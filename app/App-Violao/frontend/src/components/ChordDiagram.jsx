import { getChordDiagram } from '../utils/chordDiagrams'

// Visualiza um diagrama de acorde para violão
// Aceita: chord (string) OU chordData (objeto variante), size, onClick
export default function ChordDiagram({ chord, chordData, size = 'md', onClick }) {
  const diagram = chordData || getChordDiagram(chord)
  if (!diagram) {
    return (
      <div className={`chord-diagram chord-diagram-${size} chord-diagram-unknown`} onClick={onClick}>
        <div className="chord-diagram-label">{chord || '?'}</div>
      </div>
    )
  }

  const { fingers, baseFret, barres, label } = diagram
  const numFrets = 4
  const w = size === 'sm' ? 60 : size === 'lg' ? 130 : 95
  const h = size === 'sm' ? 80 : size === 'lg' ? 160 : 120
  const stringSpacing = (w - 20) / 5
  const fretSpacing = (h - 30) / numFrets
  const dotR = size === 'sm' ? 4 : size === 'lg' ? 7 : 5.5

  return (
    <div className={`chord-diagram chord-diagram-${size}`} onClick={onClick}>
      <div className="chord-diagram-label">{label || chord}</div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="100%" style={{ display: 'block' }}>
        {/* Fundo */}
        <rect x="10" y="20" width={w - 20} height={fretSpacing * numFrets} fill="none" stroke="var(--border)" strokeWidth="0.5" rx="2" />

        {/* Casa inicial (se for > 1) */}
        {baseFret > 1 && (
          <text x="6" y={20 + fretSpacing * 0.7} fontSize="8" fill="var(--text-dim)">
            {baseFret}ª
          </text>
        )}

        {/* Trastes (linhas horizontais) */}
        {Array.from({ length: numFrets + 1 }).map((_, i) => (
          <line
            key={`fret-${i}`}
            x1="10"
            y1={20 + i * fretSpacing}
            x2={w - 10}
            y2={20 + i * fretSpacing}
            stroke="var(--text-dim)"
            strokeWidth={i === 0 && baseFret === 1 ? 1.8 : 0.7}
            opacity={i === 0 && baseFret === 1 ? 0.9 : 0.5}
          />
        ))}

        {/* Cordas (linhas verticais) */}
        {Array.from({ length: 6 }).map((_, i) => (
          <line
            key={`string-${i}`}
            x1={10 + i * stringSpacing}
            y1="20"
            x2={10 + i * stringSpacing}
            y2={20 + fretSpacing * numFrets}
            stroke="var(--text-dim)"
            strokeWidth="0.6"
            opacity="0.6"
          />
        ))}

        {/* Pestanas (barres) */}
        {barres && barres.map((b, i) => {
          const y = 20 + (b.fret - baseFret + 0.5) * fretSpacing
          const x1 = 10 + Math.min(b.from, b.to) * stringSpacing
          const x2 = 10 + Math.max(b.from, b.to) * stringSpacing
          return (
            <rect
              key={`barre-${i}`}
              x={x1 - 5}
              y={y - dotR}
              width={x2 - x1 + 10}
              height={dotR * 2}
              rx={dotR}
              fill="var(--accent)"
              opacity="0.85"
            />
          )
        })}

        {/* Dedos / Notas */}
        {fingers.map((fret, i) => {
          const x = 10 + i * stringSpacing
          if (fret === -1) {
            // Corda não tocada (X)
            return (
              <text
                key={`mute-${i}`}
                x={x}
                y={14}
                fontSize={size === 'sm' ? 7 : 9}
                textAnchor="middle"
                fill="var(--text-muted)"
                opacity="0.7"
              >
                ✕
              </text>
            )
          }
          if (fret === 0) {
            // Corda solta (O)
            return (
              <circle
                key={`open-${i}`}
                cx={x}
                cy={14 - 2}
                r={dotR * 0.7}
                fill="none"
                stroke="var(--text-dim)"
                strokeWidth="1"
                opacity="0.8"
              />
            )
          }
          // Casa pressionada
          const y = 20 + (fret - baseFret + 0.5) * fretSpacing
          return (
            <circle
              key={`finger-${i}`}
              cx={x}
              cy={y}
              r={dotR}
              fill="var(--accent)"
              opacity="0.9"
            />
          )
        })}
      </svg>
    </div>
  )
}
