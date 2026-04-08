import React from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { periodos, PERIODO_ATUAL, getEapFolhas, getCronogramaItem, getMedicaoItem } from '../../lib/mockData'
import { gerarCurvaS } from '../../lib/calculos'

const TooltipCustom = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-slate-700 mb-1.5">{label}</p>
      {payload.map((entry) => (
        entry.value !== null && entry.value !== undefined && (
          <div key={entry.dataKey} className="flex items-center gap-2 mb-0.5">
            <span className="w-3 h-1 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-500">{entry.name}:</span>
            <span className="font-semibold" style={{ color: entry.color }}>{entry.value?.toFixed(1)}%</span>
          </div>
        )
      ))}
    </div>
  )
}

export default function CurvaS({ obraId }) {
  const folhas = getEapFolhas(obraId)
  const dados = gerarCurvaS(
    folhas,
    getCronogramaItem,
    getMedicaoItem,
    periodos,
    PERIODO_ATUAL
  )

  if (!dados || dados.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        Sem dados de cronograma disponíveis
      </div>
    )
  }

  const labelPeriodoAtual = periodos[PERIODO_ATUAL]?.label

  return (
    <div className="w-full">
      <div className="flex items-center gap-6 mb-4 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-8 h-0.5 bg-blue-500 inline-block" style={{ borderTop: '2px dashed #3b82f6' }} />
          <span>Planejado (Baseline)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-8 h-0.5 bg-green-500 inline-block" />
          <span>Realizado</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-8 h-0.5 bg-orange-400 inline-block" style={{ borderTop: '2px dotted #fb923c' }} />
          <span>Tendência</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={dados} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="periodo"
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={{ stroke: '#e2e8f0' }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={v => `${v}%`}
            width={40}
          />
          <Tooltip content={<TooltipCustom />} />
          <ReferenceLine
            x={labelPeriodoAtual}
            stroke="#94a3b8"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{ value: 'Hoje', position: 'top', fontSize: 10, fill: '#94a3b8' }}
          />
          <Line
            type="monotone"
            dataKey="planejado"
            name="Planejado"
            stroke="#3b82f6"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            activeDot={{ r: 4, fill: '#3b82f6' }}
          />
          <Line
            type="monotone"
            dataKey="realizado"
            name="Realizado"
            stroke="#16a34a"
            strokeWidth={2.5}
            dot={{ r: 3, fill: '#16a34a', strokeWidth: 0 }}
            activeDot={{ r: 5, fill: '#16a34a' }}
            connectNulls={false}
          />
          <Line
            type="monotone"
            dataKey="tendencia"
            name="Tendência"
            stroke="#fb923c"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            dot={false}
            activeDot={{ r: 4, fill: '#fb923c' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
