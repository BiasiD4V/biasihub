interface BadgeABCProps {
  classificacao: 'A' | 'B' | 'C' | null | undefined
  size?: 'sm' | 'md'
}

const CONFIG = {
  A: {
    label: 'A',
    bg: 'bg-green-100',
    text: 'text-green-700',
    border: 'border-green-300',
    tooltip: 'Fornecedor A — Melhor qualidade e confiabilidade',
  },
  B: {
    label: 'B',
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    border: 'border-yellow-300',
    tooltip: 'Fornecedor B — Boa relação custo-benefício',
  },
  C: {
    label: 'C',
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
    tooltip: 'Fornecedor C — Usar apenas se necessário',
  },
}

export function BadgeABC({ classificacao, size = 'sm' }: BadgeABCProps) {
  if (!classificacao) {
    return (
      <span
        className={`inline-flex items-center justify-center rounded border font-semibold border-gray-200 bg-gray-100 text-gray-400 ${
          size === 'sm' ? 'h-5 w-5 text-[10px]' : 'h-6 w-6 text-xs'
        }`}
        title="Sem classificação"
      >
        –
      </span>
    )
  }

  const cfg = CONFIG[classificacao]
  return (
    <span
      className={`inline-flex items-center justify-center rounded border font-bold ${cfg.bg} ${cfg.text} ${cfg.border} ${
        size === 'sm' ? 'h-5 w-5 text-[10px]' : 'h-6 w-6 text-xs'
      }`}
      title={cfg.tooltip}
    >
      {cfg.label}
    </span>
  )
}
