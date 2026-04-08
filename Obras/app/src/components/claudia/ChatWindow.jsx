// ============================================================
// ClaudIA — Main Chat Window Component
// Widget flutuante com acesso TOTAL aos dados da obra
// Respeitando permissões do usuário
// ============================================================

import React, { useState, useRef, useEffect } from 'react'
import { X, MessageCircle, Trash2, Loader } from 'lucide-react'
import { useChat } from './ChatContext'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import { chat as geminiChat, testConnection } from './geminiService'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { getSupabaseSchema, formatSchemaForGemini, executeDataQuery } from '../../lib/claudiaDataBrowser'

// Tenta importar ObraContext se disponível
let useObra = null
try {
  const obraModule = require('../../context/ObraContext')
  useObra = obraModule.useObra
} catch (e) {
  // ObraContext opcional
}

function ChatWindow() {
  const [isOpen, setIsOpen] = useState(false)
  const [showExample, setShowExample] = useState(true)
  const [windowHeight, setWindowHeight] = useState(384) // max-h-96 = 384px
  const [isResizing, setIsResizing] = useState(false)
  const [allObraData, setAllObraData] = useState(null)
  const [dbSchema, setDbSchema] = useState(null)
  const messagesEndRef = useRef(null)
  const windowRef = useRef(null)
  const { messages, addMessage, clearChat, isLoading, setIsLoading, isConnected, setIsConnected, deleteMessage } = useChat()

  // Pega usuário e obra
  const { usuario } = useAuth()
  const obraContext = useObra ? useObra() : null
  const obraSelecionadaId = obraContext?.obraSelecionadaId || obraContext?.obraAtual?.id

  // Buscar TODOS os dados da obra ao abrir ou mudar obra
  useEffect(() => {
    if (!isOpen || !obraSelecionadaId) {
      setAllObraData(null)
      return
    }

    const fetchAllObraData = async () => {
      try {
        const data = {}

        // 1. OBRA BÁSICA
        const { data: obra } = await supabase
          .from('obras')
          .select('*')
          .eq('id', obraSelecionadaId)
          .single()
        data.obra = obra

        // Busca o planejamento_id da obra
        const { data: obraPlanejamentos } = await supabase
          .from('obra_planejamentos')
          .select('id')
          .eq('obra_id', obraSelecionadaId)
          .limit(1)
          .single()

        const planejamentoId = obraPlanejamentos?.id

        // 2. CRONOGRAMA COMPLETO (usando planejamento_id)
        if (planejamentoId) {
          const { data: atividades } = await supabase
            .from('planejamento_atividades')
            .select('*')
            .eq('planejamento_id', planejamentoId)
            .order('ordem')
          data.atividades = atividades || []
        } else {
          data.atividades = []
        }

        // 3. PREDECESSORAS (dependências)
        if (planejamentoId) {
          try {
            const { data: predecessoras } = await supabase
              .from('planejamento_predecessoras')
              .select('*')
              .eq('planejamento_id', planejamentoId)
            data.predecessoras = predecessoras || []
          } catch (e) {
            data.predecessoras = []
          }
        } else {
          data.predecessoras = []
        }

        // 4. EVM - SNAPSHOTS
        const { data: evm } = await supabase
          .from('evm_snapshots')
          .select('*')
          .eq('obra_id', obraSelecionadaId)
          .order('data_snapshot', { ascending: false })
          .limit(5)
        data.evm = evm || []

        // 5. AVANÇOS FÍSICOS
        const { data: avancos } = await supabase
          .from('avancos_fisicos')
          .select('*')
          .eq('obra_id', obraSelecionadaId)
          .order('data_avanço', { ascending: false })
          .limit(10)
        data.avancos = avancos || []

        // 6. REPROGRAMAÇÕES
        const { data: reprogramacoes } = await supabase
          .from('reprogramacoes')
          .select('*')
          .eq('obra_id', obraSelecionadaId)
          .order('data_criacao', { ascending: false })
          .limit(5)
        data.reprogramacoes = reprogramacoes || []

        // 7. CONTRATOS
        const { data: contratos } = await supabase
          .from('contratos')
          .select('*')
          .eq('obra_id', obraSelecionadaId)
        data.contratos = contratos || []

        // 8. MEDIÇÕES (faturamento)
        const { data: medicoes } = await supabase
          .from('medicoes')
          .select('*')
          .eq('obra_id', obraSelecionadaId)
          .order('data_medicao', { ascending: false })
          .limit(20)
        data.medicoes = medicoes || []

        // 9. PEDIDOS DE COMPRA (suprimentos)
        const { data: pedidos } = await supabase
          .from('pedidos_compra')
          .select('*')
          .eq('obra_id', obraSelecionadaId)
          .order('data_criacao', { ascending: false })
          .limit(20)
        data.pedidos = pedidos || []

        // 10. DIÁRIO DE OBRA
        const { data: diario } = await supabase
          .from('diario_obra')
          .select('*')
          .eq('obra_id', obraSelecionadaId)
          .order('data', { ascending: false })
          .limit(10)
        data.diario = diario || []

        // 11. TAREFAS/GESTÃO
        const { data: tarefas } = await supabase
          .from('tarefas')
          .select('*')
          .eq('obra_id', obraSelecionadaId)
          .order('data_criacao', { ascending: false })
          .limit(15)
        data.tarefas = tarefas || []

        // 12. RECURSOS (se houver tabela)
        try {
          const { data: recursos } = await supabase
            .from('recursos')
            .select('*')
            .eq('obra_id', obraSelecionadaId)
          data.recursos = recursos || []
        } catch (e) {
          data.recursos = []
        }

        setAllObraData(data)
      } catch (err) {
        console.error('Erro ao buscar dados da obra:', err)
      }
    }

    fetchAllObraData()
  }, [isOpen, obraSelecionadaId])

  // Testa conexão ao montar
  useEffect(() => {
    if (!isOpen) return
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
  }, [isOpen, setIsConnected])

  // Busca schema do banco de dados para exploração dinâmica
  useEffect(() => {
    if (!isOpen) return
    const loadSchema = async () => {
      try {
        const schema = await getSupabaseSchema()
        setDbSchema(schema)
      } catch (err) {
        console.error('Erro ao buscar schema:', err)
      }
    }
    loadSchema()
  }, [isOpen])

  // Auto-scroll quando há novas mensagens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Esconde exemplos quando há mensagens
  useEffect(() => {
    setShowExample(messages.length === 0)
  }, [messages])

  // Handle resize (arrastar para cima)
  const handleMouseDown = () => {
    setIsResizing(true)
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing) return
      const container = windowRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const newHeight = window.innerHeight - e.clientY - 16
      const clampedHeight = Math.max(300, Math.min(newHeight, window.innerHeight - 100))

      setWindowHeight(clampedHeight)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  /** Envia mensagem com TODOS os dados disponíveis */
  const handleSendMessage = async (text) => {
    addMessage(text, 'user')
    setIsLoading(true)

    try {
      const context = {
        usuario: {
          nome: usuario?.nome || 'Usuário',
          perfil: usuario?.perfil || 'visualizador',
        },
      }

      if (allObraData?.obra) {
        context.obraAtual = {
          id: allObraData.obra.id,
          nome: allObraData.obra.nome,
          cliente: allObraData.obra.cliente_nome,
          endereco: allObraData.obra.endereco,
          data_inicio: allObraData.obra.data_inicio,
          data_termino: allObraData.obra.data_termino,
          valor_total: allObraData.obra.valor_total,
          status: allObraData.obra.situacao,
          cidade: allObraData.obra.cidade,
        }
      }

      // CRONOGRAMA COMPLETO
      if (allObraData?.atividades?.length > 0) {
        context.cronograma = allObraData.atividades.map(a => ({
          id: a.id,
          descricao: a.descricao,
          inicio_planejado: a.data_inicio_planejado,
          fim_planejado: a.data_fim_planejado,
          inicio_realizado: a.data_inicio_realizado,
          fim_realizado: a.data_fim_realizado,
          progresso: a.progresso_fisico,
          folga_total: a.folga_total,
          folga_livre: a.folga_livre,
          tipo: a.tipo_atividade,
          critico: a.folga_total === 0,
        }))
      }

      // PREDECESSORAS (dependências)
      if (allObraData?.predecessoras?.length > 0) {
        context.dependencias = allObraData.predecessoras.map(p => ({
          atividade_id: p.atividade_id,
          predecessora_id: p.predecessora_id,
          tipo_relacao: p.tipo_relacao, // FS, SS, FF, SF
          lag: p.lag,
        }))
      }

      // EVM - últimosnapshots
      if (allObraData?.evm?.length > 0) {
        context.evm_historico = allObraData.evm.map(e => ({
          data: e.data_snapshot,
          vp_total: e.vp_total,
          va_total: e.va_total,
          vr_total: e.vr_total,
          idp: e.idp,
          idc: e.idc,
          orc: e.orc,
          eac: e.eac,
        }))
      }

      // AVANÇOS FÍSICOS
      if (allObraData?.avancos?.length > 0) {
        context.avancos_fisicos = allObraData.avancos.map(a => ({
          data: a.data_avanço,
          percentual_global: a.percentual_global,
          percentual_eap: a.percentual_eap_atual,
          observacoes: a.observacoes,
        }))
      }

      // REPROGRAMAÇÕES
      if (allObraData?.reprogramacoes?.length > 0) {
        context.reprogramacoes = allObraData.reprogramacoes.map(r => ({
          data_criacao: r.data_criacao,
          motivo: r.motivo,
          status: r.status,
          detalhes: r.detalhes,
        }))
      }

      // CONTRATOS & MEDIÇÕES (FATURAMENTO)
      if (allObraData?.contratos?.length > 0) {
        context.contratos = allObraData.contratos.map(c => ({
          id: c.id,
          numero: c.numero_contrato,
          cliente: c.nome_fornecedor,
          valor: c.valor_total,
          data_inicio: c.data_inicio,
          data_termino: c.data_termino,
          status: c.status,
        }))
      }

      if (allObraData?.medicoes?.length > 0) {
        const medicoesPorContrato = {}
        allObraData.medicoes.forEach(m => {
          if (!medicoesPorContrato[m.contrato_id]) {
            medicoesPorContrato[m.contrato_id] = []
          }
          medicoesPorContrato[m.contrato_id].push({
            data: m.data_medicao,
            valor_medido: m.valor_medido,
            percentual: m.percentual,
            status: m.status,
          })
        })
        context.medicoes_por_contrato = medicoesPorContrato
      }

      // PEDIDOS DE COMPRA (SUPRIMENTOS)
      if (allObraData?.pedidos?.length > 0) {
        context.pedidos_compra = allObraData.pedidos.map(p => ({
          numero: p.numero_pedido,
          fornecedor: p.fornecedor,
          valor: p.valor_total,
          data_criacao: p.data_criacao,
          data_entrega_prevista: p.data_entrega_prevista,
          status: p.status,
          itens: p.quantidade_itens,
        }))
      }

      // DIÁRIO DE OBRA
      if (allObraData?.diario?.length > 0) {
        context.diario_obra = allObraData.diario.map(d => ({
          data: d.data,
          descricao: d.descricao,
          clima: d.clima,
          observacoes: d.observacoes,
        }))
      }

      // TAREFAS
      if (allObraData?.tarefas?.length > 0) {
        context.tarefas = allObraData.tarefas.map(t => ({
          descricao: t.descricao,
          status: t.status,
          data_criacao: t.data_criacao,
          data_vencimento: t.data_vencimento,
          responsavel: t.responsavel,
          prioridade: t.prioridade,
        }))
      }

      // RECURSOS
      if (allObraData?.recursos?.length > 0) {
        context.recursos = allObraData.recursos.map(r => ({
          tipo: r.tipo_recurso,
          descricao: r.descricao,
          quantidade: r.quantidade,
          custo_dia: r.custo_dia,
          status: r.status,
        }))
      }

      // SCHEMA DO BANCO - para exploração dinâmica
      if (dbSchema) {
        context.schema = formatSchemaForGemini(dbSchema)
        context.schema_instructions = `Você tem acesso a estas tabelas. Você pode sugerir queries no formato:
{QUERY_REQUEST: {tabela: "nome_tabela", colunas: ["col1", "col2"], filtros: {obra_id: "..."}, limit: 100}}
O sistema vai executar e retornar os dados.`
      }

      let response = await geminiChat(text, context)

      // Processa QUERY_REQUEST na resposta (se Gemini sugeriu queries)
      const queryMatch = response.match(/\{QUERY_REQUEST:\s*{[^}]+}\}/g)
      if (queryMatch) {
        for (const queryStr of queryMatch) {
          try {
            const queryObj = JSON.parse(queryStr.replace('QUERY_REQUEST: ', ''))
            const dados = await executeDataQuery(
              queryObj.tabela,
              queryObj.colunas || '*',
              queryObj.filtros || {},
              queryObj.limit || 100
            )
            // Insere os dados na resposta
            response = response.replace(
              queryStr,
              `[DADOS OBTIDOS: ${dados.length} registros de ${queryObj.tabela}]\n${JSON.stringify(dados).substring(0, 1000)}...`
            )
          } catch (err) {
            console.error('Erro ao executar query:', err)
          }
        }
      }

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
    // Botão flutuante (minimizado) - pequeno normalmente, cresce no hover
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 w-12 h-12 rounded-full shadow-lg hover:shadow-2xl transition-all z-50 flex items-center justify-center hover:scale-125 hover:w-16 hover:h-16 overflow-hidden"
        title="Abrir ClaudIA"
      >
        <img
          src="/claudia-icon.png"
          alt="ClaudIA"
          className="w-full h-full object-cover rounded-full"
        />
      </button>
    )
  }

  // Janela aberta (expansível)
  return (
    <div
      ref={windowRef}
      className="fixed bottom-4 right-4 w-96 rounded-2xl shadow-2xl bg-white z-50 flex flex-col border border-slate-200"
      style={{ height: `${windowHeight}px` }}
    >
      {/* Handle para expandir (drag) */}
      <div
        onMouseDown={handleMouseDown}
        className="h-1 bg-gradient-to-r from-slate-200 to-slate-300 rounded-t-2xl cursor-ns-resize hover:bg-gradient-to-r hover:from-slate-300 hover:to-slate-400 transition-colors"
        title="Arraste para redimensionar"
      />

      {/* Header */}
      <div
        className="px-4 py-4 text-white flex items-center justify-between"
        style={{ backgroundColor: '#233772' }}
      >
        <div className="flex items-center gap-3">
          <img
            src="/claudia-icon.png"
            alt="ClaudIA"
            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
          />
          <div>
            <h2 className="font-bold text-lg">ClaudIA - ERP BIASI</h2>
            <p className="text-xs opacity-90">Assistente de Planejamento</p>
          </div>
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
              Assistente com acesso COMPLETO aos dados da obra.
            </p>
            {allObraData?.obra && (
              <div className="mb-4 text-xs bg-blue-50 p-3 rounded-lg border border-blue-200 max-h-20 overflow-y-auto">
                <p className="font-bold text-blue-900">{allObraData.obra.nome}</p>
                <p className="text-blue-700 mt-1 text-left">
                  ✓ Cronograma ({allObraData.atividades?.length} atividades)
                  <br />✓ EVM ({allObraData.evm?.length} snapshots)
                  <br />✓ Contratos ({allObraData.contratos?.length}) + Medições ({allObraData.medicoes?.length})
                  <br />✓ Suprimentos ({allObraData.pedidos?.length}) · Diário ({allObraData.diario?.length})
                  <br />✓ Tarefas ({allObraData.tarefas?.length})
                </p>
              </div>
            )}
            <div className="text-xs text-slate-600 space-y-2">
              <p>📊 "Qual é meu status financeiro?"</p>
              <p>⚠️ "Quais atividades estão críticas?"</p>
              <p>💰 "Como está o custo vs orçamento?"</p>
              <p>📈 "Análise completa da obra"</p>
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
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: '#233772' }}>
              C
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Loader size={16} className="animate-spin" />
              <span className="text-sm">Analisando todos os dados...</span>
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
