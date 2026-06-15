import { useState, useEffect, useCallback, useRef } from 'react'
import SongView from './components/SongView'
import Modal from './components/Modal'
import ConfirmDialog from './components/ConfirmDialog'
import Toast from './components/Toast'
import StrumBar from './components/StrumBar'
import Tuner from './components/Tuner'
import YouTubePlayer from './components/YouTubePlayer'
import AuthModal from './components/AuthModal'
import ErrorBoundary from './components/ErrorBoundary'
import useLocalStorage from './hooks/useLocalStorage'
import { parseCifraText } from './utils/parser'

const STORE_KEY = 'cifras_app_songs'
const SETLISTS_KEY = 'cifras_setlists'

export default function App() {
  const [songs, setSongs] = useLocalStorage(STORE_KEY, [])
  const [setlists, setSetlists] = useLocalStorage(SETLISTS_KEY, [])
  const [currentSong, setCurrentSong] = useState(null)
  const [transpose, setTranspose] = useState(0)
  const [viewMode, setViewMode] = useLocalStorage('cifras_view', '1')
  const [filter, setFilter] = useState('')
  const [showFavorites, setShowFavorites] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [toast, setToast] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [activeStep, setActiveStep] = useState(-1)
  const [bpm, setBpm] = useState(80)
  const [screen, setScreen] = useState('songs')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [autoScroll, setAutoScroll] = useState(false)
  const [scrollSpeed, setScrollSpeed] = useState(3)
  const [activeSetlist, setActiveSetlist] = useState(null)
  const [renamingSetlist, setRenamingSetlist] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [addToSetlistSong, setAddToSetlistSong] = useState(null)
  const [showCreateSetlist, setShowCreateSetlist] = useState(false)
  const [createSetlistName, setCreateSetlistName] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showEditor, setShowEditor] = useState(false)
  const [editRawText, setEditRawText] = useState('')
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [showStrumBar, setShowStrumBar] = useState(false)
  const [studyMode, setStudyMode] = useState(false)
  const [showTuner, setShowTuner] = useState(false)
  const [voiceScroll, setVoiceScroll] = useState(false)
  const [voiceScrollSpeed, setVoiceScrollSpeed] = useLocalStorage('cifras_voice_speed', 2)
  const [playbackActive, setPlaybackActive] = useState(false)
  const [playersCollapsed, setPlayersCollapsed] = useState(false)
  const voiceRef = useRef(null)
  const voiceStreamRef = useRef(null)
  const [connected, setConnected] = useState(true)
  const [showPremium, setShowPremium] = useState(false)
  const [isPremium, setIsPremium] = useLocalStorage('cifras_premium', false)
  const [authUser, setAuthUser] = useLocalStorage('cifras_user', null)
  const [authToken, setAuthToken] = useLocalStorage('cifras_token', null)
  const [showAuth, setShowAuth] = useState(false)
  const [authMode, setAuthMode] = useState('login')
  const API_URL = import.meta.env.VITE_API_URL || '/api'

  useEffect(() => {
    setTimeout(() => {
      const splash = document.getElementById('splash')
      if (splash) {
        splash.style.transition = 'opacity 0.5s ease'
        splash.style.opacity = '0'
        setTimeout(() => splash.remove(), 600)
      }
    }, 2800)
  }, [])

  useEffect(() => {
    let cancelled = false
    const check = async () => {
      try {
        const res = await fetch(`${API_URL}/health`)
        if (!cancelled) setConnected(res.ok)
      } catch {
        if (!cancelled) setConnected(false)
      }
    }
    check()
    const id = setInterval(check, 15000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const allCategories = [...new Set(songs.map(s => s.category).filter(Boolean))]
  const filtered = songs.filter(s => {
    if (showFavorites && !s.favorite) return false
    if (categoryFilter && s.category !== categoryFilter) return false
    const q = filter.toLowerCase()
    return s.title.toLowerCase().includes(q) ||
      (s.artist && s.artist.toLowerCase().includes(q))
  })
  const welcome = !currentSong && songs.length === 0 && screen === 'songs'

  const CHROMATIC = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
  const ENH = {Db:'C#',Eb:'D#',Gb:'F#',Ab:'G#',Bb:'A#'}
  const currentKey = currentSong ? (() => {
    const k = ENH[currentSong.key] || currentSong.key
    const i = CHROMATIC.indexOf(k)
    return i >= 0 ? CHROMATIC[((i+transpose)%12+12)%12] : currentSong.key
  })() : null

  const metroRef = useRef(null)
  const stepRef = useRef(0)
  const ctxRef = useRef(null)
  const contentRef = useRef(null)
  const scrollRef = useRef(null)
  const renameRef = useRef(null)

  useEffect(() => {
    if (songs.length > 0 && !currentSong && screen === 'songs') {
      setCurrentSong(songs[0])
    }
  }, [songs, screen])

  const showToast = useCallback(msg => {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }, [])

  const handleAuth = useCallback(async (mode, name, email, password) => {
    try {
      const endpoint = mode === 'login' ? 'login' : 'register'
      const body = mode === 'login' ? { email, password } : { name, email, password }
      const res = await fetch(`${API_URL}/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) {
        showToast(data.error || 'Erro ao autenticar')
        return false
      }
      setAuthToken(data.token)
      setAuthUser(data.user)
      setIsPremium(!!data.user.premium)
      setShowAuth(false)
      const trialInfo = data.user.trialDays ? ` (${data.user.trialDays}d grátis)` : ''
      showToast(mode === 'login' ? `Bem-vindo, ${data.user.name}!${trialInfo}` : `Conta criada! ${data.user.trialDays} dias grátis ativados 🎉`)
      return true
    } catch (e) {
      showToast('Erro de conexão')
      return false
    }
  }, [API_URL, setAuthToken, setAuthUser, setIsPremium, showToast])

  const handleLogout = useCallback(async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, { method: 'POST' })
    } catch {}
    setAuthToken(null)
    setAuthUser(null)
    setIsPremium(false)
    showToast('Você saiu da conta')
  }, [API_URL, setAuthToken, setAuthUser, setIsPremium, showToast])

  const handleSubscribe = useCallback(async () => {
    if (!authToken) {
      setShowAuth(true)
      setAuthMode('login')
      return
    }
    try {
      const res = await fetch(`${API_URL}/pagamento/checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else if (data.sandbox_url) {
        window.location.href = data.sandbox_url
      } else {
        showToast(data.error || 'Erro ao iniciar pagamento')
      }
    } catch (e) {
      showToast('Erro de conexão com pagamento')
    }
  }, [API_URL, authToken, showToast])

  const [pixData, setPixData] = useState(null)
  const [pixLoading, setPixLoading] = useState(false)
  const handleGeneratePix = useCallback(async (amount) => {
    if (!authToken) { setShowAuth(true); setAuthMode('login'); return }
    setPixLoading(true)
    try {
      const res = await fetch(`${API_URL}/pagamento/pix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authToken}` },
        body: JSON.stringify({ amount: amount || 24.90 }),
      })
      const data = await res.json()
      if (res.ok && data.qr_code) {
        setPixData(data)
        showToast('QR Code PIX gerado!')
      } else {
        showToast(data.error || 'Erro ao gerar PIX')
      }
    } catch (e) {
      showToast('Erro de conexão ao gerar PIX')
    } finally {
      setPixLoading(false)
    }
  }, [API_URL, authToken, showToast])

  const handleCancelSubscription = useCallback(async () => {
    if (!authToken) return
    if (!confirm('Tem certeza que deseja cancelar a assinatura? Você continuará com acesso até o fim do ciclo pago.')) return
    try {
      const res = await fetch(`${API_URL}/pagamento/cancel`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${authToken}` },
      })
      const data = await res.json()
      if (res.ok) {
        showToast(data.message || 'Assinatura cancelada')
        const me = await fetch(`${API_URL}/auth/me`, { headers: { 'Authorization': `Bearer ${authToken}` } })
        const meData = await me.json()
        if (meData?.user) { setAuthUser(meData.user); setIsPremium(!!meData.user.premium) }
      } else {
        showToast(data.error || 'Erro ao cancelar')
      }
    } catch (e) {
      showToast('Erro de conexão ao cancelar')
    }
  }, [API_URL, authToken, setAuthUser, setIsPremium, showToast])

  useEffect(() => {
    if (authToken) {
      fetch(`${API_URL}/auth/me`, { headers: { 'Authorization': `Bearer ${authToken}` } })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.user) {
            setAuthUser(data.user)
            setIsPremium(!!data.user.premium)
          }
        }).catch(() => {})
    }
  }, [authToken, API_URL, setAuthUser, setIsPremium])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('pagamento') === 'sucesso') {
      showToast('🎉 Pagamento realizado! Bem-vindo ao Premium!')
      if (authToken) {
        fetch(`${API_URL}/auth/me`, { headers: { 'Authorization': `Bearer ${authToken}` } })
          .then(r => r.json())
          .then(data => {
            if (data?.user) {
              setAuthUser(data.user)
              setIsPremium(!!data.user.premium)
            }
          }).catch(() => {})
      }
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [authToken, API_URL, setAuthUser, setIsPremium, showToast])

  const handleSelect = useCallback(song => {
    stopMetro()
    setCurrentSong(song)
    setTranspose(0)
    setBpm(song.bpm || 80)
    setScreen('view')
  }, [])

  const handleAdd = useCallback(song => {
    setShowModal(false)
    setSongs(prev => [...prev, song])
    setCurrentSong(song)
    setTranspose(0)
    setBpm(song.bpm || 80)
    setScreen('view')
    setTimeout(() => showToast('Música adicionada!'), 100)
  }, [showToast])

  const handleDelete = useCallback(song => {
    setConfirmDelete(song)
  }, [])

  const handleToggleFavorite = useCallback(id => {
    setSongs(prev => prev.map(s => s.id === id ? { ...s, favorite: !s.favorite } : s))
  }, [setSongs])

  const confirmDeleteSong = useCallback(() => {
    if (!confirmDelete) return
    setSongs(prev => prev.filter(s => s.id !== confirmDelete.id))
    if (currentSong?.id === confirmDelete.id) {
      const remaining = songs.filter(s => s.id !== confirmDelete.id)
      setCurrentSong(remaining.length > 0 ? remaining[0] : null)
      if (remaining.length === 0) setScreen('songs')
    }
    setConfirmDelete(null)
    showToast('Música removida')
  }, [confirmDelete, currentSong, songs, setSongs, showToast])

  const stopMetro = useCallback(() => {
    if (metroRef.current) { clearInterval(metroRef.current); metroRef.current = null }
    stepRef.current = 0
    setIsPlaying(false)
    setActiveStep(-1)
  }, [])

  const toggleMetro = useCallback(() => {
    if (isPlaying) { stopMetro(); return }
    if (!currentSong) { showToast('Selecione uma música primeiro'); return }
    setIsPlaying(true)
    if (!ctxRef.current) ctxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    const rhythm = currentSong.rhythm || 'Hino 4/4'
    const p = { Valsa: { s: ['D','','D','U','','U'] }, Marcha: { s: ['D','D','U','D','U'] }, 'Hino 4/4': { s: ['D','','U','D','U','','D','U'] }, Baião: { s: ['D','X','U','D','X','U'] }, Bolero: { s: ['D','','D','U','D','U'] }, Outro: { s: ['D','U','D','U'] } }[rhythm] || { s: ['D','','U','D','U','','D','U'] }
    const tick = () => {
      setActiveStep(stepRef.current)
      const s = p.s[stepRef.current]
      if (s) {
        const ctx = ctxRef.current
        const o = ctx.createOscillator()
        const g = ctx.createGain()
        o.connect(g); g.connect(ctx.destination)
        o.frequency.value = (s === 'D' || s === 'X') ? 820 : 580
        g.gain.setValueAtTime(s === 'D' ? 0.3 : 0.15, ctx.currentTime)
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08)
        o.start(); o.stop(ctx.currentTime + 0.08)
      }
      stepRef.current = (stepRef.current + 1) % p.s.length
    }
    tick()
    metroRef.current = setInterval(tick, Math.round(60000 / bpm / 2))
  }, [isPlaying, currentSong, bpm, showToast, stopMetro])

  useEffect(() => {
    return () => { if (metroRef.current) clearInterval(metroRef.current) }
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [])

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const toggleAutoScroll = useCallback(() => {
    setAutoScroll(p => !p)
  }, [])

  useEffect(() => {
    if (!autoScroll || !contentRef.current) return
    const speedMap = { 1: 15, 2: 25, 3: 40, 4: 60, 5: 80 }
    const pxPerInterval = speedMap[scrollSpeed] || 40
    const id = setInterval(() => {
      if (contentRef.current) contentRef.current.scrollTop += pxPerInterval / 10
    }, 100)
    scrollRef.current = id
    return () => clearInterval(id)
  }, [autoScroll, scrollSpeed])

  const closeTuner = useCallback(() => setShowTuner(false), [])

  const toggleVoiceScroll = useCallback(() => {
    // Se playback está tocando, não permite ativar voz
    if (!voiceScroll && playbackActive) {
      showToast('Pause o playback antes de ativar a voz', 'warn')
      return
    }
    setVoiceScroll(p => !p)
  }, [playbackActive, voiceScroll])

  const voiceSpeedRef = useRef(voiceScrollSpeed)
  voiceSpeedRef.current = voiceScrollSpeed

  useEffect(() => {
    if (!voiceScroll || !contentRef.current) return
    let audioCtx, analyser, source, dataArray, interval
    let isVoiceActive = false
    let voiceFrames = 0
    let silenceFrames = 0
    const speedMap = { 1: 15, 2: 25, 3: 40, 4: 65, 5: 100 }
    const MIN_VOICE_FRAMES = 8
    const SILENCE_LIMIT = 15
    const startListening = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        voiceStreamRef.current = stream
        audioCtx = new (window.AudioContext || window.webkitAudioContext)()
        analyser = audioCtx.createAnalyser()
        analyser.fftSize = 512
        source = audioCtx.createMediaStreamSource(stream)
        source.connect(analyser)
        dataArray = new Uint8Array(analyser.frequencyBinCount)
        let baseNoise = 0
        const noiseSamples = []
        interval = setInterval(() => {
          analyser.getByteFrequencyData(dataArray)
          let sum = 0, count = 0, peak = 0
          for (let i = 4; i <= 22 && i < dataArray.length; i++) {
            sum += dataArray[i]
            if (dataArray[i] > peak) peak = dataArray[i]
            count++
          }
          const avg = count > 0 ? sum / count : 0
          const ratio = avg > 0 ? peak / avg : 1
          if (noiseSamples.length < 20) {
            noiseSamples.push(avg)
            baseNoise = noiseSamples.reduce((a, b) => a + b, 0) / noiseSamples.length
          }
          const threshold = Math.max(baseNoise + 3, 10)
          if (avg > threshold && ratio > 1.3) {
            voiceFrames++
            silenceFrames = 0
            if (voiceFrames >= MIN_VOICE_FRAMES && !isVoiceActive) {
              isVoiceActive = true
            }
          } else {
            voiceFrames = 0
            if (isVoiceActive) {
              silenceFrames++
              if (silenceFrames >= SILENCE_LIMIT) {
                isVoiceActive = false
                silenceFrames = 0
              }
            }
          }
          if (isVoiceActive && contentRef.current) {
            contentRef.current.scrollTop += (speedMap[voiceSpeedRef.current] || 15) / 60
          }
        }, 66)
      } catch (err) {
        setVoiceScroll(false)
      }
    }
    startListening()
    return () => {
      if (interval) clearInterval(interval)
      if (audioCtx) audioCtx.close()
      if (voiceStreamRef.current) {
        voiceStreamRef.current.getTracks().forEach(t => t.stop())
        voiceStreamRef.current = null
      }
    }
  }, [voiceScroll])

  useEffect(() => {
    const handler = e => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return
      if (e.key === '+' || e.key === '=') setTranspose(p => p + 1)
      if (e.key === '-' || e.key === '_') setTranspose(p => p - 1)
      if (e.key === ' ') { e.preventDefault(); toggleMetro() }
      if (e.key === 'Escape') { setShowModal(false); setConfirmDelete(null); if (autoScroll) setAutoScroll(false) }
      if (e.key === 'f' || e.key === 'F') { e.preventDefault(); toggleFullscreen() }
      if (e.key === 's' || e.key === 'S') { e.preventDefault(); toggleAutoScroll() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [toggleMetro, toggleFullscreen, toggleAutoScroll, autoScroll])

  const startCreateSetlist = useCallback(() => {
    setCreateSetlistName('')
    setShowCreateSetlist(true)
  }, [])

  const createSetlistConfirm = useCallback(() => {
    const name = createSetlistName.trim()
    if (!name) return
    setSetlists(prev => [...prev, { id: Date.now(), name, songIds: [] }])
    setShowCreateSetlist(false)
    setCreateSetlistName('')
    showToast(`Repertório "${name}" criado!`)
  }, [createSetlistName, setSetlists, showToast])

  const createSetlist = startCreateSetlist

  const deleteSetlist = useCallback(id => {
    setSetlists(prev => prev.filter(s => s.id !== id))
    if (activeSetlist?.id === id) setActiveSetlist(null)
    showToast('Repertório removido')
  }, [setSetlists, activeSetlist, showToast])

  const addSongToSetlist = useCallback((songId, setId) => {
    setSetlists(prev => prev.map(sl =>
      sl.id === setId && !sl.songIds.includes(songId)
        ? { ...sl, songIds: [...sl.songIds, songId] }
        : sl
    ))
    setAddToSetlistSong(null)
    showToast('Música adicionada ao repertório')
  }, [setSetlists, showToast])

  const removeSongFromSetlist = useCallback((songId, setId) => {
    setSetlists(prev => prev.map(sl =>
      sl.id === setId ? { ...sl, songIds: sl.songIds.filter(id => id !== songId) } : sl
    ))
  }, [setSetlists])

  const moveSongInSetlist = useCallback((setId, songId, dir) => {
    setSetlists(prev => prev.map(sl => {
      if (sl.id !== setId) return sl
      const idx = sl.songIds.indexOf(songId)
      if (idx < 0) return sl
      const newIdx = idx + dir
      if (newIdx < 0 || newIdx >= sl.songIds.length) return sl
      const ids = [...sl.songIds]
      ;[ids[idx], ids[newIdx]] = [ids[newIdx], ids[idx]]
      return { ...sl, songIds: ids }
    }))
  }, [setSetlists])

  const navigateInSetlist = useCallback(dir => {
    if (!activeSetlist || !currentSong) return
    const idx = activeSetlist.songIds.indexOf(currentSong.id)
    if (idx < 0) return
    const newIdx = idx + dir
    if (newIdx < 0 || newIdx >= activeSetlist.songIds.length) return
    const songId = activeSetlist.songIds[newIdx]
    const song = songs.find(s => s.id === songId)
    if (song) {
      stopMetro()
      setCurrentSong(song)
      setTranspose(0)
      setBpm(song.bpm || 80)
      if (contentRef.current) contentRef.current.scrollTop = 0
    }
  }, [activeSetlist, currentSong, songs, stopMetro])

  const renameSetlistStart = useCallback((sl) => {
    setRenamingSetlist(sl.id)
    setRenameValue(sl.name)
    setTimeout(() => renameRef.current?.select(), 50)
  }, [])

  const renameSetlistConfirm = useCallback(() => {
    if (!renamingSetlist || !renameValue.trim()) return
    setSetlists(prev => prev.map(sl =>
      sl.id === renamingSetlist ? { ...sl, name: renameValue.trim() } : sl
    ))
    setRenamingSetlist(null)
    setRenameValue('')
    showToast('Repertório renomeado')
  }, [renamingSetlist, renameValue, setSetlists, showToast])

  const setlistSongs = activeSetlist
    ? activeSetlist.songIds.map(id => songs.find(s => s.id === id)).filter(Boolean)
    : []

  const currentInSetlist = activeSetlist && currentSong
    ? activeSetlist.songIds.indexOf(currentSong.id)
    : -1

  const handleExportBackup = useCallback(() => {
    const data = { songs, setlists }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `songpcmusic-backup-${new Date().toISOString().slice(0,10)}.json`
    document.body.appendChild(a); a.click()
    document.body.removeChild(a); URL.revokeObjectURL(url)
    showToast('Backup baixado!')
  }, [songs, setlists, showToast])

  const handleImportBackup = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.json'
    input.onchange = e => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = ev => {
        try {
          const data = JSON.parse(ev.target.result)
          if (data.songs) setSongs(data.songs)
          if (data.setlists) setSetlists(data.setlists)
          showToast(`Importado: ${data.songs?.length || 0} músicas`)
        } catch { showToast('Arquivo inválido') }
      }
      reader.readAsText(file)
    }
    input.click()
  }, [setSongs, setSetlists, showToast])

  const handleCloudSync = useCallback(async () => {
    if (!authToken) { showToast('Faça login primeiro'); return }
    if (!isPremium) { showToast('Disponível para assinantes Premium'); return }
    try {
      const res = await fetch(`${API_URL}/sync/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({ songs, setlists }),
      })
      if (res.ok) showToast('☁️ Dados salvos na nuvem!')
      else { const d = await res.json(); showToast(d.error || 'Erro ao sincronizar') }
    } catch { showToast('Erro de conexão') }
  }, [API_URL, authToken, isPremium, songs, setlists, showToast])

  const handleCloudRestore = useCallback(async () => {
    if (!authToken) { showToast('Faça login primeiro'); return }
    if (!isPremium) { showToast('Disponível para assinantes Premium'); return }
    try {
      const res = await fetch(`${API_URL}/sync/load`, { headers: { Authorization: `Bearer ${authToken}` } })
      if (res.ok) {
        const data = await res.json()
        if (data.songs?.length) setSongs(data.songs)
        if (data.setlists?.length) setSetlists(data.setlists)
        showToast(`☁️ Restaurado: ${data.songs?.length || 0} músicas`)
      } else { const d = await res.json(); showToast(d.error || 'Erro ao restaurar') }
    } catch { showToast('Erro de conexão') }
  }, [API_URL, authToken, isPremium, setSongs, setSetlists, showToast])

  const handleShare = useCallback(() => {
    if (!currentSong) return
    const text = currentSong.rawText || currentSong.sections?.map(sec =>
      sec.lines?.map(line =>
        line.map(g => g.chord ? `[${g.chord}]${g.word}` : g.word).join('')
      ).join('\n')
    ).join('\n\n') || ''
    if (!text.trim()) { showToast('Nada para compartilhar'); return }
    if (navigator.share) {
      navigator.share({ title: currentSong.title, text }).catch(() => {})
    } else {
      navigator.clipboard.writeText(`${currentSong.title} - ${currentSong.artist}\n\n${text}`).then(() => {
        showToast('Cifra copiada!')
      }).catch(() => showToast('Erro ao copiar'))
    }
  }, [currentSong, showToast])

  const [editOriginalUrl, setEditOriginalUrl] = useState('')
  const [editPlaybackUrl, setEditPlaybackUrl] = useState('')
  // (não usado mais - áudio é via YouTube)

  // Salvar ID de áudio escolhido pelo player (busca inline dentro de YouTubePlayer)
  const pickAudioForSong = useCallback((mode, videoId) => {
    if (!currentSong) return
    const field = mode === 'playback' ? 'playbackId' : 'originalId'
    const updated = { ...currentSong, [field]: videoId }
    setSongs(prev => prev.map(s => s.id === currentSong.id ? updated : s))
    setCurrentSong(updated)
    showToast(`Áudio ${mode === 'original' ? 'Original' : 'Playback'} carregado!`)
  }, [currentSong, setSongs, showToast])

  const openEditor = useCallback(() => {
    if (!currentSong) return
    setEditRawText(currentSong.rawText || '')
    setEditOriginalUrl(currentSong.originalUrl || '')
    setEditPlaybackUrl(currentSong.playbackUrl || '')
    setShowEditor(true)
  }, [currentSong])

  const saveEdit = useCallback(() => {
    if (!currentSong) return
    const song = parseCifraText(editRawText, currentSong.title, currentSong.key, currentSong.rhythm)
    song.id = currentSong.id
    song.category = currentSong.category
    song.artist = currentSong.artist
    song.bpm = currentSong.bpm
    song.originalUrl = editOriginalUrl.trim() || undefined
    song.playbackUrl = editPlaybackUrl.trim() || undefined
    setSongs(prev => prev.map(s => s.id === currentSong.id ? song : s))
    setCurrentSong(song)
    setShowEditor(false)
    showToast('Cifra atualizada!')
  }, [currentSong, editRawText, editOriginalUrl, editPlaybackUrl, setSongs, showToast])

  return (
    <ErrorBoundary>
    <div className="app-layout">

      {/* ─── DESKTOP SIDEBAR ─── */}
      {(screen === 'songs' || screen === 'setlists') && (
        <div className="sidebar-panel desktop-only">
          <div className="sidebar-header">
            {screen === 'songs' ? '🎸 songpcmusic' : '📋 Repertórios'}
          </div>
          {screen === 'songs' ? (
            <>
              <div className="search-bar">
                <span className="search-bar-icon">🔍</span>
                <input placeholder="Filtrar músicas..." value={filter} onChange={e => setFilter(e.target.value)} />
                <button
                  className={`fav-filter-btn ${showFavorites ? 'active' : ''}`}
                  onClick={() => setShowFavorites(v => !v)}
                  title={showFavorites ? 'Mostrar todas' : 'Mostrar apenas favoritas'}
                >
                  {showFavorites ? '★' : '☆'}
                </button>
              </div>
              <button className="sidebar-add-btn" onClick={() => setShowModal(true)}>＋ Adicionar Música</button>
              <div className="sidebar-songs">
                {filtered.length === 0 ? (
                  <div className="empty-list">Nenhuma música encontrada.</div>
                ) : (
                  filtered.map(s => (
                    <div key={s.id} className={`song-card${currentSong?.id === s.id ? ' active' : ''}`}>
                      <div className="song-card-info" onClick={() => handleSelect(s)}>
                        <div className="song-card-name">{s.title}</div>
                        {s.artist && <div className="song-card-artist">{s.artist}</div>}
                      </div>
                      <span className="song-card-key">{s.key}</span>
                      <button className="song-card-del" onClick={e => { e.stopPropagation(); setAddToSetlistSong(s) }}>📋</button>
                      <button className="song-card-del" onClick={e => { e.stopPropagation(); handleDelete(s) }}>🗑</button>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <SetlistList
              setlists={setlists}
              onSelect={sl => { setActiveSetlist(sl); setScreen('setlist-view') }}
              onCreate={createSetlist}
            />
          )}
          <div className="sidebar-footer">
            {!authUser ? (
              <button className="sidebar-premium-btn" onClick={() => { setShowAuth(true); setAuthMode('login') }}>
                <span className="premium-icon">🔑</span>
                <span>Entrar / Criar Conta</span>
              </button>
            ) : (
              <button className="sidebar-premium-btn" onClick={() => setShowPremium(true)}>
                <span className="premium-icon">{isPremium ? (authUser.trialEnd && !authUser.premiumSince ? '🎉' : '⭐') : '☕'}</span>
                <span>
                  {isPremium
                    ? (authUser.trialEnd && !authUser.premiumSince
                      ? `${authUser.name} (${authUser.trialDays || 0}d grátis)`
                      : `${authUser.name} (Premium)`)
                    : `Olá, ${authUser.name}`}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── MAIN ─── */}
      <div className="main">
        {screen === 'view' && currentSong ? (
          <>
            <div className="topbar">
              <button className="tbtn" onClick={() => { setScreen(activeSetlist ? 'setlist-view' : 'songs'); stopMetro() }}>←</button>
              <span className={`conn-dot ${connected ? 'conn-ok' : 'conn-fail'}`} title={connected ? 'Servidor online' : 'Servidor offline'} />
              <div className="topbar-title">{currentSong.title}</div>
              <div className="desktop-only" style={{display:'flex',alignItems:'center',gap:4}}>
                <span style={{fontSize:11,color:'var(--text-dim)'}}>Tom:</span>
                <span className="song-card-key">{currentKey}</span>
                <button className="tbtn" onClick={() => setTranspose(p => p - 1)} style={{fontSize:'0.9rem'}}>▼</button>
                <button className="tbtn" onClick={() => setTranspose(p => p + 1)} style={{fontSize:'0.9rem'}}>▲</button>
              </div>
              <div className="desktop-only" style={{display:'flex',gap:2}}>
                {['1','4'].map(v => (
                  <button key={v} className="tbtn" style={{width:28,fontSize:'0.7rem',...viewMode===v?{background:'var(--accent-glow)',borderColor:'var(--accent)',color:'var(--accent)'}:{}}} onClick={() => setViewMode(v)}>
                    {v === '1' ? '▤' : '♩'}
                  </button>
                ))}
              </div>
              <button className="tbtn mobile-hide" onClick={openEditor} title="Editar">✏️</button>
              <button className="tbtn mobile-hide" onClick={handleShare} title="Compartilhar">📤</button>
              <button className="tbtn mobile-hide" onClick={toggleFullscreen} title="Tela cheia (F)">⛶</button>
              <button className={`tbtn mobile-hide ${autoScroll ? 'active-tbtn' : ''}`} onClick={toggleAutoScroll} title="Auto-scroll (S)">↕</button>
              <button className="tbtn mobile-hide" onClick={() => window.print()} title="Imprimir">🖨</button>
              <button className="tbtn mobile-hide" onClick={() => setShowTuner(true)} title="Afinador">🎵</button>
              <button className={`tbtn mobile-more-btn ${showMoreMenu ? 'active-tbtn' : ''}`} onClick={() => setShowMoreMenu(p => !p)} title="Mais">⋮</button>
            </div>
            {showMoreMenu && (
              <div className="more-menu" onClick={() => setShowMoreMenu(false)}>
                <div className="more-menu-inner" onClick={e => e.stopPropagation()}>
                  <div className="more-menu-section">
                    <span className="more-menu-label">Visualização</span>
                    <div style={{display:'flex',gap:4}}>
                      {['1','4'].map(v => (
                        <button key={v} className="tbtn" style={{width:32,fontSize:'0.75rem',...viewMode===v?{background:'var(--accent-glow)',borderColor:'var(--accent)',color:'var(--accent)'}:{}}} onClick={() => { setViewMode(v); setShowMoreMenu(false) }}>
                          {v === '1' ? '▤' : '♩'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="more-menu-section">
                    <span className="more-menu-label">Ações</span>
                    <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                      <button className="tbtn" onClick={() => { openEditor(); setShowMoreMenu(false) }}>✏️ Editar</button>
                      <button className="tbtn" onClick={() => { handleShare(); setShowMoreMenu(false) }}>📤 Compartilhar</button>
                      <button className="tbtn" onClick={() => { toggleFullscreen(); setShowMoreMenu(false) }}>⛶ Tela cheia</button>
                      <button className="tbtn" onClick={() => { window.print(); setShowMoreMenu(false) }}>🖨 Imprimir</button>
                      <button className={`tbtn ${showStrumBar ? 'active-tbtn' : ''}`} onClick={() => { setShowStrumBar(p => !p); setShowMoreMenu(false) }}>{showStrumBar ? '▴' : '▾'} Batida</button>
                      <button className={`tbtn ${studyMode ? 'active-tbtn' : ''}`} onClick={() => { setStudyMode(p => !p); setShowMoreMenu(false) }}>{studyMode ? '📖' : '📘'} Modo Estudo</button>
                      <button className={`tbtn ${voiceScroll ? 'active-tbtn' : ''}`} onClick={() => { toggleVoiceScroll(); setShowMoreMenu(false) }}>{voiceScroll ? '🎤' : '🎙'} Voz</button>
                      <button className="tbtn" onClick={() => { setShowTuner(true); setShowMoreMenu(false) }}>🎸 Afinar</button>
                      {authUser && isPremium && (
                        <>
                          <button className="tbtn" onClick={() => { handleCloudSync(); setShowMoreMenu(false) }}>☁️ Salvar</button>
                          <button className="tbtn" onClick={() => { handleCloudRestore(); setShowMoreMenu(false) }}>☁️ Restaurar</button>
                        </>
                      )}
                      <button className={`tbtn premium-tbtn ${isPremium ? 'is-premium' : ''}`} onClick={() => { setShowPremium(true); setShowMoreMenu(false) }}>{isPremium ? '⭐' : '☕'} Apoiar</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className={`dual-players-container${playersCollapsed ? ' hidden' : ''}`}>
              {playersCollapsed ? (
                <button className="dual-players-toggle dual-players-show" onClick={() => setPlayersCollapsed(false)} title="Mostrar players">
                  🎵 Players
                </button>
              ) : (
                <button className="dual-players-toggle" onClick={() => setPlayersCollapsed(true)} title="Ocultar players">
                  ▴ Ocultar
                </button>
              )}
              <YouTubePlayer
                key={`yt-original-${currentSong.id}`}
                videoId={currentSong.originalId}
                mode="original"
                label="Música Original"
                songTitle={currentSong.title}
                songArtist={currentSong.artist}
                songKey={currentKey}
                onPick={(vid) => pickAudioForSong('original', vid)}
              />
              <YouTubePlayer
                key={`yt-playback-${currentSong.id}`}
                videoId={currentSong.playbackId}
                mode="playback"
                label="Playback"
                songTitle={currentSong.title}
                songArtist={currentSong.artist}
                songKey={currentKey}
                onPick={(vid) => pickAudioForSong('playback', vid)}
                onPlayingChange={setPlaybackActive}
              />
            </div>

            {voiceScroll && (
              <div className="scroll-control voice-control">
                <button className="scroll-btn" onClick={toggleVoiceScroll}>■</button>
                <span className="scroll-label">🎤 Voz</span>
                <input type="range" min="1" max="5" value={voiceScrollSpeed} onChange={e => setVoiceScrollSpeed(Number(e.target.value))} className="scroll-slider" />
                <span className="scroll-speed">{voiceScrollSpeed}</span>
              </div>
            )}

            {activeSetlist && (
              <div className="setlist-nav">
                <button className="sn-btn" onClick={() => navigateInSetlist(-1)} disabled={currentInSetlist <= 0}>◀ Anterior</button>
                <span className="sn-label">{currentInSetlist + 1} / {setlistSongs.length}</span>
                <button className="sn-btn" onClick={() => navigateInSetlist(1)} disabled={currentInSetlist < 0 || currentInSetlist >= setlistSongs.length - 1}>Próxima ▶</button>
              </div>
            )}

            <div className={`strum-bar-wrap${!showStrumBar ? ' strum-bar-collapsed' : ''}`}>
              <StrumBar
                song={currentSong}
                isPlaying={isPlaying}
                activeStep={activeStep}
                onPlayToggle={toggleMetro}
                onBpmChange={setBpm}
              />
            </div>

            {autoScroll && (
              <div className="scroll-control">
                <button className="scroll-btn" onClick={toggleAutoScroll}>■</button>
                <span className="scroll-label">Rolagem</span>
                <input type="range" min="1" max="5" value={scrollSpeed} onChange={e => setScrollSpeed(Number(e.target.value))} className="scroll-slider" />
                <span className="scroll-speed">{scrollSpeed}</span>
              </div>
            )}

            <div id="content" ref={contentRef} className={viewMode !== '1' ? `view-cols-${viewMode}` : ''}>
              <SongView key={currentSong.id} song={currentSong} transpose={transpose} viewMode={viewMode} studyMode={studyMode} currentKey={currentKey} onToggleFavorite={handleToggleFavorite} onExport={handleShare} />
            </div>
          </>
        ) : screen === 'setlists' ? (
          <>
            <div className="topbar">
              <div className="topbar-title">📋 Repertórios</div>
              <button className={`tbtn premium-tbtn ${isPremium ? 'is-premium' : ''}`} onClick={() => setShowPremium(true)} title={isPremium ? 'Premium Ativo' : 'Apoiar o App'}>{isPremium ? '⭐' : '☕'}</button>
              <button className="tbtn" onClick={createSetlist}>＋</button>
            </div>
            <div id="content">
              <MobileSetlistList
                setlists={setlists}
                onSelect={sl => { setActiveSetlist(sl); setScreen('setlist-view') }}
                onCreate={createSetlist}
              />
            </div>
            <div className="keyboard-hint">Crie repertórios para seus ensaios e shows</div>
          </>
        ) : screen === 'setlist-view' && activeSetlist ? (
          <>
            <div className="topbar">
              {renamingSetlist === activeSetlist.id ? (
                <input className="rename-input" ref={renameRef} value={renameValue} onChange={e => setRenameValue(e.target.value)} onBlur={renameSetlistConfirm} onKeyDown={e => { if (e.key === 'Enter') renameSetlistConfirm(); if (e.key === 'Escape') setRenamingSetlist(null) }} autoFocus />
              ) : (
                <>
                  <button className="tbtn" onClick={() => setScreen('setlists')}>←</button>
                  <div className="topbar-title" onClick={() => renameSetlistStart(activeSetlist)} style={{cursor:'pointer'}}>{activeSetlist.name}</div>
                </>
              )}
              <button className="tbtn" onClick={() => { setScreen('view'); if (setlistSongs[0]) handleSelect(setlistSongs[0]) }}>▶</button>
              <button className="tbtn" onClick={() => deleteSetlist(activeSetlist.id)}>🗑</button>
            </div>
            <div id="content">
              {setlistSongs.length === 0 ? (
                <div className="empty-list">Repertório vazio.<br />Adicione músicas pelo botão 📋 ao lado de cada música.</div>
              ) : (
                <div className="song-list">
                  {setlistSongs.map((s, i) => (
                    <div key={s.id} className="song-card">
                      <span className="setlist-idx">{i + 1}.</span>
                      <div className="song-card-info" onClick={() => handleSelect(s)}>
                        <div className="song-card-name">{s.title}</div>
                        {s.artist && <div className="song-card-artist">{s.artist}</div>}
                      </div>
                      <span className="song-card-key">{s.key}</span>
                      <button className="song-card-del" onClick={() => moveSongInSetlist(activeSetlist.id, s.id, -1)}>▲</button>
                      <button className="song-card-del" onClick={() => moveSongInSetlist(activeSetlist.id, s.id, 1)}>▼</button>
                      <button className="song-card-del" onClick={() => removeSongFromSetlist(s.id, activeSetlist.id)}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="topbar">
              <div className="topbar-title">🎸 songpcmusic</div>
              <button className={`tbtn premium-tbtn ${isPremium ? 'is-premium' : ''}`} onClick={() => setShowPremium(true)} title={isPremium ? 'Premium Ativo' : 'Apoiar o App'}>{isPremium ? '⭐' : '☕'}</button>
              <button className="tbtn" onClick={() => setShowModal(true)}>＋</button>
            </div>
            <div id="content" style={{paddingTop:8}}>
              {welcome ? (
                <div className="welcome">
                  <div className="welcome-icon">♫</div>
                  <h2>Suas Cifras</h2>
                  <p>Busque cifras de músicas online ou adicione manualmente.</p>
                </div>
              ) : (
                <>
                  <div className="search-bar">
                    <span className="search-bar-icon">🔍</span>
                    <input placeholder="Filtrar músicas..." value={filter} onChange={e => setFilter(e.target.value)} />
                    <button
                      className={`fav-filter-btn ${showFavorites ? 'active' : ''}`}
                      onClick={() => setShowFavorites(v => !v)}
                      title={showFavorites ? 'Mostrar todas' : 'Mostrar apenas favoritas'}
                    >
                      {showFavorites ? '★' : '☆'}
                    </button>
                  </div>
                  {allCategories.length > 0 && (
                    <div className="cat-filter">
                      <button className={`cat-chip${!categoryFilter ? ' active' : ''}`} onClick={() => setCategoryFilter('')}>Todas</button>
                      {allCategories.map(c => (
                        <button key={c} className={`cat-chip${categoryFilter === c ? ' active' : ''}`} onClick={() => setCategoryFilter(c === categoryFilter ? '' : c)}>{c}</button>
                      ))}
                    </div>
                  )}
                  <div className="song-list">
                    {filtered.length === 0 ? (
                      <div className="empty-list">Nenhuma música encontrada.</div>
                    ) : (
                      filtered.map(s => (
                        <div key={s.id} className={`song-card${currentSong?.id === s.id ? ' active' : ''}`}>
                      <div className="song-card-info" onClick={() => handleSelect(s)}>
                        <div className="song-card-name">{s.favorite ? '★ ' : ''}{s.title}</div>
                        {s.artist && <div className="song-card-artist">{s.artist}</div>}
                      </div>
                      <span className="song-card-key">{s.key}</span>
                          <button className="song-card-del" onClick={e => { e.stopPropagation(); setAddToSetlistSong(s) }}>📋</button>
                          <button className="song-card-del" onClick={e => { e.stopPropagation(); handleDelete(s) }}>🗑</button>
                        </div>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="keyboard-hint">
              {songs.length > 0 ? 'Toque em uma música para ver a cifra' : 'Adicione músicas com o botão ＋'}
            </div>
          </>
        )}
      </div>

      {/* ─── BOTTOM NAV ─── */}
      <div className="bottom-nav mobile-only">
        <div className="nav-brand">
          <span className="nav-brand-main">PauloC</span>
          <span className="nav-brand-r">®</span>
        </div>
        <div className="nav-items">
          <div className={`nav-item${screen === 'songs' ? ' active' : ''}`} onClick={() => { setScreen('songs'); stopMetro(); setActiveSetlist(null) }}>
            <span className="nav-icon-wrap"><span className="nav-icon">♫</span></span>
            <span className="nav-label">Músicas</span>
          </div>
          <div className={`nav-item${screen === 'setlists' || screen === 'setlist-view' ? ' active' : ''}`} onClick={() => { setScreen('setlists'); stopMetro() }}>
            <span className="nav-icon-wrap"><span className="nav-icon">📋</span></span>
            <span className="nav-label">Repertórios</span>
          </div>
          <div className={`nav-item profile-btn${isPremium ? ' is-premium' : ''}`} onClick={() => { if (authUser) { setShowPremium(true) } else { setShowAuth(true); setAuthMode('login') } }}>
            <span className="nav-icon-wrap">
              {authUser ? (
                <span className="nav-avatar">{authUser.name.charAt(0).toUpperCase()}</span>
              ) : (
                <span className="nav-icon">🔑</span>
              )}
              {isPremium && <span className="nav-premium-badge">⭐</span>}
            </span>
            <span className="nav-label">{authUser ? (authUser.name.split(' ')[0].slice(0, 8)) : 'Entrar'}</span>
          </div>
        </div>
      </div>

      {showModal && <Modal onAdd={handleAdd} onClose={() => setShowModal(false)} />}

      {showEditor && currentSong && (
        <div className="modal-bg" onClick={() => setShowEditor(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:600,margin:'auto',borderRadius:20}}>
            <div className="modal-head">
              <span className="modal-title">Editar Cifra</span>
              <button className="modal-close" onClick={() => setShowEditor(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{display:'flex',gap:10,marginBottom:12}}>
                <input className="form-input" style={{flex:1,marginBottom:0}} value={currentSong.title} disabled />
                <span className="song-card-key">{currentSong.key}</span>
              </div>
              <textarea
                className="form-textarea"
                style={{minHeight:300}}
                value={editRawText}
                onChange={e => setEditRawText(e.target.value)}
              />
              <div className="form-note">Edite a cifra e clique em Salvar.</div>

              <div style={{marginTop:14, paddingTop:14, borderTop:'1px solid var(--border)'}}>
                <div style={{fontSize:'0.85rem', fontWeight:600, color:'var(--text-dim)', marginBottom:8}}>🎵 Áudio</div>
                <div style={{display:'flex', flexDirection:'column', gap:6}}>
                  <div style={{fontSize:'0.8rem', color:'var(--text-dim)'}}>
                    🎤 Original: <strong>{currentSong.originalId ? '✅ Configurado' : '❌ Não configurado'}</strong>
                  </div>
                  <div style={{fontSize:'0.8rem', color:'var(--text-dim)'}}>
                    🎵 Playback: <strong>{currentSong.playbackId ? '✅ Configurado' : '❌ Não configurado'}</strong>
                  </div>
                </div>
                <div className="form-note">Toque em 🔍 nos players acima para buscar áudio automaticamente.</div>
              </div>

              <button className="form-submit" onClick={saveEdit} style={{marginTop:14}}>Salvar</button>
            </div>
          </div>
        </div>
      )}

      {addToSetlistSong && (
        <div className="modal-bg" onClick={() => setAddToSetlistSong(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:400,margin:'auto',borderRadius:20}}>
            <div className="modal-head">
              <span className="modal-title">Adicionar a repertório</span>
              <button className="modal-close" onClick={() => setAddToSetlistSong(null)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{marginBottom:12,fontSize:'0.9rem',color:'var(--text-dim)'}}>
                "{addToSetlistSong.title}" em qual repertório?
              </p>
              {setlists.length === 0 ? (
                <p style={{textAlign:'center',color:'var(--text-muted)',padding:20}}>Nenhum repertório ainda.<br />Crie um primeiro.</p>
              ) : (
                setlists.map(sl => (
                  <div key={sl.id} className="result-card" onClick={() => addSongToSetlist(addToSetlistSong.id, sl.id)}>
                    <div className="result-card-title">📋 {sl.name}</div>
                    <div className="result-card-meta">{sl.songIds.length} músicas</div>
                  </div>
                ))
              )}
              <button className="form-submit" onClick={() => { createSetlist(); setAddToSetlistSong(null) }}>＋ Novo Repertório</button>
            </div>
          </div>
        </div>
      )}

      {showCreateSetlist && (
        <div className="modal-bg" onClick={() => setShowCreateSetlist(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{maxWidth:360,margin:'auto',borderRadius:20}}>
            <div className="modal-head">
              <span className="modal-title">Novo Repertório</span>
              <button className="modal-close" onClick={() => setShowCreateSetlist(false)}>✕</button>
            </div>
            <div className="modal-body">
              <input
                className="rename-input"
                style={{width:'100%',marginBottom:12}}
                placeholder="Nome do repertório"
                value={createSetlistName}
                onChange={e => setCreateSetlistName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') createSetlistConfirm(); if (e.key === 'Escape') setShowCreateSetlist(false) }}
                autoFocus
              />
              <button className="form-submit" onClick={createSetlistConfirm}>Criar</button>
            </div>
          </div>
        </div>
      )}

      {showTuner && <Tuner onClose={closeTuner} />}

      {showPremium && (
        <div className="modal-bg" onClick={() => setShowPremium(false)}>
          <div className="modal premium-modal" onClick={e => e.stopPropagation()} style={{maxWidth:440,margin:'auto',borderRadius:20}}>
            <div className="modal-head">
              <div className="modal-title">
                <span style={{fontSize:'1.3rem',marginRight:6}}>{isPremium ? '⭐' : '☕'}</span>
                {isPremium ? 'Você é Premium!' : (authUser ? 'Apoie o Cifras App' : 'Crie sua Conta')}
              </div>
              <button className="modal-close" onClick={() => setShowPremium(false)}>✕</button>
            </div>
            <div className="modal-body" style={{padding:'20px 24px 24px'}}>
              {!authUser ? (
                <>
                  <div className="premium-hero">
                    <div className="premium-hero-icon">🎸</div>
                    <p className="premium-tagline">O app completo para violão que você sempre quis</p>
                    <p style={{fontSize:'0.8rem',color:'var(--text-dim)',marginTop:4}}>7 dias grátis — sem cartão</p>
                  </div>

                  <div className="premium-perks">
                    <div className="premium-perk">
                      <span className="premium-perk-icon">🎵</span>
                      <div>
                        <strong>Cifras + Afinador + Metrônomo</strong>
                        <small>Tudo que você precisa para tocar</small>
                      </div>
                    </div>
                    <div className="premium-perk">
                      <span className="premium-perk-icon">☁️</span>
                      <div>
                        <strong>Backup na Nuvem</strong>
                        <small>Sincronize suas músicas entre dispositivos</small>
                      </div>
                    </div>
                    <div className="premium-perk">
                      <span className="premium-perk-icon">📋</span>
                      <div>
                        <strong>Repertórios Ilimitados</strong>
                        <small>Organize suas músicas por show ou ocasião</small>
                      </div>
                    </div>
                    <div className="premium-perk">
                      <span className="premium-perk-icon">🎧</span>
                      <div>
                        <strong>Player YouTube Integrado</strong>
                        <small>Original e playback lado a lado com a cifra</small>
                      </div>
                    </div>
                  </div>

                  <button className="premium-cta" onClick={() => { setShowPremium(false); setShowAuth(true); setAuthMode('register') }}>
                    🚀 Testar Grátis por 7 Dias
                  </button>
                  <button className="premium-skip" onClick={() => { setShowPremium(false); setShowAuth(true); setAuthMode('login') }}>
                    Já tenho conta — Entrar
                  </button>

                  <div className="premium-footer-note">
                    💜 Feito com carinho por <strong>PauloC®</strong> · R$ 24,90/mês após o trial
                  </div>
                </>
              ) : !isPremium ? (
                <>
                  <div className="premium-hero">
                    <div className="premium-hero-icon">⭐</div>
                    <p className="premium-tagline">Olá, <strong>{authUser.name}</strong>! Desbloqueie o Premium</p>
                    <p style={{fontSize:'0.8rem',color:'var(--text-dim)',marginTop:4}}>Apenas <strong>R$ 24,90/mês</strong> — cancele quando quiser</p>
                  </div>

                  <div className="premium-perks">
                    <div className="premium-perk">
                      <span className="premium-perk-icon">☁️</span>
                      <div>
                        <strong>Backup na Nuvem</strong>
                        <small>Sincronize suas músicas entre dispositivos</small>
                      </div>
                    </div>
                    <div className="premium-perk">
                      <span className="premium-perk-icon">📋</span>
                      <div>
                        <strong>Repertórios Ilimitados</strong>
                        <small>Organize por show, culto ou ocasião</small>
                      </div>
                    </div>
                    <div className="premium-perk">
                      <span className="premium-perk-icon">🎧</span>
                      <div>
                        <strong>Player YouTube Integrado</strong>
                        <small>Original e playback junto com a cifra</small>
                      </div>
                    </div>
                    <div className="premium-perk">
                      <span className="premium-perk-icon">⚡</span>
                      <div>
                        <strong>Novas Funções Primeiro</strong>
                        <small>Acesso antecipado a tudo que vier</small>
                      </div>
                    </div>
                  </div>

                  <button className="premium-cta" onClick={handleSubscribe}>
                    💳 Assinar Premium — R$ 24,90/mês
                  </button>

                  <div className="premium-pix">
                    <div className="premium-pix-label">Ou faça um PIX avulso de qualquer valor</div>
                    {pixData?.qr_code_base64 ? (
                      <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:8,marginTop:8}}>
                        <img src={`data:image/png;base64,${pixData.qr_code_base64}`} alt="QR Code PIX" style={{width:200,height:200,background:'#fff',padding:8,borderRadius:8}} />
                        <div className="premium-pix-key" onClick={() => { navigator.clipboard?.writeText(pixData.qr_code); showToast('Código PIX copiado!') }}>
                          <code style={{fontSize:'0.7rem',wordBreak:'break-all'}}>{pixData.qr_code}</code>
                          <span className="premium-pix-copy">📋</span>
                        </div>
                        <small className="premium-pix-hint">Toque no código para copiar · valor R$ {Number(pixData.amount).toFixed(2).replace('.', ',')}</small>
                      </div>
                    ) : (
                      <button className="premium-skip" onClick={() => handleGeneratePix(24.90)} disabled={pixLoading} style={{marginTop:6}}>
                        {pixLoading ? '⏳ Gerando...' : '🪙 Gerar QR Code PIX (R$ 24,90)'}
                      </button>
                    )}
                  </div>

                  <button className="premium-skip" onClick={() => setShowPremium(false)}>
                    Talvez depois
                  </button>

                  <div className="premium-footer-note">
                    Conectado como <strong>{authUser.email}</strong> · <button className="link-btn" onClick={handleLogout}>Sair</button>
                  </div>
                </>
              ) : authUser.trialEnd && !authUser.premiumSince ? (
                <>
                  <div className="premium-hero premium-hero-active">
                    <div className="premium-hero-icon">🎉</div>
                    <p className="premium-tagline"><strong>{authUser.name}</strong>, você está no período grátis!</p>
                    <p className="premium-thanks">
                      {authUser.trialDays > 0
                        ? `Faltam ${authUser.trialDays} dia${authUser.trialDays !== 1 ? 's' : ''} de teste grátis. Aproveite todos os recursos Premium!`
                        : 'Seu período grátis terminou. Assine para continuar com acesso Premium.'}
                    </p>
                  </div>

                  <div className="premium-perks">
                    <div className="premium-perk premium-perk-active">
                      <span className="premium-perk-icon">☁️</span>
                      <div>
                        <strong>Backup na Nuvem</strong>
                        <small>✓ Ativo</small>
                      </div>
                    </div>
                    <div className="premium-perk premium-perk-active">
                      <span className="premium-perk-icon">🎨</span>
                      <div>
                        <strong>Temas Exclusivos</strong>
                        <small>✓ Ativo</small>
                      </div>
                    </div>
                    <div className="premium-perk premium-perk-active">
                      <span className="premium-perk-icon">📋</span>
                      <div>
                        <strong>Repertórios Ilimitados</strong>
                        <small>✓ Ativo</small>
                      </div>
                    </div>
                    <div className="premium-perk premium-perk-active">
                      <span className="premium-perk-icon">⚡</span>
                      <div>
                        <strong>Acesso Antecipado</strong>
                        <small>✓ Ativo</small>
                      </div>
                    </div>
                  </div>

                  {authUser.trialDays <= 0 ? (
                    <button className="premium-cta" onClick={handleSubscribe}>
                      💳 Assinar Premium — R$ 24,90/mês
                    </button>
                  ) : (
                    <div style={{textAlign:'center',padding:'12px 0',fontSize:'0.85rem',color:'var(--text-dim)'}}>
                      Seu trial vai até <strong>{new Date(authUser.trialEnd).toLocaleDateString('pt-BR')}</strong>
                    </div>
                  )}

                  <div className="premium-footer-note">
                    Conectado como <strong>{authUser.email}</strong> · <button className="link-btn" onClick={handleLogout}>Sair</button>
                  </div>
                </>
              ) : (
                <>
                  <div className="premium-hero premium-hero-active">
                    <div className="premium-hero-icon">⭐</div>
                    <p className="premium-tagline">{authUser.name}, você apoia o <strong>Cifras App</strong></p>
                    <p className="premium-thanks">Muito obrigado! Sua contribuição ajuda a manter o app vivo e em constante evolução.</p>
                    {authUser.premiumSince && (
                      <p className="premium-thanks" style={{fontSize:'0.8rem',marginTop:4}}>
                        Assinante desde {new Date(authUser.premiumSince).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>

                  <div className="premium-perks">
                    <div className="premium-perk premium-perk-active">
                      <span className="premium-perk-icon">☁️</span>
                      <div>
                        <strong>Backup na Nuvem</strong>
                        <small>✓ Ativo</small>
                      </div>
                    </div>
                    <div className="premium-perk premium-perk-active">
                      <span className="premium-perk-icon">🎨</span>
                      <div>
                        <strong>Temas Exclusivos</strong>
                        <small>✓ Ativo</small>
                      </div>
                    </div>
                    <div className="premium-perk premium-perk-active">
                      <span className="premium-perk-icon">📋</span>
                      <div>
                        <strong>Repertórios Ilimitados</strong>
                        <small>✓ Ativo</small>
                      </div>
                    </div>
                    <div className="premium-perk premium-perk-active">
                      <span className="premium-perk-icon">⚡</span>
                      <div>
                        <strong>Acesso Antecipado</strong>
                        <small>✓ Ativo</small>
                      </div>
                    </div>
                  </div>

                  <div style={{display:'flex',flexDirection:'column',gap:6,marginTop:12}}>
                    <a
                      href="https://www.mercadopago.com.br/subscriptions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="premium-skip"
                      style={{textDecoration:'none',textAlign:'center'}}
                    >
                      ⚙️ Gerenciar no Mercado Pago
                    </a>
                    <button className="premium-skip" onClick={handleCancelSubscription} style={{color:'#f06d8a'}}>
                      ❌ Cancelar assinatura
                    </button>
                  </div>

                  <div className="premium-footer-note">
                    Conectado como <strong>{authUser.email}</strong> · <button className="link-btn" onClick={handleLogout}>Sair</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showAuth && <AuthModal mode={authMode} setMode={setAuthMode} onAuth={handleAuth} onClose={() => setShowAuth(false)} />}

      <ConfirmDialog
        message="Remover música?"
        subMessage={confirmDelete ? `"${confirmDelete.title}"` : ''}
        onConfirm={confirmDeleteSong}
        onCancel={() => setConfirmDelete(null)}
      />
      <Toast message={toast} />
    </div>
    </ErrorBoundary>
  )
}

function SetlistList({ setlists, onSelect, onCreate }) {
  return (
    <div className="sidebar-songs">
      <button className="sidebar-add-btn" onClick={onCreate}>＋ Novo Repertório</button>
      {setlists.length === 0 ? (
        <div className="empty-list">Nenhum repertório.<br />Crie um para organizar suas músicas.</div>
      ) : (
        setlists.map(sl => (
          <div key={sl.id} className="song-card" onClick={() => onSelect(sl)}>
            <div className="song-card-info">
              <div className="song-card-name">📋 {sl.name}</div>
              <div className="song-card-artist">{sl.songIds.length} músicas</div>
            </div>
            <span className="song-card-key">▶</span>
          </div>
        ))
      )}
    </div>
  )
}

function MobileSetlistList({ setlists, onSelect, onCreate }) {
  return (
    <div>
      <button className="msearch-btn" style={{width:'100%',marginBottom:12}} onClick={onCreate}>＋ Novo Repertório</button>
      {setlists.length === 0 ? (
        <div className="empty-list">Nenhum repertório ainda.<br />Crie um para organizar suas músicas.</div>
      ) : (
        <div className="song-list">
          {setlists.map(sl => (
            <div key={sl.id} className="song-card" onClick={() => onSelect(sl)}>
              <div className="song-card-info">
                <div className="song-card-name">📋 {sl.name}</div>
                <div className="song-card-artist">{sl.songIds.length} músicas</div>
              </div>
              <span className="song-card-key">▶</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
