// ─── COMENTÁRIOS DE TAREFAS ────────────────────────────────
export const tarefasComentariosService = {
  async listarPorTarefa(tarefaId) {
    const { data, error } = await supabase
      .from('tarefas_comentarios')
      .select('*, autor:perfis(id, nome, avatar)')
      .eq('tarefa_id', tarefaId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },
  async criar({ tarefa_id, autor_id, comentario }) {
    const { data, error } = await supabase
      .from('tarefas_comentarios')
      .insert({ tarefa_id, autor_id, comentario })
      .select('*, autor:perfis(id, nome, avatar)')
      .single();
    if (error) throw error;
    return data;
  },
  async remover(id) {
    const { error } = await supabase
      .from('tarefas_comentarios')
      .delete()
      .eq('id', id);
    if (error) throw error;
    return true;
  }
};

// ─── HISTÓRICO DE TAREFAS ──────────────────────────────────
export const tarefasHistoricoService = {
    async listarPorTarefa(tarefaId) {
      const { data, error } = await supabase
        .from('tarefas_historico')
        .select('*, alterado_por:perfis(id, nome, avatar)')
        .eq('tarefa_id', tarefaId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data
    },
    async registrar({ tarefa_id, acao, valor_anterior, valor_novo, alterado_por }) {
      const { data, error } = await supabase
        .from('tarefas_historico')
        .insert({ tarefa_id, acao, valor_anterior, valor_novo, alterado_por })
        .select('*, alterado_por:perfis(id, nome, avatar)')
        .single()
      if (error) throw error
      return data
    }
  }

// ─── ATIVIDADES DO PLANEJAMENTO ─────────────────────────────

export const atividadesService = {
  // Busca atividades do planejamento de uma obra, cruzando obra_planejamentos -> planejamento_atividades
  async listarPorObra(obraId) {
    // 1. Buscar planejamento_id da obra
    const { data: planejamentos, error: erroPlanejamento } = await supabase
      .from('obra_planejamentos')
      .select('id')
      .eq('obra_id', obraId)
      .limit(1);
    if (erroPlanejamento) throw erroPlanejamento;
    const planejamentoId = planejamentos && planejamentos.length > 0 ? planejamentos[0].id : null;
    if (!planejamentoId) return [];
    // 2. Buscar atividades desse planejamento
    const { data: atividades, error: erroAtividades } = await supabase
      .from('planejamento_atividades')
      .select('*')
      .eq('planejamento_id', planejamentoId)
      .order('codigo');
    if (erroAtividades) throw erroAtividades;
    return atividades || [];
  }
}

import { createClient } from '@supabase/supabase-js'


const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const SUPABASE_TIMEOUT_MS = 12000

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não configuradas.')
}

async function fetchWithTimeout(input, init = {}) {
  const controller = new AbortController()
  const timeout = globalThis.setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS)
  const onAbort = () => controller.abort()

  if (init.signal) {
    if (init.signal.aborted) {
      controller.abort()
    } else {
      init.signal.addEventListener('abort', onAbort, { once: true })
    }
  }

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    })
  } finally {
    globalThis.clearTimeout(timeout)
    if (init.signal) {
      init.signal.removeEventListener('abort', onAbort)
    }
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit',   // Hub passa access_token via URL hash → precisa de implicit
    storage: globalThis.localStorage,
  },
  global: {
    fetch: fetchWithTimeout,
  },
})

// ─── PAGINAÇÃO AUTOMÁTICA ─────────────────────────────────────
// O Supabase tem limite de 1000 linhas por request REST.
// Esta função busca todas as páginas automaticamente.
//
// @param {Function} queryFn - função (from: number, to: number) => SupabaseQuery
//   Deve criar uma nova query a cada chamada para evitar reutilização de builder.
// @param {number} pageSize - registros por request (máx 1000, padrão 1000)
// @returns {Promise<Array>} - todos os registros concatenados
//
// Exemplo de uso:
//   fetchAll((f, t) => supabase.from('tabela').select('*').order('campo').range(f, t))
export async function fetchAll(queryFn, pageSize = 1000) {
  let allData = []
  let offset = 0
  while (true) {
    const { data, error } = await queryFn(offset, offset + pageSize - 1)
    if (error) throw error
    allData = allData.concat(data || [])
    if (!data || data.length < pageSize) break   // última página
    offset += pageSize
  }
  return allData
}

// ─── OBRAS ────────────────────────────────────────────────────
export const obrasService = {
  async listar() {
    // 401+ obras e crescendo — paginação automática
    return fetchAll((f, t) =>
      supabase.from('obras').select('*').order('created_at', { ascending: false }).range(f, t)
    )
  },
  async buscarPorId(id) {
    const { data, error } = await supabase
      .from('obras')
      .select('*, responsavel:perfis(nome, email, avatar)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  },
  async criar(obra) {
    const { data, error } = await supabase
      .from('obras')
      .insert(obra)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async atualizar(id, obra) {
    const { data, error } = await supabase
      .from('obras')
      .update(obra)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },
  async resumo() {
    const { data, error } = await supabase
      .from('vw_resumo_obras')
      .select('*');
    if (error) throw error;
    return data;
  }
};

// ─── SOFT DELETE DE TAREFA ───────────────────────────────────
export async function softDeleteTarefa(id) {
  const { data, error } = await supabase
    .from('tarefas')
    .update({ deletado_em: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── EAP ──────────────────────────────────────────────────────
export const eapService = {
  async listarPorObra(obraId) {
    const { data, error } = await supabase
      .from('eap_itens')
      .select('*')
      .eq('obra_id', obraId)
      .order('ordem')
    if (error) throw error
    return data
  },

  async criar(item) {
    const { data, error } = await supabase
      .from('eap_itens')
      .insert(item)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async importarLote(itens) {
    const { data, error } = await supabase
      .from('eap_itens')
      .insert(itens)
      .select()
    if (error) throw error
    return data
  }
}

// ─── PERÍODOS ─────────────────────────────────────────────────
export const periodosService = {
  async listarPorObra(obraId) {
    const { data, error } = await supabase
      .from('periodos')
      .select('*')
      .eq('obra_id', obraId)
      .order('numero')
    if (error) throw error
    return data
  },

  async gerarMensais(obraId, dataInicio, dataFim) {
    // Gera períodos mensais automaticamente entre dataInicio e dataFim
    const periodos = []
    let atual = new Date(dataInicio)
    const fim = new Date(dataFim)
    let numero = 1

    while (atual <= fim) {
      const inicioMes = new Date(atual.getFullYear(), atual.getMonth(), 1)
      const fimMes = new Date(atual.getFullYear(), atual.getMonth() + 1, 0)
      const nomeMes = inicioMes.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

      periodos.push({
        obra_id: obraId,
        numero,
        nome: nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1),
        data_inicio: inicioMes.toISOString().split('T')[0],
        data_fim: fimMes.toISOString().split('T')[0],
        tipo: 'mensal'
      })

      atual = new Date(atual.getFullYear(), atual.getMonth() + 1, 1)
      numero++
    }

    const { data, error } = await supabase
      .from('periodos')
      .insert(periodos)
      .select()
    if (error) throw error
    return data
  }
}

// ─── CRONOGRAMA ───────────────────────────────────────────────
export const cronogramaService = {
  async listarPorObra(obraId) {
    const { data, error } = await supabase
      .from('cronograma')
      .select('*, eap_item:eap_itens(codigo, descricao, peso_percentual), periodo:periodos(nome, numero)')
      .eq('eap_item.obra_id', obraId)
      .order('periodo.numero')
    if (error) throw error
    return data
  },

  async salvarBaseline(itens) {
    const { data, error } = await supabase
      .from('cronograma')
      .upsert(itens, { onConflict: 'eap_item_id,periodo_id' })
      .select()
    if (error) throw error
    return data
  }
}

// ─── MEDIÇÕES ─────────────────────────────────────────────────
export const medicoesService = {
  async listarPorObra(obraId, periodoId = null) {
    let query = supabase
      .from('medicoes')
      .select('*, eap_item:eap_itens(codigo, descricao, peso_percentual, obra_id), periodo:periodos(nome, numero)')
      .eq('eap_item.obra_id', obraId)

    if (periodoId) query = query.eq('periodo_id', periodoId)

    const { data, error } = await query.order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async salvar(medicao) {
    const { data, error } = await supabase
      .from('medicoes')
      .upsert(medicao, { onConflict: 'eap_item_id,periodo_id' })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async aprovar(id, aprovadoPor) {
    const { data, error } = await supabase
      .from('medicoes')
      .update({
        status: 'aprovado',
        aprovado_por: aprovadoPor,
        data_aprovacao: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async pendentes() {
    const { data, error } = await supabase
      .from('vw_medicoes_pendentes')
      .select('*')
    if (error) throw error
    return data
  }
}

// ─── DIÁRIO DE OBRA ───────────────────────────────────────────
export const diarioService = {
  async listarPorObra(obraId) {
    const { data, error } = await supabase
      .from('diario_obra')
      .select('*, criado_por:perfis(nome, avatar)')
      .eq('obra_id', obraId)
      .order('data', { ascending: false })
    if (error) throw error
    return data
  },

  async salvar(diario) {
    const { data, error } = await supabase
      .from('diario_obra')
      .upsert(diario, { onConflict: 'obra_id,data' })
      .select()
      .single()
    if (error) throw error
    return data
  }
}

// ─── TAREFAS ──────────────────────────────────────────────────
export const tarefasService = {
  async listarPorObra(obraId) {
    let query = supabase
      .from('tarefas')
      .select('*')
      .order('created_at', { ascending: false })
    if (obraId) query = query.eq('obra_id', obraId)
    const { data, error } = await query
    if (error) throw error
    return data
  },

  async criar(tarefa) {
    const { data, error } = await supabase
      .from('tarefas')
      .insert(tarefa)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async atualizarStatus(id, status) {
    const { data, error } = await supabase
      .from('tarefas')
      .update({ status })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  }
}

// ─── USUÁRIOS / PERFIS ────────────────────────────────────────
export const perfisService = {
  async listar() {
    const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .order('nome')
    if (error) throw error
    return data
  },

  async buscarPorId(id) {
    const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error

    // Carrega obras vinculadas se não for admin/diretor/gerente/master
    if (!['admin', 'diretor', 'gerente', 'master'].includes(data.perfil)) {
      try {
        const { data: acessos, error: acessoError } = await supabase
          .from('usuario_obra')
          .select('obra_id')
          .eq('usuario_id', id)
        if (!acessoError && acessos) {
          data.obras_vinculadas = acessos.map(a => a.obra_id)
        }
      } catch {
        // Se houver erro ao carregar obras_vinculadas, continua sem ela
        data.obras_vinculadas = []
      }
    }

    return data
  },

  async criar(usuario) {
    // Cria usuário no auth e perfil
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: usuario.email,
      password: usuario.senha,
      email_confirm: true
    })
    if (authError) throw authError

    const { data, error } = await supabase
      .from('perfis')
      .insert({
        id: authData.user.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil,
        avatar: usuario.nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase(),
        ativo: true
      })
      .select()
      .single()
    if (error) throw error
    return data
  },

  async atualizar(id, dados) {
    const { data, error } = await supabase
      .from('perfis')
      .update(dados)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async atualizarUltimoAcesso(id) {
    await supabase
      .from('perfis')
      .update({ ultimo_acesso: new Date().toISOString() })
      .eq('id', id)
  }
}

// ─── CONTRATOS (Sienge) ──────────────────────────────────────
export const contratosService = {
  async listarTodos() {
    // 336 contratos e crescendo — paginação automática
    return fetchAll((f, t) =>
      supabase.from('contratos').select('*').order('created_at', { ascending: false }).range(f, t)
    )
  },

  async listarPorObra(obraId) {
    const { data, error } = await supabase
      .from('contratos')
      .select('*')
      .eq('obra_id', obraId)
      .range(0, 9999)
      .order('data_contrato', { ascending: false })
    if (error) throw error
    return data
  },

  async buscarPorId(id) {
    const { data, error } = await supabase
      .from('contratos')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async resumoPorObra(obraId) {
    const { data, error } = await supabase
      .from('contratos')
      .select('valor_total, valor_mao_obra, valor_material, status')
      .eq('obra_id', obraId)
      .range(0, 9999)
    if (error) throw error
    const total = data.reduce((s, c) => s + (parseFloat(c.valor_total) || 0), 0)
    const maoObra = data.reduce((s, c) => s + (parseFloat(c.valor_mao_obra) || 0), 0)
    const material = data.reduce((s, c) => s + (parseFloat(c.valor_material) || 0), 0)
    const porStatus = data.reduce((acc, c) => { acc[c.status] = (acc[c.status] || 0) + 1; return acc }, {})
    return { totalContratos: data.length, valorTotal: total, maoObra, material, porStatus }
  },
}

// ─── MEDIÇÕES DE CONTRATO (Sienge) ───────────────────────────
export const medicoesContratoService = {
  async listarTodos() {
    // Banco tem 3000+ registros — paginação automática para superar o limite de 1000/request
    return fetchAll((f, t) =>
      supabase.from('medicoes_contrato').select('*').order('data_medicao', { ascending: false }).range(f, t)
    )
  },

  async listarPorObra(obraId) {
    const { data, error } = await supabase
      .from('medicoes_contrato')
      .select('*')
      .eq('obra_id', obraId)
      .order('data_medicao', { ascending: false })
    if (error) throw error
    return data
  },

  async listarPorContrato(docId, contractNum) {
    const { data, error } = await supabase
      .from('medicoes_contrato')
      .select('*')
      .eq('contrato_doc_id', docId)
      .eq('contrato_num', contractNum)
      .order('numero_medicao', { ascending: true })
    if (error) throw error
    return data
  },

  async resumoPorObra(obraId) {
    const { data, error } = await supabase
      .from('medicoes_contrato')
      .select('valor_liquido, valor_mao_obra, valor_material, data_medicao, aprovacao, finalizada')
      .eq('obra_id', obraId)
      .range(0, 9999)
    if (error) throw error
    const totalMedido = data.reduce((s, m) => s + (parseFloat(m.valor_liquido) || 0), 0)
    const pendentes = data.filter(m => m.aprovacao === 'pendente').length
    const finalizadas = data.filter(m => m.finalizada).length
    return { totalMedicoes: data.length, totalMedido, pendentes, finalizadas }
  },

  async proximosVencimentos(dias = 30) {
    const hoje = new Date().toISOString().split('T')[0]
    const limite = new Date()
    limite.setDate(limite.getDate() + dias)
    const limiteStr = limite.toISOString().split('T')[0]
    const { data, error } = await supabase
      .from('medicoes_contrato')
      .select('*')
      .gte('data_vencimento', hoje)
      .lte('data_vencimento', limiteStr)
      .eq('finalizada', false)
      .range(0, 9999)
      .order('data_vencimento', { ascending: true })
    if (error) throw error
    return data
  },
}

// ─── PEDIDOS DE COMPRA (Sienge) ──────────────────────────────
export const pedidosCompraService = {
  async listarTodos() {
    // Banco tem 1800+ registros — paginação automática para superar o limite de 1000/request
    return fetchAll((f, t) =>
      supabase.from('pedidos_compra').select('*').order('data_pedido', { ascending: false }).range(f, t)
    )
  },

  async listarPorObra(obraId) {
    const { data, error } = await supabase
      .from('pedidos_compra')
      .select('*')
      .eq('obra_id', obraId)
      .range(0, 9999)
      .order('data_pedido', { ascending: false })
    if (error) throw error
    return data
  },

  async resumoPorObra(obraId) {
    const { data, error } = await supabase
      .from('pedidos_compra')
      .select('valor_total, status, autorizado')
      .eq('obra_id', obraId)
      .range(0, 9999)
    if (error) throw error
    const total = data.reduce((s, p) => s + (parseFloat(p.valor_total) || 0), 0)
    const pendentes = data.filter(p => !p.autorizado).length
    return { totalPedidos: data.length, valorTotal: total, pendentes }
  },
}

// ─── NOTAS FISCAIS (Sienge) ─────────────────────────────────
export const notasFiscaisService = {
  async listarTodos() {
    return fetchAll((f, t) =>
      supabase.from('notas_fiscais').select('*').order('data_emissao', { ascending: false }).range(f, t)
    )
  },
  async listarPorObra(obraId) {
    const { data, error } = await supabase.from('notas_fiscais').select('*').eq('obra_id', obraId).order('data_emissao', { ascending: false })
    if (error) throw error
    return data
  },
}

// ─── SOLICITAÇÕES DE COMPRA (Sienge) ────────────────────────
export const solicitacoesService = {
  async listarTodos() {
    // 1446 solicitações no Sienge — paginação automática
    return fetchAll((f, t) =>
      supabase.from('solicitacoes_compra').select('*').order('data_solicitacao', { ascending: false }).range(f, t)
    )
  },
  async listarPorObra(obraId) {
    const { data, error } = await supabase.from('solicitacoes_compra').select('*').eq('obra_id', obraId).order('data_solicitacao', { ascending: false })
    if (error) throw error
    return data
  },
}

// ─── COTAÇÕES (Sienge) ──────────────────────────────────────
export const cotacoesService = {
  async listarTodos() {
    return fetchAll((f, t) =>
      supabase.from('cotacoes').select('*').order('data_cotacao', { ascending: false }).range(f, t)
    )
  },
  async listarPorObra(obraId) {
    const { data, error } = await supabase.from('cotacoes').select('*').eq('obra_id', obraId).order('data_cotacao', { ascending: false })
    if (error) throw error
    return data
  },
}

// ─── ORÇAMENTOS SIENGE (por obra) ───────────────────────────
export const orcamentosSiengeService = {
  async listarPorObra(obraId) {
    const { data, error } = await supabase.from('orcamentos_sienge').select('*').eq('obra_id', obraId).order('wbs_code')
    if (error) throw error
    return data
  },

  async listarTodos() {
    return fetchAll((f, t) =>
      supabase
        .from('orcamentos_sienge')
        .select('obra_id, valor_total, valor_mo, valor_material, valor_equipamento, valor_transporte')
        .range(f, t)
    )
    // Nota: sem .order() aqui pois o agrupamento por obra_id é feito no frontend
  },

  async resumoPorObra(obraId) {
    const { data, error } = await supabase
      .from('orcamentos_sienge')
      .select('valor_total, valor_mo, valor_material, valor_equipamento, valor_transporte')
      .eq('obra_id', obraId)
    if (error) throw error
    const bac = data.reduce((s, i) => s + (parseFloat(i.valor_total) || 0), 0)
    const bacMo = data.reduce((s, i) => s + (parseFloat(i.valor_mo) || 0), 0)
    const bacMat = data.reduce((s, i) => s + (parseFloat(i.valor_material) || 0), 0)
    return { bac, bacMo, bacMat, itens: data.length }
  },
}

// ─── ESTOQUE SIENGE (por obra) ──────────────────────────────
export const estoqueSiengeService = {
  async listarPorObra(obraId) {
    const { data, error } = await supabase.from('estoque_sienge').select('*').eq('obra_id', obraId).order('recurso_descricao')
    if (error) throw error
    return data
  },
}

// ─── SYNC CONTROL ───────────────────────────────────────────
export const syncControlService = {
  async listar() {
    const { data, error } = await supabase.from('sienge_sync_control').select('*').order('modulo')
    if (error) throw error
    return data
  },
}

// ─── IMPORTAÇÃO SIENGE ────────────────────────────────────────
export const siengeService = {
  /**
   * Importa obras/contratos a partir de CSV/XLSX do Sienge
   * O arquivo deve ter as colunas: codigo, nome, cliente, contrato,
   * data_inicio, data_fim_prevista, valor_contrato
   */
  async importarObras(registros, importadoPor) {
    // Log da importação
    const { data: log, error: logError } = await supabase
      .from('importacoes_sienge')
      .insert({
        tipo: 'obras',
        arquivo_nome: 'sienge_obras.csv',
        status: 'processando',
        registros_total: registros.length,
        importado_por: importadoPor
      })
      .select()
      .single()
    if (logError) throw logError

    const erros = []
    let importados = 0

    for (const reg of registros) {
      try {
        await supabase
          .from('obras')
          .upsert({
            codigo: reg.codigo,
            nome: reg.nome,
            cliente: reg.cliente,
            contrato: reg.contrato,
            data_inicio: reg.data_inicio,
            data_fim_prevista: reg.data_fim_prevista,
            valor_contrato: parseFloat(String(reg.valor_contrato).replace(/[^0-9.]/g, '')) || 0,
            status: 'ativa'
          }, { onConflict: 'codigo' })
        importados++
      } catch (e) {
        erros.push({ registro: reg.codigo, erro: e.message })
      }
    }

    // Atualiza log
    await supabase
      .from('importacoes_sienge')
      .update({
        status: erros.length > 0 ? 'concluido' : 'concluido',
        registros_importados: importados,
        erros: erros
      })
      .eq('id', log.id)

    return { importados, erros, logId: log.id }
  }
}

// ─── PLANEJAMENTO ─────────────────────────────────────────────────
export const planejamentoService = {
  // ─── EAP CRUD ──────────────────────────────────────────────
  async listarEapPorObra(obraId, versao = null) {
    try {
      let query = supabase
        .from('obra_planejamentos')
        .select('*')
        .eq('obra_id', obraId)

      if (versao) {
        query = query.eq('versao', versao)
      } else {
        query = query.eq('status', 'aprovado').order('versao', { ascending: false })
      }

      const { data: planejamento, error: pError } = await query.limit(1).single()

      // Se a tabela não existe ou nenhum planejamento encontrado, retorna vazio
      if (pError) {
        if (pError.code === 'PGRST116' || pError.code === '42P01') {
          // PGRST116 = nenhuma linha, 42P01 = tabela não existe
          return { eap_itens: [], planejamento_metadata: null }
        }
        throw pError
      }

      if (!planejamento) return { eap_itens: [], planejamento_metadata: null }

      const { data: eapItens, error: eError } = await supabase
        .from('planejamento_eap')
        .select('*')
        .eq('planejamento_id', planejamento.id)
        .order('hierarquia')

      if (eError) {
        if (eError.code === '42P01') {
          return { eap_itens: [], planejamento_metadata: planejamento }
        }
        throw eError
      }

      return { eap_itens: eapItens || [], planejamento_metadata: planejamento }
    } catch (err) {
      console.warn('[planejamentoService] Aviso ao listar EAP:', err.message)
      // Não lançar erro - retornar estado vazio para que página renderize mesmo sem dados
      return { eap_itens: [], planejamento_metadata: null }
    }
  },

  async criarEap(obraId, eapItems) {
    try {
      // Cria novo planejamento (versão)
      const { data: planejamento, error: pError } = await supabase
        .from('obra_planejamentos')
        .insert({
          obra_id: obraId,
          versao: 1,
          status: 'rascunho',
          criado_por: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single()
      if (pError) throw pError

      // Insere itens EAP
      const eapComPlanejamento = eapItems.map(item => ({
        ...item,
        planejamento_id: planejamento.id
      }))

      const { data: itens, error: eError } = await supabase
        .from('planejamento_eap')
        .insert(eapComPlanejamento)
        .select()
      if (eError) throw eError

      return { id: planejamento.id, versao: 1, criado_em: planejamento.created_at, itens }
    } catch (err) {
      console.error('Erro ao criar EAP:', err)
      throw err
    }
  },

  async atualizarEapItem(eapItemId, atualizacoes) {
    try {
      const { data, error } = await supabase
        .from('planejamento_eap')
        .update(atualizacoes)
        .eq('id', eapItemId)
        .select()
        .single()
      if (error) throw error
      return data
    } catch (err) {
      console.error('Erro ao atualizar EAP item:', err)
      throw err
    }
  },

  // ─── ATIVIDADES ────────────────────────────────────────────
  async listarAtividadesPorEap(eapItemId) {
    try {
      const { data: atividades, error } = await supabase
        .from('planejamento_atividades')
        .select('*')
        .eq('eap_item_id', eapItemId)
        .order('ordem')

      if (error) {
        if (error.code === '42P01') { // tabela não existe
          return { atividades: [], caminho_critico: [] }
        }
        throw error
      }

      // TODO: Calcular caminho crítico (topological sort com durações)
      return { atividades: atividades || [], caminho_critico: [] }
    } catch (err) {
      console.warn('[planejamentoService] Aviso ao listar atividades:', err.message)
      return { atividades: [], caminho_critico: [] }
    }
  },

  async criarAtividade(eapItemId, planejamentoId, atividade) {
    try {
      const { data, error } = await supabase
        .from('planejamento_atividades')
        .insert({
          ...atividade,
          eap_item_id: eapItemId,
          planejamento_id: planejamentoId,
          criado_por: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single()
      if (error) throw error
      return data
    } catch (err) {
      console.error('Erro ao criar atividade:', err)
      throw err
    }
  },

  async atualizarAtividade(atividadeId, atualizacoes) {
    try {
      const { data, error } = await supabase
        .from('planejamento_atividades')
        .update(atualizacoes)
        .eq('id', atividadeId)
        .select()
        .single()
      if (error) throw error
      return data
    } catch (err) {
      console.error('Erro ao atualizar atividade:', err)
      throw err
    }
  },

  // ─── AVANÇOS (APONTAMENTO) ───────────────────────────────
  async registrarAvanco(atividadeId, pesoRealizado, observacoes = '') {
    try {
      const dataRef = new Date().toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('avancos_fisicos')
        .upsert({
          atividade_id: atividadeId,
          data_ref: dataRef,
          peso_realizado_perc: pesoRealizado,
          observacoes,
          registrado_por: (await supabase.auth.getUser()).data.user?.id
        }, { onConflict: 'atividade_id,data_ref' })
        .select()
        .single()
      if (error) throw error
      return data
    } catch (err) {
      console.error('Erro ao registrar avanço:', err)
      throw err
    }
  },

  async listarAvancosSemanais(planejamentoId, dataSemana) {
    try {
      const dataFim = new Date(dataSemana)
      dataFim.setDate(dataFim.getDate() + 7)

      const { data: avancos, error } = await supabase
        .from('avancos_fisicos')
        .select('*')
        .eq('planejamento_id', planejamentoId)
        .gte('data_ref', dataSemana)
        .lt('data_ref', dataFim.toISOString().split('T')[0])
        .order('data_ref')
      if (error) throw error

      // Calcular status geral (média ponderada)
      const statusGeral = avancos.length > 0
        ? avancos.reduce((sum, a) => sum + a.peso_realizado_perc, 0) / avancos.length
        : 0

      return { avancos: avancos || [], status_geral_perc: statusGeral }
    } catch (err) {
      console.error('Erro ao listar avanços:', err)
      throw err
    }
  },

  // ─── EVM ──────────────────────────────────────────────────
  async calcularEvm(planejamentoId) {
    try {
      const { data: snapshots, error } = await supabase
        .from('evm_snapshots')
        .select('*')
        .eq('planejamento_id', planejamentoId)
        .order('semana_ref', { ascending: false })
        .limit(1)

      if (error) {
        if (error.code === '42P01') { // tabela não existe
          return { VP: 0, VA: 0, CR: 0, IDC: 0, IDP: 0, desvios: {} }
        }
        throw error
      }

      if (!snapshots || snapshots.length === 0) {
        return { VP: 0, VA: 0, CR: 0, IDC: 0, IDP: 0, desvios: {} }
      }

      const latest = snapshots[0]
      return {
        VP: latest.vp,
        VA: latest.va,
        CR: latest.cr,
        IDC: latest.idc || 0,
        IDP: latest.idp || 0,
        desvios: { custo: latest.desvio_custo, prazo: latest.desvio_prazo },
        EAC: latest.eac || 0
      }
    } catch (err) {
      console.warn('[planejamentoService] Aviso ao calcular EVM:', err.message)
      return { VP: 0, VA: 0, CR: 0, IDC: 0, IDP: 0, desvios: {} }
    }
  },

  async obterSnapshotsEvm(planejamentoId, periodoMeses = 12) {
    try {
      const dataLimite = new Date()
      dataLimite.setMonth(dataLimite.getMonth() - periodoMeses)

      const { data: snapshots, error } = await supabase
        .from('vw_evm_mensal')
        .select('*')
        .eq('planejamento_id', planejamentoId)
        .gte('mes', dataLimite.toISOString().split('T')[0])
        .order('mes')

      if (error) {
        if (error.code === '42P01') { // tabela ou view não existe
          return []
        }
        throw error
      }

      return snapshots || []
    } catch (err) {
      console.warn('[planejamentoService] Aviso ao obter snapshots EVM:', err.message)
      return []
    }
  },

  // ─── REPROGRAMAÇÃO ────────────────────────────────────────
  async solicitarReprogramacao(atividadeId, dataNova, motivo) {
    try {
      const { data: atividade, error: aError } = await supabase
        .from('planejamento_atividades')
        .select('planejamento_id, data_inicio')
        .eq('id', atividadeId)
        .single()
      if (aError) throw aError

      const { data, error } = await supabase
        .from('reprogramacoes')
        .insert({
          planejamento_id: atividade.planejamento_id,
          atividade_id: atividadeId,
          data_original: atividade.data_inicio,
          data_nova: dataNova,
          motivo,
          solicitado_por: (await supabase.auth.getUser()).data.user?.id,
          status: 'pendente'
        })
        .select()
        .single()
      if (error) throw error

      return { id: data.id, status: 'aguardando_aprovacao' }
    } catch (err) {
      console.error('Erro ao solicitar reprogramação:', err)
      throw err
    }
  },

  async aprovarReprogramacao(reprogramacaoId) {
    try {
      const { data: reprog, error: rError } = await supabase
        .from('reprogramacoes')
        .select('atividade_id, data_nova')
        .eq('id', reprogramacaoId)
        .single()
      if (rError) throw rError

      // Atualizar atividade com nova data
      await supabase
        .from('planejamento_atividades')
        .update({
          data_inicio: reprog.data_nova,
          data_fim: reprog.data_nova // TODO: recalcular data_fim baseado em duração
        })
        .eq('id', reprog.atividade_id)

      // Marcar reprogramação como aprovada
      const { data, error } = await supabase
        .from('reprogramacoes')
        .update({
          status: 'aprovada',
          aprovado_por: (await supabase.auth.getUser()).data.user?.id,
          data_aprovacao: new Date().toISOString()
        })
        .eq('id', reprogramacaoId)
        .select()
        .single()
      if (error) throw error

      return data
    } catch (err) {
      console.error('Erro ao aprovar reprogramação:', err)
      throw err
    }
  },

  async rejeitarReprogramacao(reprogramacaoId, motivoRejeicao) {
    try {
      const { data, error } = await supabase
        .from('reprogramacoes')
        .update({
          status: 'rejeitada',
          motivo_rejeicao: motivoRejeicao,
          aprovado_por: (await supabase.auth.getUser()).data.user?.id,
          data_aprovacao: new Date().toISOString()
        })
        .eq('id', reprogramacaoId)
        .select()
        .single()
      if (error) throw error

      return data
    } catch (err) {
      console.error('Erro ao rejeitar reprogramação:', err)
      throw err
    }
  },

  // ─── BASELINE ──────────────────────────────────────────────
  criarBaseline(obraId) {
    try {
      // TODO: Implementar lógica de criação de baseline EAP do Sienge
      // - Buscar contratos e medições
      // - Criar estrutura EAP (L1: Fases, L2: Grupos, L3: Serviços)
      // - Criar atividades
      // - Criar baseline EVM
      console.log('📋 criarBaseline para obra ' + obraId + ' (não implementado)')
      return null
    } catch (err) {
      console.error('Erro ao criar baseline:', err)
      throw err
    }
  },

  async versaoAtual(obraId) {
    try {
      const { data, error } = await supabase
        .from('obra_planejamentos')
        .select('*')
        .eq('obra_id', obraId)
        .eq('status', 'aprovado')
        .order('versao', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116' || error.code === '42P01') { // nenhuma linha ou tabela não existe
          return null
        }
        throw error
      }

      return data || null
    } catch (err) {
      console.warn('[planejamentoService] Aviso ao obter versão atual:', err.message)
      return null
    }
  }
}

// ─── MÃO DE OBRA — CARGOS ────────────────────────────────────
export const moCargosService = {
  async listar() {
    const { data, error } = await supabase
      .from('mo_cargos')
      .select('*')
      .eq('ativo', true)
      .order('rateio')
      .order('cargo')
    // Se a tabela não existe ainda, retorna lista vazia sem erro
    if (error) {
      if (error.code === '42P01') return []
      throw error
    }
    return data || []
  },

  async criar(cargo) {
    const { data, error } = await supabase
      .from('mo_cargos')
      .insert(cargo)
      .select()
      .single()
    if (error) throw error
    return data
  },

  // Insere ou retorna existente pelo codigo_cargo (idempotente)
  async upsertPorCodigo(cargo) {
    // Verificar se já existe pelo codigo_cargo
    const { data: existente } = await supabase
      .from('mo_cargos')
      .select('*')
      .eq('codigo_cargo', cargo.codigo_cargo)
      .single()
    if (existente) return existente
    // Não existe, inserir
    const { data, error } = await supabase
      .from('mo_cargos')
      .insert(cargo)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async atualizar(id, cargo) {
    const { data, error } = await supabase
      .from('mo_cargos')
      .update({ ...cargo, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async excluir(id) {
    const { error } = await supabase
      .from('mo_cargos')
      .update({ ativo: false })
      .eq('id', id)
    if (error) throw error
  },
}

// ─── MÃO DE OBRA — CONFIGURAÇÃO DE ENCARGOS ──────────────────
export const moConfigService = {
  async listar() {
    const { data, error } = await supabase
      .from('mo_config_encargos')
      .select('*')
      .eq('ativo', true)
      .order('tipo')
      .order('nome')
    if (error) {
      if (error.code === '42P01') return []
      throw error
    }
    return data || []
  },

  async atualizar(id, valores) {
    const { data, error } = await supabase
      .from('mo_config_encargos')
      .update(valores)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },
}

// ─── MÃO DE OBRA — PLANEJAMENTO POR OBRA ─────────────────────
export const moPlanejamentoService = {
  async listarPorObra(obraId, { mes, ano } = {}) {
    let q = supabase
      .from('mo_planejamento')
      .select('*, cargo:mo_cargos(*)')
      .eq('obra_id', obraId)
      .order('created_at')
    if (mes) q = q.eq('mes_referencia', mes)
    if (ano) q = q.eq('ano_referencia', ano)
    const { data, error } = await q
    if (error) {
      if (error.code === '42P01') return []
      throw error
    }
    return data || []
  },

  async salvar(item) {
    const user = (await supabase.auth.getUser()).data.user
    const payload = { ...item, created_by: user?.id, updated_at: new Date().toISOString() }
    if (item.id) {
      const { data, error } = await supabase
        .from('mo_planejamento')
        .update(payload)
        .eq('id', item.id)
        .select('*, cargo:mo_cargos(*)')
        .single()
      if (error) throw error
      return data
    }
    const { data, error } = await supabase
      .from('mo_planejamento')
      .insert(payload)
      .select('*, cargo:mo_cargos(*)')
      .single()
    if (error) throw error
    return data
  },

  async excluir(id) {
    const { error } = await supabase
      .from('mo_planejamento')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  async listarTodas({ mes, ano } = {}) {
    let q = supabase
      .from('mo_planejamento')
      .select('*, cargo:mo_cargos(*), obra:obras(id, nome)')
      .order('obra_id')
      .order('created_at')
    if (mes) q = q.eq('mes_referencia', mes)
    if (ano) q = q.eq('ano_referencia', ano)
    const { data, error } = await q
    if (error) {
      if (error.code === '42P01') return []
      throw error
    }
    return data || []
  },
}

// ─── DESPESAS INDIRETAS ──────────────────────────────────────
// Tabela: despesas_indiretas (id, obra_id, mes, ano, categoria, descricao, valor, criado_por, criado_em)
export const despesasIndiretasService = {
  async listar({ obraId, mes, ano } = {}) {
    let q = supabase
      .from('despesas_indiretas')
      .select('*, obra:obras(id, nome)')
      .order('ano', { ascending: false })
      .order('mes', { ascending: false })
      .order('criado_em', { ascending: false })
    if (obraId) q = q.eq('obra_id', obraId)
    if (mes)    q = q.eq('mes', mes)
    if (ano)    q = q.eq('ano', ano)
    const { data, error } = await q
    if (error) {
      if (error.code === '42P01') return [] // tabela não existe ainda
      throw error
    }
    return data || []
  },

  async salvar(item) {
    const user = (await supabase.auth.getUser()).data.user
    const payload = {
      ...item,
      criado_por: user?.id,
      criado_em: item.id ? undefined : new Date().toISOString(),
    }
    if (item.id) {
      const { data, error } = await supabase
        .from('despesas_indiretas')
        .update(payload)
        .eq('id', item.id)
        .select('*, obra:obras(id, nome)')
        .single()
      if (error) throw error
      return data
    }
    const { data, error } = await supabase
      .from('despesas_indiretas')
      .insert(payload)
      .select('*, obra:obras(id, nome)')
      .single()
    if (error) throw error
    return data
  },

  async excluir(id) {
    const { error } = await supabase
      .from('despesas_indiretas')
      .delete()
      .eq('id', id)
    if (error) throw error
  },
}

// ─── ADM CENTRAL ─────────────────────────────────────────────
// Tabela: adm_central (id, mes, ano, despesa_sede, faturamento_total_sienge,
//         percentual_calculado, percentual_override, nota_override, criado_por, atualizado_em)
export const admCentralService = {
  async listar({ ano } = {}) {
    let q = supabase
      .from('adm_central')
      .select('*')
      .order('ano', { ascending: false })
      .order('mes', { ascending: false })
    if (ano) q = q.eq('ano', ano)
    const { data, error } = await q
    if (error) {
      if (error.code === '42P01') return []
      throw error
    }
    return data || []
  },

  async buscarMes(mes, ano) {
    const { data, error } = await supabase
      .from('adm_central')
      .select('*')
      .eq('mes', mes)
      .eq('ano', ano)
      .maybeSingle()
    if (error && error.code !== 'PGRST116') {
      if (error.code === '42P01') return null
      throw error
    }
    return data
  },

  async salvar(item) {
    const user = (await supabase.auth.getUser()).data.user
    const payload = {
      ...item,
      criado_por: user?.id,
      atualizado_em: new Date().toISOString(),
    }
    if (item.id) {
      const { data, error } = await supabase
        .from('adm_central')
        .update(payload)
        .eq('id', item.id)
        .select()
        .single()
      if (error) throw error
      return data
    }
    // Upsert por mes+ano
    const { data, error } = await supabase
      .from('adm_central')
      .upsert(payload, { onConflict: 'mes,ano' })
      .select()
      .single()
    if (error) throw error
    return data
  },
}

// ─── FATURAMENTO POR MÊS (para ADM Central e Resultado) ─────
export const faturamentoMensalService = {
  // Retorna faturamento total por mês/ano agregando todas as obras
  async porMes(mes, ano) {
    const { data, error } = await supabase
      .from('medicoes_contrato')
      .select('valor_mao_obra, valor_material, data_medicao')
      .gte('data_medicao', `${ano}-${String(mes).padStart(2,'0')}-01`)
      .lt('data_medicao',
        mes === 12
          ? `${ano + 1}-01-01`
          : `${ano}-${String(mes + 1).padStart(2,'0')}-01`
      )
    if (error) {
      if (error.code === '42P01') return 0
      throw error
    }
    return (data || []).reduce(
      (s, m) => s + (parseFloat(m.valor_mao_obra) || 0) + (parseFloat(m.valor_material) || 0),
      0
    )
  },

  // Retorna faturamento por obra em determinado mês/ano
  async porObra(obraId, mes, ano) {
    const { data, error } = await supabase
      .from('medicoes_contrato')
      .select('valor_mao_obra, valor_material')
      .eq('obra_id', obraId)
      .gte('data_medicao', `${ano}-${String(mes).padStart(2,'0')}-01`)
      .lt('data_medicao',
        mes === 12
          ? `${ano + 1}-01-01`
          : `${ano}-${String(mes + 1).padStart(2,'0')}-01`
      )
    if (error) {
      if (error.code === '42P01') return 0
      throw error
    }
    return (data || []).reduce(
      (s, m) => s + (parseFloat(m.valor_mao_obra) || 0) + (parseFloat(m.valor_material) || 0),
      0
    )
  },

  // Retorna faturamento acumulado de todos os meses de um ano, por obra
  async acumuladoAno(ano) {
    const { data, error } = await supabase
      .from('medicoes_contrato')
      .select('obra_id, valor_mao_obra, valor_material, data_medicao, obra:obras(id,nome)')
      .gte('data_medicao', `${ano}-01-01`)
      .lt('data_medicao', `${ano + 1}-01-01`)
    if (error) {
      if (error.code === '42P01') return []
      throw error
    }
    return data || []
  },
}

// ─── GESTORES DE SETOR ───────────────────────────────────────
export const gestoresService = {
  // Lista todos os gestores ativos (com dados do usuário gestor)
  async listar() {
    const { data, error } = await supabase
      .from('gestores_setor')
      .select('*, usuario:perfis!gestores_setor_usuario_id_fkey(id,nome,email,avatar,foto_url,perfil)')
      .eq('ativo', true)
      .order('setor')
    if (error) throw error
    return data || []
  },

  // Lista setores que um usuário específico gerencia
  async listarPorUsuario(usuarioId) {
    const { data, error } = await supabase
      .from('gestores_setor')
      .select('*')
      .eq('usuario_id', usuarioId)
      .eq('ativo', true)
    if (error) throw error
    return data || []
  },

  // Designa um usuário como gestor de um setor (upsert)
  async designar(usuarioId, setor, designadoPor) {
    const { data, error } = await supabase
      .from('gestores_setor')
      .upsert(
        { usuario_id: usuarioId, setor, designado_por: designadoPor, ativo: true, designado_em: new Date().toISOString() },
        { onConflict: 'usuario_id,setor' }
      )
      .select()
      .single()
    if (error) throw error
    return data
  },

  // Remove a designação de gestor (soft: ativo = false)
  async remover(id) {
    const { error } = await supabase
      .from('gestores_setor')
      .update({ ativo: false })
      .eq('id', id)
    if (error) throw error
  },

  // Remove por usuário + setor
  async removerPorUsuarioSetor(usuarioId, setor) {
    const { error } = await supabase
      .from('gestores_setor')
      .update({ ativo: false })
      .eq('usuario_id', usuarioId)
      .eq('setor', setor)
    if (error) throw error
  },
}
