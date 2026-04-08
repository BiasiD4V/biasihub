import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  ClipboardList, Briefcase, LayoutGrid, Check, X, ChevronDown,
  Plus, Trash2, ToggleLeft, ToggleRight, AlertTriangle, Clock,
  Mail, ShieldCheck, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { acessoRepository, type Solicitacao, type Cargo, type ModuloAcesso } from '../infrastructure/supabase/acessoRepository';

// ─── Constants ──────────────────────────────────────────────────────────────

const PAPEIS_OPCOES = [
  { value: 'dono',          label: 'Dono' },
  { value: 'admin',         label: 'Admin' },
  { value: 'gestor',        label: 'Gestor' },
  { value: 'almoxarifado',  label: 'Almoxarifado' },
  { value: 'comercial',     label: 'Comercial' },
  { value: 'visualizador',  label: 'Visualizador' },
];

const MODULOS_LISTA = [
  { key: 'comercial',     label: 'Comercial',     descricao: 'Orçamentos, propostas e clientes' },
  { key: 'almoxarifado',  label: 'Almoxarifado',  descricao: 'Estoque, requisições e materiais' },
  { key: 'obras',         label: 'Obras',         descricao: 'Gestão de contratos e canteiros' },
  { key: 'financeiro',    label: 'Financeiro',    descricao: 'Fluxo de caixa e relatórios' },
  { key: 'contratos',     label: 'Contratos',     descricao: 'Documentos e contratos digitais' },
  { key: 'logistica',     label: 'Logística',     descricao: 'Frota, rotas e entregas' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pendente: { label: 'Pendente',  className: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    aprovado: { label: 'Aprovado', className: 'bg-green-50 text-green-700 border-green-200' },
    negado:   { label: 'Negado',   className: 'bg-red-50 text-red-600 border-red-200' },
  };
  const info = map[status] ?? { label: status, className: 'bg-slate-50 text-slate-600 border-slate-200' };
  return (
    <span className={`inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-full border ${info.className}`}>
      {info.label}
    </span>
  );
}

// ─── Tab: Solicitações ───────────────────────────────────────────────────────

function TabSolicitacoes({ usuarioId }: { usuarioId: string }) {
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'pendente' | 'aprovado' | 'negado' | 'todos'>('pendente');

  const [modalAprovar, setModalAprovar] = useState<Solicitacao | null>(null);
  const [cargoSelecionado, setCargoSelecionado] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const [modalNegar, setModalNegar] = useState<Solicitacao | null>(null);
  const [observacaoNegar, setObservacaoNegar] = useState('');

  async function carregar() {
    setLoading(true);
    const [sols, cars] = await Promise.all([
      acessoRepository.listarSolicitacoes(filtro === 'todos' ? undefined : filtro),
      acessoRepository.listarCargos(),
    ]);
    setSolicitacoes(sols);
    setCargos(cars);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, [filtro]);

  async function handleAprovar() {
    if (!modalAprovar || !cargoSelecionado) return;
    setSalvando(true);
    const resultado = await acessoRepository.aprovarSolicitacao(modalAprovar.id, cargoSelecionado, usuarioId);
    if (resultado.sucesso) {
      setMensagem({ tipo: 'sucesso', texto: 'Solicitação aprovada com sucesso.' });
      setModalAprovar(null);
      await carregar();
    } else {
      setMensagem({ tipo: 'erro', texto: resultado.erro ?? 'Erro ao aprovar.' });
    }
    setSalvando(false);
  }

  async function handleNegar() {
    if (!modalNegar) return;
    setSalvando(true);
    const resultado = await acessoRepository.negarSolicitacao(modalNegar.id, usuarioId, observacaoNegar || undefined);
    if (resultado.sucesso) {
      setMensagem({ tipo: 'sucesso', texto: 'Solicitação negada.' });
      setModalNegar(null);
      setObservacaoNegar('');
      await carregar();
    } else {
      setMensagem({ tipo: 'erro', texto: resultado.erro ?? 'Erro ao negar.' });
    }
    setSalvando(false);
  }

  const pendentes = solicitacoes.filter(s => s.status === 'pendente').length;

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        {(['pendente', 'aprovado', 'negado', 'todos'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${
              filtro === f
                ? 'bg-[#233772] text-white border-[#233772]'
                : 'text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'
            }`}
          >
            {f === 'pendente' ? (
              <span className="flex items-center gap-1.5">
                Pendentes
                {pendentes > 0 && (
                  <span className="bg-yellow-400 text-[#233772] text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none">
                    {pendentes}
                  </span>
                )}
              </span>
            ) : f === 'aprovado' ? 'Aprovados' : f === 'negado' ? 'Negados' : 'Todos'}
          </button>
        ))}
        <button
          onClick={carregar}
          className="ml-auto p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="Atualizar"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Mensagem de feedback */}
      {mensagem && (
        <div
          className={`text-sm px-4 py-3 rounded-xl border ${
            mensagem.tipo === 'sucesso'
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          {mensagem.texto}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center text-slate-400 text-sm">
          Carregando solicitações...
        </div>
      ) : solicitacoes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
          <ClipboardList size={36} className="mx-auto text-slate-200 mb-3" />
          <p className="text-sm text-slate-400">Nenhuma solicitação encontrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {solicitacoes.map(sol => (
            <div
              key={sol.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              {/* Avatar + info */}
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
                  style={{ backgroundColor: '#233772' }}
                >
                  {sol.nome.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-slate-800 text-sm">{sol.nome}</span>
                    <StatusBadge status={sol.status} />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                    <Mail size={11} />
                    <span className="truncate">{sol.email}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                    <Clock size={10} />
                    {formatarData(sol.criado_em)}
                  </div>
                  {sol.status === 'aprovado' && sol.cargo && (
                    <div className="text-[11px] text-green-600 mt-0.5 font-medium">
                      Cargo: {sol.cargo.nome} ({sol.cargo.papel})
                    </div>
                  )}
                  {sol.status === 'negado' && sol.observacao && (
                    <div className="text-[11px] text-red-500 mt-0.5">
                      Motivo: {sol.observacao}
                    </div>
                  )}
                </div>
              </div>

              {/* Ações */}
              {sol.status === 'pendente' && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => { setModalAprovar(sol); setCargoSelecionado(''); setMensagem(null); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 transition-colors"
                  >
                    <Check size={14} />
                    Aprovar
                  </button>
                  <button
                    onClick={() => { setModalNegar(sol); setObservacaoNegar(''); setMensagem(null); }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors"
                  >
                    <X size={14} />
                    Negar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Aprovar */}
      {modalAprovar && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setModalAprovar(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-800 text-base" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Aprovar Solicitação
              </h3>
              <button onClick={() => setModalAprovar(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="mb-4 p-3 bg-slate-50 rounded-xl">
              <p className="text-sm font-semibold text-slate-700">{modalAprovar.nome}</p>
              <p className="text-xs text-slate-500">{modalAprovar.email}</p>
            </div>

            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Selecionar Cargo
            </label>
            {cargos.length === 0 ? (
              <p className="text-xs text-red-500 mb-4">Nenhum cargo ativo cadastrado. Crie cargos na aba "Cargos" primeiro.</p>
            ) : (
              <div className="relative mb-5">
                <select
                  value={cargoSelecionado}
                  onChange={e => setCargoSelecionado(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 appearance-none pr-8"
                >
                  <option value="">— Escolha um cargo —</option>
                  {cargos.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nome} ({c.papel})
                    </option>
                  ))}
                </select>
                <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setModalAprovar(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAprovar}
                disabled={salvando || !cargoSelecionado}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white rounded-xl transition-colors disabled:opacity-50"
                style={{ backgroundColor: '#233772' }}
              >
                {salvando ? 'Aprovando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Negar */}
      {modalNegar && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setModalNegar(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-slate-800 text-base" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Negar Solicitação
              </h3>
              <button onClick={() => setModalNegar(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="mb-4 p-3 bg-red-50 rounded-xl border border-red-100">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle size={14} className="text-red-500" />
                <p className="text-sm font-semibold text-slate-700">{modalNegar.nome}</p>
              </div>
              <p className="text-xs text-slate-500">{modalNegar.email}</p>
            </div>

            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Motivo (opcional)
            </label>
            <textarea
              value={observacaoNegar}
              onChange={e => setObservacaoNegar(e.target.value)}
              placeholder="Informe o motivo da negação (opcional)..."
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 resize-none mb-5"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setModalNegar(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleNegar}
                disabled={salvando}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl transition-colors"
              >
                {salvando ? 'Negando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Cargos ─────────────────────────────────────────────────────────────

function TabCargos() {
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const [novoNome, setNovoNome] = useState('');
  const [novoPapel, setNovoPapel] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');

  const [confirmDesativar, setConfirmDesativar] = useState<Cargo | null>(null);
  const [desativando, setDesativando] = useState(false);

  async function carregar() {
    setLoading(true);
    const data = await acessoRepository.listarTodosCargos();
    setCargos(data);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  async function handleCriarCargo(e: React.FormEvent) {
    e.preventDefault();
    if (!novoNome.trim() || !novoPapel) return;
    setSalvando(true);
    const resultado = await acessoRepository.criarCargo(novoNome.trim(), novoPapel, novaDescricao.trim());
    if (resultado.sucesso) {
      setMensagem({ tipo: 'sucesso', texto: `Cargo "${novoNome}" criado com sucesso.` });
      setNovoNome('');
      setNovoPapel('');
      setNovaDescricao('');
      setMostrarForm(false);
      await carregar();
    } else {
      setMensagem({ tipo: 'erro', texto: resultado.erro ?? 'Erro ao criar cargo.' });
    }
    setSalvando(false);
  }

  async function handleDesativar(cargo: Cargo) {
    setDesativando(true);
    const resultado = await acessoRepository.desativarCargo(cargo.id);
    if (resultado.sucesso) {
      setMensagem({ tipo: 'sucesso', texto: `Cargo "${cargo.nome}" desativado.` });
      await carregar();
    } else {
      setMensagem({ tipo: 'erro', texto: resultado.erro ?? 'Erro ao desativar.' });
    }
    setDesativando(false);
    setConfirmDesativar(null);
  }

  const ativos = cargos.filter(c => c.ativo);
  const inativos = cargos.filter(c => !c.ativo);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{ativos.length} cargo{ativos.length !== 1 ? 's' : ''} ativo{ativos.length !== 1 ? 's' : ''}</p>
        <button
          onClick={() => { setMostrarForm(v => !v); setMensagem(null); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
          style={{ backgroundColor: '#233772' }}
        >
          <Plus size={15} />
          Novo Cargo
        </button>
      </div>

      {/* Mensagem */}
      {mensagem && (
        <div
          className={`text-sm px-4 py-3 rounded-xl border ${
            mensagem.tipo === 'sucesso'
              ? 'bg-green-50 text-green-700 border-green-200'
              : 'bg-red-50 text-red-700 border-red-200'
          }`}
        >
          {mensagem.texto}
        </div>
      )}

      {/* Form novo cargo */}
      {mostrarForm && (
        <div className="bg-white rounded-2xl border border-[#233772]/20 shadow-sm p-5">
          <h3 className="font-bold text-slate-800 text-sm mb-4" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Novo Cargo
          </h3>
          <form onSubmit={handleCriarCargo} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Nome do Cargo
                </label>
                <input
                  type="text"
                  value={novoNome}
                  onChange={e => setNovoNome(e.target.value)}
                  placeholder="Ex: Operador de Almoxarifado"
                  required
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                  Papel (Permissão)
                </label>
                <div className="relative">
                  <select
                    value={novoPapel}
                    onChange={e => setNovoPapel(e.target.value)}
                    required
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2 appearance-none pr-8"
                  >
                    <option value="">— Selecione —</option>
                    {PAPEIS_OPCOES.map(p => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Descrição (opcional)
              </label>
              <input
                type="text"
                value={novaDescricao}
                onChange={e => setNovaDescricao(e.target.value)}
                placeholder="Breve descrição das responsabilidades..."
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:outline-none focus:ring-2"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setMostrarForm(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="px-5 py-2 text-sm font-bold text-white rounded-xl disabled:opacity-50 transition-colors"
                style={{ backgroundColor: '#233772' }}
              >
                {salvando ? 'Criando...' : 'Criar Cargo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center text-slate-400 text-sm">
          Carregando cargos...
        </div>
      ) : cargos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center">
          <Briefcase size={36} className="mx-auto text-slate-200 mb-3" />
          <p className="text-sm text-slate-400">Nenhum cargo cadastrado. Crie o primeiro!</p>
        </div>
      ) : (
        <>
          {ativos.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60">
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Cargos Ativos</p>
              </div>
              <div className="divide-y divide-slate-100">
                {ativos.map(c => (
                  <div key={c.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: 'rgba(35,55,114,0.08)' }}
                    >
                      <ShieldCheck size={18} style={{ color: '#233772' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-800 text-sm">{c.nome}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#233772]/10 text-[#233772]">
                          {PAPEIS_OPCOES.find(p => p.value === c.papel)?.label ?? c.papel}
                        </span>
                      </div>
                      {c.descricao && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">{c.descricao}</p>
                      )}
                    </div>
                    <button
                      onClick={() => setConfirmDesativar(c)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0"
                      title="Desativar cargo"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {inativos.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden opacity-60">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Cargos Inativos</p>
              </div>
              <div className="divide-y divide-slate-100">
                {inativos.map(c => (
                  <div key={c.id} className="flex items-center gap-4 px-5 py-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-slate-100">
                      <ShieldCheck size={18} className="text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-500 text-sm line-through">{c.nome}</span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">
                          {PAPEIS_OPCOES.find(p => p.value === c.papel)?.label ?? c.papel}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Confirm desativar */}
      {confirmDesativar && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setConfirmDesativar(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={28} className="text-red-600" />
            </div>
            <h3 className="text-base font-bold text-slate-800 mb-2">Desativar cargo?</h3>
            <p className="text-sm text-slate-500 mb-6">
              O cargo <strong>{confirmDesativar.nome}</strong> será desativado e não poderá ser atribuído em novas aprovações.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDesativar(null)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDesativar(confirmDesativar)}
                disabled={desativando}
                className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl transition-colors"
              >
                {desativando ? 'Desativando...' : 'Desativar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Tab: Módulos ─────────────────────────────────────────────────────────────

function TabModulos({ usuarioId }: { usuarioId: string }) {
  const [modulos, setModulos] = useState<Record<string, ModuloAcesso>>({});
  const [draft, setDraft] = useState<Record<string, { papeis: string[]; disponivel: boolean }>>({});
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Record<string, { tipo: 'sucesso' | 'erro'; texto: string }>>({});

  async function carregar() {
    setLoading(true);
    const data = await acessoRepository.listarModulos();
    const map: Record<string, ModuloAcesso> = {};
    data.forEach(m => { map[m.modulo_key] = m; });
    setModulos(map);

    const draftInit: Record<string, { papeis: string[]; disponivel: boolean }> = {};
    MODULOS_LISTA.forEach(m => {
      const existing = map[m.key];
      draftInit[m.key] = {
        papeis: existing?.papeis ?? [],
        disponivel: existing?.disponivel ?? false,
      };
    });
    setDraft(draftInit);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  function togglePapel(moduloKey: string, papel: string) {
    setDraft(prev => {
      const current = prev[moduloKey] ?? { papeis: [], disponivel: false };
      const papeis = current.papeis.includes(papel)
        ? current.papeis.filter(p => p !== papel)
        : [...current.papeis, papel];
      return { ...prev, [moduloKey]: { ...current, papeis } };
    });
  }

  function toggleDisponivel(moduloKey: string) {
    setDraft(prev => {
      const current = prev[moduloKey] ?? { papeis: [], disponivel: false };
      return { ...prev, [moduloKey]: { ...current, disponivel: !current.disponivel } };
    });
  }

  async function salvarModulo(moduloKey: string) {
    const d = draft[moduloKey];
    if (!d) return;
    setSalvando(moduloKey);
    const resultado = await acessoRepository.salvarModulo(moduloKey, d.papeis, d.disponivel, usuarioId);
    if (resultado.sucesso) {
      setMensagens(prev => ({ ...prev, [moduloKey]: { tipo: 'sucesso', texto: 'Salvo!' } }));
      await carregar();
    } else {
      setMensagens(prev => ({ ...prev, [moduloKey]: { tipo: 'erro', texto: resultado.erro ?? 'Erro ao salvar.' } }));
    }
    setSalvando(null);
    setTimeout(() => setMensagens(prev => { const next = { ...prev }; delete next[moduloKey]; return next; }), 3000);
  }

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center text-slate-400 text-sm">
          Carregando módulos...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MODULOS_LISTA.map(m => {
            const d = draft[m.key] ?? { papeis: [], disponivel: false };
            const msg = mensagens[m.key];
            const isSaving = salvando === m.key;

            return (
              <div
                key={m.key}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4"
              >
                {/* Header do card */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <LayoutGrid size={16} style={{ color: '#233772' }} />
                      <h3 className="font-bold text-slate-800 text-sm" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                        {m.label}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-400">{m.descricao}</p>
                  </div>
                  <button
                    onClick={() => toggleDisponivel(m.key)}
                    className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold transition-colors"
                    style={{ color: d.disponivel ? '#233772' : '#94a3b8' }}
                  >
                    {d.disponivel ? (
                      <ToggleRight size={22} style={{ color: '#233772' }} />
                    ) : (
                      <ToggleLeft size={22} className="text-slate-300" />
                    )}
                    {d.disponivel ? 'Ativo' : 'Inativo'}
                  </button>
                </div>

                {/* Papéis */}
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Papéis com acesso
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {PAPEIS_OPCOES.map(p => {
                      const ativo = d.papeis.includes(p.value);
                      return (
                        <button
                          key={p.value}
                          onClick={() => togglePapel(m.key, p.value)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                            ativo
                              ? 'bg-[#233772] text-white border-[#233772]'
                              : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100">
                  {msg ? (
                    <span
                      className={`text-[11px] font-medium ${msg.tipo === 'sucesso' ? 'text-green-600' : 'text-red-500'}`}
                    >
                      {msg.texto}
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-300">
                      {modulos[m.key] ? `Atualizado` : 'Não configurado'}
                    </span>
                  )}
                  <button
                    onClick={() => salvarModulo(m.key)}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white disabled:opacity-50 transition-colors"
                    style={{ backgroundColor: '#233772' }}
                  >
                    {isSaving ? (
                      <>
                        <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Check size={13} />
                        Salvar
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Página Principal ────────────────────────────────────────────────────────

type Tab = 'solicitacoes' | 'cargos' | 'modulos';

export function GerenciarAcessos() {
  const { usuario } = useAuth();
  const [tab, setTab] = useState<Tab>('solicitacoes');
  const [pendentes, setPendentes] = useState(0);

  const papel = usuario?.papel ?? '';
  const isAdmin = papel === 'admin' || papel === 'dono';

  useEffect(() => {
    if (!isAdmin) return;
    acessoRepository.contarPendentes().then(setPendentes);
    const interval = setInterval(() => {
      acessoRepository.contarPendentes().then(setPendentes);
    }, 30000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  if (!isAdmin) return <Navigate to="/" replace />;

  const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'solicitacoes', label: 'Solicitações', icon: ClipboardList },
    { key: 'cargos',       label: 'Cargos',       icon: Briefcase },
    { key: 'modulos',      label: 'Módulos',       icon: LayoutGrid },
  ];

  return (
    <div className="space-y-6 p-4 lg:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-black text-slate-800"
          style={{ fontFamily: 'Montserrat, sans-serif' }}
        >
          Gerenciar Acessos
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Controle solicitações, cargos e permissões de módulos do sistema.
        </p>
      </div>

      {/* Stats rápidos */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-100 rounded-lg p-2">
              <ClipboardList size={17} className="text-yellow-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800">{pendentes}</p>
              <p className="text-[10px] text-slate-500">Pendentes</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg p-2" style={{ backgroundColor: 'rgba(35,55,114,0.08)' }}>
              <Briefcase size={17} style={{ color: '#233772' }} />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800">–</p>
              <p className="text-[10px] text-slate-500">Cargos</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 rounded-lg p-2">
              <LayoutGrid size={17} className="text-purple-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800">{MODULOS_LISTA.length}</p>
              <p className="text-[10px] text-slate-500">Módulos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === key
                ? 'bg-[#233772] text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={15} />
            {label}
            {key === 'solicitacoes' && pendentes > 0 && (
              <span className="bg-[#FFC82D] text-[#233772] text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none">
                {pendentes}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      {tab === 'solicitacoes' && <TabSolicitacoes usuarioId={usuario!.id} />}
      {tab === 'cargos'       && <TabCargos />}
      {tab === 'modulos'      && <TabModulos usuarioId={usuario!.id} />}
    </div>
  );
}
