import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import authRouter, { authMiddleware } from './auth.js'
import mpRouter from './mercadopago.js'
import { findUserById, setUserData, getUserData } from './db.js'

process.on('uncaughtException', err => console.error('[UNCAUGHT]', err))
process.on('unhandledRejection', err => console.error('[UNHANDLED]', err))

const app = express()
const PORT = parseInt(process.env.PORT || '3001', 10)
const NODE_ENV = process.env.NODE_ENV || 'development'
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3001')
  .split(',').map(s => s.trim()).filter(Boolean)

// ===== Segurança =====
app.set('trust proxy', 1)
app.use(helmet({
  contentSecurityPolicy: false, // Vite injeta inline no dev; em prod, servimos o dist e fica ok
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))
app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true) // curl, health-check
    if (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) return cb(null, true)
    return cb(new Error('Origin não permitido: ' + origin))
  },
  credentials: true,
}))
app.use(express.json({ limit: '1mb' }))
app.use(cookieParser())

// Rate limit global (200 req / 15 min / IP) + específico pra auth/pagamento
const globalLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false })
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Muitas tentativas. Tente em 15 minutos.' }, standardHeaders: true, legacyHeaders: false })
const payLimiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 30, message: { error: 'Limite de criação de pagamento atingido.' }, standardHeaders: true, legacyHeaders: false })

app.use(globalLimiter)
app.use('/api/auth', authLimiter, authRouter)
app.use('/api/pagamento', payLimiter, mpRouter)

// ===== Health =====
app.get('/api/health', (_req, res) => res.json({
  ok: true, env: NODE_ENV, time: new Date().toISOString(),
  uptime: process.uptime(),
}))

// ===== Sync (cloud backup) =====
app.post('/api/sync/save', authMiddleware, async (req, res) => {
  try {
    const user = findUserById(req.user.id)
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
    const { songs, setlists } = req.body || {}
    if (songs && !Array.isArray(songs)) return res.status(400).json({ error: 'songs deve ser array' })
    if (setlists && !Array.isArray(setlists)) return res.status(400).json({ error: 'setlists deve ser array' })
    setUserData(user.email, { songs: songs || [], setlists: setlists || [] })
    res.json({ ok: true, savedAt: new Date().toISOString() })
  } catch (e) {
    console.error('[sync save]', e)
    res.status(500).json({ error: 'Erro ao salvar' })
  }
})

app.get('/api/sync/load', authMiddleware, (req, res) => {
  try {
    const user = findUserById(req.user.id)
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
    const data = getUserData(user.email)
    res.json({ ...(data || { songs: [], setlists: [] }), loadedAt: new Date().toISOString() })
  } catch (e) {
    console.error('[sync load]', e)
    res.status(500).json({ error: 'Erro ao carregar' })
  }
})

// ===== Cifra fetch (proxy simples) — mantém seu fluxo existente =====
async function httpsGet(url, timeoutMs = 15000, extraHeaders = {}) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14)', Accept: 'text/html,application/json', ...extraHeaders },
      signal: ctrl.signal,
    })
    return { status: r.status, body: await r.text() }
  } finally {
    clearTimeout(timer)
  }
}

const CIFRALIZE = 'https://cifralize.com.br'
const INVIDIOUS = ['https://invidious.fdn.fr', 'https://invidious.protokolla.fi', 'https://yewtu.be']
const PIPED = ['https://pipedapi.kavin.rocks', 'https://pipedapi.adminforge.de']

app.post('/api/search', async (req, res) => {
  const query = (req.body?.query || '').trim()
  if (!query) return res.status(400).json({ error: 'Query obrigatória' })
  try {
    const results = await Promise.allSettled([
      fetch(`${CIFRALIZE}/search?q=${encodeURIComponent(query)}&format=json`).then(r => r.json()).catch(() => ({})),
      fetch(`${CIFRALIZE}/search/cifraclub?q=${encodeURIComponent(query)}`).then(r => r.json()).catch(() => []),
    ])
    const a = results[0].status === 'fulfilled' ? (results[0].value.songs || []) : []
    const b = results[1].status === 'fulfilled' ? (Array.isArray(results[1].value) ? results[1].value : []) : []
    const seen = new Set(a.map(s => `${s.title}|${s.artist_name}`))
    const merged = [...a]
    for (const s of b) {
      const k = `${s.title}|${s.artist || ''}`
      if (!seen.has(k)) { merged.push({ title: s.title, artist_name: s.artist || '', key: null, url: s.url }); seen.add(k) }
    }
    res.json({ results: merged })
  } catch (e) {
    res.json({ results: [], error: e.message })
  }
})

app.post('/api/fetch', async (req, res) => {
  const { url, key: providedKey } = req.body || {}
  if (!url) return res.status(400).json({ error: 'URL obrigatória' })
  try {
    if (url.includes('cifraclub.com.br') || url.startsWith('/')) {
      const full = url.includes('cifraclub.com.br') ? url : `https://www.cifraclub.com.br${url.startsWith('/') ? '' : '/'}${url}`
      const r = await fetch(full, { headers: { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36', Accept: 'text/html' } })
      const html = await r.text()
      let text = ''
      const pre = html.match(/<pre[^>]*class=["'][^"']*cifra[^"']*["'][^>]*>([\s\S]*?)<\/pre>/i)
      if (pre) text = pre[1]
      else {
        const m = html.match(/<div[^>]*class=["'][^"']*\bcifra\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i)
        if (m) text = m[1].replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, '$1')
      }
      const clean = (text || '')
        .replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
        .split('\n').map(l => l.trimEnd()).filter(Boolean).join('\n')
      const title = (html.match(/<h1[^>]*class=["'][^"']*t1[^"']*["'][^>]*>([^<]+)</) || [])[1]?.trim() || ''
      const artist = (html.match(/<a[^>]*class=["'][^"']*artist[^"']*["'][^>]*>([^<]+)</) || [])[1]?.trim() || ''
      if (clean.length >= 30) return res.json({ text: clean, title, artist, key: providedKey || 'C' })
    }
    // fallback Cifralize (cifra + import)
    let fetchUrl = url
    if (url.startsWith('http') && !url.includes('cifralize.com.br')) {
      try {
        const ir = await fetch(`${CIFRALIZE}/search/cifraclub_import`, {
          method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
          body: `url=${encodeURIComponent(url)}`,
        })
        const j = await ir.json().catch(() => ({}))
        if (j.url) fetchUrl = j.url
      } catch {}
    } else if (url.includes('cifralize.com.br')) {
      fetchUrl = new URL(url).pathname
    }
    const r = await fetch(`${CIFRALIZE}${fetchUrl}`, { headers: { 'Turbo-Frame': 'chords-display', 'X-Requested-With': 'XMLHttpRequest', Accept: 'text/html,*/*;q=0.8' } })
    const body = await r.text()
    const open = body.match(/<div[^>]*class=["'][^"']*chords-display[^"']*["'][^>]*>/i)
    let cifra = ''
    if (open) {
      let i = open.index + open[0].length, depth = 1
      while (i < body.length && depth > 0) {
        const nOpen = body.indexOf('<div', i), nClose = body.indexOf('</div>', i)
        if (nClose === -1) break
        if (nOpen !== -1 && nOpen < nClose) { depth++; i = nOpen + 4 } else { depth--; i = nClose + 6 }
      }
      cifra = body.substring(open.index + open[0].length, i - 6)
    }
    cifra = cifra.replace(/<span class=['"]chord-section['"]>([^<]+)<\/span>/g, '$1')
      .replace(/<span class=['"]chord['"]>([^<]+)<\/span>/g, '$1')
      .replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
      .split('\n').map(l => l.trimEnd()).filter(Boolean).join('\n')
    if (!cifra || cifra.length < 30) return res.json({ text: '', error: 'Cifra não encontrada' })
    const title = (body.match(/<h1[^>]*class=["'][^"']*song-header-title[^"']*["'][^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/) || [])[1]?.trim() || ''
    const artist = (body.match(/class=["'][^"']*song-header-artist[^"']*["'][\s\S]*?<a[^>]*>([^<]+)<\/a>/) || [])[1]?.trim() || ''
    res.json({ text: cifra, title, artist, key: providedKey || 'C' })
  } catch (e) {
    res.json({ text: '', error: e.message })
  }
})

app.post('/api/audio/search', async (req, res) => {
  const { title, artist, type, key } = req.body || {}
  if (!title) return res.status(400).json({ error: 'title obrigatório' })
  const baseQuery = artist ? `${artist} ${title}` : title
  const isPlayback = type === 'playback'
  const keyPart = key ? ` ${key}` : ''
  const queries = isPlayback
    ? [`${baseQuery} instrumental${keyPart}`, `${baseQuery} karaoke${keyPart}`, `${baseQuery} playback${keyPart}`, `${baseQuery} minus one${keyPart}`, baseQuery]
    : [`${baseQuery} official${keyPart}`, `${baseQuery}${keyPart}`, title]
  const vocalKw = /\b(oficial|official|lyrics|letra|legendado|ao vivo|live|cover|version|acoustic|remix|feat|ft\.?)\b/i
  const pbKw = /\b(instrumental|karaoke|playback|minus one|no vocals|backing track|sem vocal|pista)\b/i
  const seen = new Set(), all = []
  async function ytSearch(q) {
    for (const inst of INVIDIOUS) {
      try {
        const r = await fetch(`${inst}/api/v1/search?q=${encodeURIComponent(q)}&type=video&fields=${encodeURIComponent('title,videoId,author,lengthSeconds')}`)
        if (!r.ok) continue
        const data = await r.json()
        if (Array.isArray(data) && data.length) return data.slice(0, 12).map(v => ({
          id: v.videoId, title: v.title || '',
          artist: typeof v.author === 'string' ? v.author : (v.author || ''),
          duration: v.lengthSeconds || 0,
        }))
      } catch {}
    }
    for (const inst of PIPED) {
      try {
        const r = await fetch(`${inst}/search?q=${encodeURIComponent(q)}&filter=videos`)
        if (!r.ok) continue
        const j = await r.json()
        const items = j.items || []
        if (items.length) return items.slice(0, 12).map(v => ({
          id: (v.url || '').replace('/watch?v=', '') || v.youtubeId || '',
          title: v.title || '', artist: v.uploaderName || v.uploader || '',
          duration: v.duration || 0,
        })).filter(v => v.id)
      } catch {}
    }
    return []
  }
  try {
    for (const q of queries) {
      if (all.length >= 12) break
      const r = await ytSearch(q)
      for (const v of r) {
        if (seen.has(v.id)) continue
        seen.add(v.id)
        if (isPlayback && vocalKw.test(v.title) && !pbKw.test(v.title)) continue
        all.push(v)
        if (all.length >= 12) break
      }
    }
    res.json({ results: all, query: queries[0] })
  } catch (e) {
    res.status(500).json({ error: 'Falha na busca' })
  }
})

// ===== Frontend estático =====
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendDist = path.resolve(__dirname, '../../frontend/dist')
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist, { maxAge: NODE_ENV === 'production' ? '1d' : 0, etag: true }))
  app.get('*', (_req, res) => res.sendFile(path.join(frontendDist, 'index.html')))
} else {
  app.get('/', (_req, res) => res.status(503).send('Frontend dist não encontrado. Rode "npm run build" em /frontend.'))
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] Cifras API + PWA em http://localhost:${PORT} (${NODE_ENV})`)
})
