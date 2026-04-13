// ============================================================
// ClaudIA — Google Gemini API Integration
// Especializado em Planejamento e Controle de Obras
// Sistema ERP Biasi Engenharia
// ============================================================

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`

// ============================================================
// HISTÓRICO E ALERTAS
// ============================================================

/**
 * Integra histórico de cronograma para detectar mudanças
 * @param {Array} cronograma_atual - Estado atual
 * @param {Array} cronograma_anterior - Estado anterior
 * @returns {object} Mudanças detectadas
 */
export function analisarMudancasCronograma(cronograma_atual = [], cronograma_anterior = []) {
  if (!cronograma_anterior || cronograma_anterior.length === 0) {
    return { mudancas: [], resumo: 'Primeiro levantamento' }
  }

  const mudancas = []

  // Detecta atrasos em atividades críticas
  cronograma_atual.forEach(atual => {
    const anterior = cronograma_anterior.find(a => a.id === atual.id)
    if (!anterior) return

    // Folga total diminuiu significativamente
    if (anterior.folga_total - atual.folga_total > 2) {
      mudancas.push({
        tipo: 'FOLGA_REDUZIDA',
        atividade_id: atual.id,
        atividade_nome: atual.descricao,
        folga_anterior: anterior.folga_total,
        folga_atual: atual.folga_total,
        severidade: atual.critico ? 'CRÍTICA' : 'atenção',
      })
    }

    // Progresso menor que esperado (trending)
    const dias_passados = Math.max(1, (new Date() - new Date(anterior.data_levantamento)) / (1000 * 60 * 60 * 24))
    const velocidade_esperada = (100 / anterior.duracao_total) * dias_passados
    if (atual.progresso < velocidade_esperada * 0.8) {
      mudancas.push({
        tipo: 'PROGRESSO_LENTO',
        atividade_id: atual.id,
        atividade_nome: atual.descricao,
        progresso_atual: atual.progresso,
        progresso_esperado: velocidade_esperada,
        severidade: 'atenção',
      })
    }
  })

  return {
    mudancas,
    resumo: mudancas.length > 0 ? `${mudancas.length} mudanças detectadas` : 'Sem mudanças significativas',
  }
}

/**
 * Gera alertas automáticos baseado em métricas Aldo Mattos
 * @param {object} evm - Dados de Valor Agregado
 * @param {Array} cronograma - Atividades com folga
 * @returns {Array} Alertas estruturados
 */
export function gerarAlertasAutomaticos(evm = {}, cronograma = []) {
  const alertas = []

  // ALERTA 1: IDP < 0.85 (mais de 15% de atraso)
  if (evm.idp && evm.idp < 0.85) {
    alertas.push({
      tipo: 'ATRASO_CRONOGRAMA',
      severidade: 'CRÍTICA',
      metrica: 'IDP',
      valor: evm.idp,
      mensagem: `Índice de Desempenho de Prazo (IDP) = ${(evm.idp * 100).toFixed(1)}%. Apenas ${(evm.idp * 100).toFixed(1)}% do cronograma foi realizado.`,
      recomendacao: 'Aumentar equipe no caminho crítico ou estender turno. Analisar reprogramação.',
    })
  }

  // ALERTA 2: IDC < 0.95 (mais de 5% acima do orçamento)
  if (evm.idc && evm.idc < 0.95) {
    alertas.push({
      tipo: 'CUSTO_ACIMA',
      severidade: 'ATENÇÃO',
      metrica: 'IDC',
      valor: evm.idc,
      mensagem: `Índice de Desempenho de Custo (IDC) = ${(evm.idc * 100).toFixed(1)}%. Gastando mais que agregado.`,
      recomendacao: `Revisar produtividades. Orçamento estimado no término: R$ ${(evm.orc || 0).toLocaleString('pt-BR')}`,
    })
  }

  // ALERTA 3: Near-critical (FT ≤ 5% do prazo)
  const prazo_total = cronograma.reduce((max, a) => Math.max(max, a.tc || 0), 0)
  const limite_folga = prazo_total * 0.05
  const near_critical = cronograma.filter(a => a.folga_total > 0 && a.folga_total <= limite_folga)

  if (near_critical.length > 0) {
    alertas.push({
      tipo: 'NEAR_CRITICAL',
      severidade: 'ATENÇÃO',
      quantidade: near_critical.length,
      atividades: near_critical.slice(0, 3).map(a => a.descricao),
      mensagem: `${near_critical.length} atividades em situação near-critical (folga ≤ ${limite_folga.toFixed(0)}d).`,
      recomendacao: 'Monitorar proximidade com caminho crítico. Considerar aceleração preventiva.',
    })
  }

  // ALERTA 4: Atividades críticas com progresso baixo
  const criticas_atrasadas = cronograma.filter(a => a.critico && a.progresso < 50)
  if (criticas_atrasadas.length > 0) {
    alertas.push({
      tipo: 'CRÍTICA_ATRASADA',
      severidade: 'CRÍTICA',
      quantidade: criticas_atrasadas.length,
      atividades: criticas_atrasadas.slice(0, 3).map(a => `${a.descricao} (${a.progresso}%)`),
      mensagem: `${criticas_atrasadas.length} atividades críticas com progresso < 50%.`,
      recomendacao: 'Intervenção imediata: aumentar recursos, turno adicional, ou replanejar.',
    })
  }

  return alertas
}

/** System prompt especializado em planejamento de obras
 *  Baseado em Aldo Dórea Mattos - Planejamento e Controle de Obras
 *  Com acesso COMPLETO aos dados da obra */
const SYSTEM_PROMPT = `Você é ClaudIA — especialista em Planejamento e Controle de Obras, baseada na metodologia de Aldo Dórea Mattos.

SUA PERSONALIDADE:
- Pragmático: 38 anos de experiência internacional em obras civis
- Direto: sem bate-papo, apenas fatos e recomendações
- Rigoroso: CPM/PERT, EVM, bases matemáticas
- Interventor: identifica problemas cedo (oportunidade construtiva)
- Preventivo: foco em evitar atrasos e estouros de orçamento

METODOLOGIA CORE (Aldo Mattos):
1. CPM/PERT: IC, TC, IT, TT, Folgas Totais/Livres, Caminho Crítico
2. Precedência: FS, SS, FF, SF com lag
3. EVM: VP, VA, CR → IDC, IDP → ONT, ENT
4. Ciclo PDCA: Planejar → Desempenhar → Checar → Agir (contínuo)
5. Linha de Base (Baseline): comparação Realizado vs Planejado
6. Valor Agregado: avaliação de desempenho custo/prazo em tempo real

FORMATO DE RESPOSTA:
────────────────────
**Métrica**: [Número] [Unidade]
**Status**: [Crítico/Atenção/Normal/Favorável]
**Análise**: [1 frase de diagnóstico]
**Ação Recomendada**: [O que fazer agora, específico]
────────────────────

EXEMPLOS:
✓ "**IDP**: 0.78 | **Status**: Atenção | **Análise**: Apenas 78% do cronograma foi realizado; projeção de 28 dias de atraso. | **Ação**: Aumentar equipe em +3 pessoas no caminho crítico ou estender turno."

✓ "**Folga Crítica**: 3 dias | **Status**: Atenção | **Análise**: Atividade R05 (Concretagem Vigas) passou de folga total de 5 para 3 dias em 1 semana. | **Ação**: Priorizar mobilização de grua e hormigoneira para esta semana."

NÃO FAÇA NUNCA:
❌ Explique como você vai buscar dados / queries / JSON
❌ Conversas pedagogicamente ("entendeu?", "você pode usar isso...")
❌ Cite metodologias genéricas sem conectar à prática
❌ Recomendações vagas ("melhorar produtividade", "acompanhar melhor")
❌ Mostre código ou estrutura técnica

SEMPRE FAÇA:
✅ Análise silenciosa (dados processados internamente)
✅ Números + Contexto + Recomendação Específica
✅ Respostas curtas (máx 5 linhas)
✅ Termine com ação concreta: "Aumentar X em Y para atingir Z"
✅ Use linguagem de obra: frentes, equipes, crítico, folga, baseline

EXPERTISE ESPECÍFICA:
- CPM: Detecte caminho crítico, atividades near-critical (FT ≤5%), paralelizações
- Folgas: Identifique oportunidades de redeslocação de recursos
- Valor Agregado: IDP < 0.90 = alerta vermelho; IDC < 0.95 = alerta financeiro
- Histórico de Cronograma: Compare baseline vs atual, magnitude de replanejamento
- Aceleração: Nunca crash atividades com folga; foco em crítico
- Riscos: Atrasos cascata, dependências de insumo, clima sazonal
- Cronograma: Baseline congelada vs atual; velocidade de mudança

CONTEXTO DA OBRA ATUAL: Você receberá dados reais. Analise SEMPRE comparando com histórico anterior.`

/** Chamada simples à API Gemini
 *  @param {string} mensagem - Mensagem do usuário
 *  @param {object} context - Contexto (obra atual, página, usuário)
 *  @returns {Promise<string>} Resposta da IA */
export async function chat(mensagem, context = {}) {
  if (!GEMINI_API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY não configurada no .env')
  }

  // Constrói contexto da obra se disponível
  let contextParts = []

  // OBRA
  if (context.obraAtual) {
    contextParts.push(`[OBRA]
Nome: ${context.obraAtual.nome}
Cliente: ${context.obraAtual.cliente}
Endereço: ${context.obraAtual.endereco}
Período: ${context.obraAtual.data_inicio} até ${context.obraAtual.data_termino}
Valor Total: R$ ${context.obraAtual.valor_total}
Status: ${context.obraAtual.status}`)
  }

  // CRONOGRAMA
  if (context.cronograma && context.cronograma.length > 0) {
    const criticas = context.cronograma.filter(a => a.critico)
    const emAtraso = context.cronograma.filter(a => a.progresso < 50 && new Date(a.fim_planejado) < new Date())

    contextParts.push(`[CRONOGRAMA - ${context.cronograma.length} atividades]
Críticas: ${criticas.length} | Em atraso: ${emAtraso.length}
Próximas atividades:`)

    context.cronograma.slice(0, 5).forEach(a => {
      contextParts.push(`  - ${a.descricao}: ${a.progresso}% (Folga: ${a.folga_total}d, ${a.critico ? 'CRÍTICA' : 'OK'})`)
    })
  }

  // DEPENDÊNCIAS
  if (context.dependencias && context.dependencias.length > 0) {
    contextParts.push(`[DEPENDÊNCIAS - ${context.dependencias.length}]
${context.dependencias.map(d => `  ${d.tipo_relacao}+${d.lag}d`).join(' | ')}`)
  }

  // EVM
  if (context.evm_historico && context.evm_historico.length > 0) {
    const latest = context.evm_historico[0]
    const desvio_prazo = latest.idp < 1 ? `⚠️ ATRASADO (${(latest.idp * 100).toFixed(1)}%)` : `✅ NA PROGRAMAÇÃO (${(latest.idp * 100).toFixed(1)}%)`
    const desvio_custo = latest.idc < 1 ? `⚠️ ACIMA (${(latest.idc * 100).toFixed(1)}%)` : `✅ DENTRO (${(latest.idc * 100).toFixed(1)}%)`

    contextParts.push(`[EVM - Última análise: ${latest.data}]
VP: R$ ${latest.vp_total} | VA: R$ ${latest.va_total} | VR: R$ ${latest.vr_total}
Desempenho Prazo (IDP): ${desvio_prazo}
Desempenho Custo (IDC): ${desvio_custo}
Orçamento no Término (ORC): R$ ${latest.orc}
Estimativa no Término (EAC): R$ ${latest.eac}`)
  }

  // AVANÇOS FÍSICOS
  if (context.avancos_fisicos && context.avancos_fisicos.length > 0) {
    contextParts.push(`[AVANÇOS - ${context.avancos_fisicos.length} registros]
Atual Global: ${context.avancos_fisicos[0].percentual_global}%
Últimos avanços:`)
    context.avancos_fisicos.slice(0, 3).forEach(a => {
      contextParts.push(`  ${a.data}: ${a.percentual_global}%`)
    })
  }

  // REPROGRAMAÇÕES
  if (context.reprogramacoes && context.reprogramacoes.length > 0) {
    contextParts.push(`[REPROGRAMAÇÕES - ${context.reprogramacoes.length}]
${context.reprogramacoes.slice(0, 3).map(r => `  ${r.status}: ${r.motivo}`).join('\n')}`)
  }

  // FINANCEIRO
  if (context.contratos && context.contratos.length > 0) {
    contextParts.push(`[CONTRATOS & FATURAMENTO - ${context.contratos.length} contratos]
${context.contratos.map(c => `  ${c.numero}: R$ ${c.valor} (${c.status})`).join('\n')}`)
  }

  if (context.medicoes_por_contrato) {
    const totalMedicoes = Object.values(context.medicoes_por_contrato).flat().length
    contextParts.push(`[MEDIÇÕES - ${totalMedicoes} registros]
Últimas medições com status/valor`)
  }

  // SUPRIMENTOS
  if (context.pedidos_compra && context.pedidos_compra.length > 0) {
    const emAberto = context.pedidos_compra.filter(p => p.status !== 'Finalizado').length
    contextParts.push(`[PEDIDOS DE COMPRA - ${context.pedidos_compra.length} total, ${emAberto} em aberto]
${context.pedidos_compra.slice(0, 5).map(p => `  ${p.numero}: R$ ${p.valor} (${p.status})`).join('\n')}`)
  }

  // DIÁRIO DE OBRA
  if (context.diario_obra && context.diario_obra.length > 0) {
    contextParts.push(`[DIÁRIO DE OBRA - ${context.diario_obra.length} entradas]
Última: ${context.diario_obra[0].data} - Clima: ${context.diario_obra[0].clima}`)
  }

  // TAREFAS
  if (context.tarefas && context.tarefas.length > 0) {
    const abertas = context.tarefas.filter(t => t.status === 'Aberta').length
    contextParts.push(`[TAREFAS - ${context.tarefas.length} total, ${abertas} abertas]
Próximas 3: ${context.tarefas.slice(0, 3).map(t => `${t.descricao} (${t.prioridade})`).join(' | ')}`)
  }

  // RECURSOS
  if (context.recursos && context.recursos.length > 0) {
    contextParts.push(`[RECURSOS - ${context.recursos.length} alocados]
${context.recursos.map(r => `  ${r.tipo}: ${r.quantidade}x (R$ ${r.custo_dia}/dia)`).join('\n')}`)
  }

  // USUÁRIO
  if (context.usuario) {
    contextParts.push(`[USUÁRIO - Perfil: ${context.usuario.perfil}]`)
  }

  // Constrói mensagem final com contexto completo
  const contextText = contextParts.join('\n\n')
  const mensagemComContexto = `${contextText}

[PERGUNTA DO USUÁRIO]
${mensagem}`

  try {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: mensagemComContexto,
              },
            ],
          },
        ],
        systemInstruction: {
          parts: [
            {
              text: SYSTEM_PROMPT,
            },
          ],
        },
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 800,
        },
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(
        `Erro Gemini API: ${response.status} - ${errorData?.error?.message || 'Erro desconhecido'}`
      )
    }

    const data = await response.json()

    // Extrai texto da resposta
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      const textPart = data.candidates[0].content.parts[0]
      return textPart.text || 'Sem resposta'
    }

    throw new Error('Formato inesperado na resposta da API')
  } catch (error) {
    console.error('Erro em ClaudIA.chat():', error)
    throw error
  }
}

/** Streaming da resposta (para UI com carregamento progressivo)
 *  @param {string} mensagem - Mensagem do usuário
 *  @param {object} context - Contexto da obra
 *  @returns {AsyncGenerator<string>} Generator de chunks de texto */
export async function* chatStream(mensagem, context = {}) {
  if (!GEMINI_API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY não configurada')
  }

  let contextText = ''
  if (context.obraAtual) {
    contextText = `[CONTEXTO] Obra: ${context.obraAtual.nome || 'N/A'}\n`
  }

  const mensagemComContexto = `${contextText}${mensagem}`

  try {
    // Nota: Gemini Flash não suporta streaming em texto completo
    // Fazemos chamada normal e dividimos em chunks
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: mensagemComContexto,
              },
            ],
          },
        ],
        systemInstruction: {
          parts: [
            {
              text: SYSTEM_PROMPT,
            },
          ],
        },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
    })

    if (!response.ok) {
      throw new Error(`Erro API: ${response.status}`)
    }

    const data = await response.json()
    const fullText = data.candidates[0].content.parts[0].text

    // Simula streaming dividindo por palavras
    const words = fullText.split(' ')
    for (const word of words) {
      yield word + ' '
      // Pequeno delay para efeito de streaming
      await new Promise((resolve) => setTimeout(resolve, 20))
    }
  } catch (error) {
    console.error('Erro em chatStream:', error)
    throw error
  }
}

/** Testa se a API está funcionando
 *  @returns {Promise<boolean>} true se conectada */
export async function testConnection() {
  try {
    const response = await chat('Oi, você está funcionando?', {})
    return !!response
  } catch (error) {
    console.error('Erro ao testar conexão:', error)
    return false
  }
}

/** Lista modelos disponíveis (para debug)
 *  @returns {Promise<Array>} Lista de modelos */
export async function listModels() {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`
    )
    const data = await response.json()
    return data.models || []
  } catch (error) {
    console.error('Erro ao listar modelos:', error)
    return []
  }
}

export default {
  chat,
  chatStream,
  testConnection,
  listModels,
  analisarMudancasCronograma,
  gerarAlertasAutomaticos,
}
