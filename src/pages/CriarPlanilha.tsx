import { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import {
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  Settings2,
  Building2,
  Calculator,
  AlertCircle,
  Printer,
  FileEdit,
} from 'lucide-react'
import {
  planilhaRepository,
  calcularBDI,
  issParaMunicipio,
  ISS_MUNICIPIOS,
  type PlanilhaOrcamentaria,
  type PlanilhaItem,
  type NivelItem,
} from '../infrastructure/supabase/planilhaOrcamentariaRepository'
import { clientesRepository, type ClienteSupabase } from '../infrastructure/supabase/clientesRepository'
import { insumosRepository } from '../infrastructure/supabase/insumosRepository'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ItemLocal extends Omit<PlanilhaItem, 'planilha_id' | 'criado_em'> {
  _tempId?: string  // temp ID before save
}

type TabAtiva = 'cabecalho' | 'bdi' | 'planilha' | 'resumo'

// ─── Helper functions ─────────────────────────────────────────────────────────

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtPct(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'
}

function gerarId() {
  return Math.random().toString(36).slice(2, 11)
}

function proximoNumeroItem(itens: ItemLocal[], nivel: NivelItem, parentNum: string): string {
  const irmãos = itens.filter((i) => {
    if (nivel === 'CC') return i.nivel === 'CC'
    return i.nivel === nivel && i.numero_item.startsWith(parentNum + '.')
  })
  // Count direct children only (no deeper nesting)
  const diretos = irmãos.filter((i) => {
    const rest = i.numero_item.slice(parentNum.length + 1)
    return !rest.includes('.')
  })
  const max = diretos.length > 0
    ? Math.max(...diretos.map((i) => {
        const parts = i.numero_item.split('.')
        return parseInt(parts[parts.length - 1], 10) || 0
      }))
    : 0
  if (nivel === 'CC') return String(max + 1)
  return `${parentNum}.${max + 1}`
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface InputFieldProps {
  label: string
  value: string | number
  onChange: (v: string) => void
  type?: string
  placeholder?: string
  required?: boolean
  className?: string
  suffix?: string
}

function InputField({ label, value, onChange, type = 'text', placeholder, required, className = '', suffix }: InputFieldProps) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-slate-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${suffix ? 'pr-8' : ''}`}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">{suffix}</span>
        )}
      </div>
    </div>
  )
}

// ─── BDI Panel ────────────────────────────────────────────────────────────────

interface BDIPanelProps {
  planilha: PlanilhaOrcamentaria
  onChange: (campo: string, valor: number) => void
}

function BDIPanel({ planilha, onChange }: BDIPanelProps) {
  const bdi = calcularBDI(planilha)

  const grupos = [
    {
      titulo: 'Custos Indiretos',
      campos: [
        { key: 'bdi_ac', label: 'Administração Central (AC)', hint: 'Custos da sede' },
        { key: 'bdi_riscos', label: 'Riscos', hint: 'Contingências' },
        { key: 'bdi_cf', label: 'Capital de Giro (CF)', hint: 'Financiamento da obra' },
        { key: 'bdi_seguros', label: 'Seguros', hint: '' },
        { key: 'bdi_garantias', label: 'Garantias', hint: '' },
        { key: 'bdi_lucro', label: 'Lucro', hint: '' },
      ],
    },
    {
      titulo: 'Tributos (dedutíveis)',
      campos: [
        { key: 'bdi_pis', label: 'PIS', hint: '0,65%' },
        { key: 'bdi_cofins', label: 'COFINS', hint: '3%' },
        { key: 'bdi_irpj', label: 'IRPJ', hint: '1,2% a 4,8%' },
        { key: 'bdi_csll', label: 'CSLL', hint: '1,08% a 2,88%' },
        { key: 'bdi_iss', label: 'ISS', hint: 'Varia por município' },
      ],
    },
  ]

  return (
    <div className="space-y-6">
      {/* Municipality ISS quick set */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-xs font-semibold text-blue-700 mb-2">ISS por Município</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(ISS_MUNICIPIOS).map(([municipio, iss]) => (
            <button
              key={municipio}
              onClick={() => onChange('bdi_iss', iss)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                planilha.bdi_iss === iss && planilha.municipio === municipio
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-blue-200 text-blue-700 hover:bg-blue-100'
              }`}
            >
              {municipio} ({iss}%)
            </button>
          ))}
        </div>
      </div>

      {grupos.map((grupo) => (
        <div key={grupo.titulo}>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">{grupo.titulo}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {grupo.campos.map(({ key, label, hint }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
                {hint && <p className="text-[10px] text-slate-400 mb-1">{hint}</p>}
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={planilha[key as keyof PlanilhaOrcamentaria] as number}
                    onChange={(e) => onChange(key, parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 pr-6 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* BDI result */}
      <div className="bg-slate-800 text-white rounded-lg p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400">BDI Calculado</p>
          <p className="text-2xl font-bold">{fmtPct(bdi)}</p>
          <p className="text-xs text-slate-400 mt-1">
            Numerador: {fmtPct(
              (planilha.bdi_ac + planilha.bdi_riscos + planilha.bdi_cf +
                planilha.bdi_seguros + planilha.bdi_garantias + planilha.bdi_lucro)
            )} · Dedutível: {fmtPct(
              (planilha.bdi_pis + planilha.bdi_cofins + planilha.bdi_irpj +
                planilha.bdi_csll + planilha.bdi_iss)
            )}
          </p>
        </div>
        <Calculator size={32} className="text-slate-600" />
      </div>
    </div>
  )
}

// ─── Insumo autocomplete ─────────────────────────────────────────────────────

interface Sugestao {
  descricao: string
  unidade: string
  melhor_preco: number
}

interface BuscaInsumoProps {
  value: string
  onChange: (descricao: string, unidade: string, preco: number) => void
}

function BuscaInsumo({ value, onChange }: BuscaInsumoProps) {
  const [texto, setTexto] = useState(value)
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([])
  const [aberto, setAberto] = useState(false)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync external value changes (when item is reset)
  useEffect(() => { setTexto(value) }, [value])

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const buscar = useCallback((q: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (q.length < 2) { setSugestoes([]); setAberto(false); return }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await insumosRepository.buscarSugestoes(q)
        setSugestoes(res)
        setAberto(res.length > 0)
      } catch {
        setSugestoes([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [])

  const selecionar = (s: Sugestao) => {
    setTexto(s.descricao)
    setAberto(false)
    onChange(s.descricao, s.unidade, s.melhor_preco)
  }

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      <input
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value)
          onChange(e.target.value, '', 0)
          buscar(e.target.value)
        }}
        onFocus={() => { if (sugestoes.length > 0) setAberto(true) }}
        placeholder="Descrição do serviço ou buscar insumo..."
        className="w-full px-1 py-0.5 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-400 focus:outline-none text-slate-800 text-xs"
      />
      {loading && (
        <div className="absolute right-1 top-0.5">
          <div className="h-3 w-3 rounded-full border border-blue-400 border-t-transparent animate-spin" />
        </div>
      )}
      {aberto && sugestoes.length > 0 && (
        <div className="absolute left-0 top-full mt-0.5 z-50 bg-white border border-slate-200 rounded-lg shadow-xl w-[480px] max-h-64 overflow-y-auto">
          <div className="px-2 py-1 bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-wide">
            Insumos cadastrados — clique para puxar o preço
          </div>
          {sugestoes.map((s) => (
            <button
              key={s.descricao}
              onMouseDown={(e) => { e.preventDefault(); selecionar(s) }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0"
            >
              <span className="flex-1 text-xs text-slate-800 truncate">{s.descricao}</span>
              <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">{s.unidade}</span>
              {s.melhor_preco > 0 ? (
                <span className="text-[10px] font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded flex-shrink-0">
                  {s.melhor_preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 flex-shrink-0">s/ preço</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Item Row ─────────────────────────────────────────────────────────────────

interface ItemRowProps {
  item: ItemLocal
  onUpdate: (id: string, campo: string, valor: string | number | boolean) => void
  onDelete: (id: string) => void
  totalVerbaBase?: number  // total non-verba S in same SE for verba calc
}

function ItemRow({ item, onUpdate, onDelete, totalVerbaBase = 0 }: ItemRowProps) {
  const totalMat = item.is_verba ? 0 : item.quantidade * item.preco_unit_material
  const totalMO = item.is_verba ? 0 : item.quantidade * item.preco_unit_mo
  const totalVerba = item.is_verba ? (item.verba_pct / 100) * totalVerbaBase : 0
  const total = item.is_verba ? totalVerba : (totalMat + totalMO)

  const id = item.id || item._tempId || ''

  return (
    <div className="flex items-center gap-1 px-3 py-1.5 border-b border-slate-100 hover:bg-slate-50 group text-xs">
      {/* Número */}
      <span className="w-20 text-slate-400 font-mono flex-shrink-0">{item.numero_item}</span>

      {/* Descrição — com autocomplete de insumos */}
      <BuscaInsumo
        value={item.descricao}
        onChange={(descricao, unidade, preco) => {
          onUpdate(id, 'descricao', descricao)
          if (unidade) onUpdate(id, 'unidade', unidade)
          if (preco > 0) onUpdate(id, 'preco_unit_material', preco)
        }}
      />

      {!item.is_verba ? (
        <>
          {/* Unidade */}
          <input
            value={item.unidade ?? ''}
            onChange={(e) => onUpdate(id, 'unidade', e.target.value)}
            placeholder="un"
            className="w-12 px-1 py-0.5 text-center bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-400 focus:outline-none text-slate-600"
          />
          {/* Quantidade */}
          <input
            type="number"
            value={item.quantidade}
            onChange={(e) => onUpdate(id, 'quantidade', parseFloat(e.target.value) || 0)}
            className="w-16 px-1 py-0.5 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-400 focus:outline-none text-slate-700"
          />
          {/* Preço material */}
          <input
            type="number"
            step="0.01"
            value={item.preco_unit_material || ''}
            placeholder="0,00"
            onChange={(e) => onUpdate(id, 'preco_unit_material', parseFloat(e.target.value) || 0)}
            className="w-24 px-1 py-0.5 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-400 focus:outline-none text-slate-700"
          />
          {/* Preço MO */}
          <input
            type="number"
            step="0.01"
            value={item.preco_unit_mo || ''}
            placeholder="0,00"
            onChange={(e) => onUpdate(id, 'preco_unit_mo', parseFloat(e.target.value) || 0)}
            className="w-24 px-1 py-0.5 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-400 focus:outline-none text-slate-700"
          />
          {/* Total material */}
          <span className="w-24 text-right text-slate-600 flex-shrink-0">{totalMat > 0 ? fmt(totalMat) : '—'}</span>
          {/* Total MO */}
          <span className="w-24 text-right text-slate-600 flex-shrink-0">{totalMO > 0 ? fmt(totalMO) : '—'}</span>
        </>
      ) : (
        <>
          {/* Verba % */}
          <div className="flex items-center gap-1 ml-2">
            <span className="text-slate-500">Verba:</span>
            <input
              type="number"
              step="0.1"
              value={item.verba_pct || ''}
              placeholder="0"
              onChange={(e) => onUpdate(id, 'verba_pct', parseFloat(e.target.value) || 0)}
              className="w-16 px-1 py-0.5 text-right bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-400 focus:outline-none"
            />
            <span className="text-slate-400">%</span>
          </div>
          <span className="flex-1" />
          <span className="w-24 text-right text-slate-500 flex-shrink-0">—</span>
          <span className="w-24 text-right text-slate-500 flex-shrink-0">—</span>
          <span className="w-24 text-right text-slate-500 flex-shrink-0">—</span>
          <span className="w-24 text-right text-slate-500 flex-shrink-0">—</span>
        </>
      )}

      {/* Total */}
      <span className={`w-28 text-right font-medium flex-shrink-0 ${total > 0 ? 'text-slate-800' : 'text-slate-400'}`}>
        {total > 0 ? fmt(total) : '—'}
      </span>

      {/* Delete */}
      <button
        onClick={() => onDelete(id)}
        className="ml-1 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 text-red-400 transition-all flex-shrink-0"
      >
        <Trash2 size={12} />
      </button>
    </div>
  )
}

// ─── Hierarchy Block ──────────────────────────────────────────────────────────

interface HierarquiaProps {
  itens: ItemLocal[]
  onUpdate: (id: string, campo: string, valor: string | number | boolean) => void
  onDelete: (id: string) => void
  onAddFilho: (parentNum: string, nivelPai: NivelItem | 'SE_verba') => void
}

function HierarquiaBloco({ itens, onUpdate, onDelete, onAddFilho }: HierarquiaProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const toggle = (num: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(num)) next.delete(num)
      else next.add(num)
      return next
    })

  const CCs = itens.filter((i) => i.nivel === 'CC')

  return (
    <div>
      {/* Table header */}
      <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
        <span className="w-20 flex-shrink-0">Item</span>
        <span className="flex-1">Descrição</span>
        <span className="w-12 text-center">Unid</span>
        <span className="w-16 text-right">Qtd</span>
        <span className="w-24 text-right">R$ Unit Mat</span>
        <span className="w-24 text-right">R$ Unit MO</span>
        <span className="w-24 text-right">Total Mat</span>
        <span className="w-24 text-right">Total MO</span>
        <span className="w-28 text-right">Total Geral</span>
        <span className="w-6" />
      </div>

      {CCs.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm italic">
          Nenhum item. Clique em "+ CC" para começar.
        </div>
      ) : (
        CCs.map((cc) => {
          const Es = itens.filter(
            (i) => i.nivel === 'E' && i.numero_item.startsWith(cc.numero_item + '.')
              && !i.numero_item.slice(cc.numero_item.length + 1).includes('.')
          )
          const ccCollapsed = collapsed.has(cc.id || cc._tempId || '')

          // CC totals
          const ccServicos = itens.filter(
            (i) => i.nivel === 'S' && i.numero_item.startsWith(cc.numero_item + '.')
              && !i.is_verba
          )
          const ccMatTotal = ccServicos.reduce((a, i) => a + i.quantidade * i.preco_unit_material, 0)
          const ccMOTotal = ccServicos.reduce((a, i) => a + i.quantidade * i.preco_unit_mo, 0)
          const ccTotal = ccMatTotal + ccMOTotal

          return (
            <div key={cc.id || cc._tempId} className="border-b border-slate-200">
              {/* CC Header */}
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-700 text-white">
                <button onClick={() => toggle(cc.id || cc._tempId || '')} className="text-blue-300 hover:text-white">
                  {ccCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                </button>
                <span className="font-mono text-xs text-blue-300 w-16">{cc.numero_item}</span>
                <input
                  value={cc.descricao}
                  onChange={(e) => onUpdate(cc.id || cc._tempId || '', 'descricao', e.target.value)}
                  className="flex-1 bg-transparent border-b border-blue-500 focus:outline-none text-sm font-semibold placeholder-blue-400"
                  placeholder="Nome da Célula Construtiva (CC)..."
                />
                {ccTotal > 0 && (
                  <span className="text-xs text-blue-200 ml-2 hidden md:block">{fmt(ccTotal)}</span>
                )}
                <button
                  onClick={() => onAddFilho(cc.numero_item, 'CC')}
                  className="flex items-center gap-1 px-2 py-0.5 text-xs bg-blue-600 hover:bg-blue-500 rounded transition-colors ml-2"
                  title="Adicionar Etapa"
                >
                  <Plus size={11} /> E
                </button>
                <button
                  onClick={() => onDelete(cc.id || cc._tempId || '')}
                  className="p-1 hover:bg-blue-600 rounded transition-colors ml-1"
                  title="Excluir CC"
                >
                  <Trash2 size={13} />
                </button>
              </div>

              {!ccCollapsed && Es.map((etapa) => {
                const SEs = itens.filter(
                  (i) => i.nivel === 'SE' && i.numero_item.startsWith(etapa.numero_item + '.')
                    && !i.numero_item.slice(etapa.numero_item.length + 1).includes('.')
                )
                const eCollapsed = collapsed.has(etapa.id || etapa._tempId || '')

                // E totals
                const eServicos = itens.filter(
                  (i) => i.nivel === 'S' && i.numero_item.startsWith(etapa.numero_item + '.')
                    && !i.is_verba
                )
                const eMatTotal = eServicos.reduce((a, i) => a + i.quantidade * i.preco_unit_material, 0)
                const eMOTotal = eServicos.reduce((a, i) => a + i.quantidade * i.preco_unit_mo, 0)
                const eTotal = eMatTotal + eMOTotal

                return (
                  <div key={etapa.id || etapa._tempId}>
                    {/* E Header */}
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-700 text-white">
                      <button onClick={() => toggle(etapa.id || etapa._tempId || '')} className="text-slate-400 hover:text-white">
                        {eCollapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                      </button>
                      <span className="font-mono text-xs text-slate-400 w-16">{etapa.numero_item}</span>
                      <input
                        value={etapa.descricao}
                        onChange={(e) => onUpdate(etapa.id || etapa._tempId || '', 'descricao', e.target.value)}
                        className="flex-1 bg-transparent border-b border-slate-500 focus:outline-none text-sm font-medium placeholder-slate-400"
                        placeholder="Nome da Etapa (E)..."
                      />
                      {eTotal > 0 && (
                        <span className="text-xs text-slate-400 ml-2 hidden md:block">{fmt(eTotal)}</span>
                      )}
                      <button
                        onClick={() => onAddFilho(etapa.numero_item, 'E')}
                        className="flex items-center gap-1 px-2 py-0.5 text-xs bg-slate-600 hover:bg-slate-500 rounded transition-colors ml-2"
                        title="Adicionar Sub-etapa"
                      >
                        <Plus size={11} /> SE
                      </button>
                      <button
                        onClick={() => onDelete(etapa.id || etapa._tempId || '')}
                        className="p-1 hover:bg-slate-600 rounded transition-colors ml-1"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>

                    {!eCollapsed && SEs.map((sub) => {
                      const Ss = itens.filter(
                        (i) => i.nivel === 'S' && i.numero_item.startsWith(sub.numero_item + '.')
                          && !i.numero_item.slice(sub.numero_item.length + 1).includes('.')
                      )
                      const seCollapsed = collapsed.has(sub.id || sub._tempId || '')

                      // SE totals + verba base
                      const sNaoVerba = Ss.filter((i) => !i.is_verba)
                      const seMatTotal = sNaoVerba.reduce((a, i) => a + i.quantidade * i.preco_unit_material, 0)
                      const seMOTotal = sNaoVerba.reduce((a, i) => a + i.quantidade * i.preco_unit_mo, 0)
                      const seBase = seMatTotal + seMOTotal
                      const seVerbas = Ss.filter((i) => i.is_verba)
                      const seVerbaTotal = seVerbas.reduce((a, i) => a + (i.verba_pct / 100) * seBase, 0)
                      const seTotal = seBase + seVerbaTotal

                      return (
                        <div key={sub.id || sub._tempId} className="bg-white">
                          {/* SE Header */}
                          <div className="flex items-center gap-2 px-6 py-1.5 bg-slate-100 border-b border-slate-200 text-slate-700">
                            <button onClick={() => toggle(sub.id || sub._tempId || '')} className="text-slate-400 hover:text-slate-700">
                              {seCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                            </button>
                            <span className="font-mono text-xs text-slate-400 w-16">{sub.numero_item}</span>
                            <input
                              value={sub.descricao}
                              onChange={(e) => onUpdate(sub.id || sub._tempId || '', 'descricao', e.target.value)}
                              className="flex-1 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-400 focus:outline-none text-xs font-semibold text-slate-700 placeholder-slate-400"
                              placeholder="Nome da Sub-etapa (SE)..."
                            />
                            {seTotal > 0 && (
                              <span className="text-xs text-slate-500 ml-2 hidden md:block">{fmt(seTotal)}</span>
                            )}
                            <div className="flex items-center gap-1 ml-2">
                              <button
                                onClick={() => onAddFilho(sub.numero_item, 'SE')}
                                className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-slate-200 hover:bg-slate-300 rounded transition-colors"
                                title="Adicionar Serviço"
                              >
                                <Plus size={10} /> S
                              </button>
                              <button
                                onClick={() => onAddFilho(sub.numero_item, 'SE_verba')}
                                className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-amber-100 text-amber-700 hover:bg-amber-200 rounded transition-colors"
                                title="Adicionar Verba"
                              >
                                <Plus size={10} /> Verba
                              </button>
                            </div>
                            <button
                              onClick={() => onDelete(sub.id || sub._tempId || '')}
                              className="p-1 hover:bg-slate-200 rounded transition-colors ml-1"
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>

                          {!seCollapsed && Ss.map((servico) => (
                            <ItemRow
                              key={servico.id || servico._tempId}
                              item={servico}
                              onUpdate={onUpdate}
                              onDelete={onDelete}
                              totalVerbaBase={seBase}
                            />
                          ))}

                          {/* SE subtotal */}
                          {!seCollapsed && Ss.length > 0 && (
                            <div className="flex justify-end gap-1 px-3 py-1 bg-slate-50 border-b border-slate-200 text-xs">
                              <span className="text-slate-500 mr-auto pl-20">Subtotal {sub.numero_item}</span>
                              <span className="w-24 text-right text-slate-600">{seMatTotal > 0 ? fmt(seMatTotal) : '—'}</span>
                              <span className="w-24 text-right text-slate-600">{seMOTotal > 0 ? fmt(seMOTotal) : '—'}</span>
                              <span className="w-28 text-right font-semibold text-slate-700">{seTotal > 0 ? fmt(seTotal) : '—'}</span>
                              <span className="w-7" />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )
        })
      )}
    </div>
  )
}

// ─── Resumo Tab ───────────────────────────────────────────────────────────────

interface ResumoProps {
  planilha: PlanilhaOrcamentaria
  itens: ItemLocal[]
}

function ResumoTab({ planilha, itens }: ResumoProps) {
  const bdi = calcularBDI(planilha)

  const CCs = itens.filter((i) => i.nivel === 'CC')

  const rows = CCs.map((cc) => {
    const servicoItens = itens.filter(
      (i) => i.nivel === 'S' && i.numero_item.startsWith(cc.numero_item + '.') && !i.is_verba
    )
    const seBase = servicoItens.reduce(
      (a, i) => a + i.quantidade * (i.preco_unit_material + i.preco_unit_mo),
      0
    )
    const verbas = itens.filter(
      (i) => i.nivel === 'S' && i.numero_item.startsWith(cc.numero_item + '.') && i.is_verba
    )
    const verbaAmt = verbas.reduce((a, v) => a + (v.verba_pct / 100) * seBase, 0)
    const mat = servicoItens.reduce((a, i) => a + i.quantidade * i.preco_unit_material, 0)
    const mo = servicoItens.reduce((a, i) => a + i.quantidade * i.preco_unit_mo, 0)
    const total = mat + mo + verbaAmt
    return { cc, mat, mo, verba: verbaAmt, total }
  })

  const grandMat = rows.reduce((a, r) => a + r.mat, 0)
  const grandMO = rows.reduce((a, r) => a + r.mo, 0)
  const grandVerba = rows.reduce((a, r) => a + r.verba, 0)
  const grandTotal = grandMat + grandMO + grandVerba
  const grandComBDI = grandTotal * (1 + bdi / 100)

  return (
    <div className="space-y-6">
      {/* Summary table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-700">Resumo por Célula Construtiva</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs text-slate-500">
              <th className="px-4 py-2 text-left">CC</th>
              <th className="px-4 py-2 text-right">Material</th>
              <th className="px-4 py-2 text-right">Mão de Obra</th>
              <th className="px-4 py-2 text-right">Verbas</th>
              <th className="px-4 py-2 text-right font-semibold">Total s/ BDI</th>
              <th className="px-4 py-2 text-right font-semibold">Total c/ BDI</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ cc, mat, mo, verba, total }) => (
              <tr key={cc.id || cc._tempId} className="border-b border-slate-100">
                <td className="px-4 py-2">
                  <span className="font-mono text-xs text-slate-400 mr-2">{cc.numero_item}</span>
                  {cc.descricao || <span className="italic text-slate-400">Sem nome</span>}
                </td>
                <td className="px-4 py-2 text-right text-slate-600">{mat > 0 ? fmt(mat) : '—'}</td>
                <td className="px-4 py-2 text-right text-slate-600">{mo > 0 ? fmt(mo) : '—'}</td>
                <td className="px-4 py-2 text-right text-slate-500">{verba > 0 ? fmt(verba) : '—'}</td>
                <td className="px-4 py-2 text-right font-medium">{fmt(total)}</td>
                <td className="px-4 py-2 text-right font-semibold text-blue-700">{fmt(total * (1 + bdi / 100))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
              <td className="px-4 py-2.5 text-slate-700">TOTAL GERAL</td>
              <td className="px-4 py-2.5 text-right">{fmt(grandMat)}</td>
              <td className="px-4 py-2.5 text-right">{fmt(grandMO)}</td>
              <td className="px-4 py-2.5 text-right">{grandVerba > 0 ? fmt(grandVerba) : '—'}</td>
              <td className="px-4 py-2.5 text-right text-slate-800 text-base">{fmt(grandTotal)}</td>
              <td className="px-4 py-2.5 text-right text-blue-700 text-base">{fmt(grandComBDI)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* BDI summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Material', value: grandMat },
          { label: 'Total Mão de Obra', value: grandMO },
          { label: `BDI (${fmtPct(bdi)})`, value: grandTotal * (bdi / 100) },
          { label: 'TOTAL COM BDI', value: grandComBDI, highlight: true },
        ].map((k) => (
          <div key={k.label} className={`rounded-lg p-4 border ${k.highlight ? 'bg-blue-600 border-blue-700 text-white' : 'bg-white border-slate-200'}`}>
            <p className={`text-xs mb-1 ${k.highlight ? 'text-blue-200' : 'text-slate-500'}`}>{k.label}</p>
            <p className={`text-lg font-bold ${k.highlight ? 'text-white' : 'text-slate-800'}`}>{fmt(k.value)}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const PLANILHA_DEFAULTS: Partial<PlanilhaOrcamentaria> = {
  tipo: 'PO',
  status: 'rascunho',
  revisao: 0,
  bdi_ac: 8,
  bdi_riscos: 0.5,
  bdi_cf: 1.11,
  bdi_seguros: 0.3,
  bdi_garantias: 0.5,
  bdi_lucro: 8,
  bdi_pis: 0.65,
  bdi_cofins: 3,
  bdi_irpj: 1.2,
  bdi_csll: 1.08,
  bdi_iss: 5,
  faturamento_direto: false,
  total_material: 0,
  total_mo: 0,
  total_geral: 0,
  total_com_bdi: 0,
}

export function CriarPlanilha() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const isNova = !id || id === 'nova'

  const [planilha, setPlanilha] = useState<PlanilhaOrcamentaria>({
    ...PLANILHA_DEFAULTS,
    id: '',
    numero: (location.state as { numero?: string })?.numero ?? 'PO-??????-????',
    nome_obra: '',
    cliente_id: null,
    criado_em: '',
    atualizado_em: '',
  } as PlanilhaOrcamentaria)

  const [itens, setItens] = useState<ItemLocal[]>([])
  const [clientes, setClientes] = useState<ClienteSupabase[]>([])
  const [tabAtiva, setTabAtiva] = useState<TabAtiva>('planilha')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(!isNova)
  const salvoRef = useRef(false)

  // Load clientes
  useEffect(() => {
    clientesRepository.listarTodos().then(setClientes).catch(console.error)
  }, [])

  // Load planilha if editing
  useEffect(() => {
    if (isNova) {
      setLoading(false)
      return
    }
    planilhaRepository
      .buscarPorId(id!)
      .then((data) => {
        if (!data) { navigate('/planilha-orcamentaria'); return }
        const { itens: itensDB, ...header } = data
        setPlanilha(header as PlanilhaOrcamentaria)
        setItens(itensDB.map((i) => ({ ...i, _tempId: undefined })))
      })
      .catch((e: Error) => setErro(e.message))
      .finally(() => setLoading(false))
  }, [id, isNova, navigate])

  // Auto-set ISS when municipio changes
  const handleMunicipioChange = useCallback((municipio: string) => {
    const iss = issParaMunicipio(municipio)
    setPlanilha((prev) => ({ ...prev, municipio, bdi_iss: iss }))
  }, [])

  const updateCampo = useCallback((campo: string, valor: string | number | boolean | null) => {
    setPlanilha((prev) => ({ ...prev, [campo]: valor }))
  }, [])

  // Items management
  const addCC = useCallback(() => {
    const num = proximoNumeroItem(itens, 'CC', '')
    const novo: ItemLocal = {
      id: '',
      _tempId: gerarId(),
      nivel: 'CC',
      numero_item: num,
      descricao: '',
      unidade: null,
      quantidade: 1,
      preco_unit_material: 0,
      preco_unit_mo: 0,
      is_verba: false,
      verba_pct: 0,
      ordem: itens.length,
    }
    setItens((prev) => [...prev, novo])
  }, [itens])

  const addFilho = useCallback((parentNum: string, nivelPai: NivelItem | 'SE_verba') => {
    const isVerba = nivelPai === 'SE_verba'
    const nivelMap: Record<string, NivelItem> = {
      CC: 'E',
      E: 'SE',
      SE: 'S',
      SE_verba: 'S',
    }
    const nivelFilho = nivelMap[nivelPai] as NivelItem
    const num = proximoNumeroItem(itens, nivelFilho, parentNum)
    const novo: ItemLocal = {
      id: '',
      _tempId: gerarId(),
      nivel: nivelFilho,
      numero_item: num,
      descricao: '',
      unidade: nivelFilho === 'S' ? 'un' : null,
      quantidade: 1,
      preco_unit_material: 0,
      preco_unit_mo: 0,
      is_verba: isVerba,
      verba_pct: isVerba ? 5 : 0,
      ordem: itens.length,
    }
    setItens((prev) => [...prev, novo])
  }, [itens])

  const updateItem = useCallback((itemId: string, campo: string, valor: string | number | boolean) => {
    setItens((prev) =>
      prev.map((i) => {
        const match = (i.id && i.id === itemId) || (i._tempId && i._tempId === itemId)
        return match ? { ...i, [campo]: valor } : i
      })
    )
  }, [])

  const deleteItem = useCallback((itemId: string) => {
    setItens((prev) => {
      const item = prev.find((i) => (i.id && i.id === itemId) || (i._tempId && i._tempId === itemId))
      if (!item) return prev
      // Remove item and all children
      return prev.filter((i) => {
        const id2 = i.id || i._tempId || ''
        const isTarget = id2 === itemId
        const isChild = i.numero_item.startsWith(item.numero_item + '.')
        return !isTarget && !isChild
      })
    })
  }, [])

  const salvar = async () => {
    if (!planilha.nome_obra.trim()) {
      setErro('Nome da obra é obrigatório.')
      setTabAtiva('cabecalho')
      return
    }
    setErro(null)
    setSalvando(true)
    try {
      let planilhaId = planilha.id

      // Calculate totals
      const sItens = itens.filter((i) => i.nivel === 'S' && !i.is_verba)
      const totalMat = sItens.reduce((a, i) => a + i.quantidade * i.preco_unit_material, 0)
      const totalMO = sItens.reduce((a, i) => a + i.quantidade * i.preco_unit_mo, 0)
      // Verbas
      const SEs = itens.filter((i) => i.nivel === 'SE')
      let totalVerba = 0
      for (const se of SEs) {
        const sNaoVerba = itens.filter(
          (i) => i.nivel === 'S' && !i.is_verba && i.numero_item.startsWith(se.numero_item + '.')
        )
        const seBase = sNaoVerba.reduce((a, i) => a + i.quantidade * (i.preco_unit_material + i.preco_unit_mo), 0)
        const verbas = itens.filter((i) => i.nivel === 'S' && i.is_verba && i.numero_item.startsWith(se.numero_item + '.'))
        totalVerba += verbas.reduce((a, v) => a + (v.verba_pct / 100) * seBase, 0)
      }
      const totalGeral = totalMat + totalMO + totalVerba
      const bdi = calcularBDI(planilha)
      const totalComBDI = totalGeral * (1 + bdi / 100)

      const header = {
        numero: planilha.numero,
        revisao: planilha.revisao,
        tipo: planilha.tipo,
        status: planilha.status,
        cliente_id: planilha.cliente_id,
        nome_obra: planilha.nome_obra,
        objeto: planilha.objeto,
        municipio: planilha.municipio,
        condicoes_pagamento: planilha.condicoes_pagamento,
        prazo_execucao: planilha.prazo_execucao,
        data_proposta: planilha.data_proposta,
        responsavel: planilha.responsavel,
        faturamento_direto: planilha.faturamento_direto,
        observacoes: planilha.observacoes,
        bdi_ac: planilha.bdi_ac,
        bdi_riscos: planilha.bdi_riscos,
        bdi_cf: planilha.bdi_cf,
        bdi_seguros: planilha.bdi_seguros,
        bdi_garantias: planilha.bdi_garantias,
        bdi_lucro: planilha.bdi_lucro,
        bdi_pis: planilha.bdi_pis,
        bdi_cofins: planilha.bdi_cofins,
        bdi_irpj: planilha.bdi_irpj,
        bdi_csll: planilha.bdi_csll,
        bdi_iss: planilha.bdi_iss,
        total_material: totalMat,
        total_mo: totalMO,
        total_geral: totalGeral,
        total_com_bdi: totalComBDI,
      }

      if (isNova || !planilhaId) {
        const nova = await planilhaRepository.criar(header)
        planilhaId = nova.id
        setPlanilha((prev) => ({ ...prev, id: planilhaId }))
        salvoRef.current = true
      } else {
        await planilhaRepository.atualizar(planilhaId, header)
      }

      // Save items
      const itensParaSalvar = itens.map((item, idx) => ({
        planilha_id: planilhaId,
        nivel: item.nivel,
        numero_item: item.numero_item,
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade: item.quantidade,
        preco_unit_material: item.preco_unit_material,
        preco_unit_mo: item.preco_unit_mo,
        is_verba: item.is_verba,
        verba_pct: item.verba_pct,
        ordem: idx,
      }))

      const itensDb = await planilhaRepository.salvarItens(planilhaId, itensParaSalvar)
      setItens(itensDb.map((i) => ({ ...i, _tempId: undefined })))

      // Navigate to edit page if was new
      if (isNova) {
        navigate(`/planilha-orcamentaria/${planilhaId}`, { replace: true })
      }
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally {
      setSalvando(false)
    }
  }

  const TABS: { key: TabAtiva; label: string; icon: React.ElementType }[] = [
    { key: 'planilha', label: 'Planilha', icon: FileEdit },
    { key: 'cabecalho', label: 'Cabeçalho', icon: Building2 },
    { key: 'bdi', label: 'BDI', icon: Calculator },
    { key: 'resumo', label: 'Resumo', icon: Settings2 },
  ]

  const bdi = calcularBDI(planilha)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 gap-3 text-slate-400">
        <div className="h-5 w-5 rounded-full border-2 border-slate-300 border-t-transparent animate-spin" />
        <span>Carregando planilha...</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => navigate('/planilha-orcamentaria')}
            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-sm font-semibold text-blue-600">{planilha.numero}</span>
              <span className="text-xs text-slate-400">R{planilha.revisao}</span>
              <select
                value={planilha.status}
                onChange={(e) => updateCampo('status', e.target.value)}
                className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-400"
              >
                <option value="rascunho">Rascunho</option>
                <option value="emitido">Emitido</option>
                <option value="aprovado">Aprovado</option>
                <option value="cancelado">Cancelado</option>
              </select>
              {planilha.nome_obra && (
                <span className="text-sm text-slate-700 truncate hidden sm:block max-w-[200px]">
                  {planilha.nome_obra}
                </span>
              )}
            </div>
          </div>

          {/* BDI badge */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-slate-100 rounded-lg text-xs text-slate-600">
            <Calculator size={12} />
            BDI: {fmtPct(bdi)}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button
              onClick={salvar}
              disabled={salvando}
              className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              <Save size={14} />
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>

        {erro && (
          <div className="mt-2 flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
            <AlertCircle size={13} />
            {erro}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-200 px-4">
        <div className="flex gap-1">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTabAtiva(key)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-sm border-b-2 transition-colors ${
                tabAtiva === key
                  ? 'border-blue-600 text-blue-600 font-medium'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-auto">
        {/* ── Planilha Tab ── */}
        {tabAtiva === 'planilha' && (
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-slate-700">
                Editor de Planilha — Hierarquia CC → E → SE → S
              </h2>
              <button
                onClick={addCC}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus size={14} />
                + CC
              </button>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden overflow-x-auto">
              <HierarquiaBloco
                itens={itens}
                onUpdate={updateItem}
                onDelete={deleteItem}
                onAddFilho={addFilho}
              />
            </div>

            {/* Grand total bar */}
            {itens.some((i) => i.nivel === 'S') && (() => {
              const sItens = itens.filter((i) => i.nivel === 'S' && !i.is_verba)
              const mat = sItens.reduce((a, i) => a + i.quantidade * i.preco_unit_material, 0)
              const mo = sItens.reduce((a, i) => a + i.quantidade * i.preco_unit_mo, 0)
              const total = mat + mo
              const comBDI = total * (1 + bdi / 100)
              return (
                <div className="mt-3 flex items-center justify-end gap-6 px-4 py-3 bg-slate-800 text-white rounded-lg text-sm">
                  <div className="text-center">
                    <p className="text-xs text-slate-400">Material</p>
                    <p className="font-semibold">{fmt(mat)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400">Mão de Obra</p>
                    <p className="font-semibold">{fmt(mo)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-400">Total s/ BDI</p>
                    <p className="font-semibold">{fmt(total)}</p>
                  </div>
                  <div className="text-center bg-blue-600 rounded-lg px-4 py-1.5">
                    <p className="text-xs text-blue-200">Total c/ BDI ({fmtPct(bdi)})</p>
                    <p className="font-bold text-lg">{fmt(comBDI)}</p>
                  </div>
                </div>
              )
            })()}
          </div>
        )}

        {/* ── Cabeçalho Tab ── */}
        {tabAtiva === 'cabecalho' && (
          <div className="p-4 max-w-3xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                label="Número da Proposta"
                value={planilha.numero}
                onChange={(v) => updateCampo('numero', v)}
                className="sm:col-span-1"
              />
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
                <select
                  value={planilha.tipo}
                  onChange={(e) => updateCampo('tipo', e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="PO">PO — Planilha Orçamentária</option>
                  <option value="PTC">PTC — Proposta Técnico-Comercial</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Cliente</label>
                <select
                  value={planilha.cliente_id ?? ''}
                  onChange={(e) => updateCampo('cliente_id', e.target.value || null)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecionar cliente...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>{c.nome}</option>
                  ))}
                </select>
              </div>

              <InputField
                label="Nome da Obra / Projeto"
                value={planilha.nome_obra}
                onChange={(v) => updateCampo('nome_obra', v)}
                required
                placeholder="Ex: Instalações elétricas — Galpão A"
              />

              <InputField
                label="Objeto / Escopo Resumido"
                value={planilha.objeto ?? ''}
                onChange={(v) => updateCampo('objeto', v)}
                placeholder="Descrição do escopo..."
                className="sm:col-span-2"
              />

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Município</label>
                <select
                  value={planilha.municipio ?? ''}
                  onChange={(e) => handleMunicipioChange(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecionar município...</option>
                  {Object.keys(ISS_MUNICIPIOS).map((m) => (
                    <option key={m} value={m}>{m} (ISS {ISS_MUNICIPIOS[m]}%)</option>
                  ))}
                  <option value="Outros">Outros (ISS 5%)</option>
                </select>
              </div>

              <InputField
                label="Data da Proposta"
                value={planilha.data_proposta ?? ''}
                onChange={(v) => updateCampo('data_proposta', v)}
                type="date"
              />

              <InputField
                label="Prazo de Execução"
                value={planilha.prazo_execucao ?? ''}
                onChange={(v) => updateCampo('prazo_execucao', v)}
                placeholder="Ex: 60 dias corridos"
              />

              <InputField
                label="Condições de Pagamento"
                value={planilha.condicoes_pagamento ?? ''}
                onChange={(v) => updateCampo('condicoes_pagamento', v)}
                placeholder="Ex: 30/60/90 dias"
              />

              <InputField
                label="Responsável"
                value={planilha.responsavel ?? ''}
                onChange={(v) => updateCampo('responsavel', v)}
                placeholder="Nome do engenheiro responsável"
              />

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Observações</label>
                <textarea
                  value={planilha.observacoes ?? ''}
                  onChange={(e) => updateCampo('observacoes', e.target.value)}
                  rows={3}
                  placeholder="Observações gerais..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={planilha.faturamento_direto}
                    onChange={(e) => updateCampo('faturamento_direto', e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-700">
                    Faturamento direto de materiais
                    <span className="text-xs text-slate-400 ml-1">(materiais faturados diretamente pelo fornecedor, não entram na NF da Biasi)</span>
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ── BDI Tab ── */}
        {tabAtiva === 'bdi' && (
          <div className="p-4 max-w-3xl">
            <BDIPanel
              planilha={planilha}
              onChange={(campo, valor) => updateCampo(campo, valor)}
            />
          </div>
        )}

        {/* ── Resumo Tab ── */}
        {tabAtiva === 'resumo' && (
          <div className="p-4">
            <ResumoTab planilha={planilha} itens={itens} />
          </div>
        )}
      </div>
    </div>
  )
}

