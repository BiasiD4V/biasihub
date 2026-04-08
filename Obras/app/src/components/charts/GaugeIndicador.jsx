import React from 'react'
import { semaforo } from '../../lib/calculos'

// Gauge simples usando SVG
export default function GaugeIndicador({ valor, indicador, label, min = 0, max = 2 }) {
  const s = semaforo(indicador, valor)

  const corFill = {
    verde: '#16a34a',
    amarelo: '#ca8a04',
    vermelho: '#dc2626',
  }[s]

  const corBg = {
    verde: '#dcfce7',
    amarelo: '#fef9c3',
    vermelho: '#fee2e2',
  }[s]

  // Normaliza o valor para o arco (0 a 1)
  const normalizado = Math.min(Math.max((valor - min) / (max - min), 0), 1)

  // Arco de 180 graus
  const raio = 50
  const cx = 60
  const cy = 60
  const angulo = normalizado * 180 - 90  // -90 = esquerda, 90 = direita

  const paraX = (graus) => cx + raio * Math.cos((graus * Math.PI) / 180)
  const paraY = (graus) => cy + raio * Math.sin((graus * Math.PI) / 180)

  const xFim = paraX(angulo)
  const yFim = paraY(angulo)

  // Arco de fundo (cinza)
  const d_bg = `M ${paraX(-90)} ${paraY(-90)} A ${raio} ${raio} 0 0 1 ${paraX(90)} ${paraY(90)}`

  // Arco de progresso
  const largeArc = normalizado > 0.5 ? 1 : 0
  const d_progress = `M ${paraX(-90)} ${paraY(-90)} A ${raio} ${raio} 0 ${largeArc} 1 ${xFim} ${yFim}`

  const formatarValor = () => {
    if (indicador === 'ppc' || indicador === 'desvioFisico') {
      return `${valor?.toFixed(0)}%`
    }
    return valor?.toFixed(2)
  }

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 120 70" className="w-28 h-16">
        {/* Fundo do arco */}
        <path d={d_bg} fill="none" stroke="#e2e8f0" strokeWidth="10" strokeLinecap="round" />
        {/* Zonas de cor */}
        <path
          d={`M ${paraX(-90)} ${paraY(-90)} A ${raio} ${raio} 0 0 1 ${paraX(-30)} ${paraY(-30)}`}
          fill="none" stroke="#fee2e2" strokeWidth="10" strokeLinecap="round"
        />
        <path
          d={`M ${paraX(-30)} ${paraY(-30)} A ${raio} ${raio} 0 0 1 ${paraX(30)} ${paraY(30)}`}
          fill="none" stroke="#fef9c3" strokeWidth="10" strokeLinecap="round"
        />
        <path
          d={`M ${paraX(30)} ${paraY(30)} A ${raio} ${raio} 0 0 1 ${paraX(90)} ${paraY(90)}`}
          fill="none" stroke="#dcfce7" strokeWidth="10" strokeLinecap="round"
        />
        {/* Agulha */}
        <line
          x1={cx} y1={cy}
          x2={xFim} y2={yFim}
          stroke={corFill}
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* Centro */}
        <circle cx={cx} cy={cy} r="5" fill={corFill} />
      </svg>
      <div className="text-center mt-1">
        <p className="text-xl font-bold" style={{ color: corFill }}>{formatarValor()}</p>
        <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}
