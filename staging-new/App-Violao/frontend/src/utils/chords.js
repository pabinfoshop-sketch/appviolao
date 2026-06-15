const CHROMATIC = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
const ENHARMONIC = { Db: 'C#', Eb: 'D#', Gb: 'F#', Ab: 'G#', Bb: 'A#' }

export function transposeChord(chord, n) {
  if (!chord) return ''
  return chord.replace(/[A-G][#b]?/g, m => {
    const k = ENHARMONIC[m] || m
    const i = CHROMATIC.indexOf(k)
    return i < 0 ? m : CHROMATIC[((i + n) % 12 + 12) % 12]
  })
}

export const STRUM_PRESETS = {
  Valsa:    { s: ['D', '', 'D', 'U', '', 'U'],         b: ['1', '', '2', '+', '', ''],     bpm: 72 },
  Marcha:   { s: ['D', 'D', 'U', 'D', 'U'],            b: ['1', '+', '2', '+', ''],        bpm: 90 },
  'Hino 4/4': { s: ['D', '', 'U', 'D', 'U', '', 'D', 'U'], b: ['1', 'e', '+', '2', '+', 'a', '3', '+'], bpm: 80 },
  Baião:    { s: ['D', 'X', 'U', 'D', 'X', 'U'],       b: ['1', '+', '2', '+', '3', '+'],  bpm: 100 },
  Bolero:   { s: ['D', '', 'D', 'U', 'D', 'U'],        b: ['1', '', '2', '+', '3', '+'],   bpm: 68 },
  Outro:    { s: ['D', 'U', 'D', 'U'],                  b: ['1', '+', '2', '+'],           bpm: 80 },
}
