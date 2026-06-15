import { Router } from 'express'
import { authMiddleware } from './auth.js'
import { findUserById, findUserByEmail, setPremium, setMpSubscription, recordPayment, updatePaymentStatus, PRICE_BRL } from './db.js'

const router = Router()

const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || ''
const PUBLIC_KEY = process.env.MP_PUBLIC_KEY || ''
const DOMAIN = process.env.DOMAIN || 'http://localhost:3001'
const WEBHOOK_URL = process.env.WEBHOOK_URL || `${DOMAIN}/api/pagamento/webhook`
const BACK_URL = process.env.BACK_URL || `${DOMAIN}/?pagamento=retorno`
const IS_SANDBOX = ACCESS_TOKEN.startsWith('TEST-') || ACCESS_TOKEN === ''

if (ACCESS_TOKEN) {
  console.log(`[MP] modo ${IS_SANDBOX ? 'SANDBOX (teste)' : 'PRODUÇÃO'} · preço R$ ${PRICE_BRL.toFixed(2).replace('.', ',')}/mês`)
} else {
  console.log('[MP] não configurado (defina MP_ACCESS_TOKEN)')
}

async function mpFetch(method, path, body) {
  const res = await fetch(`https://api.mercadopago.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      'User-Agent': 'CifrasApp/2.0',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { data = text }
  return { status: res.status, data }
}

router.get('/config', (_req, res) => {
  res.json({
    publicKey: PUBLIC_KEY,
    price: PRICE_BRL,
    currency: 'BRL',
    sandbox: IS_SANDBOX,
    webhookUrl: WEBHOOK_URL,
  })
})

// Cria assinatura (preapproval) — assinatura recorrente mensal
router.post('/checkout', authMiddleware, async (req, res) => {
  try {
    if (!ACCESS_TOKEN) return res.status(500).json({ error: 'MP_ACCESS_TOKEN não configurado' })

    const user = findUserById(req.user.id)
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
    if (user.premium && user.premium_since) {
      return res.status(400).json({ error: 'Você já é assinante premium' })
    }

    const body = {
      reason: `Cifras Premium — Assinatura Mensal (R$ ${PRICE_BRL.toFixed(2).replace('.', ',')})`,
      external_reference: user.id,
      payer_email: user.email,
      auto_recurring: {
        frequency: 1,
        frequency_type: 'months',
        transaction_amount: PRICE_BRL,
        currency_id: 'BRL',
      },
      back_url: BACK_URL,
      notification_url: WEBHOOK_URL,
      status: 'pending',
    }

    const mp = await mpFetch('POST', '/preapproval', body)
    if (mp.status >= 200 && mp.status < 300 && mp.data?.id) {
      setMpSubscription(user.email, mp.data.id, mp.data.payer_id || null)
      recordPayment({
        userId: user.id, mpId: mp.data.id, mpType: 'preapproval',
        amount: PRICE_BRL, status: mp.data.status || 'pending', raw: mp.data,
      })
      return res.json({
        id: mp.data.id,
        url: mp.data.init_point,
        sandbox_url: mp.data.sandbox_init_point,
      })
    }
    console.error('[MP] checkout error:', mp.status, JSON.stringify(mp.data).slice(0, 600))
    return res.status(502).json({ error: 'Erro ao criar assinatura no Mercado Pago', detail: mp.data })
  } catch (e) {
    console.error('[MP] checkout exception:', e)
    res.status(500).json({ error: 'Erro interno ao criar assinatura' })
  }
})

// Webhook MP — recebe notificações de preapproval e payment
router.post('/webhook', async (req, res) => {
  // MP pode mandar ?data.id=...&type=... ou no body
  const dataId = req.query['data.id'] || req.body?.data?.id
  const type = req.query.type || req.body?.type

  // MP exige 200 rápido — processa de forma assíncrona
  res.status(200).send('ok')

  if (!dataId) return

  try {
    if (type === 'preapproval' || type === 'subscription_preapproval') {
      const mp = await mpFetch('GET', `/preapproval/${dataId}`)
      if (mp.status === 200 && mp.data) {
        const user = findUserById(mp.data.external_reference)
        if (user) {
          updatePaymentStatus(dataId, mp.data.status, mp.data)
          if (mp.data.status === 'authorized') {
            setPremium(user.email, true)
            setMpSubscription(user.email, mp.data.id, mp.data.payer_id || null)
          } else if (['cancelled', 'paused', 'expired'].includes(mp.data.status)) {
            setPremium(user.email, false)
          }
        }
      }
    } else if (type === 'payment' || type === 'subscription_authorized_payment') {
      const mp = await mpFetch('GET', `/payments/${dataId}`)
      if (mp.status === 200 && mp.data) {
        updatePaymentStatus(dataId, mp.data.status, mp.data)
        if (mp.data.status === 'approved') {
          const user = findUserById(mp.data.external_reference)
          if (user) setPremium(user.email, true)
        }
      }
    }
  } catch (e) {
    console.error('[MP] webhook process error:', e)
  }
})

// Status da assinatura do usuário logado
router.get('/status', authMiddleware, (req, res) => {
  const user = findUserById(req.user.id)
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
  res.json({
    premium: !!user.premium,
    premiumSince: user.premium_since || null,
    trialEnd: user.trial_end || null,
    mpSubscriptionId: user.mp_subscription_id || null,
    price: PRICE_BRL,
    manageUrl: user.mp_subscription_id
      ? `https://www.mercadopago.com.br/subscriptions`
      : null,
  })
})

// Cancela assinatura no MP
router.post('/cancel', authMiddleware, async (req, res) => {
  try {
    if (!ACCESS_TOKEN) return res.status(500).json({ error: 'MP_ACCESS_TOKEN não configurado' })
    const user = findUserById(req.user.id)
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
    if (!user.mp_subscription_id) return res.status(400).json({ error: 'Você não tem assinatura ativa no Mercado Pago' })

    const mp = await mpFetch('PUT', `/preapproval/${user.mp_subscription_id}`, { status: 'cancelled' })
    if (mp.status >= 200 && mp.status < 300) {
      setPremium(user.email, false)
      return res.json({ ok: true, message: 'Assinatura cancelada. Você continua premium até o fim do ciclo pago.' })
    }
    console.error('[MP] cancel error:', mp.status, JSON.stringify(mp.data).slice(0, 500))
    return res.status(502).json({ error: 'Erro ao cancelar no Mercado Pago', detail: mp.data })
  } catch (e) {
    console.error('[MP] cancel exception:', e)
    res.status(500).json({ error: 'Erro ao cancelar' })
  }
})

// PIX avulso (cobrança única, não recorrente) — opcional
router.post('/pix', authMiddleware, async (req, res) => {
  try {
    if (!ACCESS_TOKEN) return res.status(500).json({ error: 'MP_ACCESS_TOKEN não configurado' })
    const user = findUserById(req.user.id)
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
    const amount = Math.max(1, Math.min(1000, parseFloat(req.body.amount) || PRICE_BRL))
    const description = req.body.description || `Apoio Cifras App — ${user.name}`

    const payer = { email: user.email, first_name: (user.name || 'Apoiador').split(' ')[0] }
    const body = {
      transaction_amount: amount,
      description,
      payment_method_id: 'pix',
      payer,
      external_reference: user.id,
      notification_url: WEBHOOK_URL,
    }
    const mp = await mpFetch('POST', '/v1/payments', body)
    if (mp.status >= 200 && mp.status < 300) {
      const tx = mp.data.point_of_interaction?.transaction_data || {}
      recordPayment({
        userId: user.id, mpId: String(mp.data.id), mpType: 'pix',
        amount, status: mp.data.status, raw: mp.data,
      })
      return res.json({
        paymentId: mp.data.id,
        status: mp.data.status,
        qr_code: tx.qr_code,
        qr_code_base64: tx.qr_code_base64,
        ticket_url: mp.data.ticket_url,
        amount,
      })
    }
    console.error('[MP] pix error:', mp.status, JSON.stringify(mp.data).slice(0, 500))
    return res.status(502).json({ error: 'Erro ao gerar PIX', detail: mp.data })
  } catch (e) {
    console.error('[MP] pix exception:', e)
    res.status(500).json({ error: 'Erro interno ao gerar PIX' })
  }
})

export default router
