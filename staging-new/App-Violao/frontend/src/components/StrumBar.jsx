import { STRUM_PRESETS } from '../utils/chords'

export default function StrumBar({ song, isPlaying, activeStep, onPlayToggle, onBpmChange }) {
  const p = STRUM_PRESETS[song?.rhythm] || STRUM_PRESETS['Hino 4/4']

  return (
    <div className="strum-bar">
      <span className="strum-label">Batida</span>
      <div className="strum-pattern">
        {p.s.map((s, i) => {
          let sym = '·', cls = 'rest'
          if (s === 'D') { sym = '↓'; cls = 'dn' }
          else if (s === 'U') { sym = '↑'; cls = 'up' }
          else if (s === 'X') { sym = '⬇'; cls = 'rest' }
          return (
            <div key={i} className={`sarrow ${cls}${activeStep === i ? ' active' : ''}`}>
              <span className="sarrow-sym">{sym}</span>
              <span className="sarrow-beat">{p.b[i] || ''}</span>
            </div>
          )
        })}
      </div>
      <div className="strum-sep" />
      <div className="bpm-row">
        <span className="strum-label">BPM</span>
        <input
          className="bpm-in"
          type="number"
          value={song?.bpm || p.bpm}
          min={30}
          max={240}
          onChange={e => onBpmChange?.(parseInt(e.target.value) || 80)}
        />
        <button
          className={`play-btn${isPlaying ? ' playing' : ''}`}
          onClick={onPlayToggle}
        >
          {isPlaying ? '■ Parar' : '► Tocar'}
        </button>
      </div>
      {song?.rhythm && <span className="rhythm-tag">{song.rhythm}</span>}
    </div>
  )
}
