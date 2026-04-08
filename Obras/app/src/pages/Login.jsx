import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import PCOAutoCarousel from '../components/PCOAutoCarousel'

// Ícone Microsoft (logo 4 quadrados)
function IconeMicrosoft() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
    </svg>
  )
}

export default function Login() {
  const { login, loginComMicrosoft, carregando, erro } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [loginLoading, setLoginLoading] = useState(false)
  const [mostrarFormEmail, setMostrarFormEmail] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoginLoading(true)
    try {
      const ok = await login(email, senha)
      if (ok) navigate('/')
    } finally {
      setLoginLoading(false)
    }
  }

  const handleMicrosoftLogin = async () => {
    setLoginLoading(true)
    await loginComMicrosoft()
    // Nota: após SSO, o usuário é redirecionado automaticamente
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: 'Montserrat, sans-serif' }}>

      {/* Painel esquerdo — Azul Biasi */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ backgroundColor: '#233772' }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
          {[...Array(16)].map((_, i) => (
            <div key={i} className="absolute border-2 rounded-xl"
              style={{
                borderColor: '#FFC82D', width: 60, height: 60,
                top: `${(i % 4) * 25}%`, left: `${Math.floor(i / 4) * 25}%`,
                transform: 'rotate(12deg)',
              }} />
          ))}
        </div>
        <div className="relative z-10 flex flex-col items-center w-full max-w-sm mx-auto">
          {/* Lema central */}
          <div className="mb-6 w-full">
            <p className="text-xs md:text-sm font-semibold text-center px-2 py-2 rounded-lg shadow-sm" style={{ background: 'rgba(255,255,255,0.13)', color: '#FFC82D', letterSpacing: 0.5 }}>
              O que não se mede, não é melhorado.
            </p>
          </div>
          <img src="/logo-branco.svg" alt="Biasi Engenharia" className="h-14 w-auto mx-auto mb-8" />
          <h2 className="text-2xl font-bold text-white mb-3">ERP Gestão de Obras</h2>
          <p className="text-sm mb-10" style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.7 }}>
            Controle físico e financeiro centralizado de todas as suas obras.
          </p>
          {/* Carrossel automático de PCO substitui os cards de destaque */}
          <div className="w-full mt-8">
            <PCOAutoCarousel />
          </div>
        </div>
      </div>

      {/* Painel direito — Formulário */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-sm">

          <div className="lg:hidden mb-8 text-center">
            <img src="/logo-colorido.svg" alt="Biasi" className="h-10 w-auto mx-auto" />
          </div>

          <h2 className="text-2xl font-bold mb-1" style={{ color: '#233772' }}>Bem-vindo</h2>
          <p className="text-sm mb-8" style={{ color: '#B3B3B3' }}>
            Acesse com sua conta Microsoft <strong>@biasiengenharia.com.br</strong>
          </p>

          {/* Mensagem de erro global (SSO ou form) */}
          {erro && (
            <div className="rounded-lg px-4 py-3 mb-6 text-xs"
              style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
              <strong>Erro:</strong> {erro}
            </div>
          )}

          {/* ── Botão Microsoft SSO (principal) ─────────────── */}
          <button
            type="button"
            onClick={handleMicrosoftLogin}
            disabled={carregando || loginLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg font-semibold text-sm transition-all mb-4"
            style={{
              border: '1.5px solid #e5e7eb',
              backgroundColor: '#fff',
              color: '#333333',
              fontFamily: 'Montserrat, sans-serif',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              opacity: (carregando || loginLoading) ? 0.6 : 1,
              cursor: (carregando || loginLoading) ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={e => {
              if (!carregando && !loginLoading) {
                e.currentTarget.style.borderColor = '#233772'
                e.currentTarget.style.backgroundColor = '#f8f9ff'
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#e5e7eb'
              e.currentTarget.style.backgroundColor = '#fff'
            }}
          >
            <IconeMicrosoft />
            {loginLoading ? 'Conectando...' : 'Entrar com Microsoft 365'}
          </button>

          {/* Informação para novos usuários */}
          <div className="rounded-lg px-4 py-3 mb-6 text-xs" style={{ backgroundColor: '#fef3c7', border: '1px solid #fcd34d' }}>
            <p style={{ color: '#92400e', marginBottom: '8px' }}>
              <strong>✨ Primeiro acesso?</strong>
            </p>
            <p style={{ color: '#92400e', margin: 0 }}>
              Entre com sua conta Biasi. Sua solicitação passará por análise (24-48h) e você verá uma mensagem de boas-vindas especial enquanto isso. Um administrador definirá seus acessos.
            </p>
          </div>

          {/* ── Outra opção de acesso (colapsável) ─────────── */}
          {!mostrarFormEmail && (
            <div className="text-center mb-4">
              <button
                type="button"
                onClick={() => setMostrarFormEmail(true)}
                className="text-xs font-semibold transition-colors py-2"
                style={{ color: '#B3B3B3' }}
                onMouseEnter={e => e.currentTarget.style.color = '#233772'}
                onMouseLeave={e => e.currentTarget.style.color = '#B3B3B3'}
              >
                Ou use email + senha
              </button>
            </div>
          )}

          {/* Formulário email/senha (oculto por padrão) */}
          {mostrarFormEmail && (
            <>
              {erro && (
                <div className="rounded-lg px-3 py-2.5 text-xs mb-4"
                  style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
                  {erro}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#233772' }}>
                    E-mail
                  </label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="seu@biasiengenharia.com.br" required
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none bg-white"
                    style={{ border: '1.5px solid #e5e7eb', fontFamily: 'Montserrat, sans-serif' }}
                    onFocus={e => e.target.style.borderColor = '#233772'}
                    onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#233772' }}>
                    Senha
                  </label>
                  <div className="relative">
                    <input type={mostrarSenha ? 'text' : 'password'} value={senha}
                      onChange={e => setSenha(e.target.value)} placeholder="••••••" required
                      className="w-full px-3 py-2.5 pr-10 rounded-lg text-sm outline-none bg-white"
                      style={{ border: '1.5px solid #e5e7eb', fontFamily: 'Montserrat, sans-serif' }}
                      onFocus={e => e.target.style.borderColor = '#233772'}
                      onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                    />
                    <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)}
                      className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#B3B3B3' }}>
                      {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loginLoading || carregando || !email || !senha}
                  className="w-full flex items-center justify-center gap-2 text-white font-semibold py-3 px-4 rounded-lg transition-colors text-sm mt-2"
                  style={{
                    backgroundColor: (loginLoading || carregando || !email || !senha) ? '#B3B3B3' : '#233772',
                    fontFamily: 'Montserrat, sans-serif'
                  }}
                  onMouseEnter={e => { if (!loginLoading && email && senha) e.currentTarget.style.backgroundColor = '#1a2a5e' }}
                  onMouseLeave={e => { if (!loginLoading && email && senha) e.currentTarget.style.backgroundColor = '#233772' }}
                >
                  {loginLoading
                    ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Entrando...</>
                    : <><LogIn size={16} />Entrar</>
                  }
                </button>
              </form>

              <button
                type="button"
                onClick={() => setMostrarFormEmail(false)}
                className="w-full text-xs mt-4 transition-colors"
                style={{ color: '#B3B3B3' }}
                onMouseEnter={e => e.currentTarget.style.color = '#233772'}
                onMouseLeave={e => e.currentTarget.style.color = '#B3B3B3'}
              >
                Voltar ao Microsoft
              </button>
            </>
          )}

          {!mostrarFormEmail && (
            <p className="text-center text-[11px] mt-8" style={{ color: '#B3B3B3' }}>
              © {new Date().getFullYear()} Biasi Engenharia & Instalações · Sistema Interno
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
