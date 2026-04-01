import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import type { InclusoExclusoSupabase } from '../../infrastructure/supabase/inclusoExclusoRepository';

interface ModalInclusoExclusoProps {
  aberto: boolean;
  onFechar: () => void;
  onSalvar: (item: Omit<InclusoExclusoSupabase, 'id' | 'criado_em' | 'atualizado_em'>) => Promise<void>;
  editando?: InclusoExclusoSupabase | null;
  modoVisualizacao?: boolean;
  obrasExistentes: string[];
}

interface FormData {
  obra: string;
  servico: string;
  tipo: 'incluso' | 'excluso';
  padrao: boolean;
  motivo: string;
  observacao: string;
}

function formVazio(): FormData {
  return { obra: '', servico: '', tipo: 'incluso', padrao: true, motivo: '', observacao: '' };
}

export function ModalInclusoExcluso({
  aberto,
  onFechar,
  onSalvar,
  editando,
  modoVisualizacao = false,
  obrasExistentes,
}: ModalInclusoExclusoProps) {
  const [form, setForm] = useState<FormData>(formVazio);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (aberto) {
      setForm(
        editando
          ? {
              obra: editando.obra,
              servico: editando.servico,
              tipo: editando.tipo,
              padrao: editando.padrao,
              motivo: editando.motivo ?? '',
              observacao: editando.observacao ?? '',
            }
          : formVazio()
      );
      setErro('');
    }
  }, [aberto, editando]);

  function setCampo<K extends keyof FormData>(campo: K, valor: FormData[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setErro('');
  }

  const titulo = modoVisualizacao
    ? 'Visualizar Item'
    : editando
    ? 'Editar Item'
    : 'Novo Incluso / Excluso';

  function fechar() { if (!salvando) { setErro(''); onFechar(); } }

  async function confirmar() {
    if (modoVisualizacao) { onFechar(); return; }
    if (!form.obra.trim()) { setErro('Obra é obrigatória.'); return; }
    if (!form.servico.trim()) { setErro('Serviço é obrigatório.'); return; }
    if (form.tipo === 'excluso' && !form.motivo.trim()) { setErro('Motivo da exclusão é obrigatório.'); return; }

    setSalvando(true);
    try {
      await onSalvar({
        obra: form.obra.trim(),
        servico: form.servico.trim(),
        tipo: form.tipo,
        padrao: form.padrao,
        motivo: form.motivo.trim() || null,
        observacao: form.observacao.trim() || null,
      });
      onFechar();
    } catch (err) {
      setErro('Erro ao salvar item.');
      console.error(err);
    } finally {
      setSalvando(false);
    }
  }

  const disabled = modoVisualizacao || salvando;

  const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-50 disabled:text-slate-500';

  return (
    <Modal titulo={titulo} aberto={aberto} onFechar={fechar} largura="lg">
      <div className="px-6 py-5">
        {erro && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {erro}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Obra */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Obra *</label>
            <input
              type="text"
              list="obras-list"
              value={form.obra}
              onChange={(e) => setCampo('obra', e.target.value)}
              disabled={disabled}
              placeholder="Nome da obra (ex: Galpão Industrial ABC)"
              className={inputCls}
            />
            <datalist id="obras-list">
              {obrasExistentes.map((o) => <option key={o} value={o} />)}
            </datalist>
          </div>

          {/* Serviço */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Serviço *</label>
            <input
              type="text"
              value={form.servico}
              onChange={(e) => setCampo('servico', e.target.value)}
              disabled={disabled}
              placeholder="Descrição do serviço (ex: Pintura de acabamento)"
              className={inputCls}
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Tipo *</label>
            <select
              value={form.tipo}
              onChange={(e) => setCampo('tipo', e.target.value as 'incluso' | 'excluso')}
              disabled={disabled}
              className={inputCls}
            >
              <option value="incluso">Incluso</option>
              <option value="excluso">Excluso</option>
            </select>
          </div>

          {/* Serviço padrão? */}
          <div className="flex items-end pb-1">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.padrao}
                onChange={(e) => setCampo('padrao', e.target.checked)}
                disabled={disabled}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              Serviço normalmente executado (padrão)
            </label>
          </div>

          {/* Motivo (obrigatório quando excluso) */}
          {form.tipo === 'excluso' && (
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Motivo da Exclusão *
              </label>
              <textarea
                value={form.motivo}
                onChange={(e) => setCampo('motivo', e.target.value)}
                disabled={disabled}
                rows={2}
                placeholder="Por que este serviço foi excluso desta obra?"
                className={inputCls + ' resize-none'}
              />
            </div>
          )}

          {/* Observação */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Observação</label>
            <textarea
              value={form.observacao}
              onChange={(e) => setCampo('observacao', e.target.value)}
              disabled={disabled}
              rows={2}
              placeholder="Observações adicionais..."
              className={inputCls + ' resize-none'}
            />
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
        <button
          onClick={fechar}
          className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
        >
          {modoVisualizacao ? 'Fechar' : 'Cancelar'}
        </button>
        {!modoVisualizacao && (
          <button
            onClick={confirmar}
            disabled={salvando}
            className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
          >
            {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Cadastrar'}
          </button>
        )}
      </div>
    </Modal>
  );
}
