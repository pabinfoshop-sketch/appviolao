import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, info: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    this.setState({ info })
    console.error('[ErrorBoundary] Caught:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          height: '100dvh', background: '#1a0a0a', color: '#ffdddd', padding: 32, textAlign: 'center', gap: 14,
          userSelect: 'text', WebkitUserSelect: 'text'
        }}>
          <div style={{ fontSize: '3rem' }}>⚠️</div>
          <h2 style={{ margin: 0, fontWeight: 700, fontSize: '1.3rem', color: '#ff6b6b' }}>Ops! Algo quebrou</h2>
          <p style={{ color: '#ffaaaa', fontSize: '0.85rem', maxWidth: 340, lineHeight: 1.5 }}>
            Ocorreu um erro ao exibir esta tela. Isso pode ser causado por dados baixados da internet.
          </p>
          <button onClick={() => { this.setState({ hasError: false, error: null, info: null }); window.location.hash = '#recover' }} style={{
            background: '#ff6b6b', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 28px',
            fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer', marginTop: 4
          }}>
            ← Tentar novamente
          </button>
          {this.state.error && (
            <details style={{ fontSize: '0.72rem', color: '#aa8888', maxWidth: 340, wordBreak: 'break-all', marginTop: 10, userSelect: 'text', WebkitUserSelect: 'text' }}>
              <summary style={{ cursor: 'pointer', color: '#cc9999' }}>Detalhes do erro</summary>
              <p style={{ marginTop: 6 }}>{this.state.error.message}</p>
              {this.state.info?.componentStack && (
                <pre style={{ marginTop: 6, fontSize: '0.65rem', whiteSpace: 'pre-wrap', textAlign: 'left' }}>
                  {this.state.info.componentStack}
                </pre>
              )}
            </details>
          )}
        </div>
      )
    }
    return this.props.children
  }
}
