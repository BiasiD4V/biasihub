import { AlertTriangle, Clock, Bell, CheckCircle } from 'lucide-react';
import type { OrcamentoCard } from '../../context/NovoOrcamentoContext';

interface AlertasOrcamentoProps {
  orc: OrcamentoCard;
  compact?: boolean;
}

export function AlertasOrcamento({ orc, compact = false }: AlertasOrcamentoProps) {
  const hoje = new Date();

  const acaoVencida =
    !!orc.dataProximaAcao && !!orc.proximaAcao &&
    new Date(orc.dataProximaAcao + 'T23:59:59') < hoje;

  const semAcao = !orc.proximaAcao && orc.resultadoComercial === 'em_andamento';

  const diasSemInteracao =
    (hoje.getTime() - new Date(orc.ultimaInteracao).getTime()) / (1000 * 60 * 60 * 24);
  const semInteracaoRecente =
    orc.resultadoComercial === 'em_andamento' && diasSemInteracao > 7;

  const alertas: { icon: React.ElementType; label: string; cor: string }[] = [];

  if (acaoVencida) {
    alertas.push({ icon: AlertTriangle, label: 'Ação vencida', cor: 'text-red-500' });
  }
  if (semAcao) {
    alertas.push({ icon: Clock, label: 'Sem próxima ação', cor: 'text-amber-500' });
  }
  if (semInteracaoRecente) {
    alertas.push({ icon: Bell, label: 'Sem interação recente', cor: 'text-orange-400' });
  }
  if (orc.pendenciasAbertas > 0 && orc.resultadoComercial === 'em_andamento') {
    alertas.push({
      icon: CheckCircle,
      label: `${orc.pendenciasAbertas} pendência${orc.pendenciasAbertas > 1 ? 's' : ''}`,
      cor: 'text-orange-600',
    });
  }

  if (alertas.length === 0) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {alertas.map(({ icon: Icon, label, cor }) => (
          <span key={label} title={label}>
            <Icon size={12} className={cor} />
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {alertas.map(({ icon: Icon, label, cor }) => (
        <span
          key={label}
          className="inline-flex items-center gap-1 text-xs bg-white border border-slate-200 px-2 py-0.5 rounded-full"
        >
          <Icon size={11} className={cor} />
          <span className={`${cor} font-medium`}>{label}</span>
        </span>
      ))}
    </div>
  );
}
