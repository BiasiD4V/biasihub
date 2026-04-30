import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { supabase } from './lib/supabase.js'
import { installConnectionRecovery, purgeMobileWebCaches } from './utils/runtime.js'
import './index.css'

void purgeMobileWebCaches()
installConnectionRecovery(supabase)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
