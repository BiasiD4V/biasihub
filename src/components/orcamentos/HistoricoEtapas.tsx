import { useState } from 'react';
import { GitBranch, FileText, Edit2, X, Save, Trash2, Link, ExternalLink, CheckCircle, Clock } from 'lucide-react';
import type { MudancaEtapa } from '../../domain/entities/MudancaEtapa';
import { ETAPA_LABELS, ETAPA_CORES } from '../../domain/value-objects/EtapaFunil';
import { abrirArquivo, nomeArquivo } from '../../infrastructure/supabase/storageService';
import type { PapelUsuario } from '../../domain/value-objects/PapelUsuario';
import { formatarDataHora } from '../../utils/datas';

const PAPEIS_ADMIN: PapelUsuario[] = ['dono', 'admin', 'gestor'];

interface HistoricoEtapasProps {
  mudancas: MudancaEtapa[];
  onUpdateMudanca?: (mudanca: MudancaEtapa) => void;
  onDeleteMudanca?: (mudancaId: string) => void;
  onAprovarMudanca?: (mudancaId: string) => void;
  papelUsuario?: PapelUsuario;
}

/** Parse arquivo field: supports JSON array or legacy single URL */
function parseArquivos(arquivo?: string): string[] {
  if (!arquivo) return [];
  try {
    if (arquivo.startsWith('[')) {
      const parsed = JSON.parse(arquivo);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    }
  } catch { /* ignore */ }
  return [arquivo];
}

/** Serialize array of URLs back to arquivo field */
function serializeArquivos(urls: string[]): string | undefined {
  if (urls.length === 0) return undefined;
  if (urls.length === 1) return urls[0];
  return JSON.stringify(urls);
}

export function HistoricoEtapas({ mudancas, onUpdateMudanca, onDeleteMudanca, onAprovarMudanca, papelUsuario }: HistoricoEtapasProps) {
  const [filePreviewOpen, setFilePreviewOpen] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<MudancaEtapa | null>(null);
  const [editArquivos, setEditArquivos] = useState<string[]>([]);
  const [novoLink, setNovoLink] = useState('');

  const podeExcluir = papelUsuario && PAPEIS_ADMIN.includes(papelUsuario);
  const podeAprovar = papelUsuario && PAPEIS_ADMIN.includes(papelUsuario);

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
                      onClick={() => {
                        const mudanca = mudancas.find(mu => mu.id === m.id);
                        if (mudanca) {
                          setEditForm(mudanca);
                          setEditArquivos(parseArquivos(mudanca.arquivo));
                          setEditingId(m.id);
                        }
                      }}
                      className="p-1 hover:bg-slate-100 rounded transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={14} className="text-slate-400 hover:text-slate-600" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                    <span>{formatarDataHora(m.data)}</span>
                    <span>·</span>
                    <span>{m.responsavel}</span>
                    <span>·</span>
                    {m.status === 'aprovado' ? (
                      <span className="inline-flex items-center gap-1 text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                        <CheckCircle size={10} />
                        Aprovado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                        <Clock size={10} />
                        Pendente
                      </span>
                    )}
                    {m.status === 'pendente' && podeAprovar && onAprovarMudanca && (
                      <button
                        onClick={() => onAprovarMudanca(m.id)}
                        className="inline-flex items-center gap-1 text-green-700 bg-green-100 hover:bg-green-200 px-2 py-0.5 rounded-full font-medium transition-colors"
                      >
                        <CheckCircle size={10} />
                        Aprovar
                      </button>
                    )}
                  </div>

                  {m.arquivo && parseArquivos(m.arquivo).map((arqUrl, idx) => (
                    <div key={idx} className="mt-2 flex items-center gap-2">
                      <FileText size={14} className="text-slate-400" />
                      <button
                        onClick={() => abrirArquivo(arqUrl)}
                        className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium"
                      >
                        📎 {nomeArquivo(arqUrl)}
                      </button>
                    </div>
                  ))}

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
      {editingId && editForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-auto">
          <div className="bg-white rounded-xl border border-slate-200 shadow-lg w-full max-w-lg p-6 my-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-700">Editar Etapa</h3>
              <button
                onClick={() => {
                  setEditingId(null);
                  setEditForm(null);
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              {/* Observação */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Observação
                </label>
                <textarea
                  value={editForm.observacao || ''}
                  onChange={(e) => setEditForm({ ...editForm, observacao: e.target.value || undefined })}
                  rows={3}
                  placeholder="Descreva as mudanças..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Arquivos */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Arquivos Anexados
                </label>
                {editArquivos.length > 0 && (
                  <div className="space-y-2 mb-2">
                    {editArquivos.map((arqUrl, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                        <span className="text-xs text-blue-700 truncate">📎 {nomeArquivo(arqUrl)}</span>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => abrirArquivo(arqUrl)}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                            title="Abrir arquivo"
                          >
                            <ExternalLink size={12} />
                            Abrir
                          </button>
                          <button
                            onClick={() => {
                              const next = editArquivos.filter((_, i) => i !== idx);
                              setEditArquivos(next);
                            }}
                            className="text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-100 transition-colors"
                            title="Remover arquivo"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={novoLink}
                    onChange={(e) => setNovoLink(e.target.value)}
                    placeholder="Cole um link ou caminho de pasta..."
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && novoLink.trim()) {
                        setEditArquivos(prev => [...prev, novoLink.trim()]);
                        setNovoLink('');
                      }
                    }}
                  />
                  <button
                    type="button"
                    disabled={!novoLink.trim()}
                    onClick={() => {
                      if (novoLink.trim()) {
                        setEditArquivos(prev => [...prev, novoLink.trim()]);
                        setNovoLink('');
                      }
                    }}
                    className="flex items-center gap-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    <Link size={14} />
                    Adicionar
                  </button>
                </div>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3 justify-end">
              {podeExcluir && (
                <button
                  onClick={() => {
                    if (onDeleteMudanca) {
                      onDeleteMudanca(editForm.id);
                    }
                    setEditingId(null);
                    setEditForm(null);
                  }}
                  className="flex items-center gap-1 px-3 py-2 border border-red-200 hover:bg-red-50 text-red-600 font-medium rounded-lg transition-colors text-sm"
                >
                  <Trash2 size={14} />
                  Deletar
                </button>
              )}
              <button
                onClick={() => {
                  setEditingId(null);
                  setEditForm(null);
                }}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded-lg transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (onUpdateMudanca) {
                    onUpdateMudanca({ ...editForm, arquivo: serializeArquivos(editArquivos) });
                    setEditingId(null);
                    setEditForm(null);
                    setEditArquivos([]);
                  }
                }}
                className="flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors text-sm"
              >
                <Save size={14} />
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
