// ============================================================
// ClaudIA — Google Gemini API Integration
// Especializado em Planejamento e Controle de Obras
// Sistema ERP Biasi Engenharia
// ============================================================

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

/** System prompt especializado em planejamento de obras
 *  Baseado em Aldo Dórea Mattos - Planejamento e Controle de Obras */
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
- Aceleração: Nunca crush atividades com folga; foco em crítico
- Riscos: Atrasos cascata, dependências de insumo, clima sazonal
- Cronograma: Baseline congelada vs atual; magnitude de replanejamento`

/** Chamada simples à API Gemini
 *  @param {string} mensagem - Mensagem do usuário
 *  @param {object} context - Contexto (obra atual, página, usuário)
 *  @returns {Promise<string>} Resposta da IA */
export async function chat(mensagem, context = {}) {
  if (!GEMINI_API_KEY) {
    throw new Error('VITE_GEMINI_API_KEY não configurada no .env')
  }

  // Constrói contexto da obra se disponível
  let contextText = ''
  if (context.obraAtual) {
    contextText = `
[CONTEXTO DA OBRA ATUAL]
Nome: ${context.obraAtual.nome || 'Não informado'}
Cliente: ${context.obraAtual.cliente || 'Não informado'}
Endereço: ${context.obraAtual.endereco || 'Não informado'}
Data Início: ${context.obraAtual.data_inicio || 'Não informado'}
Data Prevista: ${context.obraAtual.data_termino || 'Não informado'}
Valor: ${context.obraAtual.valor ? `R$ ${context.obraAtual.valor}` : 'Não informado'}
Status: ${context.obraAtual.status || 'Não informado'}

`
  }

  // Constrói mensagem final com contexto
  const mensagemComContexto = `${contextText}[PERGUNTA DO USUÁRIO]
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
          temperature: 0.3,
          maxOutputTokens: 800,
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
}
