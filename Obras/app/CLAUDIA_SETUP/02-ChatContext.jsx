// ============================================================
// ClaudIA — Chat Context & Provider
// Estado global do chat com persistência em localStorage
// ============================================================

import React, { createContext, useState, useCallback, useEffect } from 'react'

export const ChatContext = createContext()

/** Provider global para o chat
 *  Gerencia histórico de mensagens e estado */
export function ChatProvider({ children }) {
  const [messages, setMessages] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  // Carrega histórico do localStorage ao montar
  useEffect(() => {
    const saved = localStorage.getItem('claudia_messages')
    if (saved) {
      try {
        setMessages(JSON.parse(saved))
      } catch (e) {
        console.error('Erro ao carregar histórico:', e)
      }
    }
  }, [])

  // Salva histórico no localStorage toda vez que muda
  useEffect(() => {
    localStorage.setItem('claudia_messages', JSON.stringify(messages))
  }, [messages])

  /** Adiciona mensagem (user ou assistant)
   *  @param {string} content - Conteúdo da mensagem
   *  @param {'user'|'assistant'} role - Quem enviou */
  const addMessage = useCallback((content, role = 'user') => {
    const newMessage = {
      id: Date.now(),
      content,
      role,
      timestamp: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, newMessage])
    return newMessage
  }, [])

  /** Limpa todo o histórico do chat */
  const clearChat = useCallback(() => {
    setMessages([])
    localStorage.removeItem('claudia_messages')
  }, [])

  /** Remove uma mensagem específica
   *  @param {number} messageId - ID da mensagem */
  const deleteMessage = useCallback((messageId) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== messageId))
  }, [])

  /** Edita conteúdo de uma mensagem
   *  @param {number} messageId - ID da mensagem
   *  @param {string} newContent - Novo conteúdo */
  const editMessage = useCallback((messageId, newContent) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === messageId ? { ...msg, content: newContent } : msg))
    )
  }, [])

  const value = {
    // Estado
    messages,
    isLoading,
    setIsLoading,
    isConnected,
    setIsConnected,

    // Ações
    addMessage,
    clearChat,
    deleteMessage,
    editMessage,
  }

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>
}

/** Hook para acessar contexto do chat
 *  @returns {object} Context value */
export function useChat() {
  const context = React.useContext(ChatContext)
  if (!context) {
    throw new Error('useChat deve ser usado dentro de <ChatProvider>')
  }
  return context
}

export default ChatProvider
