import React from 'react'
import { CORES_BADGES_VARIANTESS, CORES_STATUS_ATIVIDADE, CORES_STATUS_OBRA } from '../../lib/cores'

// ─── Badge genérico com variantes ─────────────────────────────────────────

export default function Badge({ children, variante = 'default', className = '' }) {
  const classes = CORES_BADGES_VARIANTESS[variante] || CORES_BADGES_VARIANTESS.default
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${classes} ${className}`}>
      {children}
    </span>
  )
}

// ─── BadgePerfil — para exibir perfil de usuário ───────────────────────────

export function BadgePerfil({ perfil }) {
  const config = {
    diretor: { label: 'Diretor', variante: 'purple' },
    gerente: { label: 'Gerente', variante: 'blue' },
    supervisor: { label: 'Supervisor', variante: 'cyan' },
  }
  const c = config[perfil] || { label: perfil, variante: 'default' }
  return <Badge variante={c.variante}>{c.label}</Badge>
}

// ─── BadgeAprovacao — para status de aprovação ──────────────────────────────

export function BadgeAprovacao({ aprovado, statusAprovacao }) {
  if (aprovado) {
    return <Badge variante="green">Aprovado</Badge>
  }
  if (statusAprovacao === 'pendente') {
    return <Badge variante="yellow">Pendente</Badge>
  }
  return <Badge variante="default">Rascunho</Badge>
}

// ─── StatusBadge — para status geral de obra ───────────────────────────────

export function StatusBadge({ status }) {
  const config = CORES_STATUS_OBRA[status] || { label: status, classes: 'bg-slate-100 text-slate-700' }
  const label = {
    em_andamento: 'Em Andamento',
    concluido: 'Concluído',
    paralisado: 'Paralisado',
    planejado: 'Planejado',
    cancelado: 'Cancelado',
  }[status] || status

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config}`}>
      {label}
    </span>
  )
}

// ─── StatusAtividadeBadge — para status específico de atividade ──────────────

export function StatusAtividadeBadge({ status }) {
  const labelMap = {
    'CRITICO': 'Crítico (FT=0)',
    'IMPEDIMENTO_CIVIL': 'Impd. Civil',
    'PENDENCIA_INFRA': 'Pend. Infra',
    'LIBERADO': 'Liberado',
    'EM_ANDAMENTO': 'Em Andamento',
    'CONCLUIDO': 'Concluído',
  }

  const classes = CORES_STATUS_ATIVIDADE[status] || 'bg-slate-100 text-slate-700'
  const label = labelMap[status] || status

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${classes}`}>
      {label}
    </span>
  )
}
