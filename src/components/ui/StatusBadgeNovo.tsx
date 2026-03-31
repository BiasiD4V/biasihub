import type { StatusRevisao } from '../../domain/value-objects/StatusRevisao';
import { STATUS_LABELS } from '../../domain/value-objects/StatusRevisao';

type StatusUI = StatusRevisao | 'rascunho' | 'ativo' | 'inativo';

const ESTILOS: Record<StatusUI, string> = {
  rascunho: 'bg-slate-100 text-slate-600',
  em_elaboracao: 'bg-blue-50 text-blue-700',
  em_revisao: 'bg-yellow-50 text-yellow-700',
  aguardando_aprovacao: 'bg-orange-50 text-orange-700',
  aprovado: 'bg-green-50 text-green-700',
  reprovado: 'bg-red-50 text-red-700',
  proposta_emitida: 'bg-purple-50 text-purple-700',
  ativo: 'bg-green-50 text-green-700',
  inativo: 'bg-slate-100 text-slate-500',
};

const LABELS: Record<StatusUI, string> = {
  rascunho: 'Rascunho',
  ...STATUS_LABELS,
  ativo: 'Ativo',
  inativo: 'Inativo',
};

interface StatusBadgeNovoProps {
  status: StatusUI;
  label?: string;
}

export function StatusBadgeNovo({ status, label }: StatusBadgeNovoProps) {
  const estilo = ESTILOS[status] ?? 'bg-slate-100 text-slate-600';
  const texto = label ?? LABELS[status] ?? status;

  return (
    <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${estilo}`}>
      {texto}
    </span>
  );
}
