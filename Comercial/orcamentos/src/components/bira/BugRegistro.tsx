import { useEffect, useState } from 'react';
import { Bug, Check, X } from 'lucide-react';
import type { JiraIssue } from './biraTypes';
import { statusCls, statusDot, STATUS_LABEL, formatDate } from './biraTypes';
import { biraRepository } from '../../infrastructure/supabase/biraRepository';

interface BugRegistroProps {
  bugs: JiraIssue[];
  onBugAtualizado?: (bug: JiraIssue) => void;
}

type EditField = 'causa' | 'resolucao' | 'modulo';

interface EditState {
  bugId: string;
  field: EditField;
  value: string;
}

const MODULOS = ['Hub', 'Comercial', 'Almoxarifado', 'Bira', 'Obras', 'Reuniões', 'Outro'];

export function BugRegistro({ bugs: initialBugs, onBugAtualizado }: BugRegistroProps) {
  const [bugs, setBugs] = useState<JiraIssue[]>(initialBugs);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [saving, setSaving] = useState(false);

  // Sync if parent updates the bugs list
  useEffect(() => {
    setBugs(initialBugs);
  }, [initialBugs]);

  function startEdit(bugId: string, field: EditField, currentValue: string | null) {
    setEditState({ bugId, field, value: currentValue ?? '' });
  }

  function cancelEdit() {
    setEditState(null);
  }

  async function saveEdit() {
    if (!editState) return;
    setSaving(true);
    try {
      const payload: Partial<JiraIssue> & { bug_documentado_em: string } = {
        bug_documentado_em: new Date().toISOString(),
      };
      if (editState.field === 'causa') payload.bug_causa = editState.value || null;
      if (editState.field === 'resolucao') payload.bug_resolucao = editState.value || null;
      if (editState.field === 'modulo') payload.bug_modulo = editState.value || null;

      const updated = await biraRepository.atualizar(editState.bugId, payload);
      setBugs(prev => prev.map(b => b.id === updated.id ? updated : b));
      onBugAtualizado?.(updated);
      setEditState(null);
    } catch (err) {
      console.error('Erro ao salvar bug:', err);
    } finally {
      setSaving(false);
    }
  }

  if (bugs.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-12">
        <div className="w-16 h-16 bg-red-50 rounded-3xl flex items-center justify-center">
          <Bug size={28} className="text-red-300" />
        </div>
        <p className="text-sm font-bold text-slate-400">Nenhum bug registrado ainda.</p>
      </div>
    );
  }

  const inputCls = 'bg-slate-700 border border-blue-500/50 rounded-lg px-2 py-1 text-sm text-white w-full focus:outline-none focus:border-blue-400';

  function EditActions() {
    return (
      <div className="flex items-center gap-1 mt-1">
        <button
          onClick={saveEdit}
          disabled={saving}
          className="flex items-center justify-center w-6 h-6 rounded-md bg-green-600/80 hover:bg-green-500 text-white transition-colors disabled:opacity-50"
          title="Salvar"
        >
          <Check size={12} />
        </button>
        <button
          onClick={cancelEdit}
          disabled={saving}
          className="flex items-center justify-center w-6 h-6 rounded-md bg-slate-600 hover:bg-slate-500 text-white transition-colors"
          title="Cancelar"
        >
          <X size={12} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center">
          <Bug size={16} className="text-red-500" />
        </div>
        <div>
          <h2 className="text-base font-black text-slate-800">Registro de Bugs</h2>
          <p className="text-xs font-semibold text-slate-400">{bugs.length} bug{bugs.length !== 1 ? 's' : ''} no total</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-5 py-3.5">Status</th>
                <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-5 py-3.5">Código</th>
                <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-5 py-3.5">Título</th>
                <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-5 py-3.5">Módulo</th>
                <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-5 py-3.5">Causa</th>
                <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-5 py-3.5">Resolução</th>
                <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-5 py-3.5">Responsável</th>
                <th className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest px-5 py-3.5">Atualizado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {bugs.map(bug => {
                const isEditingModulo = editState?.bugId === bug.id && editState.field === 'modulo';
                const isEditingCausa = editState?.bugId === bug.id && editState.field === 'causa';
                const isEditingResolucao = editState?.bugId === bug.id && editState.field === 'resolucao';

                return (
                  <tr key={bug.id} className="hover:bg-blue-50/30 transition-colors group">
                    {/* Status */}
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusCls(bug.status)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusDot(bug.status)}`} />
                        {STATUS_LABEL[bug.status] ?? bug.status}
                      </span>
                    </td>

                    {/* Código */}
                    <td className="px-5 py-4">
                      <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg">{bug.codigo}</span>
                    </td>

                    {/* Título */}
                    <td className="px-5 py-4 max-w-[200px]">
                      <span className="text-sm font-semibold text-slate-800 line-clamp-2">{bug.titulo}</span>
                    </td>

                    {/* Módulo — editable */}
                    <td className="px-5 py-4 min-w-[120px]">
                      {isEditingModulo ? (
                        <div>
                          <select
                            value={editState.value}
                            onChange={e => setEditState(s => s ? { ...s, value: e.target.value } : s)}
                            className={inputCls}
                            autoFocus
                          >
                            <option value="">—</option>
                            {MODULOS.map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                          <EditActions />
                        </div>
                      ) : (
                        <div
                          onClick={() => startEdit(bug.id, 'modulo', bug.bug_modulo)}
                          className="cursor-pointer group/cell"
                          title="Clique para editar"
                        >
                          {bug.bug_modulo ? (
                            <span className="inline-block px-2.5 py-1 bg-red-50 text-red-600 text-[10px] font-bold rounded-xl border border-red-100 group-hover/cell:border-blue-300 transition-colors">{bug.bug_modulo}</span>
                          ) : (
                            <span className="text-xs text-slate-300 italic group-hover/cell:text-blue-400 transition-colors">— editar</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Causa — editable */}
                    <td className="px-5 py-4 max-w-[180px] min-w-[140px]">
                      {isEditingCausa ? (
                        <div>
                          <textarea
                            value={editState.value}
                            onChange={e => setEditState(s => s ? { ...s, value: e.target.value } : s)}
                            className={`${inputCls} resize-none`}
                            rows={3}
                            autoFocus
                          />
                          <EditActions />
                        </div>
                      ) : (
                        <div
                          onClick={() => startEdit(bug.id, 'causa', bug.bug_causa)}
                          className="cursor-pointer group/cell"
                          title="Clique para editar"
                        >
                          {bug.bug_causa ? (
                            <span className="text-xs text-slate-600 line-clamp-2 group-hover/cell:text-blue-600 transition-colors">{bug.bug_causa}</span>
                          ) : (
                            <span className="text-xs text-slate-300 italic group-hover/cell:text-blue-400 transition-colors">— editar</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Resolução — editable */}
                    <td className="px-5 py-4 max-w-[200px] min-w-[160px]">
                      {isEditingResolucao ? (
                        <div>
                          <textarea
                            value={editState.value}
                            onChange={e => setEditState(s => s ? { ...s, value: e.target.value } : s)}
                            className={`${inputCls} resize-none`}
                            rows={3}
                            autoFocus
                          />
                          <EditActions />
                        </div>
                      ) : (
                        <div
                          onClick={() => startEdit(bug.id, 'resolucao', bug.bug_resolucao)}
                          className="cursor-pointer group/cell"
                          title="Clique para editar"
                        >
                          {bug.bug_resolucao ? (
                            <span className="text-xs text-slate-700 font-medium line-clamp-2 group-hover/cell:text-blue-600 transition-colors">{bug.bug_resolucao}</span>
                          ) : (
                            <span className="text-xs text-slate-400 italic group-hover/cell:text-blue-400 transition-colors">Não documentado</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Responsável */}
                    <td className="px-5 py-4">
                      {bug.responsavel_nome ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center flex-shrink-0">
                            <span className="text-[9px] text-white font-bold">{bug.responsavel_nome.charAt(0).toUpperCase()}</span>
                          </div>
                          <span className="text-xs font-semibold text-slate-700 truncate max-w-[100px]">{bug.responsavel_nome}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300 italic">—</span>
                      )}
                    </td>

                    {/* Atualizado */}
                    <td className="px-5 py-4">
                      <span className="text-xs text-slate-400 font-semibold whitespace-nowrap">{formatDate(bug.atualizado_em)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
