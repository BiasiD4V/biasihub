import {
  calcularBDI,
  type PlanilhaOrcamentaria,
} from '../../infrastructure/supabase/planilhaOrcamentariaRepository'
import { fmt, fmtPct, type ItemLocal } from './planilhaTypes'

interface ResumoProps {
  planilha: PlanilhaOrcamentaria
  itens: ItemLocal[]
}

export function ResumoTab({ planilha, itens }: ResumoProps) {
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
          <h3 className="text-sm font-semibold text-slate-700">Resumo por C\u00e9lula Construtiva</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-xs text-slate-500">
              <th className="px-4 py-2 text-left">CC</th>
              <th className="px-4 py-2 text-right">Material</th>
              <th className="px-4 py-2 text-right">M\u00e3o de Obra</th>
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
                <td className="px-4 py-2 text-right text-slate-600">{mat > 0 ? fmt(mat) : '\u2014'}</td>
                <td className="px-4 py-2 text-right text-slate-600">{mo > 0 ? fmt(mo) : '\u2014'}</td>
                <td className="px-4 py-2 text-right text-slate-500">{verba > 0 ? fmt(verba) : '\u2014'}</td>
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
              <td className="px-4 py-2.5 text-right">{grandVerba > 0 ? fmt(grandVerba) : '\u2014'}</td>
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
          { label: 'Total M\u00e3o de Obra', value: grandMO },
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
