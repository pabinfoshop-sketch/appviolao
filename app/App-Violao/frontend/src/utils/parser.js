function isChordLine(line) {
  return /^[A-G][#b]?(m|dim|aug|sus|maj|M)?[0-9]*(?:\/[A-G][#b]?)?(?:\s+[A-G][#b]?(m|dim|aug|sus|maj|M)?[0-9]*(?:\/[A-G][#b]?)?)*\s*$/.test(line.trim())
}

function mergeChordsWithLyrics(chordLine, lyricLine) {
  const rawChords = chordLine.match(/[A-G][#b]?(m|dim|aug|sus|maj|M)?[0-9]*(?:\/[A-G][#b]?)?/g) || []
  if (!rawChords.length) return lyricLine

  // Deduplicate consecutive identical chords
  const chords = rawChords.filter((c, i) => i === 0 || c !== rawChords[i - 1])

  const words = lyricLine.split(/(\s+)/).filter(w => w)
  const wordCount = words.length
  const chordCount = chords.length

  if (wordCount === 0) {
    return chords.map(c => `[${c}]`).join('')
  }

  const base = Math.floor(wordCount / chordCount)
  const extra = wordCount % chordCount

  let result = ''
  let wordIdx = 0

  for (let i = 0; i < chordCount; i++) {
    const n = base + (i < extra ? 1 : 0)
    let group = ''
    for (let j = 0; j < n && wordIdx < wordCount; j++) {
      group += words[wordIdx]
      wordIdx++
    }
    const lead = group.match(/^(\s+)/)?.[1] || ''
    const body = group.slice(lead.length)
    result += lead
    result += `[${chords[i]}]`
    result += body
  }

  return result
}

export function parseCifraText(text, title, key, rhythm) {
  const rawText = text
  const rawLines = text.split('\n')
  let pendingChords = null
  const processed = []

  for (const raw of rawLines) {
    const l = raw.trim()
    if (!l) {
      if (pendingChords) processed.push({ text: '', raw: '' })
      pendingChords = null
      processed.push({ text: '', raw: '' })
      continue
    }
    if (isChordLine(l)) {
      pendingChords = l
    } else {
      const raw = pendingChords ? pendingChords + '\n' + l : ''
      if (pendingChords) {
        processed.push({ text: mergeChordsWithLyrics(pendingChords, l), raw })
        pendingChords = null
      } else {
        processed.push({ text: l, raw: '' })
      }
    }
  }
  if (pendingChords) processed.push({ text: '', raw: '' })

  const sections = []
  let curSection = null, curLines = []

  function flushSection() {
    if (curSection && curLines.length) {
      sections.push({ type: curSection.type, label: curSection.label, lines: curLines })
    }
    curLines = []
  }

  for (const entry of processed) {
    const l = entry.text.trim()
    const isRefrao = /refr[aã]o|coro/i.test(l)
    const isBridge = /bridge|ponte/i.test(l)
    const isVerso = /^(verso|estrofe)\s*\d*/i.test(l)
    const isSepLine = /^[-—–=✦♪]+$/.test(l)
    const isBlank = l === ''

    if (isRefrao || isBridge || isVerso || isSepLine) {
      flushSection()
      const label = isRefrao ? 'Refrão' : isBridge ? 'Ponte' : isVerso ? l : `Verso ${sections.length + 1}`
      curSection = { type: isRefrao ? 'refrao' : 'verso', label }
      continue
    }

    if (isBlank) {
      if (curLines.length && !curSection) {
        flushSection()
        curSection = { type: 'verso', label: `Verso ${sections.length + 1}` }
      }
      continue
    }

    if (!curSection) curSection = { type: 'verso', label: `Verso ${sections.length + 1}` }

    const groups = parseGroups(entry.text)
    if (entry.raw) {
      groups.forEach(g => { g.raw = entry.raw })
    }
    if (groups.length) curLines.push(groups)
  }

  flushSection()
  return {
    id: Date.now(),
    title,
    key,
    rhythm: rhythm || 'Hino 4/4',
    bpm: 80,
    meta: '',
    artist: '',
    category: '',
    favorite: false,
    rawText,
    sections,
  }
}

function parseGroups(line) {
  if (!/\[/.test(line)) return line.trim() ? [{ chord: '', word: line, raw: '' }] : []
  const re = /\[([A-G][#b]?(?:m|maj|min|dim|aug|sus|add)?[0-9]*(?:\/[A-G][#b]?)?)\]([^\[]*)/g
  let m, groups = []
  const pre = line.substring(0, line.indexOf('['))
  if (pre.trim()) groups.push({ chord: '', word: pre, raw: '' })
  while ((m = re.exec(line)) !== null) groups.push({ chord: m[1], word: m[2], raw: '' })
  return groups
}
