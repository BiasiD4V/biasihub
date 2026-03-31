import { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { useCadastrosMestres } from '../../context/CadastrosMestresContext';
import { useNovoOrcamento, type CriarOrcamentoInput } from '../../context/NovoOrcamentoContext';
import { useAuth } from '../../context/AuthContext';
import { clientesRepository, type ClienteSupabase } from '../../infrastructure/supabase/clientesRepository';
import { Search, Loader2, X } from 'lucide-react';

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

  // ── Clientes do Supabase ──
  const [clientes, setClientes] = useState<ClienteSupabase[]>([]);
  const [clientesCarregando, setClientesCarregando] = useState(false);
  const [clienteBusca, setClienteBusca] = useState('');
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteSupabase | null>(null);
  const [dropdownAberto, setDropdownAberto] = useState(false);
  const buscaRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Carregar clientes quando o modal abre
  useEffect(() => {
    if (!aberto) return;
    setClientesCarregando(true);
    clientesRepository.listarTodos()
      .then(setClientes)
      .catch((e) => console.error('Erro ao carregar clientes:', e))
      .finally(() => setClientesCarregando(false));
  }, [aberto]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickFora(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClickFora);
    return () => document.removeEventListener('mousedown', handleClickFora);
  }, []);

  // Clientes filtrados pela busca
  const clientesFiltrados = clienteBusca.trim()
    ? clientes.filter((c) => {
        const termo = clienteBusca.toLowerCase();
        return (
          c.nome.toLowerCase().includes(termo) ||
          (c.nome_fantasia ?? '').toLowerCase().includes(termo)
        );
      })
    : clientes;

  function selecionarCliente(c: ClienteSupabase) {
    setClienteSelecionado(c);
    setForm((p) => ({ ...p, clienteId: c.id }));
    setClienteBusca('');
    setDropdownAberto(false);
  }

  function limparCliente() {
    setClienteSelecionado(null);
    setForm((p) => ({ ...p, clienteId: '' }));
    setClienteBusca('');
    setTimeout(() => buscaRef.current?.focus(), 50);
  }

  function resetar() {
    setForm({ ...CAMPOS_VAZIOS, responsavel: usuario?.nome ?? '' });
    setErro('');
    setClienteSelecionado(null);
    setClienteBusca('');
    setDropdownAberto(false);
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

          {/* ── Campo de Cliente com busca ── */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Cliente <span className="text-red-500">*</span>
            </label>

            {clienteSelecionado ? (
              /* Cliente já selecionado */
              <div className="flex items-center gap-2 border border-blue-400 bg-blue-50 rounded-lg px-3 py-2.5">
                <span className="flex-1 text-sm font-medium text-blue-800 truncate">
                  {clienteSelecionado.nome_fantasia ?? clienteSelecionado.nome}
                </span>
                <button
                  onClick={limparCliente}
                  className="text-blue-400 hover:text-blue-600 flex-shrink-0"
                  title="Trocar cliente"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              /* Campo de busca com dropdown */
              <div ref={dropdownRef} className="relative">
                <div className="relative">
                  {clientesCarregando ? (
                    <Loader2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />
                  ) : (
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  )}
                  <input
                    ref={buscaRef}
                    type="text"
                    value={clienteBusca}
                    onChange={(e) => {
                      setClienteBusca(e.target.value);
                      setDropdownAberto(true);
                    }}
                    onFocus={() => setDropdownAberto(true)}
                    placeholder={clientesCarregando ? 'Carregando clientes...' : 'Buscar cliente...'}
                    disabled={clientesCarregando}
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50"
                  />
                </div>

                {/* Dropdown de resultados */}
                {dropdownAberto && !clientesCarregando && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    {clientesFiltrados.length === 0 ? (
                      <div className="px-3 py-3 text-sm text-slate-400 text-center">
                        Nenhum cliente encontrado
                      </div>
                    ) : (
                      clientesFiltrados.slice(0, 50).map((c) => (
                        <button
                          key={c.id}
                          onMouseDown={(e) => { e.preventDefault(); selecionarCliente(c); }}
                          className="w-full text-left px-3 py-2.5 hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0"
                        >
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {c.nome_fantasia ?? c.nome}
                          </p>
                          {c.nome_fantasia && (
                            <p className="text-xs text-slate-400 truncate">{c.nome}</p>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
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
