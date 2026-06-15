import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { findUserByEmail, findUserById, createUser, checkTrial } from './db.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || (() => { throw new Error('JWT_SECRET não definido. Defina no .env ou nos secrets do Fly.io.') })()
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d'
const COOKIE_SECURE = process.env.COOKIE_SECURE !== 'false' // default true em prod

function signToken(user) {
  return jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

function setAuthCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: COOKIE_SECURE,
    maxAge: 30 * 24 * 3600 * 1000,
    path: '/',
  })
}

export function authMiddleware(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'Não autenticado' })
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' })
  }
}

export function premiumMiddleware(req, res, next) {
  const user = findUserById(req.user.id)
  if (!user?.premium) return res.status(403).json({ error: 'Assinatura necessária', premium: false })
  req.fullUser = user
  next()
}

function publicUser(u) {
  if (!u) return null
  const trialEnd = u.trial_end || null
  const trialDays = trialEnd ? Math.max(0, Math.ceil((new Date(trialEnd) - Date.now()) / 86400000)) : 0
  return {
    id: u.id, name: u.name, email: u.email,
    premium: !!u.premium, premiumSince: u.premium_since || null,
    trialEnd, trialDays,
  }
}

router.post('/register', async (req, res) => {
  try {
    const name = (req.body.name || '').trim()
    const email = (req.body.email || '').trim().toLowerCase()
    const password = req.body.password || ''

    if (!name || !email || !password) return res.status(400).json({ error: 'Preencha todos os campos' })
    if (password.length < 6) return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' })
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return res.status(400).json({ error: 'Email inválido' })
    if (findUserByEmail(email)) return res.status(409).json({ error: 'Email já cadastrado' })

    const id = crypto.randomUUID()
    const passwordHash = await bcrypt.hash(password, 10)
    const user = createUser({ id, name, email, passwordHash })

    const token = signToken(user)
    setAuthCookie(res, token)
    res.status(201).json({ token, user: publicUser(user) })
  } catch (e) {
    console.error('register error:', e)
    res.status(500).json({ error: 'Erro ao cadastrar' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase()
    const password = req.body.password || ''
    if (!email || !password) return res.status(400).json({ error: 'Preencha email e senha' })

    const user = findUserByEmail(email)
    if (!user) return res.status(401).json({ error: 'Email ou senha incorretos' })

    const ok = await bcrypt.compare(password, user.password_hash)
    if (!ok) return res.status(401).json({ error: 'Email ou senha incorretos' })

    checkTrial(email)
    const fresh = findUserById(user.id)
    const token = signToken(fresh)
    setAuthCookie(res, token)
    res.json({ token, user: publicUser(fresh) })
  } catch (e) {
    console.error('login error:', e)
    res.status(500).json({ error: 'Erro ao fazer login' })
  }
})

router.post('/logout', (_req, res) => {
  res.clearCookie('token', { path: '/' })
  res.json({ ok: true })
})

router.get('/me', authMiddleware, (req, res) => {
  const user = findUserById(req.user.id)
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
  checkTrial(user.email)
  res.json({ user: publicUser(findUserById(user.id)) })
})

export default router
