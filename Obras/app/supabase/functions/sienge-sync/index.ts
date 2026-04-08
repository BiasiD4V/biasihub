// ============================================================
// ERP Biasi — Edge Function: Sincronização Sienge INCREMENTAL
// Cron: diariamente às 01h (BRT) = 04h UTC
// Invoke manual: POST /functions/v1/sienge-sync
//
// ESTRATÉGIA:
// 1. Lê sienge_sync_control → sabe onde cada módulo parou
// 2. Módulos com carga_completa=false → continua do ultimo_offset
// 3. Módulos com carga_completa=true  → busca só página 0 (novidades)
// 4. Per-obra (orçamentos/estoque)    → roda N obras por dia (fila)
// 5. Budget total: ~90 requests por execução
//
// Primeiro deploy: módulos existentes já marcados carga_completa=true
// Novos módulos: carregam incrementalmente ao longo de dias
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BUDGET_TOTAL = 90 // reserva 10 req como margem de segurança

// ─── Helpers ──────────────────────────────────────────────────

function parseData(val: unknown): string | null {
  if (!val) return null
  const s = String(val)
  if (s.includes('/')) { const [d, m, y] = s.split('/'); return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}` }
  return s.split('T')[0]
}

function parseValor(val: unknown): number {
  if (typeof val === 'number') return val
  return parseFloat(String(val ?? '0').replace(/[^0-9.,]/g, '').replace(',', '.')) || 0
}

async function batchUpsert(supabase: any, table: string, rows: any[], conflict: string, batchSize = 100) {
  let ok = 0; const errs: string[] = []
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize)
    const { error } = await supabase.from(table).upsert(batch, { onConflict: conflict })
    if (error) errs.push(`${table} batch ${i}: ${error.message}`)
    else ok += batch.length
  }
  return { ok, errs }
}

/** Busca N páginas a partir de um offset. Retorna dados + metadados de progresso. */
async function fetchPages(
  endpoint: string, headers: Record<string, string>,
  startOffset: number, maxPages: number,
  params: Record<string, string> = {}
): Promise<{ results: any[]; totalRemoto: number; requests: number; acabou: boolean; novoOffset: number }> {
  const results: any[] = []
  let offset = startOffset, requests = 0, totalRemoto = 0

  while (requests < maxPages) {
    const qs = new URLSearchParams({ limit: '200', offset: String(offset), ...params })
    const res = await fetch(`${endpoint}?${qs}`, { headers })
    requests++
    if (!res.ok) { console.error(`[sync] HTTP ${res.status} em ${endpoint}`); break }
    const json = await res.json()
    const page = json.results ?? json.data ?? (Array.isArray(json) ? json : [])
    totalRemoto = json.resultSetMetadata?.count ?? totalRemoto
    results.push(...page)
    offset += 200
    if (page.length < 200) break // última página
  }

  const ultimaPaginaCheia = results.length > 0 && results.length === requests * 200
  return { results, totalRemoto, requests, acabou: !ultimaPaginaCheia, novoOffset: offset }
}

// ─── Mapeamento de status do Sienge → status local ───────────
// Valores documentados da API Sienge (buildingStatus)
const MAP_BUILDING_STATUS: Record<string, string> = {
  'IN_PROGRESS':                           'ativa',
  'COST_ESTIMATING':                       'planejamento',
  'FINISHED_WITHOUT_FINANCIAL_PENDENCIES': 'concluida',
  'FINISHED_WITH_FINANCIAL_PENDENCIES':    'suspensa',
  // aliases extras observados em alguns ambientes Sienge
  'ACTIVE':      'ativa',
  'FINISHED':    'concluida',
  'CANCELLED':   'cancelada',
  'SUSPENDED':   'suspensa',
}

// ─── Map Functions (Sienge API → DB rows) ─────────────────────

function extrairCidade(endereco: string | null | undefined): string | null {
  if (!endereco) return null
  const s = String(endereco).trim()
  const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
  const LOGRADOURO = /^(RUA|AV\.?\s|AV\s|AVENIDA|ALAMEDA|AL\s|ROD\.?\s|ROD\s|RODOVIA|ESTRADA|TRAVESSA|PRAÇA|LARGO|PARQUE|CAMINHO|VIELA)/i
  const CEP = /^\d{5}-?\d{3}$/
  const partes = s.split(' - ').map((p: string) => p.trim()).filter(Boolean)
  // Remove CEP e estado do final
  while (partes.length > 0) {
    const last = partes[partes.length - 1]
    if (CEP.test(last) || ESTADOS.includes(last.toUpperCase())) partes.pop()
    else break
  }
  // Retorna o primeiro segmento que não é logradouro
  for (const parte of partes) {
    if (!LOGRADOURO.test(parte)) return parte
  }
  return null
}

function mapObra(o: any) {
  const di = parseData(o.creationDate) ?? new Date().toISOString().split('T')[0]
  const df = (() => { const d = new Date(di); d.setFullYear(d.getFullYear() + 1); return d.toISOString().split('T')[0] })()
  // enterpriseType pode vir como string ou como objeto { id, description }
  const tipo = typeof o.enterpriseType === 'string'
    ? o.enterpriseType
    : o.enterpriseType?.description ?? o.enterpriseType?.name ?? o.workType ?? o.category ?? null

  const row: Record<string, any> = {
    codigo: String(o.id), nome: o.name ?? `Obra ${o.id}`, cliente: o.companyName ?? '-',
    data_inicio: di, data_fim_prevista: df, valor_contrato: 0,
    endereco: o.adress ?? null, cidade: extrairCidade(o.adress),
    estado: o.state ?? 'SP',
    descricao: o.enterpriseObservation ?? o.commercialName ?? null,
    tipo,
    // Salva o valor bruto que o Sienge manda (pode ser null se o endpoint de listagem não retornar)
    building_status: o.buildingStatus ?? null,
  }

  // Só sobrescreve 'status' se o Sienge informou buildingStatus nesta resposta.
  // Caso contrário preserva o status que foi gravado pelo enrichment do endpoint de detalhe.
  // (evita que o upsert do sync reverta um status 'concluida' para 'ativa' hardcoded)
  if (o.buildingStatus) {
    row.status = MAP_BUILDING_STATUS[o.buildingStatus] ?? 'ativa'
    console.log(`[mapObra] obra ${o.id} buildingStatus="${o.buildingStatus}" → status="${row.status}"`)
  }

  return row
}

function mapContrato(c: any, obraMap: Map<string, string>) {
  const bid = c.buildings?.[0]?.buildingId ? String(c.buildings[0].buildingId) : null
  const vt = parseValor(c.totalLaborValue) + parseValor(c.totalMaterialValue)
  const st = String(c.status ?? '').toUpperCase()
  return {
    sienge_doc_id: String(c.documentId), sienge_contract_num: String(c.contractNumber),
    sienge_building_id: bid ? parseInt(bid) : null, obra_id: bid ? obraMap.get(bid) ?? null : null,
    // contractType: 'CONTRACTED' = Biasi é Contratada | 'CONTRACTOR' = Biasi é Contratante
    tipo_contrato: c.contractType ?? null,
    // Fornecedor (quem Biasi contratou) — preenchido quando contractType = CONTRACTOR
    fornecedor: c.supplierName ?? null,
    sienge_supplier_id: c.supplierId ?? null,
    // Cliente (quem contratou a Biasi) — preenchido quando contractType = CONTRACTED
    sienge_customer_id: c.customerId ? parseInt(String(c.customerId)) : null,
    cliente: c.companyName ?? null,
    responsavel: c.responsibleName ?? null,
    objeto: c.object ?? null,
    status: ['COMPLETED'].includes(st) ? 'concluido' : ['CANCELLED'].includes(st) ? 'cancelado' : 'em_andamento',
    aprovacao: c.statusApproval?.toLowerCase() ?? 'pendente',
    data_contrato: parseData(c.contractDate), data_inicio: parseData(c.startDate), data_fim: parseData(c.endDate),
    valor_mao_obra: parseValor(c.totalLaborValue), valor_material: parseValor(c.totalMaterialValue), valor_total: vt,
  }
}

function mapMedicao(m: any, obraMap: Map<string, string>) {
  const bid = m.buildingId ? String(m.buildingId) : null
  return {
    contrato_doc_id: String(m.documentId), contrato_num: String(m.contractNumber),
    sienge_building_id: bid ? parseInt(bid) : null, obra_id: bid ? obraMap.get(bid) ?? null : null,
    numero_medicao: m.measurementNumber ?? 0, data_medicao: parseData(m.measurementDate),
    data_vencimento: parseData(m.dueDate), valor_mao_obra: parseValor(m.totalLaborValue),
    valor_material: parseValor(m.totalMaterialValue), valor_liquido: parseValor(m.netValue),
    aprovacao: m.statusApproval?.toLowerCase() ?? 'pendente', autorizada: m.authorized ?? false,
    finalizada: m.finalized ?? false, observacao: m.notes ?? null,
  }
}

function mapPedido(p: any, obraMap: Map<string, string>) {
  const bid = p.buildingId ? String(p.buildingId) : null
  const st = String(p.status ?? '').toUpperCase()
  // Faturamento direto: campos oficiais da API (purchase-orders-v1)
  // directBillingDocumentId + directBillingContractNumber → pedido em nome do cliente
  const fatDiretoDocId       = p.directBillingDocumentId ?? null
  const fatDiretoContratoNum = p.directBillingContractNumber ?? null
  return {
    sienge_id: p.id, sienge_building_id: bid ? parseInt(bid) : null,
    obra_id: bid ? obraMap.get(bid) ?? null : null,
    fornecedor_id: p.supplierId ?? null, comprador: p.buyerId ?? null,
    data_pedido: parseData(p.date),
    status: ['PENDING'].includes(st) ? 'pendente' : ['FULLY_DELIVERED','COMPLETED'].includes(st) ? 'concluido' : 'em_andamento',
    valor_total: parseValor(p.totalAmount), condicao_pagamento: p.paymentCondition ?? null,
    autorizado: p.authorized ?? false, entrega_atrasada: p.deliveryLate ?? false,
    observacao: p.internalNotes ?? null,
    fat_direto_doc_id: fatDiretoDocId,
    fat_direto_contrato_num: fatDiretoContratoNum ? parseInt(String(fatDiretoContratoNum)) : null,
  }
}

function mapNotaFiscal(n: any, obraMap: Map<string, string>) {
  const bid = n.buildingId ? String(n.buildingId) : null
  return {
    sienge_id: n.id, sienge_building_id: bid ? parseInt(bid) : null,
    obra_id: bid ? obraMap.get(bid) ?? null : null,
    fornecedor_id: n.supplierId ?? null, fornecedor_nome: n.supplierName ?? null,
    numero_nf: n.number ? String(n.number) : null, serie: n.serie ?? null,
    data_emissao: parseData(n.issueDate), data_entrada: parseData(n.entryDate),
    valor_total: parseValor(n.itemsTotalAmount ?? n.totalAmount),
    valor_desconto: parseValor(n.discountAmount), valor_liquido: parseValor(n.netAmount ?? n.itemsTotalAmount),
    status: n.status?.toLowerCase() ?? 'pendente', observacao: n.notes ?? null,
  }
}

function mapSolicitacao(s: any, obraMap: Map<string, string>) {
  const bid = s.buildingId ? String(s.buildingId) : null
  return {
    sienge_id: s.purchaseRequestId ?? s.id, sienge_item_id: s.itemId ?? 0,  // 0 = sem item específico (nunca null — índice único não aceita)
    sienge_building_id: bid ? parseInt(bid) : null, obra_id: bid ? obraMap.get(bid) ?? null : null,
    solicitante: s.requesterName ?? null, data_solicitacao: parseData(s.date ?? s.requestDate),
    recurso_id: s.resourceId ?? null, recurso_descricao: s.resourceDescription ?? s.description ?? null,
    quantidade: parseValor(s.quantity), unidade: s.unitOfMeasure ?? null,
    valor_unitario: parseValor(s.unitPrice), valor_total: parseValor(s.totalPrice ?? s.quantity * s.unitPrice),
    status: s.status?.toLowerCase() ?? 'pendente', observacao: s.notes ?? null,
  }
}

function mapCotacao(c: any, obraMap: Map<string, string>) {
  const bid = c.buildingId ? String(c.buildingId) : null
  return {
    sienge_negotiation_id: c.negotiationId ?? c.id,
    sienge_building_id: bid ? parseInt(bid) : null, obra_id: bid ? obraMap.get(bid) ?? null : null,
    fornecedor_id: c.supplierId ?? null, fornecedor_nome: c.supplierName ?? null,
    recurso_id: c.resourceId ?? null, recurso_descricao: c.resourceDescription ?? null,
    quantidade: parseValor(c.quantity), valor_unitario: parseValor(c.unitPrice),
    valor_total: parseValor(c.totalPrice),
    data_cotacao: parseData(c.quotationDate ?? c.date),
    vencedora: c.winner ?? false, observacao: c.notes ?? null,
  }
}

// ─── Definição dos módulos paginados ──────────────────────────

interface ModConfig {
  nome: string; endpoint: string; tabela: string; conflito: string
  params?: Record<string, string>
  filter?: (r: any) => boolean
  mapFn: (r: any, m: Map<string, string>) => any
}

const MODULOS: ModConfig[] = [
  { nome: 'obras',               endpoint: '/enterprises',                          tabela: 'obras',               conflito: 'codigo',                                              filter: o => !!o.id,                            mapFn: (o) => mapObra(o) },
  { nome: 'contratos',           endpoint: '/supply-contracts/all',                 tabela: 'contratos',           conflito: 'sienge_doc_id,sienge_contract_num',                    filter: c => c.documentId && c.contractNumber, mapFn: mapContrato },
  { nome: 'medicoes_contrato',   endpoint: '/supply-contracts/measurements/all',    tabela: 'medicoes_contrato',   conflito: 'contrato_doc_id,contrato_num,sienge_building_id,numero_medicao', filter: m => m.documentId && m.contractNumber, mapFn: mapMedicao },
  { nome: 'pedidos_compra',      endpoint: '/purchase-orders',                      tabela: 'pedidos_compra',      conflito: 'sienge_id',                                           filter: p => !!p.id,                            mapFn: mapPedido },
  { nome: 'notas_fiscais',       endpoint: '/purchase-invoices',                    tabela: 'notas_fiscais',       conflito: 'sienge_id',                                           filter: n => !!n.id,                            mapFn: mapNotaFiscal },
  { nome: 'solicitacoes_compra', endpoint: '/purchase-requests/all/items',          tabela: 'solicitacoes_compra', conflito: 'sienge_id,sienge_item_id',                            filter: s => !!(s.purchaseRequestId || s.id),   mapFn: mapSolicitacao },
  { nome: 'cotacoes',            endpoint: '/purchase-quotations/all/negotiations', tabela: 'cotacoes',            conflito: 'sienge_negotiation_id',                               filter: c => !!(c.negotiationId || c.id),       mapFn: mapCotacao },
]

// ─── Handler Principal ────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const SIENGE_SUB  = Deno.env.get('SIENGE_SUBDOMAIN') ?? 'biasi'
  const SIENGE_USER = Deno.env.get('SIENGE_USUARIO')   ?? 'biasi-bi'
  const SIENGE_PASS = Deno.env.get('SIENGE_SENHA')     ?? ''
  const SIENGE_BASE = `https://api.sienge.com.br/${SIENGE_SUB}/public/api/v1`
  const SIENGE_HDRS = { Authorization: `Basic ${btoa(`${SIENGE_USER}:${SIENGE_PASS}`)}`, Accept: 'application/json' }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  // Identifica quem disparou
  let importadoPor: string | null = null
  try {
    const auth = req.headers.get('Authorization')
    if (auth?.startsWith('Bearer ')) {
      const { data: { user } } = await supabase.auth.getUser(auth.replace('Bearer ', ''))
      importadoPor = user?.id ?? null
    }
  } catch (_) {}

  // Log
  const { data: log } = await supabase.from('importacoes_sienge')
    .insert({ tipo: 'sync_incremental', arquivo_nome: `sync-${new Date().toISOString().split('T')[0]}`, status: 'processando', registros_total: 0, importado_por: importadoPor })
    .select().single()

  const erros: Array<{ registro: string; erro: string }> = []
  const resumo: Record<string, { total: number; importados: number; remoto: number; modo: string }> = {}
  let budgetRestante = BUDGET_TOTAL
  let requestsTotal = 0

  try {
    // ═══════════════════════════════════════════════════════════
    // 1. CARREGAR CONTROLE DE SYNC
    // ═══════════════════════════════════════════════════════════
    const { data: controles } = await supabase.from('sienge_sync_control').select('*')
    const ctrlMap = new Map<string, any>()
    for (const c of (controles ?? [])) ctrlMap.set(c.modulo, c)

    // ═══════════════════════════════════════════════════════════
    // 2. PROCESSAR MÓDULOS PAGINADOS
    // ═══════════════════════════════════════════════════════════

    // Mapa buildingId → obra.id (necessário para os mappers)
    // Busca obras do BD antes de tudo
    const { data: obrasDB } = await supabase.from('obras').select('id, codigo')
    const obraMap = new Map<string, string>()
    for (const o of (obrasDB ?? [])) obraMap.set(o.codigo, o.id)

    for (const mod of MODULOS) {
      if (budgetRestante <= 0) {
        console.log(`[sync] Budget esgotado, pulando ${mod.nome}`)
        break
      }

      const ctrl = ctrlMap.get(mod.nome) ?? { ultimo_offset: 0, carga_completa: false, budget_por_exec: 10, total_remoto: 0, total_local: 0, meta: {} }
      const budget = Math.min(ctrl.budget_por_exec, budgetRestante)

      // Decide offset de partida
      const startOffset = ctrl.carga_completa ? 0 : ctrl.ultimo_offset
      const modo = ctrl.carga_completa ? 'manutenção' : 'carga_inicial'
      // Em manutenção: busca só 1-2 páginas do início (novidades)
      const maxPages = ctrl.carga_completa ? Math.min(2, budget) : budget

      console.log(`[sync] ${mod.nome} — modo: ${modo}, offset: ${startOffset}, maxPages: ${maxPages}`)

      try {
        const { results, totalRemoto, requests, acabou, novoOffset } =
          await fetchPages(`${SIENGE_BASE}${mod.endpoint}`, SIENGE_HDRS, startOffset, maxPages, mod.params)

        budgetRestante -= requests
        requestsTotal += requests

        // Mapeia resultados
        const rows = results.filter(mod.filter ?? (() => true)).map(r => mod.mapFn(r, obraMap))

        if (rows.length > 0) {
          const { ok, errs: batchErrs } = await batchUpsert(supabase, mod.tabela, rows, mod.conflito)
          batchErrs.forEach(e => erros.push({ registro: mod.nome, erro: e }))
          resumo[mod.nome] = { total: results.length, importados: ok, remoto: totalRemoto, modo }
          console.log(`[sync] ${mod.nome}: ${ok}/${results.length} (remoto: ${totalRemoto})`)
        } else {
          resumo[mod.nome] = { total: 0, importados: 0, remoto: totalRemoto, modo }
        }

        // Atualiza controle
        const novoCtrl: any = {
          ultima_sync: new Date().toISOString(),
          total_remoto: totalRemoto || ctrl.total_remoto,
        }
        if (!ctrl.carga_completa) {
          novoCtrl.ultimo_offset = novoOffset
          novoCtrl.total_local = (ctrl.total_local ?? 0) + results.length
          if (acabou) novoCtrl.carga_completa = true
        } else {
          novoCtrl.total_local = totalRemoto || ctrl.total_local // em manutenção, assume que temos tudo
        }

        await supabase.from('sienge_sync_control').upsert({
          modulo: mod.nome, ...ctrl, ...novoCtrl
        }, { onConflict: 'modulo' })

        // Pós-processamento para OBRAS: atualiza obraMap + enriquece obras sem dados detalhados
        if (mod.nome === 'obras') {
          // Carrega todas as obras — inclui responsavel_tecnico e cidade para saber quais já foram enriquecidas
          const { data: obrasAtuais } = await supabase
            .from('obras')
            .select('id, codigo, responsavel_tecnico, cidade, building_status, status')
          obraMap.clear()
          for (const o of (obrasAtuais ?? [])) obraMap.set(o.codigo, o.id)

          // ── Critérios de enriquecimento via endpoint de detalhe ──────────────
          // Prioridade 1: obras sem building_status (nunca tiveram status real do Sienge)
          // Prioridade 2: obras sem responsavel_tecnico ou cidade (dados incompletos)
          // Limite: 20 por execução para cobrir as 400 obras em ~20 dias (sync diário)
          const semStatus   = (obrasAtuais ?? []).filter(o => !o.building_status)
          const semDados    = (obrasAtuais ?? []).filter(o => o.building_status && (!o.responsavel_tecnico || !o.cidade))
          const obrasParaEnriquecer = [...semStatus, ...semDados].slice(0, 20)

          console.log(`[sync] Enrichment: ${semStatus.length} sem status, ${semDados.length} sem dados → processando ${obrasParaEnriquecer.length}`)

          let enrichCount = 0
          for (const o of obrasParaEnriquecer) {
            if (budgetRestante <= 5) break // reserva 5 req de margem
            try {
              const res = await fetch(`${SIENGE_BASE}/enterprises/${o.codigo}`, { headers: SIENGE_HDRS })
              budgetRestante--; requestsTotal++
              if (!res.ok) {
                console.error(`[sync] enterprises/${o.codigo} retornou HTTP ${res.status}`)
                continue
              }
              const e = await res.json()
              const upd: Record<string, any> = {}

              // ── Datas de construção ──────────────────────────────────────────
              if (e.constructionDetails?.startDate) upd.data_inicio_obra = parseData(e.constructionDetails.startDate)
              if (e.constructionDetails?.endDate)   upd.data_fim_obra    = parseData(e.constructionDetails.endDate)
              if (e.constructionDetails?.totalArea) upd.area_total_m2   = e.constructionDetails.totalArea

              // ── Responsável técnico ──────────────────────────────────────────
              if (e.accountable?.name)  upd.responsavel_tecnico = e.accountable.name
              if (e.accountable?.email) upd.responsavel_email   = e.accountable.email

              // ── Status (BUG 2 CORRIGIDO: usa 'building_status', não 'status_sienge') ─
              // 'status_sienge' não existe na tabela → update falhava silenciosamente
              if (e.buildingStatus) {
                upd.building_status = e.buildingStatus                         // campo que existe na migration_009
                upd.status          = MAP_BUILDING_STATUS[e.buildingStatus] ?? 'ativa'
                console.log(`[enrichment] obra ${o.codigo} buildingStatus="${e.buildingStatus}" → status="${upd.status}"`)
              }

              // ── VGV e endereço ───────────────────────────────────────────────
              if (e.salesDetails?.generalSalesValue > 0) upd.vgv = e.salesDetails.generalSalesValue
              if (e.adress) {
                upd.endereco = e.adress
                const cidadeExtraida = extrairCidade(e.adress)
                if (cidadeExtraida) upd.cidade = cidadeExtraida
              }
              if (e.city) upd.cidade = e.city

              if (Object.keys(upd).length > 0) {
                const { error: updErr } = await supabase.from('obras').update(upd).eq('id', o.id)
                if (updErr) console.error(`[enrichment] update falhou obra ${o.codigo}:`, updErr.message)
                else enrichCount++
              }
            } catch (enrichErr: any) {
              console.error(`[enrichment] erro obra ${o.codigo}:`, enrichErr.message)
            }
          }
          console.log(`[sync] Obras enriquecidas: ${enrichCount}/${obrasParaEnriquecer.length} (${semStatus.length} ainda sem status)`)
        }

        if (mod.nome === 'contratos' && results.length > 0) {
          // Enriquece obras com valor contratado acumulado
          const valorPorObra = new Map<string, number>()
          results.forEach((c: any) => {
            const bid = c.buildings?.[0]?.buildingId ? String(c.buildings[0].buildingId) : null
            const vt = parseValor(c.totalLaborValue) + parseValor(c.totalMaterialValue)
            if (bid) valorPorObra.set(bid, (valorPorObra.get(bid) ?? 0) + vt)
          })
          for (const [bid, val] of valorPorObra.entries()) {
            const uid = obraMap.get(bid)
            if (uid && val > 0) await supabase.from('obras').update({ valor_contrato: val }).eq('id', uid)
          }
        }

      } catch (err: any) {
        console.error(`[sync] Erro em ${mod.nome}:`, err.message)
        erros.push({ registro: mod.nome, erro: err.message })
        resumo[mod.nome] = { total: 0, importados: 0, remoto: 0, modo: 'erro' }
      }
    }

    // ═══════════════════════════════════════════════════════════
    // 3. MÓDULOS PER-OBRA (orçamentos + estoque)
    // ═══════════════════════════════════════════════════════════

    const PER_OBRA_MODULOS = [
      { nome: 'orcamentos', endpointFn: (bid: string) => `/building-cost-estimations/${bid}/sheets`, tabela: 'orcamentos_sienge', conflito: 'obra_id,wbs_code,sheet_id' },
      { nome: 'estoque',    endpointFn: (bid: string) => `/stock-inventories/${bid}/items`,          tabela: 'estoque_sienge',    conflito: 'obra_id,recurso_id' },
    ]

    for (const pmod of PER_OBRA_MODULOS) {
      if (budgetRestante <= 0) break

      const ctrl = ctrlMap.get(pmod.nome) ?? { ultimo_offset: 0, carga_completa: false, budget_por_exec: 10, total_remoto: 0, total_local: 0, meta: {} }
      const budget = Math.min(ctrl.budget_por_exec, budgetRestante)

      // Montar fila de obras a processar
      let fila: string[] = ctrl.meta?.fila ?? []
      if (fila.length === 0) {
        // Recarrega fila com todas as obras
        fila = Array.from(obraMap.keys())
      }

      const obrasProcessadas: string[] = []
      let reqUsados = 0, totalImportPmod = 0

      while (fila.length > 0 && reqUsados < budget) {
        const bid = fila.shift()!
        const obraId = obraMap.get(bid)
        if (!obraId) continue

        console.log(`[sync] ${pmod.nome} — obra ${bid} (faltam ${fila.length} na fila)`)

        try {
          if (pmod.nome === 'orcamentos') {
            // Step 1: buscar sheets
            const sheetsUrl = `${SIENGE_BASE}${pmod.endpointFn(bid)}`
            const sheetsRes = await fetch(sheetsUrl, { headers: SIENGE_HDRS })
            reqUsados++

            if (sheetsRes.ok) {
              const sheetsJson = await sheetsRes.json()
              const sheets = sheetsJson.results ?? sheetsJson.data ?? (Array.isArray(sheetsJson) ? sheetsJson : [])

              // Step 2: buscar itens de cada sheet (1 req cada)
              for (const sheet of sheets) {
                if (reqUsados >= budget) break
                const unit = sheet.unit ?? sheet.id ?? sheet.sheetId
                if (!unit) continue

                const itemsUrl = `${SIENGE_BASE}/building-cost-estimations/${bid}/sheets/${unit}/items?limit=200&offset=0`
                const itemsRes = await fetch(itemsUrl, { headers: SIENGE_HDRS })
                reqUsados++

                if (itemsRes.ok) {
                  const itemsJson = await itemsRes.json()
                  const items = itemsJson.results ?? itemsJson.data ?? (Array.isArray(itemsJson) ? itemsJson : [])

                  const rows = items.map((it: any) => {
                    // pricesByCategory: array de { category, unitPrice, totalPrice }
                    const byCateg = (cat: string) =>
                      parseValor(it.pricesByCategory?.find((p: any) => p.category === cat)?.totalPrice ?? 0)
                    return {
                      obra_id: obraId, sienge_building_id: parseInt(bid),
                      sheet_id: String(unit), wbs_code: it.wbsCode ?? it.id ?? null,
                      descricao: it.description ?? 'Item', unidade: it.unitOfMeasure ?? null,
                      quantidade: parseValor(it.quantity), preco_unitario: parseValor(it.unitPrice),
                      valor_mo:         byCateg('LABOR'),
                      valor_material:   byCateg('MATERIAL'),
                      valor_equipamento: byCateg('EQUIPMENT'),
                      valor_transporte:  byCateg('TRANSPORT_ITEM'),
                      valor_total: parseValor(it.totalPrice),
                      sienge_item_id: it.id ? String(it.id) : null,
                    }
                  })

                  if (rows.length > 0) {
                    const { ok } = await batchUpsert(supabase, pmod.tabela, rows, pmod.conflito)
                    totalImportPmod += ok
                  }
                }
              }
            }
          } else {
            // Estoque: endpoint direto por costCenterId (= buildingId)
            const { results, requests } = await fetchPages(
              `${SIENGE_BASE}${pmod.endpointFn(bid)}`, SIENGE_HDRS, 0, Math.min(3, budget - reqUsados)
            )
            reqUsados += requests

            const rows = results.map((it: any) => ({
              obra_id: obraId, sienge_building_id: parseInt(bid),
              recurso_id: it.resourceId ?? it.id,
              recurso_descricao: it.description ?? it.resourceDescription ?? null,
              unidade: it.unitOfMeasure ?? null,
              quantidade: parseValor(it.quantity ?? it.balance),
              preco_medio: parseValor(it.averagePrice ?? it.unitPrice),
              valor_total: parseValor(it.totalValue ?? it.quantity * it.averagePrice),
              localizacao: it.location ?? null,
            }))

            if (rows.length > 0) {
              const { ok } = await batchUpsert(supabase, pmod.tabela, rows, pmod.conflito)
              totalImportPmod += ok
            }
          }

          obrasProcessadas.push(bid)
        } catch (err: any) {
          console.error(`[sync] ${pmod.nome} obra ${bid}:`, err.message)
          erros.push({ registro: `${pmod.nome}_obra_${bid}`, erro: err.message })
          obrasProcessadas.push(bid) // remove da fila mesmo com erro (tenta na próxima rodada completa)
        }
      }

      budgetRestante -= reqUsados
      requestsTotal += reqUsados

      const cargaCompleta = fila.length === 0
      resumo[pmod.nome] = {
        total: obrasProcessadas.length, importados: totalImportPmod,
        remoto: Array.from(obraMap.keys()).length,
        modo: cargaCompleta ? 'ciclo_completo' : `faltam_${fila.length}_obras`
      }

      // Salva estado
      await supabase.from('sienge_sync_control').upsert({
        modulo: pmod.nome,
        carga_completa: cargaCompleta,
        total_local: (ctrl.total_local ?? 0) + totalImportPmod,
        total_remoto: Array.from(obraMap.keys()).length,
        ultima_sync: new Date().toISOString(),
        budget_por_exec: ctrl.budget_por_exec,
        ultimo_offset: 0,
        meta: { fila, obras_processadas_ultimo_sync: obrasProcessadas },
      }, { onConflict: 'modulo' })

      console.log(`[sync] ${pmod.nome}: ${obrasProcessadas.length} obras (${totalImportPmod} registros), fila restante: ${fila.length}`)
    }

    // ═══════════════════════════════════════════════════════════
    // 3.5 SINCRONIZAR CENTROS DE CUSTO (sempre, com budget reservado)
    // GET /cost-centers → buildingSectors → atualiza obras.centro_custo_id/nome
    // ═══════════════════════════════════════════════════════════
    try {
      let ccOffset = 0, ccTotal = 0, ccLinked = 0
      let ccRawSample: any = null
      const ccBudgetBefore = budgetRestante
      let ccHttpStatus = 0
      while (budgetRestante > 0) {
        const ccRes = await fetch(`${SIENGE_BASE}/cost-centers?limit=200&offset=${ccOffset}`, { headers: SIENGE_HDRS })
        budgetRestante--; requestsTotal++
        ccHttpStatus = ccRes.status
        if (!ccRes.ok) {
          const errBody = await ccRes.text()
          console.warn(`[sync] cost-centers HTTP ${ccRes.status}: ${errBody}`)
          ccRawSample = { _http_error: ccRes.status, _body: errBody.slice(0, 200) }
          break
        }
        const ccJson = await ccRes.json()
        if (!ccRawSample) ccRawSample = ccJson
        const ccs: any[] = ccJson.results ?? ccJson.data ?? (Array.isArray(ccJson) ? ccJson : [])
        ccTotal += ccs.length
        for (const cc of ccs) {
          const sectors: any[] = cc.buildingSectors ?? cc.sectors ?? cc.buildings ?? []
          for (const s of sectors) {
            const { error } = await supabase
              .from('obras')
              .update({ centro_custo_id: cc.id, centro_custo_nome: cc.name ?? null })
              .eq('codigo', String(s.id ?? s.buildingId ?? s.enterpriseId))
            if (!error) ccLinked++
          }
        }
        if (ccs.length < 200) break
        ccOffset += 200
      }
      resumo['cost_centers'] = {
        total: ccTotal, importados: ccLinked, remoto: ccTotal, modo: 'always',
        _debug_budget_before: ccBudgetBefore, _debug_http_status: ccHttpStatus, _debug_raw: ccRawSample
      }
    } catch (err: any) {
      console.warn(`[sync] Centros de custo erro: ${err.message}`)
      resumo['cost_centers'] = { total: 0, importados: 0, remoto: 0, modo: 'erro', _debug_error: err.message }
    }

    // ═══════════════════════════════════════════════════════════
    // 3.6 CRIAR BASELINE EAP (Estrutura Analítica) PARA NOVAS OBRAS
    // Para cada obra sem planejamento_id, gera EAP inicial do Sienge
    // ═══════════════════════════════════════════════════════════
    try {
      if (budgetRestante > 5) {
        const { data: obrasAtuais } = await supabase
          .from('obras')
          .select('id, codigo, nome, data_inicio, data_fim_prevista, valor_contrato')
          .is('planejamento_id', null)
          .limit(3) // Apenas 3 obras por execução para economizar budget

        let baselinesCriadas = 0
        const eapBudgetBefore = budgetRestante

        for (const obra of (obrasAtuais ?? [])) {
          if (budgetRestante <= 5) break

          try {
            // 1. Buscar contratos e medições dessa obra
            const { data: contratos } = await supabase
              .from('contratos')
              .select('tipo_contrato, valor_total, data_contrato, data_inicio')
              .eq('obra_id', obra.id)
              .range(0, 999)

            const { data: medicoes } = await supabase
              .from('medicoes_contrato')
              .select('id, valor_medido, data_medicao')
              .eq('obra_id', obra.id)
              .range(0, 999)

            // 2. Criar registro de planejamento (versão 1, baseline)
            const { data: planejamento, error: pError } = await supabase
              .from('obra_planejamentos')
              .insert({
                obra_id: obra.id,
                versao: 1,
                status: 'rascunho',
                data_base_assinada: new Date().toISOString()
              })
              .select()
              .single()

            if (pError) {
              console.warn(`[sync] Erro ao criar planejamento para obra ${obra.codigo}:`, pError.message)
              continue
            }

            // 3. Criar estrutura EAP L1: Fases (Projeto, Execução, Encerramento)
            const fases = [
              { codigo: '1', nome: 'Projeto', nivel: 1, peso_percentual: 10 },
              { codigo: '2', nome: 'Execução', nivel: 1, peso_percentual: 75 },
              { codigo: '3', nome: 'Encerramento', nivel: 1, peso_percentual: 15 },
            ]

            const eapL1 = await Promise.all(
              fases.map((fase, idx) =>
                supabase.from('planejamento_eap').insert({
                  planejamento_id: planejamento.id,
                  codigo: fase.codigo,
                  nome: fase.nome,
                  nivel: 1,
                  hierarquia: fase.codigo,
                  peso_percentual: fase.peso_percentual,
                  ordem: idx
                }).select().single()
              )
            )

            // 4. Criar L2: Grupos de Serviço (por tipo de contrato/pacote)
            const tiposContrato = new Set((contratos ?? []).map((c: any) => c.tipo_contrato || 'Geral'))
            let ordemL2 = 0

            const eapL2 = await Promise.all(
              Array.from(tiposContrato).map((tipo, idx) =>
                supabase.from('planejamento_eap').insert({
                  planejamento_id: planejamento.id,
                  codigo: `2.${idx + 1}`,
                  nome: `${tipo} (${contratos?.filter((c: any) => c.tipo_contrato === tipo).length || 0} contratos)`,
                  nivel: 2,
                  parent_id: eapL1[1].data?.id, // Parent = Execução (L1[1])
                  hierarquia: `2.${idx + 1}`,
                  peso_percentual: 100 / tiposContrato.size,
                  valor_contratado: (contratos ?? [])
                    .filter((c: any) => c.tipo_contrato === tipo)
                    .reduce((s, c) => s + (parseFloat(c.valor_total) || 0), 0),
                  ordem: ordemL2++
                }).select().single()
              )
            )

            // 5. Criar L3: Serviços (por contrato)
            if ((contratos ?? []).length > 0) {
              let ordemL3 = 0
              for (const contrato of (contratos ?? [])) {
                const tipoIdx = Array.from(tiposContrato).indexOf(contrato.tipo_contrato || 'Geral')
                const parentL2 = eapL2[tipoIdx]?.data

                if (parentL2) {
                  await supabase.from('planejamento_atividades').insert({
                    eap_item_id: parentL2.id,
                    planejamento_id: planejamento.id,
                    nome: `Contrato ${contrato.id?.slice(0, 8)}`,
                    descricao: `Contrato de serviço - Valor: R$ ${contrato.valor_total}`,
                    duracao_dias: Math.ceil(
                      (new Date(obra.data_fim_prevista).getTime() - new Date(obra.data_inicio).getTime()) / 86400000
                    ) || 90,
                    data_inicio: contrato.data_inicio || obra.data_inicio,
                    data_fim: obra.data_fim_prevista,
                    status: 'nao_iniciada',
                    ordem: ordemL3++,
                    recursos_json: {
                      valor_contratado: parseFloat(contrato.valor_total) || 0,
                      valor_medido: (medicoes ?? [])
                        .reduce((s, m) => s + (parseFloat(m.valor_medido) || 0), 0)
                    }
                  })
                }
              }
            }

            // 6. Criar baseline EVM
            const vpBaseline = parseFloat(obra.valor_contrato) || 0
            const vaBaseline = (medicoes ?? [])
              .reduce((s, m) => s + (parseFloat(m.valor_medido) || 0), 0)

            await supabase.from('evm_snapshots').insert({
              planejamento_id: planejamento.id,
              semana_ref: new Date(obra.data_inicio).toISOString().split('T')[0],
              periodo: 'semanal',
              vp: vpBaseline,
              va: vaBaseline,
              cr: vpBaseline * 0.5, // Assuming 50% de custo realizado
              idc: (vaBaseline / (vpBaseline * 0.5)) || 0,
              idp: (vaBaseline / vpBaseline) || 0
            })

            // 7. Atualizar obra com planejamento_id
            await supabase
              .from('obras')
              .update({ planejamento_id: planejamento.id })
              .eq('id', obra.id)

            baselinesCriadas++
            console.log(`[sync] Baseline EAP criado para obra ${obra.codigo}`)
          } catch (erro: any) {
            console.warn(`[sync] Erro ao processar baseline para ${obra.codigo}:`, erro.message)
          }
        }

        resumo['baseline_eap'] = {
          total: obrasAtuais?.length || 0,
          importados: baselinesCriadas,
          remoto: obrasAtuais?.length || 0,
          modo: 'ciclo_completo',
          _debug_budget_before: eapBudgetBefore
        }
      } else {
        resumo['baseline_eap'] = {
          total: 0, importados: 0, remoto: 0, modo: 'budget_insufficiente'
        }
      }
    } catch (err: any) {
      console.warn(`[sync] Baseline EAP erro: ${err.message}`)
      resumo['baseline_eap'] = { total: 0, importados: 0, remoto: 0, modo: 'erro', _debug_error: err.message }
    }

  } catch (e: any) {
    console.error('[sync] Erro global:', e)
    erros.push({ registro: 'global', erro: e.message })
  }

  // ═══════════════════════════════════════════════════════════
  // 4. FINALIZAR LOG
  // ═══════════════════════════════════════════════════════════
  const totalImportados = Object.values(resumo).reduce((s, r) => s + r.importados, 0)
  const statusFinal = erros.some(e => e.registro === 'global') ? 'erro' : 'concluido'

  if (log) {
    await supabase.from('importacoes_sienge')
      .update({
        status: statusFinal,
        registros_total: totalImportados,
        registros_importados: totalImportados,
        erros,
        resumo,                          // detalhamento por módulo (precisa migration_011)
        requests_usados: requestsTotal,  // requests HTTP usados (budget = 90)
      })
      .eq('id', log.id)
  }

  const resposta = {
    ok: statusFinal !== 'erro',
    modo: 'incremental',
    resumo,
    requestsUsados: requestsTotal,
    budgetRestante,
    totalImportados,
    erros: erros.length,
    detalhes_erros: erros.slice(0, 20),
    timestamp: new Date().toISOString(),
  }

  console.log('[sync] FIM:', JSON.stringify({ ...resposta, detalhes_erros: `${erros.length} erros` }))
  return new Response(JSON.stringify(resposta), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
})
