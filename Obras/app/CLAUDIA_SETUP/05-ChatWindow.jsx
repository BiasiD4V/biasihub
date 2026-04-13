// ============================================================
// ClaudIA — Main Chat Window Component
// Widget flutuante fixo no bottom-right (como Intercom)
// ============================================================

import React, { useState, useRef, useEffect } from 'react'
import { X, MessageCircle, Send, Trash2, Loader } from 'lucide-react'
import { useChat } from './ChatContext'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import { chat as geminiChat, testConnection } from './geminiService'

function ChatWindow() {
  const [isOpen, setIsOpen] = useState(false)
  const [showExample, setShowExample] = useState(true)
  const messagesEndRef = useRef(null)
  const { messages, addMessage, clearChat, isLoading, setIsLoading, isConnected, setIsConnected, deleteMessage } = useChat()

  // Testa conexão ao montar
  useEffect(() => {
    const test = async () => {
      try {
        const connected = await testConnection()
        setIsConnected(connected)
      } catch (e) {
        console.error('Erro ao testar conexão:', e)
        setIsConnected(false)
      }
    }
    test()
  }, [setIsConnected])

  // Auto-scroll quando há novas mensagens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Esconde exemplos quando há mensagens
  useEffect(() => {
    setShowExample(messages.length === 0)
  }, [messages])

  /** Envia mensagem para o Gemini
   *  @param {string} text - Texto da mensagem */
  const handleSendMessage = async (text) => {
    // Adiciona mensagem do usuário
    addMessage(text, 'user')

    // Começa carregamento
    setIsLoading(true)

    try {
      // Chama Gemini API
      const response = await geminiChat(text, {
        // Você pode passar dados da obra aqui se tiver acesso
        // obraAtual: { nome: 'Obra X', ... }
      })

      // Adiciona resposta do ClaudIA
      addMessage(response, 'assistant')
      setIsConnected(true)
    } catch (error) {
      console.error('Erro ao chamar ClaudIA:', error)
      addMessage(
        `❌ Erro: ${error.message || 'Não consegui conectar ao ClaudIA. Verifique sua API key.'}`,
        'assistant'
      )
      setIsConnected(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearChat = () => {
    if (window.confirm('Deseja limpar todo o histórico do chat?')) {
      clearChat()
    }
  }

  if (!isOpen) {
    // Botão flutuante (minimizado)
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-shadow z-50 flex items-center justify-center text-white"
        style={{ backgroundColor: '#233772' }}
        title="Abrir ClaudIA"
      >
        <MessageCircle size={24} />
      </button>
    )
  }

  // Janela aberta (maximizado)
  return (
    <div className="fixed bottom-4 right-4 w-96 h-screen max-h-96 rounded-2xl shadow-2xl bg-white z-50 flex flex-col border border-slate-200">
      {/* Header */}
      <div
        className="px-4 py-4 rounded-t-2xl text-white flex items-center justify-between"
        style={{ backgroundColor: '#233772' }}
      >
        <div>
          <h2 className="font-bold text-lg">ClaudIA</h2>
          <p className="text-xs opacity-90">Assistente de Planejamento</p>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-400' : 'bg-red-400'
            }`}
          />
          <button
            onClick={() => setIsOpen(false)}
            className="hover:bg-blue-700 p-1 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
        {messages.length === 0 && showExample && (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <MessageCircle size={48} className="text-slate-300 mb-4" />
            <h3 className="font-semibold text-slate-700 mb-3">Bem-vindo ao ClaudIA!</h3>
            <p className="text-sm text-slate-600 mb-4">
              Sou especialista em planejamento e controle de obras. Pergunte sobre:
            </p>
            <div className="text-xs text-slate-600 space-y-2">
              <p>• Caminho crítico e folgas</p>
              <p>• EAP e cronogramas</p>
              <p>• Análise de valor agregado</p>
              <p>• Corrente crítica</p>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            onDelete={deleteMessage}
          />
        ))}

        {isLoading && (
          <div className="flex gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: '#233772' }}>
              <C>C</C>
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Loader size={16} className="animate-spin" />
              <span className="text-sm">ClaudIA está pensando...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Toolbar */}
      {messages.length > 0 && (
        <div className="border-t border-slate-200 px-4 py-2 bg-white flex gap-2">
          <button
            onClick={handleClearChat}
            className="flex-1 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 size={14} />
            Limpar
          </button>
        </div>
      )}

      {/* Input */}
      <ChatInput
        onSubmit={handleSendMessage}
        disabled={!isConnected}
      />
    </div>
  )
}

export default ChatWindow
