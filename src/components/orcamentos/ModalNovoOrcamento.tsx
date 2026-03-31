import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { useCadastrosMestres } from '../../context/CadastrosMestresContext';
import { useNovoOrcamento, type CriarOrcamentoInput } from '../../context/NovoOrcamentoContext';
import { mockClientes } from '../../infrastructure/mock/dados/clientes.mock';
import { useAuth } from '../../context/AuthContext';

interface ModalNovoOrcamentoProps {
  aberto: boolean;
  onFechar: () => void;
  onCriado: (id: string) => void;
}

const CAMPOS_VAZIOS: CriarOrcamentoInput = {
  titulo: '',
  clienteId: '',
  tiposObraIds: [],
  dataBase: new Date().toISOString().slice(0, 10),
  responsavel: '',
  disciplinaIds: [],
};

export function ModalNovoOrcamento({ aberto, onFechar, onCriado }: ModalNovoOrcamentoProps) {
  const { tiposObra, disciplinas } = useCadastrosMestres();
  const { criarOrcamento } = useNovoOrcamento();
  const { usuario } = useAuth();

  const [form, setForm] = useState<CriarOrcamentoInput>({
    ...CAMPOS_VAZIOS,
    responsavel: usuario?.nome ?? '',
  });
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  function resetar() {
    setForm({ ...CAMPOS_VAZIOS, responsavel: usuario?.nome ?? '' });
    setErro('');
  }

  function fechar() {
    resetar();
    onFechar();
  }

  function toggleDisciplina(id: string) {
    setForm((prev) => ({
      ...prev,
      disciplinaIds: prev.disciplinaIds.includes(id)
        ? prev.disciplinaIds.filter((d) => d !== id)
        : [...prev.disciplinaIds, id],
    }));
  }

  async function confirmar() {
    setErro('');

    if (!form.titulo.trim()) {
      setErro('Informe o título da obra / projeto.');
      return;
    }
    if (!form.clienteId) {
      setErro('Selecione um cliente.');
      return;
    }
    if (form.tiposObraIds.length === 0) {
      setErro('Selecione ao menos um tipo de obra.');
      return;
    }
    if (!form.dataBase) {
      setErro('Informe a data-base.');
      return;
    }
    if (form.disciplinaIds.length === 0) {
      setErro('Selecione ao menos uma disciplina.');
      return;
    }

    setSalvando(true);
    await new Promise<void>((r) => setTimeout(r, 400));
    const id = criarOrcamento(form);
    setSalvando(false);
    resetar();
    onCriado(id);
  }

  return (
    <Modal aberto={aberto} onFechar={fechar} titulo="Novo Orçamento" largura="xl">
      <div className="px-6 py-5 space-y-5">
        {/* Erro */}
        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {erro}
          </div>
        )}

        {/* Título */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Título da Obra / Projeto <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.titulo}
            onChange={(e) => setForm((p) => ({ ...p, titulo: e.target.value }))}
            placeholder="Ex: Reforma elétrica — Galpão 3"
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Cliente + Tipo de Obra */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Cliente <span className="text-red-500">*</span>
            </label>
            <select
              value={form.clienteId}
              onChange={(e) => setForm((p) => ({ ...p, clienteId: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Selecionar...</option>
              {mockClientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nomeFantasia ?? c.razaoSocial}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Tipo de Obra <span className="text-red-500">*</span>
            </label>
            <select
              value={form.tiposObraIds[0] ?? ''}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  tiposObraIds: e.target.value ? [e.target.value] : [],
                }))
              }
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Selecionar...</option>
              {tiposObra
                .filter((t) => t.ativo)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nome}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Data-base + Responsável */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Data-base <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.dataBase}
              onChange={(e) => setForm((p) => ({ ...p, dataBase: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Responsável
            </label>
            <input
              type="text"
              value={form.responsavel}
              onChange={(e) => setForm((p) => ({ ...p, responsavel: e.target.value }))}
              placeholder="Nome do responsável"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Disciplinas */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Disciplinas <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {disciplinas
              .filter((d) => d.ativa)
              .map((d) => (
                <label
                  key={d.id}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                    form.disciplinaIds.includes(d.id)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={form.disciplinaIds.includes(d.id)}
                    onChange={() => toggleDisciplina(d.id)}
                    className="accent-blue-600"
                  />
                  <span className="text-sm">{d.nome}</span>
                </label>
              ))}
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3">
        <button
          onClick={fechar}
          disabled={salvando}
          className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={confirmar}
          disabled={salvando}
          className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
        >
          {salvando ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Criando...
            </>
          ) : (
            'Criar e abrir orçamento'
          )}
        </button>
      </div>
    </Modal>
  );
}
