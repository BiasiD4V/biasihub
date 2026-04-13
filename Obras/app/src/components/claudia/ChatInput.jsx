// ============================================================
// ClaudIA — Chat Input Component
// Input com suporte a Shift+Enter para multilinhas
// ============================================================

import React, { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { useChat } from './ChatContext'

/** Input para mensagens do usuário
 *  @param {function} onSubmit - Callback quando envia mensagem
 *  @param {boolean} disabled - Se está desabilitado */
function ChatInput({ onSubmit, disabled = false }) {
  const [text, setText] = useState('')
  const [rows, setRows] = useState(1)
  const textareaRef = useRef(null)
  const { isLoading, isConnected } = useChat()

  // Auto-expande textarea conforme digita
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const newHeight = Math.min(textareaRef.current.scrollHeight, 120)
      textareaRef.current.style.height = newHeight + 'px'
      setRows(Math.max(1, Math.floor(newHeight / 24)))
    }
  }, [text])

  /** Envia mensagem
   *  Enter = envia, Shift+Enter = nova linha */
  const handleKeyDown = (e) => {
    // Shift+Enter: nova linha (deixa prosseguir normalmente)
    if (e.key === 'Enter' && e.shiftKey) {
      return // Não bloqueia, deixa inserir \n
    }

    // Enter sozinho: envia
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSubmit = () => {
    const trimmed = text.trim()
    if (!trimmed || isLoading || disabled) return

    onSubmit(trimmed)
    setText('')
    setRows(1)

    // Focus no input
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const isDisabled = isLoading || disabled || !text.trim() || !isConnected

  return (
    <div className="border-t border-slate-200 p-4 bg-white">
      <div className="flex gap-3">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Pergunte algo sobre planejamento de obras..."
          disabled={disabled}
          className="flex-1 px-4 py-2 border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm disabled:bg-slate-100 disabled:cursor-not-allowed"
          style={{ backgroundColor: disabled ? '#f1f5f9' : 'white' }}
          rows={rows}
        />
        <button
          onClick={handleSubmit}
          disabled={isDisabled}
          className={`p-3 rounded-lg transition-colors flex-shrink-0 ${
            isDisabled
              ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
          style={
            isDisabled
              ? {}
              : { backgroundColor: '#233772' }
          }
          title={isLoading ? 'Carregando...' : 'Enviar (Enter)'}
        >
          <Send size={20} />
        </button>
      </div>

      {!isConnected && (
        <p className="text-xs text-red-600 mt-2">
          ⚠️ Desconectado. Verifique sua API key.
        </p>
      )}

      <p className="text-xs text-slate-500 mt-2">
        💡 Shift+Enter para nova linha
      </p>
    </div>
  )
}

export default ChatInput
