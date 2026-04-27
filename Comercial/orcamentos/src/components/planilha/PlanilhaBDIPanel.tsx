import { Calculator } from 'lucide-react'
import {
  calcularBDI,
  ISS_MUNICIPIOS,
  type PlanilhaOrcamentaria,
} from '../../infrastructure/supabase/planilhaOrcamentariaRepository'
import { fmtPct } from './planilhaTypes'

interface BDIPanelProps {
  planilha: PlanilhaOrcamentaria
  onChange: (campo: string, valor: number) => void
}

export function BDIPanel({ planilha, onChange }: BDIPanelProps) {
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
