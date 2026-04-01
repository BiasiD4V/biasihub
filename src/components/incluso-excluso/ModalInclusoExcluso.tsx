import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import type {
  InclusoExclusoSupabase,
  SituacaoEscopo,
  RiscoEscopo,
} from '../../infrastructure/supabase/inclusoExclusoRepository';
import {
  SITUACOES_ESCOPO,
  RISCOS_ESCOPO,
  RESPONSAVEIS_ESCOPO,
} from '../../infrastructure/supabase/inclusoExclusoRepository';

interface ModalInclusoExclusoProps {
  aberto: boolean;
  onFechar: () => void;
  onSalvar: (item: Omit<InclusoExclusoSupabase, 'id' | 'criado_em' | 'atualizado_em'>) => Promise<void>;
  editando?: InclusoExclusoSupabase | null;
  modoVisualizacao?: boolean;
  obrasExistentes: string[];
  disciplinasDisponiveis: string[];
}

interface FormData {
  obra: string;
  disciplina: string;
  area_ambiente: string;
  item_servico: string;
  antes_da_biasi: string;
  o_que_biasi_faz: string;
  onde_faz: string;
  ate_onde_vai: string;
  como_entrega: string;
  quem_entra_depois: string;
  o_que_nao_entra: string;
  base_usada: string;
  situacao: SituacaoEscopo;
  risco: RiscoEscopo;
  premissa: string;
  pendencia: string;
  responsavel: string;
}

function formVazio(): FormData {
  return {
    obra: '', disciplina: '', area_ambiente: '', item_servico: '',
    antes_da_biasi: '', o_que_biasi_faz: '', onde_faz: '', ate_onde_vai: '',
    como_entrega: '', quem_entra_depois: '', o_que_nao_entra: '',
    base_usada: '', situacao: 'Pendente', risco: 'Baixo',
    premissa: '', pendencia: '', responsavel: '',
  };
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="-mx-6 px-6 py-2 mb-3 bg-slate-50 border-y border-slate-100">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
    </div>
  );
}

export function ModalInclusoExcluso({
  aberto,
  onFechar,
  onSalvar,
  editando,
  modoVisualizacao = false,
  obrasExistentes,
  disciplinasDisponiveis,
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
              disciplina: editando.disciplina ?? '',
              area_ambiente: editando.area_ambiente ?? '',
              item_servico: editando.item_servico,
              antes_da_biasi: editando.antes_da_biasi ?? '',
              o_que_biasi_faz: editando.o_que_biasi_faz ?? '',
              onde_faz: editando.onde_faz ?? '',
              ate_onde_vai: editando.ate_onde_vai ?? '',
              como_entrega: editando.como_entrega ?? '',
              quem_entra_depois: editando.quem_entra_depois ?? '',
              o_que_nao_entra: editando.o_que_nao_entra ?? '',
              base_usada: editando.base_usada ?? '',
              situacao: editando.situacao,
              risco: editando.risco,
              premissa: editando.premissa ?? '',
              pendencia: editando.pendencia ?? '',
              responsavel: editando.responsavel ?? '',
            }
          : formVazio()
      );
      setErro('');
    }
  }, [aberto, editando]);

  function set<K extends keyof FormData>(campo: K, valor: FormData[K]) {
    setForm((p) => ({ ...p, [campo]: valor }));
    setErro('');
  }

  const titulo = modoVisualizacao ? 'Visualizar Item' : editando ? 'Editar Escopo' : 'Novo Item de Escopo';
  const disabled = modoVisualizacao || salvando;

  function fechar() { if (!salvando) { setErro(''); onFechar(); } }

  async function confirmar() {
    if (modoVisualizacao) { onFechar(); return; }
    if (!form.obra.trim()) { setErro('Obra é obrigatória.'); return; }
    if (!form.item_servico.trim()) { setErro('Item / Serviço é obrigatório.'); return; }

    setSalvando(true);
    try {
      await onSalvar({
        obra: form.obra.trim(),
        disciplina: form.disciplina || null,
        area_ambiente: form.area_ambiente.trim() || null,
        item_servico: form.item_servico.trim(),
        antes_da_biasi: form.antes_da_biasi.trim() || null,
        o_que_biasi_faz: form.o_que_biasi_faz.trim() || null,
        onde_faz: form.onde_faz.trim() || null,
        ate_onde_vai: form.ate_onde_vai.trim() || null,
        como_entrega: form.como_entrega.trim() || null,
        quem_entra_depois: form.quem_entra_depois.trim() || null,
        o_que_nao_entra: form.o_que_nao_entra.trim() || null,
        base_usada: form.base_usada.trim() || null,
        situacao: form.situacao,
        risco: form.risco,
        premissa: form.premissa.trim() || null,
        pendencia: form.pendencia.trim() || null,
        responsavel: form.responsavel.trim() || null,
      });
      onFechar();
    } catch {
      setErro('Erro ao salvar. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  }

  const inputCls = 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-50 disabled:text-slate-500';
  const textareaCls = inputCls + ' resize-none';

  return (
    <Modal titulo={titulo} aberto={aberto} onFechar={fechar} largura="xl">
      <div className="px-6 py-5 overflow-y-auto max-h-[75vh]">
        {erro && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{erro}</div>
        )}

        {/* Seção 1 — Entendimento da obra */}
        <SectionHeader label="Entendimento da obra" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Obra *</label>
            <input type="text" list="obras-list" value={form.obra} onChange={(e) => set('obra', e.target.value)} disabled={disabled} placeholder="Nome da obra" className={inputCls} />
            <datalist id="obras-list">{obrasExistentes.map((o) => <option key={o} value={o} />)}</datalist>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Disciplina</label>
            <select value={form.disciplina} onChange={(e) => set('disciplina', e.target.value)} disabled={disabled} className={inputCls}>
              <option value="">Selecione...</option>
              {disciplinasDisponiveis.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Área / Ambiente</label>
            <input type="text" value={form.area_ambiente} onChange={(e) => set('area_ambiente', e.target.value)} disabled={disabled} placeholder="ex: Galpão principal, Mezanino" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Item / Serviço *</label>
            <input type="text" value={form.item_servico} onChange={(e) => set('item_servico', e.target.value)} disabled={disabled} placeholder="ex: Instalação de tomadas industriais" className={inputCls} />
          </div>
        </div>

        {/* Seção 2 — Limite da responsabilidade */}
        <SectionHeader label="Limite da responsabilidade da Biasi" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Antes da Biasi</label>
            <textarea value={form.antes_da_biasi} onChange={(e) => set('antes_da_biasi', e.target.value)} disabled={disabled} rows={2} placeholder="O que já existe ou foi feito antes da Biasi entrar?" className={textareaCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">O que a Biasi faz</label>
            <textarea value={form.o_que_biasi_faz} onChange={(e) => set('o_que_biasi_faz', e.target.value)} disabled={disabled} rows={2} placeholder="Descreva claramente o que está no escopo" className={textareaCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Onde faz</label>
            <input type="text" value={form.onde_faz} onChange={(e) => set('onde_faz', e.target.value)} disabled={disabled} placeholder="Local físico de execução" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Até onde vai</label>
            <input type="text" value={form.ate_onde_vai} onChange={(e) => set('ate_onde_vai', e.target.value)} disabled={disabled} placeholder="Ponto de entrega / limite" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Como entrega</label>
            <input type="text" value={form.como_entrega} onChange={(e) => set('como_entrega', e.target.value)} disabled={disabled} placeholder="ex: Instalado e testado" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Quem entra depois</label>
            <input type="text" value={form.quem_entra_depois} onChange={(e) => set('quem_entra_depois', e.target.value)} disabled={disabled} placeholder="ex: Empreiteiro civil, cliente" className={inputCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">O que não entra</label>
            <textarea value={form.o_que_nao_entra} onChange={(e) => set('o_que_nao_entra', e.target.value)} disabled={disabled} rows={2} placeholder="Liste o que está explicitamente fora do escopo" className={textareaCls} />
          </div>
        </div>

        {/* Seção 3 — Controle comercial */}
        <SectionHeader label="Controle comercial" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Base usada</label>
            <input type="text" value={form.base_usada} onChange={(e) => set('base_usada', e.target.value)} disabled={disabled} placeholder="ex: Projeto rev.3, visita técnica, e-mail" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Responsável</label>
            <select value={form.responsavel} onChange={(e) => set('responsavel', e.target.value)} disabled={disabled} className={inputCls}>
              <option value="">Selecione...</option>
              {RESPONSAVEIS_ESCOPO.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Situação</label>
            <select value={form.situacao} onChange={(e) => set('situacao', e.target.value as SituacaoEscopo)} disabled={disabled} className={inputCls}>
              {SITUACOES_ESCOPO.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Risco</label>
            <select value={form.risco} onChange={(e) => set('risco', e.target.value as RiscoEscopo)} disabled={disabled} className={inputCls}>
              {RISCOS_ESCOPO.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Premissa</label>
            <textarea value={form.premissa} onChange={(e) => set('premissa', e.target.value)} disabled={disabled} rows={2} placeholder="Registre premissas assumidas para este item" className={textareaCls} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Pendência</label>
            <textarea value={form.pendencia} onChange={(e) => set('pendencia', e.target.value)} disabled={disabled} rows={2} placeholder="Informe pendências abertas" className={textareaCls} />
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-xl">
        <button onClick={fechar} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors">
          {modoVisualizacao ? 'Fechar' : 'Cancelar'}
        </button>
        {!modoVisualizacao && (
          <button onClick={confirmar} disabled={salvando} className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50">
            {salvando ? 'Salvando...' : editando ? 'Salvar Alterações' : 'Cadastrar'}
          </button>
        )}
      </div>
    </Modal>
  );
}
