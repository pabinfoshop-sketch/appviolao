import { useState, useRef, useEffect } from 'react'

const STRINGS = [
  { note: 'E', octave: 2, freq: 82.41, name: 'Mi' },
  { note: 'A', octave: 2, freq: 110.00, name: 'Lá' },
  { note: 'D', octave: 3, freq: 146.83, name: 'Ré' },
  { note: 'G', octave: 3, freq: 196.00, name: 'Sol' },
  { note: 'B', octave: 3, freq: 246.94, name: 'Si' },
  { note: 'E', octave: 4, freq: 329.63, name: 'Mi' },
]

function autoCorrelate(buf, sampleRate) {
  const SIZE = buf.length
  let rms = 0
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i]
  rms = Math.sqrt(rms / SIZE)
  if (rms < 0.01) return -1

  let r1 = 0, r2 = SIZE - 1
  for (let i = 0; i < SIZE / 2; i++) {
    if (Math.abs(buf[i]) < 0.2) { r1 = i; break }
  }
  for (let i = 1; i < SIZE / 2; i++) {
    if (Math.abs(buf[SIZE - i]) < 0.2) { r2 = SIZE - i; break }
  }
  const clipped = buf.slice(r1, r2)
  const len = clipped.length

  const c = new Array(len).fill(0)
  for (let i = 0; i < len; i++) {
    for (let j = 0; j < len - i; j++) {
      c[i] += clipped[j] * clipped[j + i]
    }
  }

  let d = 0
  while (d < len && c[d] > c[d + 1]) d++
  let maxVal = -1, maxPos = -1
  for (let i = d; i < len; i++) {
    if (c[i] > maxVal) { maxVal = c[i]; maxPos = i }
  }

  let T0 = maxPos
  const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1]
  const a = (x1 + x3 - 2 * x2) / 2
  const b = (x3 - x1) / 2
  if (a) T0 = T0 - b / (2 * a)

  return sampleRate / T0
}

export default function Tuner({ onClose }) {
  const [currentString, setCurrentString] = useState(0)
  const [activeTab, setActiveTab] = useState(1)
  const [freq, setFreq] = useState(-1)
  const [diff, setDiff] = useState(0)
  const [cents, setCents] = useState(0)
  const [volumes, setVolumes] = useState([0, 0, 0, 0])
  const [permDenied, setPermDenied] = useState(false)

  const audioCtxRef = useRef(null)
  const analyserRef = useRef(null)
  const streamRef = useRef(null)
  const animRef = useRef(null)
  const currentStringRef = useRef(0)
  currentStringRef.current = currentString

  useEffect(() => {
    startTuner()
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
      if (audioCtxRef.current) audioCtxRef.current.close()
    }
  }, [])

  async function startTuner() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      audioCtxRef.current = ctx
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 8192
      analyserRef.current = analyser
      const src = ctx.createMediaStreamSource(stream)
      src.connect(analyser)
      detect()
    } catch {
      setPermDenied(true)
    }
  }

  function detect() {
    const buf = new Float32Array(8192)
    const volBuf = new Uint8Array(analyserRef.current.frequencyBinCount)

    function loop() {
      animRef.current = requestAnimationFrame(loop)
      analyserRef.current.getFloatTimeDomainData(buf)
      analyserRef.current.getByteFrequencyData(volBuf)

      const segments = [0.02, 0.05, 0.1, 0.2]
      const newVols = segments.map((seg, i) => {
        const start = Math.floor(seg * volBuf.length)
        const end = Math.floor((seg + 0.03) * volBuf.length)
        let sum = 0
        for (let j = start; j < end; j++) sum += volBuf[j]
        return sum / (end - start)
      })
      setVolumes(newVols)

      const hz = autoCorrelate(buf, audioCtxRef.current.sampleRate)
      const target = STRINGS[currentStringRef.current]

      if (hz < 20) {
        setFreq(-1)
        setDiff(0)
        setCents(0)
      } else {
        const d = hz - target.freq
        const c = 1200 * Math.log2(hz / target.freq)
        setFreq(hz)
        setDiff(d)
        setCents(c)
      }
    }
    loop()
  }

  function selectString(i) {
    setCurrentString(i)
  }

  function setTab(i) {
    setActiveTab(i)
  }

  const target = STRINGS[currentString]
  const absCents = Math.abs(cents)

  let warningIcon = '🎸'
  let warningText = 'Toque a corda para afinar'
  let warningColor = '#888'
  let centsBg = '#2a2a2a'
  let centsBorder = '#555'
  let centsColor = '#888'
  let diffStr = '– Hz'

  if (freq >= 20) {
    diffStr = (diff >= 0 ? '+' : '') + diff.toFixed(1).replace('.', ',') + 'Hz'

    if (cents > 50) {
      warningIcon = '⚠️'
      warningText = 'Afrouxe a corda imediatamente,\nou ela pode arrebentar!'
      warningColor = '#e03010'
      centsBg = '#7a1010'
      centsBorder = '#cc2200'
      centsColor = '#ff6644'
    } else if (cents < -50) {
      warningIcon = '⬆️'
      warningText = 'Aperte a corda\npara aumentar o tom'
      warningColor = '#ddbb00'
      centsBg = '#5a4a00'
      centsBorder = '#aa8800'
      centsColor = '#ffdd44'
    } else if (absCents <= 5) {
      warningIcon = '✅'
      warningText = 'Corda afinada!'
      warningColor = '#00dd55'
      centsBg = '#0a3a18'
      centsBorder = '#00aa33'
      centsColor = '#44ff88'
    } else {
      warningIcon = '🎯'
      warningText = cents > 0 ? 'Afrouxe levemente a corda' : 'Aperte levemente a corda'
      warningColor = '#ffbb22'
      centsBg = '#3a2a00'
      centsBorder = '#aa7700'
      centsColor = '#ffcc44'
    }
  }

  return (
    <div className="tuner-overlay">
      {permDenied && (
        <div className="tuner-perm">
          <div className="tuner-perm-content">
            <div style={{fontSize:60}}>🎸</div>
            <h2>Afinador de Violão e Guitarra</h2>
            <p>Para afinar seu instrumento, precisamos acessar o microfone do seu dispositivo.</p>
            <button className="tuner-perm-btn" onClick={startTuner}>Permitir Microfone</button>
            <button className="tuner-close-perm" onClick={onClose}>Fechar</button>
          </div>
        </div>
      )}

      <div className="tuner-new-topbar">
        <div className="tuner-new-instrument">
          Violão e Guitarra <span>▼</span>
        </div>
        <div className="tuner-new-mic">🎙️</div>
        <button className="tuner-new-close" onClick={onClose}>✕</button>
      </div>

      <div className="tuner-new-needle-area">
        <div className="tuner-new-lines">
          {STRINGS.map((_, i) => (
            <div key={i} className={`tuner-new-line${i === currentString ? ' active' : ''}`} />
          ))}
        </div>

        <div className="tuner-new-center">
          <div className="tuner-new-warning-icon" style={{color: warningColor}}>
            {warningIcon}
          </div>
          <div className="tuner-new-warning-text" style={{color: warningColor}}>
            {warningText.split('\n').map((l, i) => <span key={i}>{l}{i === 0 ? <br /> : ''}</span>)}
          </div>
          <div className="tuner-new-freq">
            {freq >= 20 ? freq.toFixed(1).replace('.', ',') + 'Hz' : '– Hz'}
          </div>
          <div className="tuner-new-cents" style={{background: centsBg, borderColor: centsBorder, color: centsColor}}>
            {freq >= 20 ? diffStr : '– Hz'}
          </div>
        </div>
      </div>

      <div className="tuner-new-meter">
        <div className="tuner-new-volbars">
          {volumes.map((v, i) => {
            const h = Math.max(2, (v / 255) * 24)
            return (
              <div key={i}
                className="tuner-new-volbar"
                style={{height: h + 'px', background: v > 120 ? '#ff3300' : '#555'}}
              />
            )
          })}
        </div>
        <div className="tuner-new-meter-indicator">🔴</div>
      </div>

      <div className="tuner-new-strings">
        {STRINGS.map((s, i) => (
          <div key={i} className="tuner-new-sbtn" onClick={() => selectString(i)}>
            <div className={`tuner-new-dot${i === currentString ? ' active' : ''}`}>
              {s.note}<sup>{s.octave}</sup>
            </div>
            <div className={`tuner-new-label${i === currentString ? ' active' : ''}`}>
              {(i === 0 || i === 5) ? s.name : ''}
            </div>
          </div>
        ))}
      </div>

      <div className="tuner-new-tabs">
        {['🎼', '🎸', '🏋️', '⚙️', '•••'].map((icon, i) => (
          <div key={i}
            className={`tuner-new-tab${i === activeTab ? ' active' : ''}`}
            onClick={() => setTab(i)}>
            <div className="tuner-new-tab-icon">{icon}</div>
            <span>{['Cromático', 'Corda a corda', 'Treinar', 'Preferências', 'Mais Apps'][i]}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
