import { CheckCircle, AlertCircle, Plus } from 'lucide-react';
import type { Pendencia, StatusPendencia } from '../../domain/entities/Pendencia';

interface BlocoPendenciasProps {
  pendencias: Pendencia[];
  onResolver: (id: string) => void;
  onAdicionarNova?: () => void;
}

const ESTILO_STATUS: Record<StatusPendencia, string> = {
  aberta: 'bg-orange-50 text-orange-700',
  resolvida: 'bg-green-50 text-green-700',
  cancelada: 'bg-slate-100 text-slate-500',
};

const ROTULO_STATUS: Record<StatusPendencia, string> = {
  aberta: 'Aberta',
  resolvida: 'Resolvida',
  cancelada: 'Cancelada',
};

function isPrazoVencido(prazo: string, status: StatusPendencia): boolean {
  return status === 'aberta' && new Date(prazo + 'T23:59:59') < new Date();
}

export function BlocoPendencias({ pendencias, onResolver, onAdicionarNova }: BlocoPendenciasProps) {
  const abertas = pendencias.filter((p) => p.status === 'aberta').length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-semibold text-slate-700">Pendências</h3>
        <div className="flex items-center gap-2">
          {pendencias.length > 0 && (
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                abertas > 0 ? 'bg-orange-50 text-orange-700' : 'bg-green-50 text-green-700'
              }`}
            >
              {abertas > 0 ? (
                <>
                  <AlertCircle size={11} />
                  {abertas} aberta{abertas !== 1 ? 's' : ''}
                </>
              ) : (
                <>
                  <CheckCircle size={11} />
                  Tudo resolvido
                </>
              )}
            </span>
          )}
          {onAdicionarNova && (
            <button
              onClick={onAdicionarNova}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors ml-auto"
              title="Adicionar pendência"
            >
              <Plus size={13} />
              Adicionar
            </button>
          )}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="p-5">
        {pendencias.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle size={24} className="text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-400">Nenhuma pendência registrada.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendencias.map((p) => {
              const vencida = isPrazoVencido(p.prazo, p.status);
              return (
                <div
                  key={p.id}
                  className="border border-slate-100 rounded-lg p-3 bg-slate-50"
                >
                  <p className="text-xs text-slate-700 leading-relaxed mb-2">{p.descricao}</p>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex text-xs font-medium px-2 py-0.5 rounded-full ${ESTILO_STATUS[p.status]}`}
                      >
                        {ROTULO_STATUS[p.status]}
                      </span>
                      <span
                        className={`text-xs ${vencida ? 'text-red-500 font-medium' : 'text-slate-400'}`}
                      >
                        {vencida ? '⚠ ' : ''}
                        {new Date(p.prazo + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    {p.status === 'aberta' && (
                      <button
                        onClick={() => onResolver(p.id)}
                        className="flex items-center gap-1 text-xs text-green-700 hover:text-green-800 font-medium transition-colors"
                        title="Marcar como resolvida"
                      >
                        <CheckCircle size={13} />
                        Resolver
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
