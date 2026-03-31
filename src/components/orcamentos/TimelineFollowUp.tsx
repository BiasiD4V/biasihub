import { useState } from 'react';
import { Phone, Mail, MessageCircle, Users, StickyNote, PlusCircle, FileText, Edit2, X, Save, Trash2, Upload, ExternalLink, Loader2 } from 'lucide-react';
import { uploadArquivo, abrirArquivo, nomeArquivo } from '../../infrastructure/supabase/storageService';
import type { FollowUp, TipoFollowUp } from '../../domain/entities/FollowUp';

interface TimelineFollowUpProps {
  followUps: FollowUp[];
  onRegistrar: () => void;
  onUpdateFollowUp?: (followUp: FollowUp) => void;
  onDeleteFollowUp?: (followUpId: string) => void;
}

const ICONE_POR_TIPO: Record<TipoFollowUp, React.ElementType> = {
  ligacao: Phone,
  email: Mail,
  whatsapp: MessageCircle,
  reuniao: Users,
  observacao: StickyNote,
};

const COR_POR_TIPO: Record<TipoFollowUp, string> = {
  ligacao: 'bg-blue-100 text-blue-600',
  email: 'bg-indigo-100 text-indigo-600',
  whatsapp: 'bg-green-100 text-green-600',
  reuniao: 'bg-purple-100 text-purple-600',
  observacao: 'bg-slate-100 text-slate-500',
};

const ROTULO_POR_TIPO: Record<TipoFollowUp, string> = {
  ligacao: 'Ligação',
  email: 'E-mail',
  whatsapp: 'WhatsApp',
  reuniao: 'Reunião',
  observacao: 'Observação interna',
};

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function TimelineFollowUp({ followUps, onRegistrar, onUpdateFollowUp, onDeleteFollowUp }: TimelineFollowUpProps) {
  const [filePreviewOpen, setFilePreviewOpen] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FollowUp | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [uploading, setUploading] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">Timeline de Follow-up</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {followUps.length} interaç{followUps.length !== 1 ? 'ões' : 'ão'} registrada{followUps.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={onRegistrar}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
        >
          <PlusCircle size={14} />
          Registrar Interação
        </button>
      </div>

      {/* Conteúdo */}
      <div className="p-6">
        {followUps.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="bg-slate-100 rounded-2xl p-4 mb-3">
              <MessageCircle size={28} className="text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-600 mb-1">Nenhuma interação registrada</p>
            <p className="text-xs text-slate-400">
              Registre ligações, e-mails, reuniões e observações para acompanhar este orçamento.
            </p>
          </div>
        ) : (
          <div className="relative">
            {/* Linha vertical conectora */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-200" />

            <div className="space-y-6">
              {followUps.map((fup) => {
                const Icone = ICONE_POR_TIPO[fup.tipo];
                const cor = COR_POR_TIPO[fup.tipo];
                const rotulo = ROTULO_POR_TIPO[fup.tipo];

                return (
                  <div key={fup.id} className="relative flex gap-4">
                    {/* Ícone bubble */}
                    <div
                      className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${cor}`}
                    >
                      <Icone size={16} />
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-700">{rotulo}</span>
                          <span className="text-xs text-slate-400">·</span>
                          <span className="text-xs text-slate-400">{formatarData(fup.data)}</span>
                          <span className="text-xs text-slate-400">·</span>
                          <span className="text-xs text-slate-500">{fup.responsavel}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              const followUp = followUps.find(f => f.id === fup.id);
                              if (followUp) {
                                setEditForm(followUp);
                                setEditingId(fup.id);
                              }
                            }}
                            className="p-1 hover:bg-slate-100 rounded transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={14} className="text-slate-400 hover:text-slate-600" />
                          </button>
                        </div>
                      </div>

                      <p className="text-sm text-slate-600 leading-relaxed">{fup.resumo}</p>

                      {fup.arquivo && (
                        <div className="mt-2 flex items-center gap-2">
                          <FileText size={14} className="text-slate-400" />
                          <button
                            onClick={() => abrirArquivo(fup.arquivo!)}
                            className="text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium"
                          >
                            📎 {nomeArquivo(fup.arquivo)}
                          </button>
                        </div>
                      )}

                      {fup.proximaAcao && (
                        <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                          <span className="text-xs font-semibold text-amber-700 mt-0.5 flex-shrink-0">
                            Próxima ação:
                          </span>
                          <span className="text-xs text-amber-700 leading-relaxed">
                            {fup.proximaAcao}
                            {fup.dataProximaAcao && (
                              <span className="ml-2 text-amber-500">
                                — até{' '}
                                {new Date(fup.dataProximaAcao + 'T12:00:00').toLocaleDateString(
                                  'pt-BR'
                                )}
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
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
              <h3 className="font-semibold text-slate-700">Editar Follow-up</h3>
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
              {/* Resumo */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Resumo da Interação *
                </label>
                <textarea
                  value={editForm.resumo}
                  onChange={(e) => setEditForm({ ...editForm, resumo: e.target.value })}
                  rows={3}
                  placeholder="Descreva o que foi tratado..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Próxima Ação */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Próxima Ação (opcional)
                </label>
                <input
                  type="text"
                  value={editForm.proximaAcao || ''}
                  onChange={(e) => setEditForm({ ...editForm, proximaAcao: e.target.value || undefined })}
                  placeholder="Próxima ação..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Data Próxima Ação */}
              {editForm.proximaAcao && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Data da Próxima Ação
                  </label>
                  <input
                    type="date"
                    value={editForm.dataProximaAcao || ''}
                    onChange={(e) => setEditForm({ ...editForm, dataProximaAcao: e.target.value || undefined })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              {/* Arquivo */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Arquivo Anexado
                </label>
                {editForm.arquivo && (
                  <div className="mb-2 flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                    <span className="text-xs text-blue-700 truncate">📎 {nomeArquivo(editForm.arquivo)}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => abrirArquivo(editForm.arquivo!)}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-100 transition-colors"
                        title="Abrir arquivo"
                      >
                        <ExternalLink size={12} />
                        Abrir
                      </button>
                      <button
                        onClick={() => setEditForm({ ...editForm, arquivo: undefined })}
                        className="text-blue-600 hover:text-blue-700 p-1 rounded hover:bg-blue-100 transition-colors"
                        title="Remover arquivo"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}
                <label className={`flex items-center justify-center w-full px-3 py-2 border border-dashed border-slate-300 rounded-lg transition-colors ${uploading ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:bg-slate-50'}`}>
                  <div className="flex items-center gap-2 text-slate-500 text-sm">
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    <span>{uploading ? 'Enviando...' : 'Escolher arquivo'}</span>
                  </div>
                  <input
                    key={fileInputKey}
                    type="file"
                    disabled={uploading}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setUploading(true);
                        const result = await uploadArquivo(file, 'follow-ups');
                        if (result) {
                          setEditForm({ ...editForm, arquivo: result.url });
                        } else {
                          alert('Erro ao enviar arquivo. Verifique sua conexão e tente novamente.');
                        }
                        setUploading(false);
                      }
                      setFileInputKey(k => k + 1);
                    }}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  if (onDeleteFollowUp) {
                    onDeleteFollowUp(editForm.id);
                  }
                  setEditingId(null);
                  setEditForm(null);
                }}
                className="flex items-center gap-1 px-3 py-2 border border-red-200 hover:bg-red-50 text-red-600 font-medium rounded-lg transition-colors text-sm"
              >
                <Trash2 size={14} />
                Deletar
              </button>
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
                  if (editForm.resumo.trim() && onUpdateFollowUp) {
                    onUpdateFollowUp(editForm);
                    setEditingId(null);
                    setEditForm(null);
                  }
                }}
                disabled={!editForm.resumo.trim()}
                className="flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium rounded-lg transition-colors text-sm"
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
