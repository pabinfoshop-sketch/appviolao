import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
  })
}

window.addEventListener('error', e => {
  console.error('[Global error]', e.error || e.message)
  const root = document.getElementById('root')
  if (root && !root.querySelector('[data-error-ui]')) {
    const div = document.createElement('div')
    div.setAttribute('data-error-ui', '1')
    div.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#1a0a0a;color:#ffdddd;padding:32px;text-align:center;font-family:sans-serif;gap:14px;user-select:text;-webkit-user-select:text'
    div.innerHTML = `
      <div style="font-size:3rem">⚠️</div>
      <h2 style="margin:0;font-weight:700;font-size:1.3rem;color:#ff6b6b">Erro inesperado</h2>
      <p style="color:#ffaaaa;font-size:0.85rem;max-width:340px;line-height:1.5">O app encontrou um erro inesperado. Recarregue a página para tentar novamente.</p>
      <button onclick="location.reload()" style="background:#ff6b6b;color:#fff;border:none;border-radius:10px;padding:12px 28px;font-size:0.95rem;font-weight:600;cursor:pointer;margin-top:4px">⟳ Recarregar</button>
      <details style="font-size:0.72rem;color:#aa8888;max-width:340px;word-break:break-all;margin-top:10px">
        <summary style="cursor:pointer;color:#cc9999">Detalhes</summary>
        <p style="margin-top:6px">${(e.error?.message || e.message || 'Erro desconhecido').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
      </details>
    `
    root.appendChild(div)
  }
})

window.addEventListener('unhandledrejection', e => {
  console.error('[Unhandled rejection]', e.reason)
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
