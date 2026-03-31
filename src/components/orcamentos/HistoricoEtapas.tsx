import { useState } from 'react';
import { GitBranch, FileText, Edit2, X } from 'lucide-react';
import type { MudancaEtapa } from '../../domain/entities/MudancaEtapa';
import { ETAPA_LABELS, ETAPA_CORES } from '../../domain/value-objects/EtapaFunil';

interface HistoricoEtapasProps {
  mudancas: MudancaEtapa[];
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function HistoricoEtapas({ mudancas }: HistoricoEtapasProps) {
  const [filePreviewOpen, setFilePreviewOpen] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  if (mudancas.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
          Histórico de Etapas
        </h3>
        <p className="text-xs text-slate-400 text-center py-4">Nenhuma mudança registrada.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
        Histórico de Etapas
      </h3>

      <div className="relative">
        {/* Linha conectora */}
        <div className="absolute left-3.5 top-0 bottom-0 w-px bg-slate-100" />

        <div className="space-y-4">
          {mudancas.map((m) => {
            const cor = ETAPA_CORES[m.etapaNova];
            return (
              <div key={m.id} className="relative flex gap-3">
                {/* Dot */}
                <div
                  className={`relative z-10 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${cor.bg}`}
                >
                  <GitBranch size={12} className={cor.text} />
                </div>

                {/* Conteúdo */}
                <div className="flex-1 min-w-0 pb-1">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      {m.etapaAnterior && (
                        <>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${ETAPA_CORES[m.etapaAnterior].bg} ${ETAPA_CORES[m.etapaAnterior].text}`}
                          >
                            {ETAPA_LABELS[m.etapaAnterior]}
                          </span>
                          <span className="text-slate-400 text-xs">→</span>
                        </>
                      )}
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cor.bg} ${cor.text}`}
                      >
                        {ETAPA_LABELS[m.etapaNova]}
                      </span>
                    </div>
                    <button
                      onClick={() => setEditingId(m.id)}
                      className="p-1 hover:bg-slate-100 rounded transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={14} className="text-slate-400 hover:text-slate-600" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span>{formatarData(m.data)}</span>
                    <span>·</span>
                    <span>{m.responsavel}</span>
                  </div>

                  {m.arquivo && (
                    <div className="mt-2 flex items-center gap-2">
                      <FileText size={14} className="text-slate-400" />
                      <button
                        onClick={() => setFilePreviewOpen(m.arquivo!)}
                        className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium"
                      >
                        📎 {typeof m.arquivo === 'string' ? m.arquivo.split('/').pop() : 'Visualizar arquivo'}
                      </button>
                    </div>
                  )}

                  {m.observacao && (
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">{m.observacao}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Preview Arquivo */}
      {filePreviewOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg w-full max-w-2xl max-h-96 flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-700">Visualizar Arquivo</h3>
              <button
                onClick={() => setFilePreviewOpen(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <p className="text-sm text-slate-600 mb-4">📎 Arquivo anexado:</p>
              <p className="text-sm font-mono text-blue-600">{filePreviewOpen}</p>
              <a
                href={filePreviewOpen}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Abrir em nova aba
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {editingId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-700">Editar Etapa</h3>
              <button
                onClick={() => setEditingId(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">Funcionalidade de edição será implementada em breve.</p>
            <button
              onClick={() => setEditingId(null)}
              className="w-full px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-colors"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
