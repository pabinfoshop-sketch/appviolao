import { useState, useMemo, useEffect } from 'react'
import { transposeChord } from '../utils/chords'
import { STRUM_PRESETS } from '../utils/chords'
import { simplifyChord, getChordVariants } from '../utils/chordDiagrams'
import ChordDiagram from './ChordDiagram'

function isTabLine(text) {
  return /^[EeADGB]\|[:=.\-0-9|()hps/\\]*\|?\s*$/.test(text.trim())
}

export default function SongView({ song, transpose, viewMode, studyMode, currentKey, onToggleFavorite, onExport }) {
  const [showChords, setShowChords] = useState(false)
  const [simplified, setSimplified] = useState(false)
  const [hideTab, setHideTab] = useState(false)
  const [chordPopup, setChordPopup] = useState(null) // { chord, x, y }

  if (!song) return null

  const chordColors = {}
  let colorIdx = 0
  const getChordColor = chord => {
    if (!chordColors[chord]) {
      const hues = [330, 280, 200, 160, 30, 0]
      chordColors[chord] = hues[colorIdx % hues.length]
      colorIdx++
    }
    return chordColors[chord]
  }

  const transposeChordStr = ch => {
    if (!ch) return ''
    const t = transposeChord(ch, transpose)
    return simplified ? simplifyChord(t) : t
  }

  // Extrai todos os acordes únicos da música (após transposição)
  const uniqueChords = useMemo(() => {
    const set = new Set()
    const collect = lines => {
      for (const line of lines || []) {
        for (const g of line) {
          const ch = Array.isArray(g) ? g[0] : g.chord
          if (ch) {
            const tc = transposeChordStr(ch)
            if (tc) set.add(tc)
          }
        }
      }
    }
    for (const sec of song.sections || []) {
      for (const line of sec.lines || []) collect([line])
    }
    return Array.from(set)
  }, [song, transpose, simplified])

  // Verifica se a cifra tem tablatura
  const hasTab = (song.sections || []).some(sec =>
    /tab/i.test(sec.label) || (sec.lines || []).some(line =>
      line.some(g => {
        const wd = Array.isArray(g) ? g[1] : g.word
        return wd && isTabLine(wd)
      })
    )
  )

  if (viewMode === '4') {
    return renderMusicianView(song, getChordColor, chordPopup, setChordPopup, simplified, setSimplified, transposeChordStr, onToggleFavorite)
  }

  const rhythm = song.rhythm || 'Hino 4/4'
  const p = STRUM_PRESETS[rhythm] || STRUM_PRESETS['Hino 4/4']
  const strumDisplay = p ? p.s.map(s => s === 'D' ? '↓' : s === 'U' ? '↑' : s === 'X' ? '✕' : '·').join(' ') : ''

  const header = (
    <div className="song-header">
      <div className="stitle-row">
        <div className="stitle">{song.title}</div>
        <button
          className={`fav-btn ${song.favorite ? 'active' : ''}`}
          onClick={() => onToggleFavorite && onToggleFavorite(song.id)}
          title={song.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
        >
          {song.favorite ? '★' : '☆'}
        </button>
      </div>
      {song.artist && <div style={{fontSize:'0.85rem',color:'var(--text-dim)',marginBottom:4}}>{song.artist}</div>}
      <div className="smeta">
        Tom Original: <strong>{song.key}</strong>
        {transpose !== 0 && ` · Transposto: ${transposeChord(song.key, transpose)}`}
      </div>
      {uniqueChords.length > 0 && (
        <button
          className={`chord-list-toggle ${showChords ? 'open' : ''}`}
          onClick={() => setShowChords(p => !p)}
        >
          <span className="chord-list-toggle-icon">{showChords ? '▾' : '▸'}</span>
          <span>🎵 Acordes ({uniqueChords.length})</span>
        </button>
      )}
      <button
        className={`chord-list-toggle ${simplified ? 'open' : ''}`}
        onClick={() => setSimplified(p => !p)}
        title={simplified ? 'Mostrando versão simplificada' : 'Mostrar todos os acordes'}
        style={{ marginTop: 4 }}
      >
        <span className="chord-list-toggle-icon">{simplified ? '✓' : '○'}</span>
        <span>📝 Cifra Simplificada</span>
      </button>
      {hasTab && (
        <button
          className={`chord-list-toggle ${hideTab ? 'open' : ''}`}
          onClick={() => setHideTab(p => !p)}
          style={{ marginTop: 4 }}
          title={hideTab ? 'Mostrar tablatura' : 'Ocultar tablatura'}
        >
          <span className="chord-list-toggle-icon">{hideTab ? '✓' : '○'}</span>
          <span>🎸 Tab</span>
        </button>
      )}
      <button
        className="chord-list-toggle"
        onClick={() => onExport && onExport()}
        style={{ marginTop: 4 }}
        title="Exportar cifra"
      >
        <span className="chord-list-toggle-icon">📤</span>
        <span>Exportar</span>
      </button>
      {showChords && (
        <div className="chord-list-grid">
          {uniqueChords.map(ch => (
            <ChordDiagram key={ch} chord={ch} size="sm" onClick={() => setChordPopup({ chord: ch })} />
          ))}
        </div>
      )}
      <div className="song-rhythm-info">
        <span>{rhythm}</span>
        <span className="strum-inline">{strumDisplay}</span>
        <span className="bpm-inline">{song.bpm || p?.bpm || 80} BPM</span>
      </div>
    </div>
  )

  const transposeInStr = str =>
    str.replace(/[A-G][#b]?(m|dim|aug|sus|maj|M)?[0-9]*(?:\/[A-G][#b]?)?/g, m => transposeChordStr(m))

  const renderChordLine = (rawChordLine, key) => {
    const colored = []
    let idx = 0
    let lastChord = ''
    while (idx < rawChordLine.length) {
      const match = rawChordLine.slice(idx).match(/^[A-G][#b]?(m|dim|aug|sus|maj|M)?[0-9]*(?:\/[A-G][#b]?)?/)
      if (match) {
        const ch = match[0]
        if (ch !== lastChord) {
          colored.push(
            <span key={idx} className="ss-chord" style={{color:`hsl(${getChordColor(ch)},80%,65%)`}} onClick={() => setChordPopup({ chord: ch })}>{ch}</span>
          )
          lastChord = ch
        } else {
          colored.push(<span key={idx} className="ss-space">{' '.repeat(ch.length)}</span>)
        }
        idx += ch.length
      } else {
        colored.push(<span key={idx} className="ss-space">{rawChordLine[idx]}</span>)
        idx++
      }
    }
    return colored
  }

  return (
    <>
      {header}
      {studyMode && (
        <div className="study-info">
          <div className="study-row">
            <span className="study-item">🎵 Tom: <strong>{song.key}</strong>{transpose !== 0 && <> → <strong>{currentKey}</strong></>}</span>
            <span className="study-item">🥁 <strong>{rhythm}</strong></span>
            <span className="study-item">⏱ <strong>{song.bpm || p?.bpm || 80}</strong> BPM</span>
          </div>
          {strumDisplay && <div className="study-strum">{strumDisplay}</div>}
        </div>
      )}
      <div className="song-sections">
        {(song.sections || []).filter(sec => !hideTab || !/tab/i.test(sec.label)).map((sec, i) => {
          const isRef = sec.type === 'refrao'
          const lines = (sec.lines || []).filter(line =>
            !hideTab || !line.some(g => {
              const wd = Array.isArray(g) ? g[1] : g.word
              return wd && isTabLine(wd)
            })
          )
          if (lines.length === 0) return null
          const body = (
            <div className="lyric-block">
              {lines.map((line, li) => (
                <div key={li} className="lyric-line">
                  {line.map((g, gi) => {
                    const ch = Array.isArray(g) ? g[0] : g.chord
                    const wd = Array.isArray(g) ? g[1] : g.word
                    const tc = transposeChordStr(ch)
                    return (
                      <span key={gi} className="wg">
                        {tc ? (
                          <span
                            className="ch ch-clickable"
                            style={{ color: `hsl(${getChordColor(ch)}, 80%, 65%)` }}
                            onClick={() => setChordPopup({ chord: tc })}
                          >{tc}</span>
                        ) : (
                          <span className="ch" style={{ minHeight: '1.2em', display: 'inline-block' }}></span>
                        )}
                        <span className="wd">{wd}</span>
                      </span>
                    )
                  })}
                </div>
              ))}
            </div>
          )
          return (
            <div key={i} className="sec-block">
              <div className="sec-label">{sec.label}</div>
              {isRef ? <div className="refrao-box">{body}</div> : body}
            </div>
          )
        })}
      </div>
      {chordPopup && (
        <ChordPopup chord={chordPopup.chord} onClose={() => setChordPopup(null)} />
      )}
    </>
  )
}

function ChordPopup({ chord, onClose }) {
  const [variantIdx, setVariantIdx] = useState(0)
  const variants = getChordVariants(chord)
  const hasMultiple = variants.length > 1

  useEffect(() => { setVariantIdx(0) }, [chord])

  if (variants.length === 0) {
    return (
      <div className="chord-popup-bg" onClick={onClose}>
        <div className="chord-popup" onClick={e => e.stopPropagation()}>
          <div className="chord-popup-title">
            <span>{chord}</span>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
          <ChordDiagram chord={chord} size="md" />
        </div>
      </div>
    )
  }

  const v = variants[variantIdx]
  const diagramData = { ...v, label: chord, root: chord, suffix: '', bass: '' }

  return (
    <div className="chord-popup-bg" onClick={onClose}>
      <div className="chord-popup chord-popup-variants" onClick={e => e.stopPropagation()}>
        <div className="chord-popup-title">
          <span>{chord}</span>
          {hasMultiple && (
            <span className="chord-popup-variant-info">{v.label}</span>
          )}
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <ChordDiagram chordData={diagramData} size="lg" />
        {hasMultiple && (
          <div className="chord-popup-actions">
            <button
              className="chord-popup-cycle-btn"
              onClick={() => setVariantIdx((variantIdx + 1) % variants.length)}
              title="Ver outras posições deste acorde"
            >
              ↻ Outras posições ({variantIdx + 1}/{variants.length})
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function renderMusicianView(song, getChordColor, chordPopup, setChordPopup, simplified, setSimplified, transposeChordStr, onToggleFavorite) {
  const transposeInStr = str =>
    str.replace(/[A-G][#b]?(m|dim|aug|sus|maj|M)?[0-9]*(?:\/[A-G][#b]?)?/g, m => transposeChordStr(m))

  return (
    <>
      <div className="song-header">
        <div className="stitle-row">
          <div className="stitle">{song.title}</div>
          <button
            className={`fav-btn ${song.favorite ? 'active' : ''}`}
            onClick={() => onToggleFavorite && onToggleFavorite(song.id)}
            title={song.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          >
            {song.favorite ? '★' : '☆'}
          </button>
        </div>
        {song.artist && <div style={{fontSize:'0.85rem',color:'var(--text-dim)',marginBottom:4}}>{song.artist}</div>}
        <div className="smeta">
          Tom Original: <strong>{song.key}</strong>
        </div>
        <button
          className={`chord-list-toggle ${simplified ? 'open' : ''}`}
          onClick={() => setSimplified(p => !p)}
          title={simplified ? 'Mostrando versão simplificada' : 'Mostrar todos os acordes'}
          style={{ marginTop: 4 }}
        >
          <span className="chord-list-toggle-icon">{simplified ? '✓' : '○'}</span>
          <span>📝 Cifra Simplificada</span>
        </button>
      </div>
      <div className="song-sections">
        {(song.sections || []).map((sec, i) => {
          const isRef = sec.type === 'refrao'
          const lines = []

          for (const line of sec.lines || []) {
            let rawChordLine = ''
            let rawLyricLines = []
            let hasRaw = false

            for (const g of line) {
              const raw = (!Array.isArray(g) && g.raw) ? g.raw : ''
              if (raw) {
                hasRaw = true
                const parts = raw.split('\n')
                rawChordLine = parts[0] || ''
                rawLyricLines = parts.slice(1).filter(Boolean)
                break
              }
            }

            if (!hasRaw) {
              const text = line.map(g => Array.isArray(g) ? g[1] : g.word).join('')
              lines.push(
                <div key={lines.length} className="ms-line">
                  <div className="ms-empty" />
                  <div className="ms-lyric">{text}</div>
                </div>
              )
              continue
            }

            const chordStr = transposeInStr(rawChordLine)
            const colored = []
            let i = 0
            let lastChord = ''
            while (i < chordStr.length) {
              const match = chordStr.slice(i).match(/^[A-G][#b]?(m|dim|aug|sus|maj|M)?[0-9]*(?:\/[A-G][#b]?)?/)
              if (match) {
                const ch = match[0]
                if (ch !== lastChord) {
                  colored.push(
                    <span
                      key={i}
                      className="ms-chord ms-chord-clickable"
                      style={{color: `hsl(${getChordColor(ch)}, 80%, 65%)`}}
                      onClick={() => setChordPopup && setChordPopup({ chord: ch })}
                    >{ch}</span>
                  )
                  lastChord = ch
                } else {
                  colored.push(<span key={i} className="ms-space">{' '.repeat(ch.length)}</span>)
                }
                i += ch.length
              } else {
                colored.push(<span key={i} className="ms-space">{chordStr[i]}</span>)
                i++
              }
            }

            if (rawLyricLines.length === 0) rawLyricLines = ['']
            for (const lyricLine of rawLyricLines) {
              lines.push(
                <div key={lines.length} className="ms-line">
                  <div className="ms-chords">{colored}</div>
                  <div className="ms-lyric">{lyricLine}</div>
                </div>
              )
            }
          }

          const body = <div className="ms-block">{lines}</div>
          return (
            <div key={i} className="sec-block">
              <div className="sec-label">{sec.label}</div>
              {isRef ? <div className="refrao-box">{body}</div> : body}
            </div>
          )
        })}
      </div>
      {chordPopup && (
        <ChordPopup chord={chordPopup.chord} onClose={() => setChordPopup(null)} />
      )}
    </>
  )
}
