import React, { useState, useEffect, useMemo } from 'react'
import { Download, Loader2 } from 'lucide-react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts'
import { contratosService } from '../lib/supabase'
import { formatarMoeda } from '../lib/calculos'
import { useObra } from '../context/ObraContext'

const classeBadge = {
  A: 'bg-red-100 text-red-700 border border-red-200',
  B: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  C: 'bg-green-100 text-green-700 border border-green-200',
}

function calcularCurvaABC(itens) {
  const ordenados = [...itens].sort((a, b) => b.valor - a.valor)
  const total = ordenados.reduce((s, i) => s + i.valor, 0)
  let acumulado = 0
  return ordenados.map((item, idx) => {
    const participacao = total > 0 ? (item.valor / total) * 100 : 0
    acumulado += participacao
    const classe = acumulado <= 80 ? 'A' : acumulado <= 95 ? 'B' : 'C'
    return { ...item, rank: idx + 1, participacao: Math.round(participacao * 100) / 100, acumulado: Math.round(acumulado * 100) / 100, classe }
  })
}

export default function CurvaABC() {
  const { obraSelecionadaId } = useObra()
  const [contratos, setContratos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [modoVista, setModoVista] = useState('fornecedor') // fornecedor | contrato

  useEffect(() => {
    contratosService.listarTodos()
      .then(data => setContratos(data || []))
      .catch(err => console.error(err))
      .finally(() => setCarregando(false))
  }, [])

  const dadosABC = useMemo(() => {
    const cf = obraSelecionadaId ? contratos.filter(c => c.obra_id === obraSelecionadaId) : contratos

    if (modoVista === 'fornecedor') {
      const porFornecedor = {}
      cf.forEach(c => {
        const nome = c.fornecedor || 'Não informado'
        if (!porFornecedor[nome]) porFornecedor[nome] = { nome, valor: 0, qtd: 0 }
        porFornecedor[nome].valor += parseFloat(c.valor_total) || 0
        porFornecedor[nome].qtd++
      })
      return calcularCurvaABC(Object.values(porFornecedor))
    }

    return calcularCurvaABC(cf.map(c => ({
      nome: c.fornecedor || 'N/I',
      objeto: c.objeto || '',
      valor: parseFloat(c.valor_total) || 0,
    })))
  }, [contratos, obraSelecionadaId, modoVista])

  const totais = useMemo(() => {
    const porClasse = { A: 0, B: 0, C: 0 }
    const qtd = { A: 0, B: 0, C: 0 }
    dadosABC.forEach(d => {
      porClasse[d.classe] += d.valor
      qtd[d.classe]++
    })
    return { porClasse, qtd, total: dadosABC.reduce((s, d) => s + d.valor, 0) }
  }, [dadosABC])

  const dadosGrafico = dadosABC.slice(0, 15).map(d => ({
    nome: d.nome?.substring(0, 20) || d.rank.toString(),
    valor: d.valor,
    acumulado: d.acumulado,
  }))

  if (carregando) return <div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin" style={{ color: '#233772' }} /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Curva ABC</h1>
          <p className="text-sm text-gray-500 mt-0.5">Análise de concentração de valor por {modoVista === 'fornecedor' ? 'fornecedor' : 'contrato'}</p>
        </div>
        <div className="flex gap-3">
          <div className="flex gap-1 border border-gray-200 rounded-lg p-1 bg-white">
            {['fornecedor', 'contrato'].map(m => (
              <button key={m} onClick={() => setModoVista(m)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${modoVista === m ? 'text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                style={modoVista === m ? { backgroundColor: '#233772' } : undefined}>
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards de classe */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['A', 'B', 'C']).map(cls => (
          <div key={cls} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Classe {cls} — {cls === 'A' ? 'Vitais (80%)' : cls === 'B' ? 'Importantes (95%)' : 'Triviais (100%)'}
                </p>
                <p className="text-2xl font-bold text-gray-900">{totais.qtd[cls]} itens</p>
                <p className="text-sm text-gray-500 mt-1">{formatarMoeda(totais.porClasse[cls])}</p>
              </div>
              <span className={`px-3 py-1.5 rounded-full text-lg font-bold ${classeBadge[cls]}`}>{cls}</span>
            </div>
            <div className="mt-3 bg-gray-100 rounded-full h-2">
              <div className={`h-2 rounded-full ${cls === 'A' ? 'bg-red-500' : cls === 'B' ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${totais.total > 0 ? (totais.porClasse[cls] / totais.total) * 100 : 0}%` }} />
            </div>
            <p className="text-xs text-gray-400 mt-1">{totais.total > 0 ? ((totais.porClasse[cls] / totais.total) * 100).toFixed(1) : 0}% do valor total</p>
          </div>
        ))}
      </div>

      {/* Gráfico */}
      {dadosGrafico.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="mb-4">
            <h2 className="font-semibold text-gray-800">Gráfico Curva ABC</h2>
            <p className="text-xs text-gray-400 mt-0.5">Top 15 · barras = valor, linha = % acumulado</p>
          </div>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={dadosGrafico} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="nome" tick={{ fontSize: 10, fill: '#6b7280' }} angle={-45} textAnchor="end" height={80} />
              <YAxis yAxisId="left" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#6b7280' }} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 11, fill: '#6b7280' }} />
              <Tooltip formatter={(v, name) => [name === '% Acumulado' ? `${v}%` : formatarMoeda(v), name]} />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
              <Bar yAxisId="left" dataKey="valor" name="Valor" fill="#233772" radius={[4, 4, 0, 0]} />
              <Line yAxisId="right" type="monotone" dataKey="acumulado" name="% Acumulado" stroke="#FFC82D" strokeWidth={2} dot={{ fill: '#FFC82D', r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">Detalhamento <span className="ml-2 text-xs font-normal text-gray-400">({dadosABC.length} itens)</span></h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-12">Rank</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{modoVista === 'fornecedor' ? 'Fornecedor' : 'Fornecedor / Objeto'}</th>
                {modoVista === 'fornecedor' && <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contratos</th>}
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Valor</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">% Part.</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">% Acum.</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Classe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {dadosABC.map(item => (
                <tr key={item.rank} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3 text-center text-gray-500 text-xs">{item.rank}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-700">{item.nome}</span>
                    {item.objeto && <p className="text-xs text-gray-400 truncate max-w-xs">{item.objeto}</p>}
                  </td>
                  {modoVista === 'fornecedor' && <td className="px-4 py-3 text-center text-gray-600">{item.qtd}</td>}
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">{formatarMoeda(item.valor)}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{item.participacao.toFixed(2)}%</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${item.acumulado <= 80 ? 'text-red-600' : item.acumulado <= 95 ? 'text-yellow-600' : 'text-green-600'}`}>
                      {item.acumulado.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${classeBadge[item.classe]}`}>{item.classe}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
