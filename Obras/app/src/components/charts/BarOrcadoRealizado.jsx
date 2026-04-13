import React from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts'
import { formatarMoeda } from '../../lib/calculos'

const TooltipCustom = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs max-w-xs">
      <p className="font-semibold text-gray-700 mb-1.5 text-sm">{label}</p>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2 mb-0.5">
          <span className="w-3 h-3 rounded-sm inline-block flex-shrink-0" style={{ backgroundColor: entry.fill }} />
          <span className="text-gray-500">{entry.name}:</span>
          <span className="font-semibold text-gray-700">{formatarMoeda(entry.value)}</span>
        </div>
      ))}
    </div>
  )
}

export default function BarOrcadoRealizado({ dados }) {
  // dados: [{nome, orcado, realizado, nomeAbrev}]
  if (!dados || dados.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        Sem dados disponíveis
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={dados}
        margin={{ top: 5, right: 10, left: 10, bottom: 40 }}
        barSize={22}
        barGap={4}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="nomeAbrev"
          tick={{ fontSize: 10, fill: '#6b7280' }}
          tickLine={false}
          axisLine={{ stroke: '#e5e7eb' }}
          angle={-25}
          textAnchor="end"
          height={60}
          interval={0}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={v => {
            if (v >= 1000000) return `R$${(v / 1000000).toFixed(1)}M`
            if (v >= 1000) return `R$${(v / 1000).toFixed(0)}K`
            return `R$${v}`
          }}
          width={55}
        />
        <Tooltip content={<TooltipCustom />} />
        <Legend
          wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
          formatter={(value) => <span style={{ color: '#4b5563' }}>{value}</span>}
        />
        <Bar dataKey="orcado" name="Orçado" fill="#fed7aa" radius={[3, 3, 0, 0]} />
        <Bar dataKey="realizado" name="Realizado" fill="#f97316" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
