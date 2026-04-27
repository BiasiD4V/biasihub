import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// PWA: registra service worker apenas em http/https (Electron usa app:// e ignora).
// Mantém o app instalável no celular sem interferir no Desktop.
if (typeof window !== 'undefined' && /^https?:$/.test(window.location.protocol)) {
  import('virtual:pwa-register')
    .then(({ registerSW }) => registerSW({ immediate: true }))
    .catch(() => {/* dev sem PWA — silencia */});
}
