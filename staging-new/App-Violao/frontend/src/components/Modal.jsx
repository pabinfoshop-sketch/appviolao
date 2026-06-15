import { useState, useRef } from 'react'
import { parseCifraText } from '../utils/parser'
import { detectKey } from '../utils/chordDiagrams'

export default function Modal({ onAdd, onClose }) {
  const [tab, setTab] = useState('search')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('idle')
  const [results, setResults] = useState([])
  const [fetching, setFetching] = useState(null)
  const [manualTitle, setManualTitle] = useState('')
  const [manualKey, setManualKey] = useState('G')
  const [manualRhythm, setManualRhythm] = useState('Hino 4/4')
  const [manualCifra, setManualCifra] = useState('')
  const [manualCategory, setManualCategory] = useState('')
  const inputRef = useRef(null)

  const API_URL = import.meta.env.VITE_API_URL || '/api'

  const handleSearch = async () => {
    if (!query.trim()) return
    setStatus('searching')
    setResults([])
    setFetching(null)
    try {
      const res = await fetch(`${API_URL}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResults(data.results || [])
      setStatus(data.results?.length > 0 ? 'found' : 'notfound')
    } catch {
      setStatus('error')
    }
  }

  const handleSelectResult = async (song) => {
    setFetching(song.url)
    try {
      const res = await fetch(`${API_URL}/fetch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: song.url, key: song.key }),
      })
      const data = await res.json()
      if (data.error || !data.text || data.text.length < 30) {
        setFetching(null)
        setStatus('notfound')
        return
      }
      const songKey = data.key || song.key || 'C'
      const songObj = parseCifraText(data.text, data.title || song.title, songKey, 'Hino 4/4')
      songObj.artist = data.artist || song.artist_name || ''
      // Detect key from actual chords
      const allChords = []
      for (const sec of songObj.sections || []) {
        for (const line of sec.lines || []) {
          for (const g of line || []) {
            const ch = Array.isArray(g) ? g[0] : g.chord
            if (ch) allChords.push(ch)
          }
        }
      }
      if (allChords.length) {
        songObj.key = detectKey(allChords)
      }
      onAdd(songObj)
      reset()
    } catch {
      setFetching(null)
      setStatus('error')
    }
  }

  const addManual = () => {
    if (!manualTitle.trim() || !manualCifra.trim()) return
    const song = parseCifraText(manualCifra, manualTitle, manualKey, manualRhythm)
    song.category = manualCategory.trim()
    onAdd(song)
    reset()
  }

  const reset = () => {
    setQuery('')
    setStatus('idle')
    setResults([])
    setFetching(null)
    setManualTitle('')
    setManualKey('G')
    setManualRhythm('Hino 4/4')
    setManualCifra('')
    setManualCategory('')
    onClose()
  }

  const handleKeyDown = e => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="modal-bg" onClick={e => { if (e.target.className === 'modal-bg') reset() }}>
      <div className="modal">
        <div className="modal-head">
          <span className="modal-title">Adicionar Música</span>
          <button className="modal-close" onClick={reset}>✕</button>
        </div>
        <div className="modal-body">
          <div className="tab-row">
            <div className={`tab${tab === 'search' ? ' active' : ''}`} onClick={() => setTab('search')}>
              🔍 Buscar Online
            </div>
            <div className={`tab${tab === 'manual' ? ' active' : ''}`} onClick={() => setTab('manual')}>
              ✏️ Digitar Manual
            </div>
          </div>

          {tab === 'search' && (
            <div>
              <div className="msearch-row">
                <input
                  ref={inputRef}
                  className="msearch"
                  placeholder="Nome da música ou artista..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <button className="msearch-btn" onClick={handleSearch} disabled={status === 'searching'}>
                  Buscar
                </button>
              </div>

              {status === 'searching' && (
                <div className="status-msg">
                  <span className="status-spinner" />Buscando...
                </div>
              )}

              {status === 'notfound' && (
                <div className="status-msg">
                  ⚠️ Nenhuma música encontrada.<br />
                  <span style={{ fontSize: 0.82, opacity: 0.7 }}>Tente digitar manualmente.</span>
                </div>
              )}

              {status === 'error' && (
                <div className="status-msg">
                  ❌ Erro ao buscar. Verifique a conexão.
                </div>
              )}

              {results.length > 0 && (
                <div className="results-list">
                  {results.map((s, i) => (
                    <div
                      key={i}
                      className={`result-card${fetching === s.url ? ' loading' : ''}`}
                      onClick={() => !fetching && handleSelectResult(s)}
                    >
                      <div className="result-card-title">
                        {s.title}
                        <span className="result-card-key">{s.key}</span>
                      </div>
                      <div className="result-card-meta">
                        {s.artist_name}
                      </div>
                      {fetching === s.url ? (
                        <div className="result-card-loading">
                          <span className="status-spinner" />Obtendo cifra...
                        </div>
                      ) : (
                        <div className="result-card-cta">▶ Clique para adicionar</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'manual' && (
            <div>
              <div className="form-row">
                <div>
                  <label className="form-label">Título</label>
                  <input className="form-input" placeholder="Nome da música" value={manualTitle} onChange={e => setManualTitle(e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Tom</label>
                  <select className="form-select" value={manualKey} onChange={e => setManualKey(e.target.value)}>
                    {['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'].map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Ritmo</label>
                  <select className="form-select" value={manualRhythm} onChange={e => setManualRhythm(e.target.value)}>
                    {['Valsa','Marcha','Hino 4/4','Baião','Bolero','Outro'].map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Categoria</label>
                  <input className="form-input" placeholder="ex: Louvor, Adoração" value={manualCategory} onChange={e => setManualCategory(e.target.value)} />
                </div>
              </div>
              <label className="form-label">Cifra com acordes em [colchetes]</label>
              <textarea
                className="form-textarea"
                placeholder={`[G]Alma cansada que [D7]buscas a paz\n[G]No mundo não [C]podes encontrar\n\n— Refrão —\n[G]Vem a Jesus [D7]vem a Jesus`}
                value={manualCifra}
                onChange={e => setManualCifra(e.target.value)}
              />
              <div className="form-note">Use [Acorde] antes da palavra. Separe seções com linhas vazias. "— Refrão —" marca o refrão.</div>
              <button className="form-submit" onClick={addManual}>Adicionar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
