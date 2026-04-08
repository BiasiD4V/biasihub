// ============================================================
// ClaudIA — useChat Hook
// Hook customizado que injeta contexto da obra automaticamente
// ============================================================

import { useCallback } from 'react'
import { useChat as useChatContext } from './ChatContext'
import { chat as geminiChat } from './geminiService'

/** Hook para usar chat com injeção automática de contexto
 *  Combina claudeService + ChatContext + contexto da obra
 *
 *  @param {object} obraAtual - Dados da obra atual (opcional)
 *  @returns {object} { messages, isLoading, sendMessage, ... } */
export function useClaudIA(obraAtual = null) {
  const context = useChatContext()
  const { addMessage, messages, isLoading, setIsLoading } = context

  /** Envia mensagem com contexto automático
   *  @param {string} mensagem - Texto da mensagem
   *  @param {object} extraContext - Contexto adicional */
  const sendMessage = useCallback(
    async (mensagem, extraContext = {}) => {
      try {
        // Adiciona mensagem do usuário
        addMessage(mensagem, 'user')
        setIsLoading(true)

        // Constrói contexto completo
        const fullContext = {
          obraAtual,
          ...extraContext,
          currentPage: window.location.pathname,
          userAgent: navigator.userAgent,
        }

        // Chama Gemini com contexto
        const response = await geminiChat(mensagem, fullContext)

        // Adiciona resposta
        addMessage(response, 'assistant')

        return response
      } catch (error) {
        console.error('Erro em sendMessage:', error)
        addMessage(
          `❌ Erro: ${error.message}`,
          'assistant'
        )
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [obraAtual, addMessage, setIsLoading]
  )

  return {
    // Estado
    messages,
    isLoading,

    // Ações
    sendMessage,
    addMessage: context.addMessage,
    clearChat: context.clearChat,
    deleteMessage: context.deleteMessage,

    // Info
    isConnected: context.isConnected,
    setIsConnected: context.setIsConnected,
  }
}

export default useClaudIA
