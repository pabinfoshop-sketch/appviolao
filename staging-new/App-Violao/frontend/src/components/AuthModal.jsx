import { useState } from 'react'

export default function AuthModal({ mode, setMode, onAuth, onClose }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async e => {
    e.preventDefault()
    if (loading) return
    if (mode === 'register' && !name) return
    if (!email || !password) return
    setLoading(true)
    const ok = await onAuth(mode, name, email, password)
    setLoading(false)
    if (ok) {
      setName('')
      setEmail('')
      setPassword('')
    }
  }

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal auth-modal" onClick={e => e.stopPropagation()} style={{maxWidth:420,margin:'auto',borderRadius:20}}>
        <div className="modal-head">
          <div className="modal-title">
            <span style={{fontSize:'1.3rem',marginRight:6}}>{mode === 'login' ? '🔑' : '🎉'}</span>
            {mode === 'login' ? 'Entrar na sua conta' : 'Criar Conta — 7 dias grátis'}
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <form className="modal-body auth-form" onSubmit={submit} style={{padding:'20px 24px 24px'}}>
          {mode === 'register' && (
            <div className="auth-field">
              <label>Nome</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Seu nome"
                autoComplete="name"
                required
                autoFocus
              />
            </div>
          )}
          <div className="auth-field">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com"
              autoComplete="email"
              required
              autoFocus={mode === 'login'}
            />
          </div>
          <div className="auth-field">
            <label>Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'Mínimo 4 caracteres' : 'Sua senha'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={4}
            />
          </div>
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? '⏳ Aguarde...' : (mode === 'login' ? '🔑 Entrar' : '🚀 Criar Conta e Testar Grátis')}
          </button>
          <div className="auth-switch">
            {mode === 'login' ? (
              <>Não tem conta? <button type="button" className="link-btn" onClick={() => setMode('register')}>Criar agora</button></>
            ) : (
              <>Já tem conta? <button type="button" className="link-btn" onClick={() => setMode('login')}>Entrar</button></>
            )}
          </div>
          <div className="premium-footer-note" style={{marginTop:12}}>
            {mode === 'register' ? (
              <>🎉 7 dias grátis — sem cartão. Suas músicas ficam salvas.</>
            ) : (
              <>🔒 Suas músicas continuam salvas no dispositivo</>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
