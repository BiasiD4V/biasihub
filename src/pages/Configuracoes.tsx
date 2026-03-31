import { useEffect, useState } from 'react';
import { Search, Pencil, Power, Trash2, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCadastrosMestres } from '../context/CadastrosMestresContext';
import { useClientes } from '../context/ClientesContext';
import { maoDeObraTiposRepository } from '../infrastructure/supabase/maoDeObraTiposRepository';
import type { MaoDeObraTipo } from '../infrastructure/supabase/maoDeObraTiposRepository';
import type { TipoUnidade } from '../domain/entities/Unidade';
import type { TipoCategoria } from '../domain/entities/Categoria';

type AbaConfig =
  | 'tiposObra'
  | 'disciplinas'
  | 'unidades'
  | 'regioes'
  | 'categorias'
  | 'maoDeObra'
  | 'clientes';

const ABAS: { id: AbaConfig; rotulo: string }[] = [
  { id: 'tiposObra', rotulo: 'Tipos de Obra' },
  { id: 'disciplinas', rotulo: 'Disciplinas' },
  { id: 'unidades', rotulo: 'Unidades' },
  { id: 'regioes', rotulo: 'Regiões' },
  { id: 'categorias', rotulo: 'Categorias' },
  { id: 'maoDeObra', rotulo: 'Mão de Obra' },
  { id: 'clientes', rotulo: 'Clientes' },
];

const ROTULO_BOTAO_NOVO: Record<AbaConfig, string> = {
  tiposObra: 'Novo Tipo de Obra',
  disciplinas: 'Nova Disciplina',
  unidades: 'Nova Unidade',
  regioes: 'Nova Região',
  categorias: 'Nova Categoria',
  maoDeObra: 'Novo Tipo de Mão de Obra',
  clientes: 'Novo Cliente',
};

const PLACEHOLDER_BUSCA: Record<AbaConfig, string> = {
  tiposObra: 'Pesquisar tipo de obra...',
  disciplinas: 'Pesquisar disciplina ou código...',
  unidades: 'Pesquisar unidade ou símbolo...',
  regioes: 'Pesquisar região ou UF...',
  categorias: 'Pesquisar categoria...',
  maoDeObra: 'Pesquisar tipo de mão de obra...',
  clientes: 'Pesquisar cliente ou CNPJ/CPF...',
};

const ROTULO_COLUNA_CODIGO: Record<AbaConfig, string> = {
  tiposObra: 'Cód / Simb.',
  disciplinas: 'Cód / Simb.',
  unidades: 'Cód / Simb.',
  regioes: 'Cód / Simb.',
  categorias: 'Tipo',
  maoDeObra: '—',
  clientes: 'CNPJ / CPF',
};

type ModalCadastro = 'disciplinas' | 'unidades' | 'regioes' | 'categorias' | 'maoDeObra' | null;

const TIPOS_UNIDADE: TipoUnidade[] = ['unidade', 'comprimento', 'area', 'volume', 'outro'];
const TIPOS_CATEGORIA: TipoCategoria[] = ['insumo', 'servico', 'equipamento'];

function BadgeAtivo({ ativo }: { ativo: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
        ativo ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${ativo ? 'bg-green-500' : 'bg-slate-400'}`} />
      {ativo ? 'Ativo' : 'Inativo'}
    </span>
  );
}

export function Configuracoes() {
  const navigate = useNavigate();
  const {
    tiposObra,
    disciplinas,
    unidades,
    regioes,
    categorias,
    criarDisciplina,
    criarUnidade,
    criarRegiao,
    criarCategoria,
    toggleAtivoTipoObra,
    toggleAtivaDisciplina,
    excluirTipoObra,
    excluirDisciplina,
    excluirUnidade,
    excluirRegiao,
    excluirCategoria,
  } = useCadastrosMestres();
  const { clientes, toggleAtivoCliente } = useClientes();

  const [abaAtiva, setAbaAtiva] = useState<AbaConfig>('tiposObra');
  const [busca, setBusca] = useState('');
  const [tiposMO, setTiposMO] = useState<MaoDeObraTipo[]>([]);
  const [novoTipoMO, setNovoTipoMO] = useState('');

  // Carregar tipos de MO do Supabase quando a aba for ativada
  useEffect(() => {
    if (abaAtiva !== 'maoDeObra') return;
    maoDeObraTiposRepository.listarTodos()
      .then(setTiposMO)
      .catch(console.error);
  }, [abaAtiva]);
  const [modalCadastro, setModalCadastro] = useState<ModalCadastro>(null);
  const [novaDisciplina, setNovaDisciplina] = useState({
    codigo: '',
    nome: '',
    especialidade: 'geral',
    ativa: true,
  });
  const [novaUnidade, setNovaUnidade] = useState({
    simbolo: '',
    descricao: '',
    tipo: 'unidade' as TipoUnidade,
  });
  const [novaRegiao, setNovaRegiao] = useState({
    nome: '',
    uf: '',
  });
  const [novaCategoria, setNovaCategoria] = useState({
    nome: '',
    tipo: 'insumo' as TipoCategoria,
    descricao: '',
  });
  const [tentouSalvarModal, setTentouSalvarModal] = useState(false);

  const buscaNorm = busca.toLowerCase();
  const novoDirecionavel = abaAtiva === 'clientes';
  const novoModalDisponivel =
    abaAtiva === 'disciplinas' ||
    abaAtiva === 'unidades' ||
    abaAtiva === 'regioes' ||
    abaAtiva === 'categorias' ||
    abaAtiva === 'maoDeObra';
  const novoHabilitado = novoDirecionavel || novoModalDisponivel;

  function handleNovoClick() {
    if (abaAtiva === 'clientes') {
      navigate('/clientes');
      return;
    }

    if (abaAtiva === 'maoDeObra') {
      setTentouSalvarModal(false);
      setModalCadastro('maoDeObra');
      return;
    }

    if (abaAtiva === 'disciplinas') {
      setTentouSalvarModal(false);
      setModalCadastro('disciplinas');
      return;
    }

    if (abaAtiva === 'unidades') {
      setTentouSalvarModal(false);
      setModalCadastro('unidades');
      return;
    }

    if (abaAtiva === 'regioes') {
      setTentouSalvarModal(false);
      setModalCadastro('regioes');
      return;
    }

    if (abaAtiva === 'categorias') {
      setTentouSalvarModal(false);
      setModalCadastro('categorias');
    }
  }

  function fecharModalCadastro() {
    setTentouSalvarModal(false);
    setModalCadastro(null);
  }

  useEffect(() => {
    if (!modalCadastro) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        fecharModalCadastro();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [modalCadastro]);

  const erroCodigoDisciplinaDuplicado = disciplinas.some(
    (d) => d.codigo.toLowerCase() === novaDisciplina.codigo.trim().toLowerCase()
  );
  const erroNomeDisciplinaDuplicado = disciplinas.some(
    (d) => d.nome.toLowerCase() === novaDisciplina.nome.trim().toLowerCase()
  );
  const erroSimboloUnidadeDuplicado = unidades.some(
    (u) => u.simbolo.toLowerCase() === novaUnidade.simbolo.trim().toLowerCase()
  );
  const erroNomeRegiaoDuplicado = regioes.some(
    (r) =>
      r.nome.toLowerCase() === novaRegiao.nome.trim().toLowerCase() &&
      r.uf.toLowerCase() === novaRegiao.uf.trim().toLowerCase()
  );
  const erroNomeCategoriaDuplicado = categorias.some(
    (c) => c.nome.toLowerCase() === novaCategoria.nome.trim().toLowerCase()
  );

  const erroNomeTipoMODuplicado = tiposMO.some(
    (t) => t.nome.toLowerCase() === novoTipoMO.trim().toLowerCase()
  );

  const modalValido =
    modalCadastro === 'maoDeObra'
      ? Boolean(novoTipoMO.trim()) && !erroNomeTipoMODuplicado
      : modalCadastro === 'disciplinas'
      ? Boolean(novaDisciplina.codigo.trim()) &&
        Boolean(novaDisciplina.nome.trim()) &&
        !erroCodigoDisciplinaDuplicado &&
        !erroNomeDisciplinaDuplicado
      : modalCadastro === 'unidades'
      ? Boolean(novaUnidade.simbolo.trim()) &&
        Boolean(novaUnidade.descricao.trim()) &&
        !erroSimboloUnidadeDuplicado
      : modalCadastro === 'regioes'
      ? Boolean(novaRegiao.nome.trim()) && Boolean(novaRegiao.uf.trim()) && novaRegiao.uf.trim().length === 2 && !erroNomeRegiaoDuplicado
      : modalCadastro === 'categorias'
      ? Boolean(novaCategoria.nome.trim()) && !erroNomeCategoriaDuplicado
      : false;

  function salvarCadastroRapido() {
    setTentouSalvarModal(true);
    if (!modalValido) return;

    if (modalCadastro === 'maoDeObra') {
      maoDeObraTiposRepository.criar(novoTipoMO.trim())
        .then((criado) => {
          setTiposMO((prev) => [...prev, criado].sort((a, b) => a.nome.localeCompare(b.nome)));
          setNovoTipoMO('');
          fecharModalCadastro();
        })
        .catch(console.error);
      return;
    }

    if (modalCadastro === 'disciplinas') {
      criarDisciplina({
        codigo: novaDisciplina.codigo.trim().toUpperCase(),
        nome: novaDisciplina.nome.trim(),
        especialidade: novaDisciplina.especialidade.trim().toLowerCase() || 'geral',
        ativa: novaDisciplina.ativa,
      });
      setNovaDisciplina({ codigo: '', nome: '', especialidade: 'geral', ativa: true });
      fecharModalCadastro();
      return;
    }

    if (modalCadastro === 'unidades') {
      criarUnidade({
        simbolo: novaUnidade.simbolo.trim(),
        descricao: novaUnidade.descricao.trim(),
        tipo: novaUnidade.tipo,
      });
      setNovaUnidade({ simbolo: '', descricao: '', tipo: 'unidade' });
      fecharModalCadastro();
      return;
    }

    if (modalCadastro === 'regioes') {
      criarRegiao({
        nome: novaRegiao.nome.trim(),
        uf: novaRegiao.uf.trim().toUpperCase(),
        municipios: [],
      });
      setNovaRegiao({ nome: '', uf: '' });
      fecharModalCadastro();
      return;
    }

    if (modalCadastro === 'categorias') {
      criarCategoria({
        nome: novaCategoria.nome.trim(),
        tipo: novaCategoria.tipo,
        descricao: novaCategoria.descricao.trim() || undefined,
      });
      setNovaCategoria({ nome: '', tipo: 'insumo', descricao: '' });
      fecharModalCadastro();
    }
  }

  const linhas: {
    id: string;
    status: boolean | null;
    codigo: string;
    nome: string;
    onToggle?: () => void;
    onExcluir?: () => void;
  }[] = (() => {
    switch (abaAtiva) {
      case 'tiposObra':
        return tiposObra
          .filter((t) => t.nome.toLowerCase().includes(buscaNorm))
          .map((t) => ({
            id: t.id,
            status: t.ativo,
            codigo: '—',
            nome: t.nome,
            onToggle: () => toggleAtivoTipoObra(t.id),
            onExcluir: () => excluirTipoObra(t.id),
          }));
      case 'disciplinas':
        return disciplinas
          .filter(
            (d) =>
              d.nome.toLowerCase().includes(buscaNorm) ||
              d.codigo.toLowerCase().includes(buscaNorm)
          )
          .map((d) => ({
            id: d.id,
            status: d.ativa,
            codigo: d.codigo,
            nome: d.nome,
            onToggle: () => toggleAtivaDisciplina(d.id),
            onExcluir: () => excluirDisciplina(d.id),
          }));
      case 'unidades':
        return unidades
          .filter(
            (u) =>
              u.descricao.toLowerCase().includes(buscaNorm) ||
              u.simbolo.toLowerCase().includes(buscaNorm)
          )
          .map((u) => ({
            id: u.id,
            status: null,
            codigo: u.simbolo,
            nome: u.descricao,
            onExcluir: () => excluirUnidade(u.id),
          }));
      case 'regioes':
        return regioes
          .filter((r) => r.nome.toLowerCase().includes(buscaNorm))
          .map((r) => ({
            id: r.id,
            status: null,
            codigo: r.uf,
            nome: r.nome,
            onExcluir: () => excluirRegiao(r.id),
          }));
      case 'categorias':
        return categorias
          .filter((c) => c.nome.toLowerCase().includes(buscaNorm))
          .map((c) => ({
            id: c.id,
            status: null,
            codigo: c.tipo,
            nome: c.nome,
            onExcluir: () => excluirCategoria(c.id),
          }));
      case 'maoDeObra':
        return tiposMO
          .filter((t) => t.nome.toLowerCase().includes(buscaNorm))
          .map((t) => ({
            id: t.id,
            status: t.ativo,
            codigo: '—',
            nome: t.nome,
            onToggle: () => {
              maoDeObraTiposRepository.toggleAtivo(t.id, !t.ativo)
                .then(() => setTiposMO((prev) => prev.map((x) => x.id === t.id ? { ...x, ativo: !x.ativo } : x)))
                .catch(console.error);
            },
            onExcluir: () => {
              maoDeObraTiposRepository.deletar(t.id)
                .then(() => setTiposMO((prev) => prev.filter((x) => x.id !== t.id)))
                .catch(console.error);
            },
          }));
      case 'clientes':
        return clientes
          .filter(
            (c) =>
              c.razaoSocial.toLowerCase().includes(buscaNorm) ||
              c.cnpjCpf.toLowerCase().includes(buscaNorm)
          )
          .map((c) => ({
            id: c.id,
            status: c.ativo,
            codigo: c.cnpjCpf || '—',
            nome: c.razaoSocial,
            onToggle: () => {
              void toggleAtivoCliente(c.id);
            },
          }));
      default:
        return [];
    }
  })();

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho */}
      <div className="px-8 py-6 border-b border-slate-200 bg-white flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Configurações e Dicionários</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestão de dados mestres, classificações e parâmetros oficiais do sistema.
          </p>
        </div>
        <button
          onClick={handleNovoClick}
          disabled={!novoHabilitado}
          title={
            novoDirecionavel
              ? 'Abrir cadastro completo'
              : novoModalDisponivel
              ? 'Cadastro rápido na própria tela'
              : 'Cadastro desta aba ainda não disponível'
          }
          className={`flex items-center gap-2 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shadow-sm ${
            novoHabilitado
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-slate-400 cursor-not-allowed'
          }`}
        >
          <PlusCircle size={16} />
          {ROTULO_BOTAO_NOVO[abaAtiva]}
        </button>
      </div>

      {/* Corpo */}
      <div className="flex-1 p-8">
        {/* Abas */}
        <div className="flex gap-1 border-b border-slate-200 mb-6">
          {ABAS.map((aba) => (
            <button
              key={aba.id}
              onClick={() => {
                setAbaAtiva(aba.id);
                setBusca('');
              }}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                abaAtiva === aba.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {aba.rotulo}
            </button>
          ))}
        </div>

        {/* Busca */}
        <div className="mb-5 relative max-w-sm">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={PLACEHOLDER_BUSCA[abaAtiva]}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Tabela */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">
                  Status
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-28">
                  {ROTULO_COLUNA_CODIGO[abaAtiva]}
                </th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Nome
                </th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide w-36">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {linhas.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-6 py-12 text-center text-sm text-slate-400"
                  >
                    Nenhum registro encontrado.
                  </td>
                </tr>
              ) : (
                linhas.map((linha, idx) => (
                  <tr
                    key={linha.id}
                    className={idx !== linhas.length - 1 ? 'border-b border-slate-100' : ''}
                  >
                    <td className="px-6 py-3.5">
                      {linha.status !== null ? (
                        <BadgeAtivo ativo={linha.status} />
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs text-slate-500">
                      {linha.codigo}
                    </td>
                    <td className="px-6 py-3.5 text-slate-700 font-medium">{linha.nome}</td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        {abaAtiva === 'clientes' && (
                          <button
                            title="Abrir tela completa"
                            onClick={() => navigate('/clientes')}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        {linha.onToggle && (
                          <button
                            title={linha.status ? 'Inativar' : 'Ativar'}
                            onClick={linha.onToggle}
                            className={`p-1.5 rounded-lg transition-colors ${
                              linha.status
                                ? 'text-slate-400 hover:text-orange-600 hover:bg-orange-50'
                                : 'text-slate-400 hover:text-green-600 hover:bg-green-50'
                            }`}
                          >
                            <Power size={14} />
                          </button>
                        )}
                        {linha.onExcluir && (
                          <button
                            title="Excluir"
                            onClick={linha.onExcluir}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {modalCadastro && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                fecharModalCadastro();
              }
            }}
          >
            <div
              className="w-full max-w-lg rounded-xl bg-white border border-slate-200 shadow-2xl"
              role="dialog"
              aria-modal="true"
            >
              <div className="px-5 py-4 border-b border-slate-200">
                <h3 className="text-base font-semibold text-slate-800">
                  {modalCadastro === 'maoDeObra' && 'Novo Tipo de Mão de Obra'}
                  {modalCadastro === 'disciplinas' && 'Nova Disciplina'}
                  {modalCadastro === 'unidades' && 'Nova Unidade'}
                  {modalCadastro === 'regioes' && 'Nova Região'}
                  {modalCadastro === 'categorias' && 'Nova Categoria'}
                </h3>
              </div>

              <div className="p-5 space-y-4">
                {modalCadastro === 'maoDeObra' && (
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Nome do tipo</label>
                    <input
                      autoFocus
                      value={novoTipoMO}
                      onChange={(e) => setNovoTipoMO(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && salvarCadastroRapido()}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: Eletricista, Encarregado, Ajudante..."
                    />
                    {tentouSalvarModal && !novoTipoMO.trim() && (
                      <p className="mt-1 text-xs text-red-600">Informe o nome.</p>
                    )}
                    {tentouSalvarModal && erroNomeTipoMODuplicado && (
                      <p className="mt-1 text-xs text-red-600">Tipo já cadastrado.</p>
                    )}
                  </div>
                )}

                {modalCadastro === 'disciplinas' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Código</label>
                        <input
                          autoFocus
                          value={novaDisciplina.codigo}
                          onChange={(e) =>
                            setNovaDisciplina((prev) => ({ ...prev, codigo: e.target.value }))
                          }
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Ex: ELE"
                        />
                        {tentouSalvarModal && !novaDisciplina.codigo.trim() && (
                          <p className="mt-1 text-xs text-red-600">Informe o código.</p>
                        )}
                        {tentouSalvarModal && erroCodigoDisciplinaDuplicado && (
                          <p className="mt-1 text-xs text-red-600">Código já cadastrado.</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Especialidade</label>
                        <input
                          value={novaDisciplina.especialidade}
                          onChange={(e) =>
                            setNovaDisciplina((prev) => ({
                              ...prev,
                              especialidade: e.target.value,
                            }))
                          }
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Ex: eletrica"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Nome</label>
                      <input
                        value={novaDisciplina.nome}
                        onChange={(e) =>
                          setNovaDisciplina((prev) => ({ ...prev, nome: e.target.value }))
                        }
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nome da disciplina"
                      />
                        {tentouSalvarModal && !novaDisciplina.nome.trim() && (
                          <p className="mt-1 text-xs text-red-600">Informe o nome.</p>
                        )}
                        {tentouSalvarModal && erroNomeDisciplinaDuplicado && (
                          <p className="mt-1 text-xs text-red-600">Nome já cadastrado.</p>
                        )}
                    </div>
                  </>
                )}

                {modalCadastro === 'unidades' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Símbolo</label>
                        <input
                          autoFocus
                          value={novaUnidade.simbolo}
                          onChange={(e) =>
                            setNovaUnidade((prev) => ({ ...prev, simbolo: e.target.value }))
                          }
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Ex: m2"
                        />
                        {tentouSalvarModal && !novaUnidade.simbolo.trim() && (
                          <p className="mt-1 text-xs text-red-600">Informe o símbolo.</p>
                        )}
                        {tentouSalvarModal && erroSimboloUnidadeDuplicado && (
                          <p className="mt-1 text-xs text-red-600">Símbolo já cadastrado.</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Tipo</label>
                        <select
                          value={novaUnidade.tipo}
                          onChange={(e) =>
                            setNovaUnidade((prev) => ({
                              ...prev,
                              tipo: e.target.value as TipoUnidade,
                            }))
                          }
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {TIPOS_UNIDADE.map((tipo) => (
                            <option key={tipo} value={tipo}>
                              {tipo}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Descrição</label>
                      <input
                        value={novaUnidade.descricao}
                        onChange={(e) =>
                          setNovaUnidade((prev) => ({ ...prev, descricao: e.target.value }))
                        }
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Descrição da unidade"
                      />
                      {tentouSalvarModal && !novaUnidade.descricao.trim() && (
                        <p className="mt-1 text-xs text-red-600">Informe a descrição.</p>
                      )}
                    </div>
                  </>
                )}

                {modalCadastro === 'regioes' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Nome</label>
                      <input
                        autoFocus
                        value={novaRegiao.nome}
                        onChange={(e) => setNovaRegiao((prev) => ({ ...prev, nome: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nome da região"
                      />
                      {tentouSalvarModal && !novaRegiao.nome.trim() && (
                        <p className="mt-1 text-xs text-red-600">Informe o nome da região.</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">UF</label>
                      <input
                        value={novaRegiao.uf}
                        onChange={(e) => setNovaRegiao((prev) => ({ ...prev, uf: e.target.value }))}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="SP"
                        maxLength={2}
                      />
                      {tentouSalvarModal && !novaRegiao.uf.trim() && (
                        <p className="mt-1 text-xs text-red-600">Informe a UF.</p>
                      )}
                      {tentouSalvarModal && novaRegiao.uf.trim().length !== 2 && novaRegiao.uf.trim().length > 0 && (
                        <p className="mt-1 text-xs text-red-600">UF deve ter 2 letras.</p>
                      )}
                      {tentouSalvarModal && erroNomeRegiaoDuplicado && (
                        <p className="mt-1 text-xs text-red-600">Região já cadastrada para esta UF.</p>
                      )}
                    </div>
                  </div>
                )}

                {modalCadastro === 'categorias' && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Nome</label>
                        <input
                          autoFocus
                          value={novaCategoria.nome}
                          onChange={(e) =>
                            setNovaCategoria((prev) => ({ ...prev, nome: e.target.value }))
                          }
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Nome da categoria"
                        />
                        {tentouSalvarModal && !novaCategoria.nome.trim() && (
                          <p className="mt-1 text-xs text-red-600">Informe o nome da categoria.</p>
                        )}
                        {tentouSalvarModal && erroNomeCategoriaDuplicado && (
                          <p className="mt-1 text-xs text-red-600">Categoria já cadastrada.</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Tipo</label>
                        <select
                          value={novaCategoria.tipo}
                          onChange={(e) =>
                            setNovaCategoria((prev) => ({
                              ...prev,
                              tipo: e.target.value as TipoCategoria,
                            }))
                          }
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          {TIPOS_CATEGORIA.map((tipo) => (
                            <option key={tipo} value={tipo}>
                              {tipo}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Descrição (opcional)</label>
                      <textarea
                        value={novaCategoria.descricao}
                        onChange={(e) =>
                          setNovaCategoria((prev) => ({ ...prev, descricao: e.target.value }))
                        }
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  onClick={fecharModalCadastro}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={salvarCadastroRapido}
                  disabled={!modalValido}
                  className={`px-3 py-2 rounded-lg text-sm text-white ${
                    modalValido
                      ? 'bg-blue-600 hover:bg-blue-700'
                      : 'bg-slate-400 cursor-not-allowed'
                  }`}
                >
                  Salvar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
