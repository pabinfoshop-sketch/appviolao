import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import https from 'https'
import path from 'path'
import { fileURLToPath } from 'url'
import authRouter from './auth.js'
import mpRouter from './mercadopago.js'
import { authMiddleware } from './auth.js'
import { findUserById, setUserData, getUserData } from './db.js'

process.on('uncaughtException', err => console.error('UNCAUGHT:', err))
process.on('unhandledRejection', err => console.error('UNHANDLED:', err))

const app = express()
const PORT = process.env.PORT || 3001
const CIFRALIZE = 'https://cifralize.com.br'

app.use(cors({ origin: true, credentials: true }))
app.use(express.json())
app.use(cookieParser())

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendDist = path.resolve(__dirname, '../../frontend/dist')
app.use(express.static(frontendDist, { maxAge: 0 }))

function httpsGet(url, timeoutMs = 15000, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    let done = false
    const finish = (fn, val) => { if (!done) { done = true; fn(val) } }
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 14)',
        Accept: 'text/html,application/json',
        ...extraHeaders,
      },
      timeout: timeoutMs,
    }, res => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', c => { body += c })
      res.on('end', () => finish(resolve, { status: res.statusCode, body }))
    })
    req.on('error', e => finish(reject, e))
    req.on('timeout', () => { req.destroy(); finish(reject, new Error('timeout')) })
  })
}

function httpsPost(url, data, timeoutMs = 15000, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    let done = false
    const finish = (fn, val) => { if (!done) { done = true; fn(val) } }
    const parsed = new URL(url)
    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 14)',
        'Content-Type': 'application/x-www-form-urlencoded',
        ...extraHeaders,
      },
      timeout: timeoutMs,
    }, res => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', c => { body += c })
      res.on('end', () => finish(resolve, { status: res.statusCode, body }))
    })
    req.on('error', e => finish(reject, e))
    req.on('timeout', () => { req.destroy(); finish(reject, new Error('timeout')) })
    req.write(data)
    req.end()
  })
}

// ====== YOUTUBE SEARCH (Invidious + Piped fallback) ======
const INVIDIOUS_INSTANCES = [
  'https://invidious.flokinet.to',
  'https://invidious.materialio.us',
  'https://iv.melmac.space',
  'https://invidious.fdn.fr',
  'https://invidious.protokolla.fi',
]

const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.syncpundit.io',
  'https://pipedapi.moomoo.me',
]

async function searchInvidious(query) {
  const errors = []
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const url = `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video&fields=${encodeURIComponent('title,videoId,author,lengthSeconds')}`
      const { status, body } = await httpsGet(url, 10000)
      if (status !== 200) { errors.push(`${instance}: HTTP ${status}`); continue }
      let data
      try { data = JSON.parse(body) } catch (e) { errors.push(`${instance}: JSON`); continue }
      if (!Array.isArray(data) || data.length === 0) { errors.push(`${instance}: empty`); continue }
      return data.slice(0, 12).map(v => ({
        id: v.videoId,
        title: v.title || '',
        artist: typeof v.author === 'string' ? v.author : (v.author || ''),
        duration: v.lengthSeconds || 0,
      }))
    } catch (e) {
      errors.push(`${instance}: ${e.message}`)
      continue
    }
  }
  return null
}

async function searchPiped(query) {
  for (const instance of PIPED_INSTANCES) {
    try {
      const url = `${instance}/search?q=${encodeURIComponent(query)}&filter=videos`
      const { status, body } = await httpsGet(url, 10000, { Accept: 'application/json' })
      if (status !== 200) continue
      let data
      try { data = JSON.parse(body) } catch (e) { continue }
      const items = data.items || []
      if (!Array.isArray(items) || items.length === 0) continue
      return items.slice(0, 12).map(v => ({
        id: v.url?.replace('/watch?v=', '') || v.youtubeId || '',
        title: v.title || '',
        artist: v.uploaderName || v.uploader || '',
        duration: v.duration || 0,
      })).filter(v => v.id)
    } catch (e) {
      continue
    }
  }
  return []
}

async function searchYouTube(query) {
  const invidious = await searchInvidious(query)
  if (invidious) return invidious
  console.log('Invidious failed, trying Piped...')
  return await searchPiped(query)
}

app.post('/api/audio/search', async (req, res) => {
  const { title, artist, type, key } = req.body
  if (!title) return res.status(400).json({ error: 'title obrigatório' })

  try {
    const baseQuery = artist ? `${artist} ${title}` : title
    const isPlayback = type === 'playback'
    const keyPart = key ? ` ${key}` : ''

    const queries = isPlayback
      ? [
          `${baseQuery} instrumental${keyPart}`,
          `${baseQuery} karaoke${keyPart}`,
          `${baseQuery} playback${keyPart}`,
          `${baseQuery} minus one${keyPart}`,
          `${baseQuery} no vocals${keyPart}`,
          `${baseQuery} backing track${keyPart}`,
          `${baseQuery} sem vocal`,
          baseQuery,
        ]
      : [
          `${baseQuery} official${keyPart}`,
          `${baseQuery}${keyPart}`,
          title,
        ]

    const vocalKeywords = /\b(oficial|official|lyrics|letra|legendado|subtitled|ao vivo|live|cover|version|acoustic|remix|feat|ft\.?)\b/i
    const playbackKeywords = /\b(instrumental|karaoke|playback|minus one|no vocals|backing track|sem vocal|pista)\b/i

    const seen = new Set()
    const allResults = []
    for (const q of queries) {
      if (allResults.length >= 12) break
      const r = await searchYouTube(q)
      for (const v of r) {
        if (seen.has(v.id)) continue
        seen.add(v.id)
        if (isPlayback && vocalKeywords.test(v.title) && !playbackKeywords.test(v.title)) continue
        allResults.push(v)
        if (allResults.length >= 12) break
      }
    }

    res.json({ results: allResults, query: queries[0] })
  } catch (err) {
    console.error('Audio search error:', err)
    res.status(500).json({ error: 'Falha na busca' })
  }
})

app.post('/api/search', async (req, res) => {
  const { query } = req.body
  if (!query) return res.status(400).json({ error: 'Query obrigatória' })

  try {
    const [{ body: cifralizeBody }, { body: cifraclubBody }] = await Promise.allSettled([
      httpsGet(`${CIFRALIZE}/search?q=${encodeURIComponent(query)}&format=json`, 10000),
      httpsGet(`${CIFRALIZE}/search/cifraclub?q=${encodeURIComponent(query)}`, 10000),
    ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : { body: '{}' }))

    let results = []
    try {
      const data = JSON.parse(cifralizeBody)
      results = data.songs || []
    } catch {}

    // Include CifraClub results not already in results (deduplicate by title+artist)
    try {
      const ccData = JSON.parse(cifraclubBody)
      if (Array.isArray(ccData)) {
        const existing = new Set(results.map(s => `${s.title}|${s.artist_name}`))
        for (const s of ccData) {
          if (!existing.has(`${s.title}|${s.artist || ''}`)) {
            results.push({
              title: s.title,
              artist_name: s.artist || '',
              key: null,
              url: s.url,
            })
          }
        }
      }
    } catch {}

    res.json({ results })
  } catch (e) {
    res.json({ results: [], error: e.message })
  }
})

async function fetchCifraClub(url) {
  const { body } = await httpsGet(url, 15000, {
    'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36',
    Accept: 'text/html',
  })

  let title = body.match(/<h1[^>]*class="[^"]*t1[^"]*"[^>]*>([^<]+)</)?.[1]?.trim() || ''
  if (!title) title = body.match(/<title>([^<]+)<\/title>/)?.[1]?.trim()?.replace(/\s*\|.*$/, '').trim() || ''
  const artist = body.match(/<a[^>]*class="[^"]*artist[^"]*"[^>]*>([^<]+)</)?.[1]?.trim() || ''

  // Extract cifra content from <pre> or div.cifra
  let cifra = ''
  const preMatch = body.match(/<pre[^>]*class="[^"]*cifra[^"]*"[^>]*>([\s\S]*?)<\/pre>/i)
  if (preMatch) {
    cifra = preMatch[1]
  } else {
    // Try extracting from div.cifra
    const divRe = /<div[^>]*class=["'][^"']*\bcifra\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i
    const divMatch = body.match(divRe)
    if (divMatch) {
      // Remove inner divs but keep text
      cifra = divMatch[1].replace(/<div[^>]*>([\s\S]*?)<\/div>/gi, '$1')
    }
  }

  if (!cifra) return null

  cifra = cifra
    .replace(/<b[^>]*>([^<]+)<\/b>/g, '$1')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map(l => l.trimEnd())
    .filter(l => l)
    .join('\n')

  return { text: cifra, title, artist }
}

app.post('/api/fetch', async (req, res) => {
  const { url, key: providedKey } = req.body
  if (!url) return res.status(400).json({ error: 'URL obrigatória' })

  try {
    let fetchUrl = url

    // Direct CifraClub fetch
    if (url.includes('cifraclub.com.br') || url.startsWith('/')) {
      const fullUrl = url.includes('cifraclub.com.br')
        ? url
        : `https://www.cifraclub.com.br${url.startsWith('/') ? '' : '/'}${url}`
      const result = await fetchCifraClub(fullUrl)
      if (result && result.text.length >= 30) {
        const key = providedKey || 'C'
        return res.json({ text: result.text, title: result.title, artist: result.artist, key })
      }
    }

    if (url.startsWith('http')) {
      if (url.includes('cifralize.com.br')) {
        fetchUrl = new URL(url).pathname
      } else {
        try {
          const importRes = await httpsPost(`${CIFRALIZE}/search/cifraclub_import`, `url=${encodeURIComponent(url)}`, 15000, {
            Accept: 'application/json',
          })
          if (importRes.status === 200) {
            const importData = JSON.parse(importRes.body)
            if (importData.url) fetchUrl = importData.url
          }
        } catch {}
      }
    }

    const { body } = await httpsGet(`${CIFRALIZE}${fetchUrl}`, 15000, {
      'Turbo-Frame': 'chords-display',
      'X-Requested-With': 'XMLHttpRequest',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    })

    let title = body.match(/<h1[^>]*class="[^"]*song-header-title[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/)?.[1]?.trim() || ''
    const artist = body.match(/class="[^"]*song-header-artist[^"]*"[\s\S]*?<a[^>]*>([^<]+)<\/a>/)?.[1]?.trim() || ''
    if (!title) title = body.match(/<title>([^<]+)<\/title>/)?.[1]?.trim()?.replace(/\s*\|.*$/, '').trim() || ''
    const key = providedKey || 'C'

    function extractDivContent(html, classPattern) {
      const openRe = new RegExp(`<div[^>]*class=["'][^"']*${classPattern}[^"']*["'][^>]*>`, 'i')
      const openMatch = html.match(openRe)
      if (!openMatch) return ''
      const startIdx = openMatch.index + openMatch[0].length
      let depth = 1
      let i = startIdx
      while (i < html.length && depth > 0) {
        const nextOpen = html.indexOf('<div', i)
        const nextClose = html.indexOf('</div>', i)
        if (nextClose === -1) break
        if (nextOpen !== -1 && nextOpen < nextClose) { depth++; i = nextOpen + 4 }
        else { depth--; i = nextClose + 6 }
      }
      return html.substring(startIdx, i - 6)
    }

    let cifra = extractDivContent(body, 'chords-display')

    cifra = cifra
      .replace(/<span class=['"]chord-section['"]>([^<]+)<\/span>/g, '$1')
      .replace(/<span class=['"]chord['"]>([^<]+)<\/span>/g, '$1')
      .replace(/<b[^>]*>([^<]+)<\/b>/g, '$1')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\r\n/g, '\n')
      .split('\n').map(l => l.trimEnd()).filter(l => l).join('\n')

    if (!cifra || cifra.length < 30) {
      return res.json({ text: '', error: 'Cifra não encontrada' })
    }

    res.json({ text: cifra, title, artist, key })
  } catch (e) {
    res.json({ text: '', error: e.message })
  }
})

app.get('/api/health', (_, res) => res.json({ ok: true }))

app.use('/api/auth', authRouter)
app.use('/api/pagamento', mpRouter)

app.post('/api/sync/save', authMiddleware, async (req, res) => {
  try {
    const user = findUserById(req.user.id)
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
    const { songs, setlists } = req.body
    setUserData(user.email, { songs: songs || [], setlists: setlists || [] })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('/api/sync/load', authMiddleware, async (req, res) => {
  try {
    const user = findUserById(req.user.id)
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' })
    const data = getUserData(user.email)
    res.json(data || { songs: [], setlists: [] })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

app.get('*', (_, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`Cifras API rodando em http://localhost:${PORT}`)
})
