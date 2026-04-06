import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PlusCircle, Search, Gift, TrendingUp, CheckCircle, Clock,
  X, Save, Trash2, ExternalLink, ChevronDown, Users,
} from 'lucide-react'
import {
  indicacoesRepository,
  type IndicacaoSupabase,
  type CriarIndicacaoInput,
  STATUS_INDICACAO,
  TIPO_INDICADOR,
  CANAIS_INDICACAO,
} from '../infrastructure/supabase/indicacoesRepository'
import { responsaveisComerciaisRepository } from '../infrastructure/supabase/responsaveisComerciaisRepository'
import { formatarMoeda } from '../utils/calculos'

const STATUS_LIST = Object.entries(STATUS_INDICACAO)

const FORM_VAZIO: CriarIndicacaoInput = {
  data: new Date().toISOString().slice(0, 10),
  indicador_nome: '',
  indicador_tipo: 'cliente',
  cliente_indicado: '',
  canal: null,
  status: 'nova',
  proposta_id: null,
  valor_potencial: null,
  observacao: null,
  responsavel: null,
  data_retorno: null,
  resultado: null,
}

function formatarData(d: string | null): string {
  if (!d) return '—'
  const [ano, mes, dia] = d.split('-')
  return `${dia}/${mes}/${ano}`
}

interface ModalProps {
  aberto: boolean
  onFechar: () => void
  onSalvo: (ind: IndicacaoSupabase) => void
  edicao?: IndicacaoSupabase | null
  responsaveis: string[]
}

function ModalIndicacao({ aberto, onFechar, onSalvo, edicao, responsaveis }: ModalProps) {
  const [form, setForm] = useState<CriarIndicacaoInput>(FORM_VAZIO)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (aberto) {
      setErro('')
      setForm(edicao
        ? {
            data: edicao.data,
            indicador_nome: edicao.indicador_nome,
            indicador_tipo: edicao.indicador_tipo,
            cliente_indicado: edicao.cliente_indicado,
            canal: edicao.canal,
            status: edicao.status,
            proposta_id: edicao.proposta_id,
            valor_potencial: edicao.valor_potencial,
            observacao: edicao.observacao,
            responsavel: edicao.responsavel,
            data_retorno: edicao.data_retorno,
            resultado: edicao.resultado,
          }
        : { ...FORM_VAZIO, data: new Date().toISOString().slice(0, 10) })
    }
  }, [aberto, edicao])

  if (!aberto) return null

  function set(campo: keyof CriarIndicacaoInput, valor: unknown) {
    setForm(prev => ({ ...prev, [campo]: valor || null }))
  }

  async function salvar() {
    setErro('')
    if (!form.indicador_nome.trim()) { setErro('Informe quem indicou.'); return }
    if (!form.cliente_indicado.trim()) { setErro('Informe o cliente/lead indicado.'); return }

    setSalvando(true)
    try {
      const payload: CriarIndicacaoInput = {
        ...form,
        indicador_nome: form.indicador_nome.trim(),
        cliente_indicado: form.cliente_indicado.trim(),
        valor_potencial: form.valor_potencial ? Number(form.valor_potencial) : null,
      }
      let salvo: IndicacaoSupabase
      if (edicao) {
        salvo = await indicacoesRepository.atualizar(edicao.id, payload)
      } else {
        salvo = await indicacoesRepository.criar(payload)
      }
      onSalvo(salvo)
      onFechar()
    } catch {
      setErro('Erro ao salvar. Tente novamente.')
    } finally {
      setSalvando(false)
    }
  }

  const labelInput = 'block text-xs font-medium text-slate-600 mb-1'
  const input = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
  const select = `${input} bg-white`

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onFechar} />
      <div className="relative bg-white w-full sm:max-w-xl sm:mx-4 sm:rounded-2xl rounded-t-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-800">
            {edicao ? 'Editar Indicação' : 'Nova Indicação'}
          </h2>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">{erro}</div>
          )}

          {/* Quem indicou */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelInput}>Quem indicou <span className="text-red-500">*</span></label>
              <input
                className={input}
                value={form.indicador_nome}
                onChange={e => setForm(p => ({ ...p, indicador_nome: e.target.value }))}
                placeholder="Nome do indicador"
              />
            </div>
            <div>
              <label className={labelInput}>Tipo de indicador</label>
              <select className={select} value={form.indicador_tipo} onChange={e => setForm(p => ({ ...p, indicador_tipo: e.target.value }))}>
                {TIPO_INDICADOR.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Cliente indicado */}
          <div>
            <label className={labelInput}>Cliente / Lead indicado <span className="text-red-500">*</span></label>
            <input
              className={input}
              value={form.cliente_indicado}
              onChange={e => setForm(p => ({ ...p, cliente_indicado: e.target.value }))}
              placeholder="Nome da empresa ou pessoa"
            />
          </div>

          {/* Canal + Data */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelInput}>Canal</label>
              <select className={select} value={form.canal ?? ''} onChange={e => set('canal', e.target.value)}>
                <option value="">— Selecionar —</option>
                {CANAIS_INDICACAO.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelInput}>Data da indicação</label>
              <input
                type="date"
                className={input}
                value={form.data}
                onChange={e => setForm(p => ({ ...p, data: e.target.value }))}
              />
            </div>
          </div>

          {/* Status + Responsável */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelInput}>Status</label>
              <select className={select} value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                {STATUS_LIST.map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className={labelInput}>Responsável</label>
              <select className={select} value={form.responsavel ?? ''} onChange={e => set('responsavel', e.target.value)}>
                <option value="">— Nenhum —</option>
                {responsaveis.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          {/* Valor potencial + Data retorno */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelInput}>Valor potencial (R$)</label>
              <input
                type="number"
                className={input}
                value={form.valor_potencial ?? ''}
                onChange={e => set('valor_potencial', e.target.value)}
                placeholder="0,00"
                min={0}
              />
            </div>
            <div>
              <label className={labelInput}>Data de retorno</label>
              <input
                type="date"
                className={input}
                value={form.data_retorno ?? ''}
                onChange={e => set('data_retorno', e.target.value)}
              />
            </div>
          </div>

          {/* Observação */}
          <div>
            <label className={labelInput}>Observação</label>
            <textarea
              className={`${input} resize-none`}
              rows={3}
              value={form.observacao ?? ''}
              onChange={e => set('observacao', e.target.value)}
              placeholder="Contexto, histórico do indicador, detalhes do lead..."
            />
          </div>

          {/* Resultado (visível quando convertida ou perdida) */}
          {(form.status === 'convertida' || form.status === 'perdida') && (
            <div>
              <label className={labelInput}>Resultado / Motivo</label>
              <textarea
                className={`${input} resize-none`}
                rows={2}
                value={form.resultado ?? ''}
                onChange={e => set('resultado', e.target.value)}
                placeholder={form.status === 'convertida' ? 'Descreva o negócio fechado...' : 'Motivo da perda...'}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-slate-200 flex justify-end gap-3">
          <button onClick={onFechar} disabled={salvando} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50">
            Cancelar
          </button>
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
          >
            {salvando ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {edicao ? 'Salvar' : 'Criar indicação'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function Indicacoes() {
  const navigate = useNavigate()
  const [indicacoes, setIndicacoes] = useState<IndicacaoSupabase[]>([])
  const [carregando, setCarregando] = useState(true)
  const [responsaveis, setResponsaveis] = useState<string[]>([])

  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string | null>(null)
  const [filtroResponsavel, setFiltroResponsavel] = useState<string | null>(null)

  const [modalAberto, setModalAberto] = useState(false)
  const [edicao, setEdicao] = useState<IndicacaoSupabase | null>(null)
  const [excluindo, setExcluindo] = useState<string | null>(null)

  const [toastMsg, setToastMsg] = useState('')

  // Carregar responsáveis
  useEffect(() => {
    responsaveisComerciaisRepository.listarTodos()
      .then(r => setResponsaveis(r.filter(x => x.ativo).map(x => x.nome)))
      .catch(() => {})
  }, [])

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const data = await indicacoesRepository.listarTodas({
        status: filtroStatus,
        responsavel: filtroResponsavel,
        busca: busca || undefined,
      })
      setIndicacoes(data)
    } catch {
      // silently fail
    } finally {
      setCarregando(false)
    }
  }, [filtroStatus, filtroResponsavel, busca])

  useEffect(() => { carregar() }, [carregar])

  function mostrarToast(msg: string) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(''), 3000)
  }

  function handleSalvo(ind: IndicacaoSupabase) {
    setIndicacoes(prev => {
      const idx = prev.findIndex(x => x.id === ind.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = ind
        return next
      }
      return [ind, ...prev]
    })
    mostrarToast(edicao ? 'Indicação atualizada!' : 'Indicação criada!')
    setEdicao(null)
  }

  async function handleExcluir(id: string) {
    if (excluindo !== id) { setExcluindo(id); return }
    try {
      await indicacoesRepository.deletar(id)
      setIndicacoes(prev => prev.filter(x => x.id !== id))
      setExcluindo(null)
      mostrarToast('Indicação removida.')
    } catch {
      setExcluindo(null)
    }
  }

  // KPIs
  const total = indicacoes.length
  const convertidas = indicacoes.filter(x => x.status === 'convertida').length
  const emAndamento = indicacoes.filter(x => ['nova', 'em_contato', 'proposta_gerada'].includes(x.status)).length
  const valorPotencial = indicacoes
    .filter(x => x.status !== 'perdida' && x.status !== 'convertida')
    .reduce((acc, x) => acc + (x.valor_potencial ?? 0), 0)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 sm:px-8 sm:py-6 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Indicações</h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Leads e oportunidades indicadas por clientes e parceiros
            </p>
          </div>
          <button
            onClick={() => { setEdicao(null); setModalAberto(true) }}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-colors shadow-sm"
          >
            <PlusCircle size={16} />
            <span className="hidden sm:inline">Nova Indicação</span>
            <span className="sm:hidden">Nova</span>
          </button>
        </div>
      </div>

      {/* Corpo */}
      <div className="flex-1 p-3 sm:p-6 overflow-auto">

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="bg-blue-50 p-2 rounded-lg flex-shrink-0"><Gift size={18} className="text-blue-600" /></div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-slate-500">Total</p>
              <p className="text-xl font-bold text-slate-800">{total}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="bg-amber-50 p-2 rounded-lg flex-shrink-0"><Clock size={18} className="text-amber-600" /></div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-slate-500">Em andamento</p>
              <p className="text-xl font-bold text-slate-800">{emAndamento}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="bg-green-50 p-2 rounded-lg flex-shrink-0"><CheckCircle size={18} className="text-green-600" /></div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-slate-500">Convertidas</p>
              <p className="text-xl font-bold text-slate-800">{convertidas}</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="bg-purple-50 p-2 rounded-lg flex-shrink-0"><TrendingUp size={18} className="text-purple-600" /></div>
            <div className="min-w-0">
              <p className="text-[10px] sm:text-xs text-slate-500">Valor potencial</p>
              <p className="text-sm sm:text-base font-bold text-slate-800">{valorPotencial > 0 ? formatarMoeda(valorPotencial, true) : '—'}</p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 mb-4">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3 items-end">
            <div className="col-span-2 sm:flex-1 sm:min-w-[200px]">
              <label className="block text-xs text-slate-500 mb-1">Buscar</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  placeholder="Indicador, cliente, lead..."
                  className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Status</label>
              <div className="relative">
                <select
                  value={filtroStatus ?? ''}
                  onChange={e => setFiltroStatus(e.target.value || null)}
                  className="w-full appearance-none py-2 pl-3 pr-7 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Todos</option>
                  {STATUS_LIST.map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            <div className="hidden sm:block">
              <label className="block text-xs text-slate-500 mb-1">Responsável</label>
              <div className="relative">
                <select
                  value={filtroResponsavel ?? ''}
                  onChange={e => setFiltroResponsavel(e.target.value || null)}
                  className="w-full appearance-none py-2 pl-3 pr-7 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Todos</option>
                  {responsaveis.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                <ChevronDown size={13} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>
            {(filtroStatus || filtroResponsavel || busca) && (
              <button
                onClick={() => { setBusca(''); setFiltroStatus(null); setFiltroResponsavel(null) }}
                className="py-2 px-3 bg-slate-100 text-slate-600 text-sm rounded-lg hover:bg-slate-200"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Lista — Mobile cards */}
        {carregando ? (
          <div className="text-center py-16 text-slate-400">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm">Carregando...</p>
          </div>
        ) : indicacoes.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="bg-slate-100 rounded-2xl p-5 mb-4 inline-block">
              <Users size={32} className="text-slate-400" />
            </div>
            <p className="text-base font-medium">Nenhuma indicação encontrada</p>
            <p className="text-sm mt-1">Registre indicações de clientes e parceiros aqui.</p>
            <button
              onClick={() => { setEdicao(null); setModalAberto(true) }}
              className="mt-4 flex items-center gap-2 mx-auto bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <PlusCircle size={15} />
              Nova Indicação
            </button>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden space-y-2">
              {indicacoes.map(ind => {
                const st = STATUS_INDICACAO[ind.status]
                const vencido = ind.data_retorno && new Date(ind.data_retorno + 'T00:00:00') < new Date() && !['convertida', 'perdida'].includes(ind.status)
                return (
                  <div key={ind.id} className="bg-white rounded-xl border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 text-sm truncate">{ind.cliente_indicado}</p>
                        <p className="text-xs text-slate-500">por <span className="font-medium">{ind.indicador_nome}</span>
                          {ind.canal ? ` · ${ind.canal}` : ''}</p>
                      </div>
                      <span className={`flex-shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full ${st.bg} ${st.cor}`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-400">
                      <span>{formatarData(ind.data)}</span>
                      {ind.responsavel && <span>· {ind.responsavel}</span>}
                      {ind.valor_potencial && <span className="ml-auto font-semibold text-slate-600">{formatarMoeda(ind.valor_potencial, true)}</span>}
                      {vencido && <span className="text-red-500 font-medium">⚠ Retorno vencido</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-slate-100">
                      <button
                        onClick={() => { setEdicao(ind); setModalAberto(true) }}
                        className="flex-1 text-xs text-blue-600 font-medium py-1 rounded-lg hover:bg-blue-50"
                      >Editar</button>
                      {ind.proposta_id && (
                        <button
                          onClick={() => navigate(`/orcamentos/${ind.proposta_id}`)}
                          className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-0.5"
                        >
                          <ExternalLink size={11} /> Ver proposta
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left">Cliente / Lead</th>
                    <th className="px-4 py-3 text-left">Indicado por</th>
                    <th className="px-4 py-3 text-left">Canal</th>
                    <th className="px-4 py-3 text-left">Data</th>
                    <th className="px-4 py-3 text-left">Retorno</th>
                    <th className="px-4 py-3 text-left">Responsável</th>
                    <th className="px-4 py-3 text-right">Valor potencial</th>
                    <th className="px-4 py-3 text-center">Status</th>
                    <th className="px-2 py-3 w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {indicacoes.map(ind => {
                    const st = STATUS_INDICACAO[ind.status]
                    const vencido = ind.data_retorno && new Date(ind.data_retorno + 'T00:00:00') < new Date() && !['convertida', 'perdida'].includes(ind.status)
                    return (
                      <tr key={ind.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{ind.cliente_indicado}</p>
                          {ind.observacao && (
                            <p className="text-xs text-slate-400 truncate max-w-[180px]" title={ind.observacao}>{ind.observacao}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          <p>{ind.indicador_nome}</p>
                          <p className="text-xs text-slate-400 capitalize">{ind.indicador_tipo}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{ind.canal || '—'}</td>
                        <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatarData(ind.data)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {ind.data_retorno ? (
                            <span className={vencido ? 'text-red-600 font-medium' : 'text-slate-500'}>
                              {vencido && '⚠ '}{formatarData(ind.data_retorno)}
                            </span>
                          ) : <span className="text-slate-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{ind.responsavel || '—'}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700 whitespace-nowrap">
                          {ind.valor_potencial ? formatarMoeda(ind.valor_potencial, true) : '—'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${st.bg} ${st.cor}`}>
                            {st.label}
                          </span>
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex items-center justify-center gap-1">
                            {ind.proposta_id && (
                              <button
                                onClick={() => navigate(`/orcamentos/${ind.proposta_id}`)}
                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Ver proposta"
                              >
                                <ExternalLink size={13} />
                              </button>
                            )}
                            <button
                              onClick={() => { setEdicao(ind); setModalAberto(true) }}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                            </button>
                            <button
                              onClick={() => handleExcluir(ind.id)}
                              className={`p-1.5 rounded-lg transition-colors ${excluindo === ind.id ? 'text-red-600 bg-red-50' : 'text-slate-400 hover:text-red-500 hover:bg-red-50'}`}
                              title={excluindo === ind.id ? 'Clique para confirmar exclusão' : 'Excluir'}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-slate-400 mt-3 text-center">{indicacoes.length} indicaç{indicacoes.length === 1 ? 'ão' : 'ões'} encontrada{indicacoes.length === 1 ? '' : 's'}</p>
          </>
        )}
      </div>

      {/* Modal */}
      <ModalIndicacao
        aberto={modalAberto}
        onFechar={() => { setModalAberto(false); setEdicao(null) }}
        onSalvo={handleSalvo}
        edicao={edicao}
        responsaveis={responsaveis}
      />

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-green-600 text-white text-sm font-medium px-5 py-3 rounded-lg shadow-lg">
          <CheckCircle size={16} />
          {toastMsg}
        </div>
      )}
    </div>
  )
}
