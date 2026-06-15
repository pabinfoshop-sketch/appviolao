import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { findUserByEmail, findUserById, createUser, setPremium, checkTrial } from './db.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'cifras-secret-dev-2024'

export function authMiddleware(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '')
  if (!token) return res.status(401).json({ error: 'Não autenticado' })
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    return res.status(401).json({ error: 'Token inválido' })
  }
}

export function premiumMiddleware(req, res, next) {
  const user = findUserById(req.user.id)
  if (!user?.premium) return res.status(403).json({ error: 'Assinatura necessária', premium: false })
  req.fullUser = user
  next()
}

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body
  if (!name || !email || !password) return res.status(400).json({ error: 'Preencha todos os campos' })
  if (password.length < 4) return res.status(400).json({ error: 'Senha deve ter no mínimo 4 caracteres' })
  if (findUserByEmail(email)) return res.status(400).json({ error: 'Email já cadastrado' })

  const id = crypto.randomUUID()
  const passwordHash = await bcrypt.hash(password, 10)
  createUser({ id, name, email, passwordHash })

  const token = jwt.sign({ id, email: email.toLowerCase() }, JWT_SECRET, { expiresIn: '30d' })
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 3600 * 1000 })
  const user = findUserByEmail(email)
  const trialDays = 7
  res.json({ token, user: { id, name, email: email.toLowerCase(), premium: true, trialEnd: user?.trialEnd, trialDays } })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'Preencha email e senha' })

  const user = findUserByEmail(email)
  if (!user) return res.status(400).json({ error: 'Email não cadastrado' })

  const ok = await bcrypt.compare(password, user.passwordHash)
  if (!ok) return res.status(400).json({ error: 'Senha incorreta' })

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '30d' })
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 30 * 24 * 3600 * 1000 })
  const trialEnd = user.trialEnd || null
  const trialDays = trialEnd ? Math.max(0, Math.ceil((new Date(trialEnd) - new Date()) / 86400000)) : 0
  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, premium: user.premium, premiumSince: user.premiumSince, trialEnd, trialDays },
  })
})

router.post('/logout', (_, res) => {
  res.clearCookie('token')
  res.json({ ok: true })
})

router.get('/me', authMiddleware, (req, res) => {
  const user = findUserById(req.user.id)
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
  checkTrial(user.email)
  const fresh = findUserById(req.user.id)
  const trialEnd = fresh?.trialEnd || null
  const trialDays = trialEnd ? Math.max(0, Math.ceil((new Date(trialEnd) - new Date()) / 86400000)) : 0
  res.json({
    user: { id: fresh.id, name: fresh.name, email: fresh.email, premium: fresh.premium, premiumSince: fresh.premiumSince, trialEnd, trialDays },
  })
})

export default router
