import { Router } from 'express'
import https from 'https'
import { authMiddleware } from './auth.js'
import { findUserById, findUserByEmail, setPremium, setMpId } from './db.js'

const router = Router()
const API = 'https://api.mercadopago.com'
const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || ''
const DOMAIN = process.env.DOMAIN || 'https://app-cifra.fly.dev'
const IS_SANDBOX = ACCESS_TOKEN.startsWith('TEST-')

if (ACCESS_TOKEN) {
  console.log(`Mercado Pago: modo ${IS_SANDBOX ? 'SANDBOX (teste)' : 'PRODUÇÃO'}`)
} else {
  console.log('Mercado Pago: não configurado')
}

function mpFetch(method, path, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(API + path)
    const opts = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'CifrasApp/1.0',
      },
    }
    const req = https.request(opts, res => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }) }
        catch { resolve({ status: res.statusCode, data }) }
      })
    })
    req.on('error', reject)
    if (body) req.write(JSON.stringify(body))
    req.end()
  })
}

router.get('/config', (_, res) => {
  res.json({ publicKey: process.env.MP_PUBLIC_KEY || '' })
})

router.post('/checkout', authMiddleware, async (req, res) => {
  try {
    const user = findUserById(req.user.id)
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
    if (user.premium) return res.status(400).json({ error: 'Já é premium' })
    if (!ACCESS_TOKEN) return res.status(500).json({ error: 'MP_ACCESS_TOKEN não configurado' });

    const body = {
      reason: 'Cifras Premium — Assinatura Mensal',
      external_reference: user.id,
      payer_email: user.email,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: 19.90,
        currency_id: 'BRL',
      },
      back_url: `${DOMAIN}/?pagamento=sucesso`,
      notification_url: `${DOMAIN}/api/pagamento/webhook`,
    }

    const mp = await mpFetch('POST', '/preapproval', body)
    if (mp.status === 201 && mp.data?.init_point) {
      if (mp.data?.id) setMpId(user.email, mp.data.id)
      res.json({ url: mp.data.init_point })
    } else {
      console.error('MP error:', mp.status, JSON.stringify(mp.data).slice(0, 500))
      res.status(500).json({ error: 'Erro ao criar assinatura no Mercado Pago', detail: mp.data })
    }
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.post('/webhook', async (req, res) => {
  try {
    const { type, data } = req.body
    const mpId = data?.id

    if (!mpId) return res.send('ok')

    if (type === 'preapproval' || type === 'subscription') {
      const mp = await mpFetch('GET', `/preapproval/${mpId}`)
      if (mp.status === 200 && mp.data) {
        const user = findUserById(mp.data.external_reference)
        if (user && mp.data.status === 'authorized') {
          setPremium(user.email, true)
          setMpId(user.email, mpId)
        }
      }
    }

    if (type === 'payment') {
      const mp = await mpFetch('GET', `/payments/${mpId}`)
      if (mp.status === 200 && mp.data?.status === 'approved') {
        const user = findUserById(mp.data.external_reference)
        if (user) setPremium(user.email, true)
      }
    }

    res.send('ok')
  } catch {
    res.send('ok')
  }
})

router.get('/status', authMiddleware, async (req, res) => {
  const user = findUserById(req.user.id)
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
  res.json({ premium: user.premium || false, premiumSince: user.premiumSince || null })
})

export default router
