import { useEffect, useRef, useState } from 'react'

let apiReady = null

function loadYT() {
  if (apiReady) return apiReady
  apiReady = new Promise(resolve => {
    if (window.YT && window.YT.Player) { resolve(window.YT); return }
    const s = document.createElement('script')
    s.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(s)
    window.onYouTubeIframeAPIReady = () => resolve(window.YT)
  })
  return apiReady
}

export default function YouTubePlayer({
  videoId,
  mode,
  label,
  songTitle,
  songArtist,
  songKey,
  onPick,
  onPlayingChange,
}) {
  const containerRef = useRef(null)
  const playerRef = useRef(null)
  const readyRef = useRef(false)
  const videoRef = useRef(videoId || null)
  const [internalId, setInternalId] = useState(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [duration, setDuration] = useState(0)
  const [curTime, setCurTime] = useState(0)
  const [volume, setVolume] = useState(80)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState([])
  const [searchError, setSearchError] = useState('')
  const [lastQuery, setLastQuery] = useState('')
  const [useKey, setUseKey] = useState(false)

  const vid = videoId || internalId

  useEffect(() => {
    if (videoId) setInternalId(null)
  }, [videoId])

  // Cria o player apenas quando houver videoId
  useEffect(() => {
    if (!vid) return
    let mounted = true
    loadYT().then(YT => {
      if (!mounted || !containerRef.current) return
      if (playerRef.current) {
        try { playerRef.current.destroy() } catch {}
        playerRef.current = null
      }
      readyRef.current = false
      setIsReady(false)
      videoRef.current = vid
      playerRef.current = new YT.Player(containerRef.current, {
        height: '1',
        width: '1',
        videoId: vid,
        playerVars: {
          controls: 0,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
          disablekb: 1,
          fs: 0,
          playsinline: 1,
          autoplay: 0,
        },
        events: {
          onReady: e => {
            if (!mounted) return
            readyRef.current = true
            try { e.target.setVolume(volume) } catch {}
            try { setDuration(e.target.getDuration() || 0) } catch { setDuration(0) }
            setCurTime(0)
            setIsReady(true)
          },
          onStateChange: e => {
            if (!mounted) return
            const YT = window.YT
            if (e.data === YT.PlayerState.PLAYING) {
              setIsPlaying(true)
              onPlayingChange?.(true)
            } else if (e.data === YT.PlayerState.PAUSED || e.data === YT.PlayerState.CUED) {
              setIsPlaying(false)
              onPlayingChange?.(false)
            } else if (e.data === YT.PlayerState.ENDED) {
              setIsPlaying(false)
              onPlayingChange?.(false)
            } else if (e.data === YT.PlayerState.BUFFERING) {
              // buffering
            }
          },
          onError: () => {
            if (!mounted) return
            setIsReady(false)
            setIsPlaying(false)
          },
        },
      })
    })
    return () => { mounted = false; if (playerRef.current) { try { playerRef.current.destroy() } catch {}; playerRef.current = null } }
  }, [vid])

  // Sincroniza o player com o videoId atual
  useEffect(() => {
    if (!playerRef.current || !readyRef.current) return
    const id = vid
    videoRef.current = id
    if (id) {
      try {
        playerRef.current.cueVideoById(id)
        setIsPlaying(false)
        onPlayingChange?.(false)
        try { setDuration(playerRef.current.getDuration() || 0) } catch { setDuration(0) }
        setCurTime(0)
      } catch (e) {
        console.warn('YT cueVideoById error:', e)
      }
    }
  }, [vid])

  useEffect(() => {
    if (!isPlaying || !playerRef.current) return
    const interval = setInterval(() => {
      try { setCurTime(playerRef.current.getCurrentTime()) } catch {}
    }, 500)
    return () => clearInterval(interval)
  }, [isPlaying])

  useEffect(() => {
    if (isReady && playerRef.current) {
      try { playerRef.current.setVolume(volume) } catch {}
    }
  }, [volume, isReady])

  const togglePlay = () => {
    if (!playerRef.current) return
    try {
      if (isPlaying) playerRef.current.pauseVideo()
      else playerRef.current.playVideo()
    } catch {}
  }

  const restart = () => {
    if (!playerRef.current) return
    try {
      playerRef.current.seekTo(0, true)
      playerRef.current.playVideo()
    } catch {}
  }

  const handleSeek = e => {
    if (!playerRef.current) return
    try { playerRef.current.seekTo(parseFloat(e.target.value), true); setCurTime(parseFloat(e.target.value)) } catch {}
  }

  const handleVolume = e => setVolume(parseInt(e.target.value))

  const runSearch = async () => {
    setSearchOpen(true)
    setSearching(true)
    setResults([])
    setSearchError('')
    if (!songTitle) { setSearching(false); setSearchError('Sem música para buscar.'); return }
    const key = useKey ? (songKey || '') : ''
    try {
      const res = await fetch('/api/audio/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: songTitle, artist: songArtist || '', type: mode, key }),
      })
      const data = await res.json()
      setResults(data.results || [])
      setLastQuery(data.query || '')
      if (!data.results?.length) setSearchError('Nenhum resultado. Tente outra opção.')
    } catch {
      setSearchError('Falha na busca.')
    } finally {
      setSearching(false)
    }
  }

  const pickResult = r => {
    setInternalId(r.id)
    setSearchOpen(false)
    setResults([])
    setSearchError('')
    onPick?.(r.id)
  }

  const fmt = s => { s = Math.floor(s || 0); return `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}` }

  const dl = label || (mode === 'playback' ? 'Playback' : 'Original')
  const di = mode === 'playback' ? '🎵' : '🎤'

  return (
    <div className={`dual-player-row mode-${mode}${isPlaying ? ' playing' : ''}`}>
      <div ref={containerRef}
        style={{position:'absolute',width:1,height:1,opacity:0,pointerEvents:'none',left:'-9999px',top:'-9999px',overflow:'hidden',visibility:'hidden'}} />
      <div className="dual-player-bar">
        <span className="dual-player-icon">{di}</span>
        <span className="dual-player-label">{dl}</span>
        <button className="dual-player-btn play" onClick={togglePlay}
          disabled={!vid || !isReady}
          title={isPlaying ? 'Pausar' : 'Tocar'}>{isPlaying ? '⏸' : '▶'}</button>
        <button className="dual-player-btn" onClick={restart}
          disabled={!vid || !isReady} title="Reiniciar">🔄</button>
        <button className="dual-player-btn" onClick={runSearch} title="Buscar">🔍</button>
      </div>
      {vid ? (
        <div className="dual-player-progress-row">
          <span className="dual-player-time">{fmt(curTime)}</span>
          <input type="range" min="0" max={duration || 0} step="0.1"
            value={curTime} onChange={handleSeek}
            className="dual-player-seek" disabled={!isReady} />
          <span className="dual-player-time">{fmt(duration)}</span>
          <span className="dual-player-vol-icon">🔊</span>
          <input type="range" min="0" max="100" value={volume}
            onChange={handleVolume} className="dual-player-vol" title="Volume" />
        </div>
      ) : !searchOpen && (
        <div className="dual-player-status">Toque em 🔍 para carregar</div>
      )}
      {searchOpen && (
        <div className="dual-player-search">
          <div className="dual-player-search-head">
            <span>🔍 Buscar {dl}</span>
            <button onClick={() => setSearchOpen(false)}>✕</button>
          </div>
          <div className="dual-player-search-options">
            <label className="dual-player-opt">
              <input type="checkbox" checked={useKey} onChange={e => setUseKey(e.target.checked)} />
              <span>🔑 Incluir tom{songKey ? ` (${songKey})` : ''}</span>
            </label>
            {lastQuery && <span className="dual-player-search-q">{lastQuery.length > 30 ? lastQuery.slice(0,30)+'…' : lastQuery}</span>}
            <button className="dual-player-opt-btn" onClick={runSearch} disabled={searching}>🔄 Outras</button>
          </div>
          {searching ? (
            <div className="dual-player-search-msg"><div className="dual-player-spinner">⏳</div>Buscando...</div>
          ) : results.length === 0 ? (
            <div className="dual-player-search-msg">
              <div style={{fontSize:'1.4rem',marginBottom:6}}>😕</div>
              {searchError || 'Nenhum resultado.'}
              <div className="dual-player-search-hint">Tente marcar "Incluir tom" ou "🔄 Outras".</div>
            </div>
          ) : (
            <div className="dual-player-search-list">
              {results.map((r,i) => (
                <div key={r.id} className="dual-player-search-item" onClick={() => pickResult(r)}>
                  <span className="dual-player-search-idx">{i+1}</span>
                  <div className="dual-player-search-info">
                    <div className="dual-player-search-title">{r.title}</div>
                    <div className="dual-player-search-meta">{r.artist} · {fmt(r.duration)}</div>
                  </div>
                  <span className="dual-player-search-pick">▶</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}