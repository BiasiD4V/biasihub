import { useState, useEffect } from 'react';
import { X, Save, Loader2, CheckCircle } from 'lucide-react';
import type { PropostaSupabase } from '../../infrastructure/supabase/propostasRepository';
import { propostasRepository } from '../../infrastructure/supabase/propostasRepository';
import { ETAPA_LABELS, ORDEM_FUNIL } from '../../domain/value-objects/EtapaFunil';
import { RESULTADO_LABELS } from '../../domain/value-objects/ResultadoComercial';
import type { ResultadoComercial } from '../../domain/value-objects/ResultadoComercial';


interface Props {
  proposta: PropostaSupabase | null;
  onFechar: () => void;
  onSalvo: (p: PropostaSupabase) => void;
  statusOpcoes: string[];
  disciplinaOpcoes: string[];
  responsavelOpcoes: string[];
}

export function ModalEditarProposta({
  proposta,
  onFechar,
  onSalvo,
  statusOpcoes,
  disciplinaOpcoes,
  responsavelOpcoes,
}: Props) {
  const [form, setForm] = useState({
    numero_composto: '',
    data_entrada: '',
    cliente: '',
    obra: '',
    objeto: '',
    disciplina: '',
    responsavel: '',
    valor_orcado: '',
    valor_material: '',
    valor_mo: '',
    status: '',
    tipo: '',
    data_limite: '',
    etapa_funil: '',
    resultado_comercial: '',
    chance_fechamento: '',
    urgencia: '',
    proxima_acao: '',
    data_proxima_acao: '',
    observacao_comercial: '',
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [toast, setToast] = useState(false);

  useEffect(() => {
    if (!proposta) return;
    setForm({
      numero_composto: proposta.numero_composto || '',
      data_entrada: proposta.data_entrada || '',
      cliente: proposta.cliente || '',
      obra: proposta.obra || '',
      objeto: proposta.objeto || '',
      disciplina: proposta.disciplina || '',
      responsavel: proposta.responsavel || '',
      valor_orcado: proposta.valor_orcado?.toString() || '',
      valor_material: proposta.valor_material?.toString() || '',
      valor_mo: proposta.valor_mo?.toString() || '',
      status: proposta.status || '',
      tipo: proposta.tipo || '',
      data_limite: proposta.data_limite || '',
      etapa_funil: proposta.etapa_funil || '',
      resultado_comercial: proposta.resultado_comercial || '',
      chance_fechamento: proposta.chance_fechamento || '',
      urgencia: proposta.urgencia || '',
      proxima_acao: proposta.proxima_acao || '',
      data_proxima_acao: proposta.data_proxima_acao || '',
      observacao_comercial: proposta.observacao_comercial || '',
    });
    setErro('');
  }, [proposta]);

  useEffect(() => {
    if (!proposta) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFechar();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [proposta, onFechar]);

  if (!proposta) return null;

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSalvar() {
    setSalvando(true);
    setErro('');
    try {
      const dados: Partial<PropostaSupabase> = {
        numero_composto: form.numero_composto || null as any,
        data_entrada: form.data_entrada || null,
        cliente: form.cliente || null,
        obra: form.obra || null,
        objeto: form.objeto || null,
        disciplina: form.disciplina || null,
        responsavel: form.responsavel || null,
        valor_orcado: form.valor_orcado ? Number(form.valor_orcado) : null,
        valor_material: form.valor_material ? Number(form.valor_material) : null,
        valor_mo: form.valor_mo ? Number(form.valor_mo) : null,
        status: form.status || null,
        tipo: form.tipo || null,
        data_limite: form.data_limite || null,
        etapa_funil: form.etapa_funil || null,
        resultado_comercial: form.resultado_comercial || null,
        chance_fechamento: form.chance_fechamento || null,
        urgencia: form.urgencia || null,
        proxima_acao: form.proxima_acao || null,
        data_proxima_acao: form.data_proxima_acao || null,
        observacao_comercial: form.observacao_comercial || null,
        ultima_interacao: new Date().toISOString().split('T')[0],
      };
      const atualizado = await propostasRepository.atualizar(proposta!.id, dados);
      setToast(true);
      setTimeout(() => setToast(false), 3000);
      onSalvo(atualizado);
    } catch (e: any) {
      console.error(e);
      setErro(e.message || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onFechar} />
      <div
        className="relative bg-white rounded-xl shadow-2xl w-full mx-4 max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">Editar Proposta</h2>
            <p className="text-xs text-slate-400 mt-0.5">{proposta.numero_composto}</p>
          </div>
          <button onClick={onFechar} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {erro && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2">
              {erro}
            </div>
          )}

          {/* Identificação */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Identificação</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Número</label>
                <input
                  type="text"
                  value={form.numero_composto}
                  onChange={(e) => handleChange('numero_composto', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Data Entrada</label>
                <input
                  type="date"
                  value={form.data_entrada}
                  onChange={(e) => handleChange('data_entrada', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Data Limite</label>
                <input
                  type="date"
                  value={form.data_limite}
                  onChange={(e) => handleChange('data_limite', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Cliente / Obra */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Cliente e Obra</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Cliente</label>
                <input
                  type="text"
                  value={form.cliente}
                  onChange={(e) => handleChange('cliente', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Obra</label>
                <input
                  type="text"
                  value={form.obra}
                  onChange={(e) => handleChange('obra', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs text-slate-500 mb-1">Objeto</label>
              <input
                type="text"
                value={form.objeto}
                onChange={(e) => handleChange('objeto', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Classificação */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Classificação</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">— Selecionar —</option>
                  {statusOpcoes.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Disciplina</label>
                <select
                  value={form.disciplina}
                  onChange={(e) => handleChange('disciplina', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">— Selecionar —</option>
                  {disciplinaOpcoes.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Responsável</label>
                <select
                  value={form.responsavel}
                  onChange={(e) => handleChange('responsavel', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">— Selecionar —</option>
                  {responsavelOpcoes.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Tipo</label>
                <input
                  type="text"
                  value={form.tipo}
                  onChange={(e) => handleChange('tipo', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Valores */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Valores</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Valor Orçado (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.valor_orcado}
                  onChange={(e) => handleChange('valor_orcado', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Valor Material (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.valor_material}
                  onChange={(e) => handleChange('valor_material', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Valor M.O. (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.valor_mo}
                  onChange={(e) => handleChange('valor_mo', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Funil Comercial */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Funil Comercial</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Etapa do Funil</label>
                <select
                  value={form.etapa_funil}
                  onChange={(e) => handleChange('etapa_funil', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">— Selecionar —</option>
                  {ORDEM_FUNIL.map((etapa) => (
                    <option key={etapa} value={etapa}>{ETAPA_LABELS[etapa]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Resultado Comercial</label>
                <select
                  value={form.resultado_comercial}
                  onChange={(e) => handleChange('resultado_comercial', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">— Selecionar —</option>
                  {(Object.keys(RESULTADO_LABELS) as ResultadoComercial[]).map((r) => (
                    <option key={r} value={r}>{RESULTADO_LABELS[r]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Chance de Fechamento</label>
                <select
                  value={form.chance_fechamento}
                  onChange={(e) => handleChange('chance_fechamento', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">— Selecionar —</option>
                  <option value="alta">Alta</option>
                  <option value="media">Média</option>
                  <option value="baixa">Baixa</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Urgência</label>
                <select
                  value={form.urgencia}
                  onChange={(e) => handleChange('urgencia', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">— Selecionar —</option>
                  <option value="alta">Alta</option>
                  <option value="media">Média</option>
                  <option value="baixa">Baixa</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Próxima Ação</label>
                <input
                  type="text"
                  value={form.proxima_acao}
                  onChange={(e) => handleChange('proxima_acao', e.target.value)}
                  placeholder="Ex: Enviar proposta revisada"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Data Próxima Ação</label>
                <input
                  type="date"
                  value={form.data_proxima_acao}
                  onChange={(e) => handleChange('data_proxima_acao', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs text-slate-500 mb-1">Observação Comercial</label>
              <textarea
                value={form.observacao_comercial}
                onChange={(e) => handleChange('observacao_comercial', e.target.value)}
                rows={2}
                placeholder="Notas sobre negociação, contatos, decisões..."
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="absolute top-4 right-4 flex items-center gap-2 bg-green-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-lg animate-fade-in z-50">
            <CheckCircle size={16} />
            Proposta salva com sucesso!
          </div>
        )}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
          <button
            onClick={onFechar}
            className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {salvando ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save size={14} />
                Salvar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
