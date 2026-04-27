import type { PlanilhaItem, NivelItem, PlanilhaOrcamentaria } from '../../infrastructure/supabase/planilhaOrcamentariaRepository'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ItemLocal extends Omit<PlanilhaItem, 'planilha_id' | 'criado_em'> {
  _tempId?: string
}

export type TabAtiva = 'cabecalho' | 'bdi' | 'planilha' | 'resumo'

// ─── Helper functions ─────────────────────────────────────────────────────────

export function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function fmtPct(v: number) {
  return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '%'
}

export function gerarId() {
  return Math.random().toString(36).slice(2, 11)
}

export function proximoNumeroItem(itens: ItemLocal[], nivel: NivelItem, parentNum: string): string {
  const irmãos = itens.filter((i) => {
    if (nivel === 'CC') return i.nivel === 'CC'
    return i.nivel === nivel && i.numero_item.startsWith(parentNum + '.')
  })
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

// ─── Defaults ─────────────────────────────────────────────────────────────────

export const PLANILHA_DEFAULTS: Partial<PlanilhaOrcamentaria> = {
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

// ─── Shared sub-component ─────────────────────────────────────────────────────

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

export function InputField({ label, value, onChange, type = 'text', placeholder, required, className = '', suffix }: InputFieldProps) {
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
