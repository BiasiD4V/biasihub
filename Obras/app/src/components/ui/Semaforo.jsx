import React from 'react'
import { semaforo, classesSemaforo } from '../../lib/calculos'
import { getCoresBGSemaforo } from '../../lib/cores'

export default function Semaforo({ indicador, valor, mostrarValor = true, tamanho = 'md' }) {
  const s = semaforo(indicador, valor)
  const corPonto = getCoresBGSemaforo(s)

  const tamanhos = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3.5 h-3.5',
  }

  if (!mostrarValor) {
    return (
      <span
        className={`inline-block rounded-full ${corPonto} ${tamanhos[tamanho]} flex-shrink-0`}
        title={s}
      />
    )
  }

  const classes = classesSemaforo(indicador, valor)

  const formatarValor = () => {
    if (valor === null || valor === undefined || isNaN(valor)) return '—'
    if (indicador === 'desvioFisico') {
      return `${valor > 0 ? '+' : ''}${Number(valor).toFixed(1)}pp`
    }
    if (indicador === 'ppc') {
      return `${Number(valor).toFixed(0)}%`
    }
    return Number(valor).toFixed(2)
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${classes}`}>
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${corPonto}`} />
      {formatarValor()}
    </span>
  )
}

export function SemaforoIcone({ indicador, valor }) {
  const s = semaforo(indicador, valor)
  const coresText = getCoresTextSemaforo(s)
  return (
    <span className={`text-lg ${coresText}`} title={`${indicador}: ${valor} — ${s}`}>
      ●
    </span>
  )
}
