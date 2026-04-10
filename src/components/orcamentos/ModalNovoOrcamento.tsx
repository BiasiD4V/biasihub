import { useState, useEffect, useRef } from 'react';
import { Modal } from '../ui/Modal';
import { useCadastrosMestres } from '../../context/CadastrosMestresContext';
import type { CriarOrcamentoInput } from '../../context/NovoOrcamentoContext';
import { useAuth } from '../../context/AuthContext';
import { clientesRepository, type ClienteSupabase } from '../../infrastructure/supabase/clientesRepository';
import { propostasRepository } from '../../infrastructure/supabase/propostasRepository';
import { responsaveisComerciaisRepository, type ResponsavelComercial } from '../../infrastructure/supabase/responsaveisComerciaisRepository';
import { supabase } from '../../infrastructure/supabase/client';
import { gamificacaoService } from '../../services/gamificacaoService';
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
  dataEntrada: new Date().toISOString().slice(0, 10),
  dataLimite: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().slice(0, 10),
  responsavel: '',
  disciplinaIds: [],
};


export function ModalNovoOrcamento({ aberto, onFechar, onCriado }: ModalNovoOrcamentoProps) {
  const { tiposObra, disciplinas } = useCadastrosMestres();
  const { usuario } = useAuth();

  const [form, setForm] = useState<CriarOrcamentoInput>({
    ...CAMPOS_VAZIOS,
    responsavel: usuario?.nome ?? '',
  });
  const [responsavelComercialSelecionado, setResponsavelComercialSelecionado] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  // ── Responsáveis do config (para campo Responsável) ──
  const [responsaveis, setResponsaveis] = useState<ResponsavelComercial[]>([]);
  // ── Membros comerciais do sistema (para campo Responsável Comercial) ──
  const [membrosComercial, setMembrosComercial] = useState<{ id: string; nome: string }[]>([]);

  useEffect(() => {
    responsaveisComerciaisRepository.listarTodos()
      .then((r) => setResponsaveis(r.filter((x) => x.ativo)))
      .catch(() => { });

    supabase
      .from('usuarios')
      .select('id, nome')
      .eq('papel', 'comercial')
      .eq('ativo', true)
      .order('nome')
      .then(({ data }) => { setMembrosComercial(data ?? []); });
  }, []);

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
    setForm({ ...CAMPOS_VAZIOS, responsavel: '' });
    setResponsavelComercialSelecionado('');
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
    if (!form.dataEntrada) {
      setErro('Informe a data de início.');
      return;
    }
    if (!form.dataLimite) {
      setErro('Informe a data de entrega.');
      return;
    }
    if (form.disciplinaIds.length === 0) {
      setErro('Selecione ao menos uma disciplina.');
      return;
    }

    setSalvando(true);
    try {
      const tipoNome = tiposObra.find((t) => t.id === form.tiposObraIds[0])?.nome ?? null;
      const disciplinaNomes = form.disciplinaIds
        .map((did) => disciplinas.find((d) => d.id === did)?.nome ?? did)
        .join(', ');

      const proposta = await propostasRepository.criar({
        obra: form.titulo.trim(),
        cliente: clienteSelecionado?.nome_fantasia ?? clienteSelecionado?.nome ?? '',
        tipo: tipoNome,
        disciplina: disciplinaNomes || null,
        data_entrada: form.dataEntrada,
        data_limite: form.dataLimite,
        responsavel: form.responsavel.trim() || '',
        responsavel_comercial: responsavelComercialSelecionado || null,
      });

      // Automação: Dá os pontos iniciais de entrada no funil
      if (form.responsavel) {
        gamificacaoService.registrarAtividadePorEtapa(form.responsavel, 'entrada_oportunidade').catch(console.error);
      }

      resetar();
      onCriado(proposta.id);
    } catch {
      setErro('Erro ao criar orçamento. Verifique a conexão e tente novamente.');
    } finally {
      setSalvando(false);
    }
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

        {/* Data Início e Entrega */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Data de Início <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.dataEntrada}
              onChange={(e) => setForm((p) => ({ ...p, dataEntrada: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Data de Entrega <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.dataLimite}
              onChange={(e) => setForm((p) => ({ ...p, dataLimite: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Responsável técnico + Responsável Comercial */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Responsável
            </label>
            <select
              value={form.responsavel}
              onChange={(e) => setForm((p) => ({ ...p, responsavel: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Selecionar...</option>
              {responsaveis.map((r) => (
                <option key={r.id} value={r.nome}>{r.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Responsável Comercial
            </label>
            <select
              value={responsavelComercialSelecionado}
              onChange={(e) => setResponsavelComercialSelecionado(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Selecionar...</option>
              {membrosComercial.map((m) => (
                <option key={m.id} value={m.nome}>{m.nome}</option>
              ))}
            </select>
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
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${form.disciplinaIds.includes(d.id)
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
