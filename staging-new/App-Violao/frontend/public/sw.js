// Cifras App Service Worker — Network First com fallback de cache
const VERSION = 'cifras-v3'
const STATIC_CACHE = `${VERSION}-static`
const RUNTIME_CACHE = `${VERSION}-runtime`

const PRECACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png',
  '/icons/favicon-32.png',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(err => console.warn('[SW] precache falhou:', err))
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !k.startsWith(VERSION)).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

// Estratégia:
// - Navegação (HTML) → Network First, fallback cache, fallback /offline
// - API (/api/)    → Network Only (nunca cacheia pra evitar dados velhos)
// - Estáticos      → Cache First, atualiza em background
self.addEventListener('fetch', event => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)

  // Ignora cross-origin (MercadoPago, YouTube, etc.)
  if (url.origin !== self.location.origin) return

  // API: nunca cacheia
  if (url.pathname.startsWith('/api/')) return

  // Navegação: network first
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const clone = res.clone()
          caches.open(RUNTIME_CACHE).then(c => c.put(req, clone)).catch(() => {})
          return res
        })
        .catch(() => caches.match(req).then(r => r || caches.match('/index.html')))
    )
    return
  }

  // Estáticos: cache first
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) {
        fetch(req).then(res => {
          if (res.ok) caches.open(RUNTIME_CACHE).then(c => c.put(req, res.clone()))
        }).catch(() => {})
        return cached
      }
      return fetch(req).then(res => {
        if (res.ok && res.type === 'basic') {
          const clone = res.clone()
          caches.open(RUNTIME_CACHE).then(c => c.put(req, clone))
        }
        return res
      }).catch(() => cached)
    })
  )
})
