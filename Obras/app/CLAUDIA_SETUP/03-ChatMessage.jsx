// ============================================================
// ClaudIA — Chat Message Component
// Renderiza mensagens com suporte a markdown e ações
// ============================================================

import React, { useState } from 'react'
import { Copy, Trash2, Check } from 'lucide-react'
import { useChat } from './ChatContext'

/** Renderiza markdown básico (bold, italic, links)
 *  @param {string} text - Texto com markdown
 *  @returns {JSX} HTML renderizado */
function parseMarkdown(text) {
  if (!text) return ''

  let html = text
    // Bold: **texto** → <strong>
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic: *texto* → <em>
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links: [texto](url) → <a>
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    // Code: `texto` → <code>
    .replace(/`(.+?)`/g, '<code>$1</code>')
    // Line breaks
    .replace(/\n/g, '<br />')

  return html
}

/** Componente de mensagem individual
 *  @param {object} message - { id, content, role, timestamp }
 *  @param {function} onDelete - Callback ao deletar */
function ChatMessage({ message, onDelete }) {
  const [copied, setCopied] = useState(false)
  const isAssistant = message.role === 'assistant'

  // Copia conteúdo para clipboard
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Erro ao copiar:', err)
    }
  }

  const handleDelete = () => {
    if (window.confirm('Deletar essa mensagem?')) {
      onDelete(message.id)
    }
  }

  return (
    <div
      className={`flex gap-3 mb-4 ${
        isAssistant ? 'flex-row' : 'flex-row-reverse'
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
          isAssistant ? 'bg-blue-600' : 'bg-slate-500'
        }`}
        style={isAssistant ? { backgroundColor: '#233772' } : {}}
      >
        {isAssistant ? 'C' : 'V'}
      </div>

      {/* Mensagem */}
      <div className={`flex-1 ${isAssistant ? 'items-start' : 'items-end'} flex flex-col`}>
        <div
          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
            isAssistant
              ? 'bg-slate-100 text-slate-900'
              : 'bg-blue-600 text-white rounded-br-none'
          }`}
          style={
            isAssistant
              ? {}
              : { backgroundColor: '#233772' }
          }
        >
          <div
            className="text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(message.content) }}
          />
        </div>

        {/* Ações (hover) */}
        <div className="flex gap-2 mt-1 opacity-0 hover:opacity-100 transition-opacity">
          <button
            onClick={handleCopy}
            className="p-1 hover:bg-slate-200 rounded text-slate-600 text-xs"
            title="Copiar"
          >
            {copied ? (
              <Check size={14} className="text-green-600" />
            ) : (
              <Copy size={14} />
            )}
          </button>
          <button
            onClick={handleDelete}
            className="p-1 hover:bg-red-100 rounded text-red-600 text-xs"
            title="Deletar"
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* Timestamp */}
        <span className="text-xs text-slate-500 mt-1">
          {new Date(message.timestamp).toLocaleTimeString('pt-BR')}
        </span>
      </div>
    </div>
  )
}

export default ChatMessage
