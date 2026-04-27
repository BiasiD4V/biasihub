import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, Bell, CheckCircle, XCircle } from 'lucide-react';
import type { OrcamentoCard } from '../../context/NovoOrcamentoContext';
import type { EtapaFunil } from '../../domain/value-objects/EtapaFunil';
import { ETAPA_LABELS, ETAPA_CORES, ORDEM_FUNIL } from '../../domain/value-objects/EtapaFunil';

// Todas as 11 etapas aparecem no Kanban
const COLUNAS_KANBAN: EtapaFunil[] = ORDEM_FUNIL;

interface AlertasCard {
  acaoVencida: boolean;
  semAcao: boolean;
  semInteracaoRecente: boolean;
  pendenciasAbertas: boolean;
}

function calcularAlertas(orc: OrcamentoCard): AlertasCard {
  const hoje = new Date();
  const acaoVencida =
    !!orc.dataProximaAcao && !!orc.proximaAcao &&
    new Date(orc.dataProximaAcao + 'T23:59:59') < hoje;

  const semAcao =
    !orc.proximaAcao &&
    orc.resultadoComercial === 'em_andamento';

  // Sem interação há mais de 7 dias
  const diasSemInteracao =
    (hoje.getTime() - new Date(orc.ultimaInteracao).getTime()) / (1000 * 60 * 60 * 24);
  const semInteracaoRecente = diasSemInteracao > 7;

  return {
    acaoVencida,
    semAcao,
    semInteracaoRecente,
    pendenciasAbertas: orc.pendenciasAbertas > 0,
  };
}

interface KanbanCardProps {
  orc: OrcamentoCard;
}

function KanbanCard({ orc }: KanbanCardProps) {
  const navigate = useNavigate();
  const alertas = calcularAlertas(orc);
  const totalAlertas = Object.values(alertas).filter(Boolean).length;

  return (
    <div
      onClick={() => navigate(`/orcamentos/${orc.id}`)}
      className="bg-white rounded-lg border border-slate-200 p-3 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group"
    >
      {/* Header do card */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-mono text-xs text-slate-400">{orc.numero}</span>
        {totalAlertas > 0 && (
          <div className="flex items-center gap-1">
            {alertas.acaoVencida && (
              <span title="Ação vencida">
                <AlertTriangle size={12} className="text-red-500" />
              </span>
            )}
            {alertas.semAcao && (
              <span title="Sem próxima ação">
                <Clock size={12} className="text-amber-500" />
              </span>
            )}
            {alertas.semInteracaoRecente && (
              <span title="Sem interação recente">
                <Bell size={12} className="text-orange-400" />
              </span>
            )}
            {alertas.pendenciasAbertas && (
              <span
                className="bg-orange-50 text-orange-700 text-xs font-medium px-1.5 py-0.5 rounded-full"
                title="Pendências abertas"
              >
                {orc.pendenciasAbertas}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Título */}
      <p className="text-sm font-medium text-slate-800 leading-snug mb-2 line-clamp-2 group-hover:text-blue-700 transition-colors">
        {orc.titulo}
      </p>

      {/* Cliente */}
      <p className="text-xs text-slate-500 truncate mb-2">{orc.clienteNome}</p>

      {/* Footer */}
      <div className="flex items-center justify-between gap-1">
        <span className="text-xs text-slate-400 truncate">{orc.responsavel}</span>
        {orc.valorProposta && (
          <span className="text-xs font-semibold text-green-700 flex-shrink-0">
            {orc.valorProposta.toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
              maximumFractionDigits: 0,
            })}
          </span>
        )}
      </div>

      {/* Resultado comercial — badge apenas quando fechado */}
      {orc.resultadoComercial !== 'em_andamento' && (
        <div
          className={`mt-2 flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg ${
            orc.resultadoComercial === 'ganho'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-600'
          }`}
        >
          {orc.resultadoComercial === 'ganho' ? (
            <CheckCircle size={11} />
          ) : (
            <XCircle size={11} />
          )}
          {orc.resultadoComercial === 'ganho' ? 'Ganho' : 'Perdido'}
        </div>
      )}

      {/* Próxima ação */}
      {orc.proximaAcao && (
        <div
          className={`mt-2 text-xs px-2 py-1 rounded truncate ${
            alertas.acaoVencida
              ? 'bg-red-50 text-red-600'
              : 'bg-amber-50 text-amber-700'
          }`}
        >
          {orc.proximaAcao}
        </div>
      )}
    </div>
  );
}

interface KanbanFunilProps {
  orcamentos: OrcamentoCard[];
}

export function KanbanFunil({ orcamentos }: KanbanFunilProps) {
  // Agrupa por etapa — inclui todas as colunas, mesmo vazias
  const porEtapa = new Map<EtapaFunil, OrcamentoCard[]>();
  COLUNAS_KANBAN.forEach((e) => porEtapa.set(e, []));

  orcamentos.forEach((orc) => {
    const col = porEtapa.get(orc.etapaFunil);
    if (col) {
      col.push(orc);
    }
    // etapas fora das 11 colunas (não deve ocorrer após Sprint 3) são ignoradas silenciosamente
  });

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-0" style={{ WebkitOverflowScrolling: 'touch' }}>
      {COLUNAS_KANBAN.map((etapa) => {
        const cards = porEtapa.get(etapa) ?? [];
        const cor = ETAPA_CORES[etapa];
        return (
          <div key={etapa} className="flex-shrink-0 w-64">
            {/* Header da coluna */}
            <div
              className={`flex items-center justify-between px-3 py-2 rounded-lg mb-3 ${cor.bg} border ${cor.border}`}
            >
              <span className={`text-xs font-semibold ${cor.text}`}>
                {ETAPA_LABELS[etapa]}
              </span>
              <span
                className={`text-xs font-bold ${cor.text} bg-white bg-opacity-60 px-1.5 py-0.5 rounded-full`}
              >
                {cards.length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-2">
              {cards.length === 0 ? (
                <div className="border-2 border-dashed border-slate-100 rounded-lg h-16 flex items-center justify-center">
                  <span className="text-xs text-slate-300">Vazio</span>
                </div>
              ) : (
                cards.map((orc) => <KanbanCard key={orc.id} orc={orc} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
