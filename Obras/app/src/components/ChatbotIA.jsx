import React, { useState, useRef, useEffect } from 'react'
import { MessageCircle, X, Send, Bot, User, Loader2, Minimize2 } from 'lucide-react'

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY

const SYSTEM_PROMPT = `Você é o Assistente IA do ERP Biasi Engenharia & Instalações, um sistema de gestão de obras de engenharia elétrica.

Você ajuda os usuários com dúvidas sobre:
- Gestão de obras e contratos
- Cronogramas e planejamento (CPM, EAP/WBS)
- Medições e faturamento
- Análise de desempenho (EVM: VP, VA, IDC, IDP, ONT)
- Financeiro (previsto × realizado)
- Curva ABC e Curva S
- Diário de obra e relatórios
- Gestão de equipe e recursos
- Reprogramações de atividades
- Glossário de termos técnicos

Responda de forma concisa, profissional e em português brasileiro. Foque no contexto de gestão de obras de engenharia.`

let _idCounter = 2

function nextId() {
  return ++_idCounter
}

async function chamarGemini(historico, mensagem) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`

  const contents = [
    ...historico.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    })),
    {
      role: 'user',
      parts: [{ text: mensagem }]
    }
  ]

  const body = {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error?.message || `Erro ${res.status}`)
  }

  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Sem resposta.'
}

const BOAS_VINDAS = {
  id: 1,
  role: 'assistant',
  text: 'Olá! Sou o assistente IA do ERP Biasi. Como posso ajudar você hoje?',
  boasVindas: true
}

export default function ChatbotIA() {
  const [aberto, setAberto] = useState(false)
  const [minimizado, setMinimizado] = useState(false)
  const [mensagens, setMensagens] = useState([BOAS_VINDAS])
  const [input, setInput] = useState('')
  const [carregando, setCarregando] = useState(false)
  const endRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (aberto && !minimizado) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [mensagens, aberto, minimizado])

  useEffect(() => {
    if (aberto && !minimizado) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [aberto, minimizado])

  const enviar = async () => {
    const texto = input.trim()
    if (!texto || carregando) return

    const novaMensagem = { id: nextId(), role: 'user', text: texto }
    setMensagens(prev => [...prev, novaMensagem])
    setInput('')
    setCarregando(true)

    try {
      if (!GEMINI_API_KEY) {
        throw new Error('Chave da API Gemini não configurada. Crie o arquivo .env a partir do .env.example e defina VITE_GEMINI_API_KEY.')
      }

      // Envia ao Gemini o histórico excluindo mensagens de boas-vindas
      const historico = mensagens
        .filter(m => !m.boasVindas)
        .map(m => ({ role: m.role, text: m.text }))

      const resposta = await chamarGemini(historico, texto)
      setMensagens(prev => [...prev, { id: nextId(), role: 'assistant', text: resposta }])
    } catch (e) {
      setMensagens(prev => [
        ...prev,
        { id: nextId(), role: 'assistant', text: `⚠️ ${e.message}`, erro: true }
      ])
    } finally {
      setCarregando(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviar()
    }
  }

  return (
    <>
      {/* Botão flutuante */}
      {!aberto && (
        <button
          onClick={() => setAberto(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-110 z-50"
          style={{ backgroundColor: '#233772' }}
          title="Assistente IA"
        >
          <MessageCircle size={24} color="#FFC82D" />
        </button>
      )}

      {/* Janela do chat */}
      {aberto && (
        <div
          className="fixed bottom-6 right-6 flex flex-col rounded-2xl shadow-2xl z-50 overflow-hidden"
          style={{
            width: 360,
            height: minimizado ? 56 : 520,
            border: '1px solid #e5e7eb',
            backgroundColor: '#fff',
            transition: 'height 0.2s ease'
          }}
        >
          {/* Header */}
          <div
            className="flex items-center gap-2.5 px-4 h-14 flex-shrink-0"
            style={{ backgroundColor: '#233772' }}
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: '#FFC82D' }}>
              <Bot size={16} color="#233772" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white leading-tight">Assistente IA</p>
              <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.5)' }}>Biasi Engenharia</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMinimizado(v => !v)}
                className="p-1.5 rounded transition-colors"
                style={{ color: 'rgba(255,255,255,0.5)' }}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
                title={minimizado ? 'Expandir' : 'Minimizar'}
              >
                <Minimize2 size={14} />
              </button>
              <button
                onClick={() => setAberto(false)}
                className="p-1.5 rounded transition-colors"
                style={{ color: 'rgba(255,255,255,0.5)' }}
                onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
                title="Fechar"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {!minimizado && (
            <>
              {/* Mensagens */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3" style={{ backgroundColor: '#f8fafc' }}>
                {mensagens.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: '#233772' }}>
                        <Bot size={13} color="#FFC82D" />
                      </div>
                    )}
                    <div
                      className="px-3 py-2 rounded-xl text-sm leading-relaxed max-w-[80%]"
                      style={msg.role === 'user'
                        ? { backgroundColor: '#233772', color: '#fff', borderBottomRightRadius: 4 }
                        : {
                          backgroundColor: msg.erro ? '#fef2f2' : '#fff',
                          color: msg.erro ? '#dc2626' : '#1e293b',
                          border: `1px solid ${msg.erro ? '#fecaca' : '#e5e7eb'}`,
                          borderBottomLeftRadius: 4,
                          whiteSpace: 'pre-wrap'
                        }
                      }
                    >
                      {msg.text}
                    </div>
                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: '#e2e8f0' }}>
                        <User size={13} color="#64748b" />
                      </div>
                    )}
                  </div>
                ))}

                {carregando && (
                  <div className="flex gap-2 justify-start">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: '#233772' }}>
                      <Bot size={13} color="#FFC82D" />
                    </div>
                    <div className="px-3 py-2 rounded-xl flex items-center gap-1.5"
                      style={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderBottomLeftRadius: 4 }}>
                      <Loader2 size={13} className="animate-spin" style={{ color: '#233772' }} />
                      <span className="text-xs" style={{ color: '#64748b' }}>Digitando...</span>
                    </div>
                  </div>
                )}

                <div ref={endRef} />
              </div>

              {/* Input */}
              <div className="p-3 flex-shrink-0" style={{ borderTop: '1px solid #e5e7eb' }}>
                <div className="flex gap-2 items-end">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Pergunte algo sobre o ERP..."
                    rows={1}
                    disabled={carregando}
                    className="flex-1 resize-none rounded-xl px-3 py-2 text-sm outline-none transition-colors"
                    style={{
                      border: '1px solid #e5e7eb',
                      maxHeight: 100,
                      fontFamily: 'inherit',
                      backgroundColor: carregando ? '#f8fafc' : '#fff',
                      color: '#1e293b'
                    }}
                    onInput={e => {
                      e.target.style.height = 'auto'
                      e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'
                    }}
                  />
                  <button
                    onClick={enviar}
                    disabled={!input.trim() || carregando}
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-opacity"
                    style={{
                      backgroundColor: '#233772',
                      opacity: !input.trim() || carregando ? 0.4 : 1
                    }}
                    title="Enviar"
                  >
                    <Send size={15} color="#FFC82D" />
                  </button>
                </div>
                <p className="text-[10px] text-center mt-1.5" style={{ color: '#b0b8c4' }}>
                  Enter para enviar · Shift+Enter nova linha
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}