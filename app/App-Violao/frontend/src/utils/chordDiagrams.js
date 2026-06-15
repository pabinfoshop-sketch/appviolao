// Diagramas de acordes para violão (6 cordas, padrão EADGBE)
// fret: número da casa no topo (0 = pestano aberta)
// fingers: [c1, c2, c3, c4, c5, c6] - casa em cada corda (0 = solta, -1 = não toca, número = casa)
// baseFret: casa inicial do diagrama (1 = primeira casa)
// Cada acorde pode ter múltiplas variantes (posições diferentes no braço)

const _ = {
  // MAIORES
  'C': [
    { baseFret: 1, fingers: [-1, 3, 2, 0, 1, 0], barres: [], label: 'Aberto' },
    { baseFret: 3, fingers: [-1, 5, 5, 5, 5, 3], barres: [{ fret: 3, from: 2, to: 5 }], label: 'Pestana 3ª' },
    { baseFret: 5, fingers: [1, 3, 3, -1, 1, -1], barres: [], label: 'Forma A' },
    { baseFret: 8, fingers: [-1, 10, 10, 9, 8, 8], barres: [{ fret: 8, from: 4, to: 6 }], label: 'Pestana 8ª' },
  ],
  'C#': [
    { baseFret: 1, fingers: [-1, -1, 3, 1, 2, 1], barres: [{ fret: 1, from: 4, to: 6 }], label: 'Pestano 1ª' },
    { baseFret: 4, fingers: [-1, 6, 6, 6, 6, 4], barres: [{ fret: 4, from: 2, to: 5 }], label: 'Pestano 4ª' },
  ],
  'Db': [
    { baseFret: 1, fingers: [-1, -1, 3, 1, 2, 1], barres: [{ fret: 1, from: 4, to: 6 }], label: 'Pestano 1ª' },
  ],
  'D': [
    { baseFret: 1, fingers: [-1, -1, 0, 2, 3, 2], barres: [], label: 'Aberto' },
    { baseFret: 5, fingers: [5, 7, 7, 7, 5, 5], barres: [{ fret: 5, from: 1, to: 5 }], label: 'Pestano 5ª' },
    { baseFret: 10, fingers: [-1, 12, 12, 11, 10, 10], barres: [{ fret: 10, from: 4, to: 6 }], label: 'Pestano 10ª' },
  ],
  'D#': [
    { baseFret: 1, fingers: [-1, -1, 1, 3, 4, 3], barres: [{ fret: 3, from: 4, to: 6 }], label: 'Pestano 3ª' },
    { baseFret: 6, fingers: [6, 8, 8, 8, 6, 6], barres: [{ fret: 6, from: 1, to: 5 }], label: 'Pestano 6ª' },
  ],
  'Eb': [
    { baseFret: 1, fingers: [-1, -1, 1, 3, 4, 3], barres: [{ fret: 3, from: 4, to: 6 }], label: 'Pestano 3ª' },
  ],
  'E': [
    { baseFret: 1, fingers: [0, 2, 2, 1, 0, 0], barres: [], label: 'Aberto' },
    { baseFret: 4, fingers: [-1, 6, 6, 6, 6, 4], barres: [{ fret: 4, from: 2, to: 5 }], label: 'Pestano 4ª' },
    { baseFret: 7, fingers: [7, 9, 9, 9, 7, 7], barres: [{ fret: 7, from: 1, to: 5 }], label: 'Pestano 7ª' },
  ],
  'F': [
    { baseFret: 1, fingers: [-1, -1, 3, 2, 1, 1], barres: [{ fret: 1, from: 3, to: 6 }], label: 'Pestano 1ª' },
    { baseFret: 5, fingers: [5, 7, 7, 7, 5, 5], barres: [{ fret: 5, from: 1, to: 5 }], label: 'Mini-F' },
    { baseFret: 8, fingers: [-1, 10, 10, 10, 8, 8], barres: [{ fret: 8, from: 2, to: 5 }], label: 'Pestano 8ª' },
  ],
  'F#': [
    { baseFret: 2, fingers: [-1, -1, 4, 3, 2, 2], barres: [{ fret: 2, from: 3, to: 6 }], label: 'Pestano 2ª' },
    { baseFret: 6, fingers: [6, 8, 8, 8, 6, 6], barres: [{ fret: 6, from: 1, to: 5 }], label: 'Mini-F#' },
  ],
  'Gb': [
    { baseFret: 2, fingers: [-1, -1, 4, 3, 2, 2], barres: [{ fret: 2, from: 3, to: 6 }], label: 'Pestano 2ª' },
  ],
  'G': [
    { baseFret: 1, fingers: [3, 2, 0, 0, 0, 3], barres: [], label: 'Aberto' },
    { baseFret: 3, fingers: [3, 5, 5, 4, 3, 3], barres: [{ fret: 3, from: 1, to: 6 }], label: 'Pestano 3ª' },
    { baseFret: 5, fingers: [-1, 7, 7, 7, 5, 5], barres: [{ fret: 5, from: 2, to: 5 }], label: 'Forma C' },
    { baseFret: 10, fingers: [10, 12, 12, 12, 10, 10], barres: [{ fret: 10, from: 1, to: 5 }], label: 'Pestano 10ª' },
  ],
  'G#': [
    { baseFret: 1, fingers: [-1, -1, -1, 1, 1, 1], barres: [{ fret: 1, from: 3, to: 5 }], label: 'Pestano 1ª' },
    { baseFret: 4, fingers: [4, 6, 6, 6, 4, 4], barres: [{ fret: 4, from: 1, to: 5 }], label: 'Pestano 4ª' },
  ],
  'Ab': [
    { baseFret: 1, fingers: [-1, -1, -1, 1, 1, 1], barres: [{ fret: 1, from: 3, to: 5 }], label: 'Pestano 1ª' },
  ],
  'A': [
    { baseFret: 1, fingers: [-1, 0, 2, 2, 2, 0], barres: [], label: 'Aberto' },
    { baseFret: 5, fingers: [5, 7, 7, 6, 5, 5], barres: [{ fret: 5, from: 1, to: 6 }], label: 'Pestano 5ª' },
    { baseFret: 12, fingers: [-1, 14, 14, 14, 14, 12], barres: [{ fret: 12, from: 2, to: 6 }], label: 'Pestano 12ª' },
  ],
  'A#': [
    { baseFret: 1, fingers: [-1, 1, 3, 3, 3, 1], barres: [{ fret: 1, from: 2, to: 6 }], label: 'Pestano 1ª' },
    { baseFret: 6, fingers: [6, 8, 8, 8, 6, 6], barres: [{ fret: 6, from: 1, to: 5 }], label: 'Mini-A#' },
  ],
  'Bb': [
    { baseFret: 1, fingers: [-1, 1, 3, 3, 3, 1], barres: [{ fret: 1, from: 2, to: 6 }], label: 'Pestano 1ª' },
    { baseFret: 6, fingers: [6, 8, 8, 8, 6, 6], barres: [{ fret: 6, from: 1, to: 5 }], label: 'Mini-Bb' },
  ],
  'B': [
    { baseFret: 1, fingers: [-1, 2, 4, 4, 4, 2], barres: [{ fret: 2, from: 2, to: 6 }], label: 'Pestano 2ª' },
    { baseFret: 7, fingers: [7, 9, 9, 8, 7, 7], barres: [{ fret: 7, from: 1, to: 6 }], label: 'Pestano 7ª' },
  ],

  // MENORES
  'Cm': [
    { baseFret: 1, fingers: [-1, 3, 5, 5, 4, 3], barres: [{ fret: 3, from: 2, to: 6 }], label: 'Pestano 3ª' },
    { baseFret: 3, fingers: [-1, 5, 5, 5, 4, 3], barres: [{ fret: 3, from: 2, to: 5 }], label: 'Mini-Cm' },
  ],
  'C#m': [
    { baseFret: 1, fingers: [-1, -1, 2, 1, 2, 0], barres: [], label: 'Aberto' },
    { baseFret: 4, fingers: [-1, 6, 6, 6, 5, 4], barres: [{ fret: 4, from: 2, to: 5 }], label: 'Pestano 4ª' },
  ],
  'Dm': [
    { baseFret: 1, fingers: [-1, -1, 0, 2, 3, 1], barres: [], label: 'Aberto' },
    { baseFret: 5, fingers: [5, 7, 7, 7, 5, 5], barres: [{ fret: 5, from: 1, to: 5 }], label: 'Pestano 5ª' },
  ],
  'D#m': [
    { baseFret: 1, fingers: [-1, -1, 1, 3, 4, 2], barres: [{ fret: 3, from: 3, to: 5 }], label: 'Pestano 3ª' },
  ],
  'Ebm': [
    { baseFret: 1, fingers: [-1, -1, 1, 3, 4, 2], barres: [{ fret: 3, from: 3, to: 5 }], label: 'Pestano 3ª' },
  ],
  'Em': [
    { baseFret: 1, fingers: [0, 2, 2, 0, 0, 0], barres: [], label: 'Aberto' },
    { baseFret: 4, fingers: [-1, 6, 6, 6, 4, 4], barres: [{ fret: 4, from: 2, to: 5 }], label: 'Pestano 4ª' },
    { baseFret: 7, fingers: [7, 9, 9, 9, 7, 7], barres: [{ fret: 7, from: 1, to: 5 }], label: 'Pestano 7ª' },
  ],
  'Fm': [
    { baseFret: 1, fingers: [-1, -1, 3, 1, 1, 1], barres: [{ fret: 1, from: 3, to: 6 }], label: 'Pestano 1ª' },
    { baseFret: 5, fingers: [5, 7, 7, 5, 5, 5], barres: [{ fret: 5, from: 1, to: 6 }], label: 'Mini-Fm' },
  ],
  'F#m': [
    { baseFret: 2, fingers: [-1, -1, 4, 2, 2, 2], barres: [{ fret: 2, from: 3, to: 6 }], label: 'Pestano 2ª' },
    { baseFret: 6, fingers: [6, 8, 8, 6, 6, 6], barres: [{ fret: 6, from: 1, to: 6 }], label: 'Mini-F#m' },
  ],
  'Gm': [
    { baseFret: 3, fingers: [3, 5, 5, 3, 3, 3], barres: [{ fret: 3, from: 1, to: 6 }], label: 'Pestano 3ª' },
    { baseFret: 5, fingers: [-1, 7, 7, 5, 5, 5], barres: [{ fret: 5, from: 2, to: 6 }], label: 'Mini-Gm' },
  ],
  'G#m': [
    { baseFret: 4, fingers: [-1, -1, -1, 1, 2, 1], barres: [], label: 'Aberto' },
  ],
  'Am': [
    { baseFret: 1, fingers: [-1, 0, 2, 2, 1, 0], barres: [], label: 'Aberto' },
    { baseFret: 5, fingers: [5, 7, 7, 5, 5, 5], barres: [{ fret: 5, from: 1, to: 6 }], label: 'Pestano 5ª' },
    { baseFret: 12, fingers: [-1, 14, 14, 12, 12, 12], barres: [{ fret: 12, from: 2, to: 6 }], label: 'Pestano 12ª' },
  ],
  'A#m': [
    { baseFret: 1, fingers: [-1, 1, 3, 3, 2, 1], barres: [{ fret: 1, from: 2, to: 6 }], label: 'Pestano 1ª' },
  ],
  'Bm': [
    { baseFret: 1, fingers: [-1, 2, 4, 4, 3, 2], barres: [{ fret: 2, from: 2, to: 6 }], label: 'Pestano 2ª' },
    { baseFret: 7, fingers: [7, 9, 9, 7, 7, 7], barres: [{ fret: 7, from: 1, to: 6 }], label: 'Mini-Bm' },
  ],

  // 7ª
  'C7': [
    { baseFret: 1, fingers: [-1, 3, 2, 3, 1, 0], barres: [], label: 'Aberto' },
    { baseFret: 3, fingers: [-1, 5, 4, 5, 3, 3], barres: [], label: 'Forma A' },
  ],
  'D7': [
    { baseFret: 1, fingers: [-1, -1, 0, 2, 1, 2], barres: [], label: 'Aberto' },
    { baseFret: 5, fingers: [5, 7, 5, 7, 5, 5], barres: [], label: 'Pestano 5ª' },
  ],
  'E7': [
    { baseFret: 1, fingers: [0, 2, 0, 1, 0, 0], barres: [], label: 'Aberto' },
    { baseFret: 4, fingers: [-1, 6, 4, 6, 4, 4], barres: [], label: 'Pestano 4ª' },
  ],
  'F7': [
    { baseFret: 1, fingers: [-1, -1, 3, 2, 1, 0], barres: [], label: 'Aberto' },
    { baseFret: 5, fingers: [5, 7, 5, 7, 5, 5], barres: [{ fret: 5, from: 1, to: 5 }], label: 'Pestano 5ª' },
  ],
  'G7': [
    { baseFret: 1, fingers: [3, 2, 0, 0, 0, 1], barres: [], label: 'Aberto' },
    { baseFret: 3, fingers: [3, 5, 3, 4, 3, 3], barres: [{ fret: 3, from: 1, to: 6 }], label: 'Pestano 3ª' },
  ],
  'A7': [
    { baseFret: 1, fingers: [-1, 0, 2, 0, 2, 0], barres: [], label: 'Aberto' },
    { baseFret: 5, fingers: [5, 7, 5, 6, 5, 5], barres: [{ fret: 5, from: 1, to: 6 }], label: 'Pestano 5ª' },
  ],
  'B7': [
    { baseFret: 1, fingers: [-1, 2, 1, 2, 0, 2], barres: [], label: 'Aberto' },
    { baseFret: 7, fingers: [7, 9, 7, 9, 7, 7], barres: [{ fret: 7, from: 1, to: 5 }], label: 'Pestano 7ª' },
  ],

  // 7ª menor
  'Am7': [
    { baseFret: 1, fingers: [-1, 0, 2, 0, 1, 0], barres: [], label: 'Aberto' },
    { baseFret: 5, fingers: [5, 7, 5, 5, 5, 5], barres: [{ fret: 5, from: 1, to: 6 }], label: 'Pestano 5ª' },
  ],
  'Bm7': [
    { baseFret: 1, fingers: [-1, 2, 0, 2, 0, 2], barres: [], label: 'Aberto' },
    { baseFret: 7, fingers: [7, 9, 7, 7, 7, 7], barres: [{ fret: 7, from: 1, to: 6 }], label: 'Pestano 7ª' },
  ],
  'Cm7': [
    { baseFret: 1, fingers: [-1, 3, 5, 3, 4, 3], barres: [{ fret: 3, from: 2, to: 6 }], label: 'Pestano 3ª' },
  ],
  'Dm7': [
    { baseFret: 1, fingers: [-1, -1, 0, 2, 1, 1], barres: [], label: 'Aberto' },
    { baseFret: 5, fingers: [5, 7, 5, 7, 5, 5], barres: [{ fret: 5, from: 1, to: 5 }], label: 'Pestano 5ª' },
  ],
  'Em7': [
    { baseFret: 1, fingers: [0, 2, 0, 0, 0, 0], barres: [], label: 'Aberto' },
  ],
  'Fm7': [
    { baseFret: 1, fingers: [-1, -1, 3, 1, 1, 1], barres: [{ fret: 1, from: 3, to: 6 }], label: 'Pestano 1ª' },
  ],
  'Gm7': [
    { baseFret: 1, fingers: [-1, -1, -1, 2, 3, 1], barres: [], label: 'Aberto' },
    { baseFret: 3, fingers: [3, 5, 3, 3, 3, 3], barres: [{ fret: 3, from: 1, to: 6 }], label: 'Pestano 3ª' },
  ],

  // Sus e outros
  'Csus': [
    { baseFret: 1, fingers: [-1, 3, 3, 0, 1, 0], barres: [], label: 'Aberto' },
    { baseFret: 3, fingers: [-1, 5, 5, 6, 5, 3], barres: [], label: 'Pestano 3ª' },
  ],
  'Dsus': [
    { baseFret: 1, fingers: [-1, -1, 0, 2, 3, 3], barres: [], label: 'Aberto' },
    { baseFret: 5, fingers: [5, 5, 7, 7, 5, 5], barres: [], label: 'Pestano 5ª' },
  ],
  'Esus': [
    { baseFret: 1, fingers: [0, 2, 2, 2, 0, 0], barres: [], label: 'Aberto' },
  ],
  'Gsus': [
    { baseFret: 1, fingers: [3, 3, 0, 0, 1, 3], barres: [], label: 'Aberto' },
    { baseFret: 3, fingers: [3, 5, 5, 5, 3, 3], barres: [{ fret: 3, from: 1, to: 6 }], label: 'Pestano 3ª' },
  ],
  'Asus': [
    { baseFret: 1, fingers: [-1, 0, 2, 2, 3, 0], barres: [], label: 'Aberto' },
    { baseFret: 5, fingers: [5, 7, 7, 7, 5, 5], barres: [{ fret: 5, from: 1, to: 5 }], label: 'Pestano 5ª' },
  ],

  // Dim
  'Cdim': [
    { baseFret: 1, fingers: [-1, 3, 4, 2, -1, -1], barres: [], label: 'Aberto' },
  ],
  'Ddim': [
    { baseFret: 1, fingers: [-1, -1, 0, 1, 3, 1], barres: [], label: 'Aberto' },
  ],

  // Maior com baixo
  'C/E': [
    { baseFret: 1, fingers: [0, 3, 2, 0, 1, 0], barres: [], label: 'Aberto' },
  ],
  'G/B': [
    { baseFret: 1, fingers: [-1, 2, 0, 0, 0, 3], barres: [], label: 'Aberto' },
  ],
  'D/F#': [
    { baseFret: 1, fingers: [2, -1, 0, 2, 3, 2], barres: [], label: 'Aberto' },
  ],
  'A/E': [
    { baseFret: 1, fingers: [0, 0, 2, 2, 2, 0], barres: [], label: 'Aberto' },
  ],
}

export const CHORD_DIAGRAMS = {}
for (const [name, variants] of Object.entries(_)) {
  CHORD_DIAGRAMS[name] = variants[0]
  CHORD_DIAGRAMS[name].variants = variants
  CHORD_DIAGRAMS[name].label = name
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

// Extrai a raiz do acorde (ex: "C#m7" => "C#", "F#m/A" => "F#")
export function getChordRoot(chord) {
  if (!chord) return ''
  const m = chord.match(/^([A-G][#b]?)/)
  return m ? m[1] : ''
}

// Extrai o sufixo (ex: "C#m7" => "m7", "F" => "")
export function getChordSuffix(chord) {
  if (!chord) return ''
  const m = chord.match(/^[A-G][#b]?(.*)$/)
  return m ? m[1] : ''
}

// Extrai a nota do baixo (ex: "C/E" => "E")
export function getChordBass(chord) {
  if (!chord) return ''
  const m = chord.match(/\/([A-G][#b]?)$/)
  return m ? m[1] : ''
}

// Retorna o diagrama para um acorde, ou null se não existir
export function getChordDiagram(chord) {
  if (!chord) return null
  const root = getChordRoot(chord)
  const suffix = getChordSuffix(chord)
  const bass = getChordBass(chord)

  const fullName = root + suffix
  if (CHORD_DIAGRAMS[fullName]) {
    const base = CHORD_DIAGRAMS[fullName]
    return { ...base, root, suffix, bass, label: fullName }
  }
  if (CHORD_DIAGRAMS[root]) {
    const base = CHORD_DIAGRAMS[root]
    return { ...base, root, suffix, bass, label: fullName }
  }
  return null
}

// Retorna todas as variantes (posições) de um acorde
export function getChordVariants(chord) {
  if (!chord) return []
  const root = getChordRoot(chord)
  const suffix = getChordSuffix(chord)
  const fullName = root + suffix

  let variants = CHORD_DIAGRAMS[fullName]?.variants
  if (!variants && CHORD_DIAGRAMS[root]?.variants) {
    variants = CHORD_DIAGRAMS[root].variants.map(v => ({ ...v, label: v.label + ' (pos. enraizada)' }))
  }
  return variants || []
}

// Simplifica acordes complexos para versões mais fáceis
// Ex: C#m7 -> C#m, D7sus -> D7, Cmaj7 -> C, C7#9 -> C7, D7(9) -> D7
export function simplifyChord(chord) {
  if (!chord) return ''
  const root = getChordRoot(chord)
  const bass = getChordBass(chord)

  let suffix = getChordSuffix(chord)
  if (!suffix) return root + (bass ? '/' + bass : '')

  suffix = suffix.replace(/\/[A-G][#b]?$/, '')
  suffix = suffix.replace(/\([^)]*\)/g, '')
  suffix = suffix.replace(/[#b]1[13]/g, '')
  suffix = suffix.replace(/[#b]9/g, '')
  suffix = suffix.replace(/[#b]5/g, '')

  suffix = suffix.replace(/m7b5/gi, 'm')
  suffix = suffix.replace(/dim7/gi, 'dim')
  suffix = suffix.replace(/maj7/gi, '')
  suffix = suffix.replace(/m7/gi, 'm')
  suffix = suffix.replace(/sus4/gi, 'sus')
  suffix = suffix.replace(/sus2/gi, 'sus')
  suffix = suffix.replace(/7sus/gi, '7')
  suffix = suffix.replace(/add\d+/gi, '')
  suffix = suffix.replace(/aug/gi, '')

  suffix = suffix.replace(/(\D|^)1[13]/g, '$1')
  suffix = suffix.replace(/(\D|^)9/g, '$1')
  suffix = suffix.replace(/(\D|^)11/g, '$1')
  suffix = suffix.replace(/(\D|^)13/g, '$1')

  // Remove 7 solto (vira tríade)
  suffix = suffix.replace(/(^|\D)7($|\D)/g, '$1$2').replace(/^7$/, '')

  suffix = suffix.replace(/maj/gi, '').replace(/M(?=\d|$)/g, '')
  suffix = suffix.replace(/^7m$/i, 'm')

  return root + suffix + (bass ? '/' + bass : '')
}

const CIRCLE_OF_FIFTHS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#', 'F']

export function detectKey(chords) {
  const freq = {}
  for (const c of chords) {
    const r = getChordRoot(c)
    if (r) freq[r] = (freq[r] || 0) + 1
  }
  let best = '', bestN = 0
  for (const [k, v] of Object.entries(freq)) {
    if (v > bestN) { best = k; bestN = v }
  }
  if (!best) return 'C'
  // Check if most chords with this root are minor
  let minor = 0, total = 0
  for (const c of chords) {
    if (getChordRoot(c) === best) {
      total++
      const s = getChordSuffix(c).toLowerCase()
      if (s.startsWith('m') && !s.startsWith('maj')) minor++
    }
  }
  return best + (minor > total / 2 ? 'm' : '')
}
