import { useEffect, useState } from 'react';
import { Search, Pencil, Power, Trash2, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCadastrosMestres } from '../context/CadastrosMestresContext';
import { useClientes } from '../context/ClientesContext';
import { maoDeObraTiposRepository } from '../infrastructure/supabase/maoDeObraTiposRepository';
import type { MaoDeObraTipo } from '../infrastructure/supabase/maoDeObraTiposRepository';
import {
  responsaveisComerciaisRepository,
  type ResponsavelComercial,
} from '../infrastructure/supabase/responsaveisComerciaisRepository';
import type { TipoUnidade } from '../domain/entities/Unidade';
import type { TipoCategoria } from '../domain/entities/Categoria';
import {
  type AbaConfig,
  type ModalCadastro,
  ABAS,
  ROTULO_BOTAO_NOVO,
  PLACEHOLDER_BUSCA,
  ROTULO_COLUNA_CODIGO,
  BadgeAtivo,
} from '../components/config/configTypes';
import { ConfigModalCadastro } from '../components/config/ConfigModalCadastro';

export function Configuracoes() {
  const navigate = useNavigate();
  const {
    tiposObra,
    disciplinas,
    unidades,
    regioes,
    categorias,
    criarTipoObra,
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
  const [responsaveisComerciais, setResponsaveisComerciais] = useState<ResponsavelComercial[]>([]);
  const [novoResponsavelComercial, setNovoResponsavelComercial] = useState('');

  // Carregar tipos de MO do Supabase quando a aba for ativada
  useEffect(() => {
    if (abaAtiva !== 'maoDeObra') return;
    maoDeObraTiposRepository.listarTodos()
      .then(setTiposMO)
      .catch(console.error);
  }, [abaAtiva]);

  useEffect(() => {
    if (abaAtiva !== 'responsaveisComerciais') return;
    responsaveisComerciaisRepository.listarTodos()
      .then(setResponsaveisComerciais)
      .catch(console.error);
  }, [abaAtiva]);
  const [modalCadastro, setModalCadastro] = useState<ModalCadastro>(null);
  const [novaDisciplina, setNovaDisciplina] = useState({
    codigo: '',
    nome: '',
    especialidade: 'geral',
    ativa: true,
  });
  const [novoTipoObra, setNovoTipoObra] = useState({
    nome: '',
    descricao: '',
    ativo: true,
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
    abaAtiva === 'tiposObra' ||
    abaAtiva === 'disciplinas' ||
    abaAtiva === 'responsaveisComerciais' ||
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

    if (abaAtiva === 'tiposObra') {
      setTentouSalvarModal(false);
      setModalCadastro('tiposObra');
      return;
    }

    if (abaAtiva === 'disciplinas') {
      setTentouSalvarModal(false);
      setModalCadastro('disciplinas');
      return;
    }

    if (abaAtiva === 'responsaveisComerciais') {
      setTentouSalvarModal(false);
      setModalCadastro('responsaveisComerciais');
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

  const erroNomeTipoObraDuplicado = tiposObra.some(
    (t) => t.nome.toLowerCase() === novoTipoObra.nome.trim().toLowerCase()
  );

  const erroNomeTipoMODuplicado = tiposMO.some(
    (t) => t.nome.toLowerCase() === novoTipoMO.trim().toLowerCase()
  );

  const erroNomeResponsavelComercialDuplicado = responsaveisComerciais.some(
    (r) => r.nome.toLowerCase() === novoResponsavelComercial.trim().toLowerCase()
  );

  const modalValido =
    modalCadastro === 'maoDeObra'
      ? Boolean(novoTipoMO.trim()) && !erroNomeTipoMODuplicado
      : modalCadastro === 'tiposObra'
      ? Boolean(novoTipoObra.nome.trim()) && !erroNomeTipoObraDuplicado
      : modalCadastro === 'responsaveisComerciais'
      ? Boolean(novoResponsavelComercial.trim()) && !erroNomeResponsavelComercialDuplicado
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
      ? Boolean(novaRegiao.nome.trim()) &&
        Boolean(novaRegiao.uf.trim()) &&
        novaRegiao.uf.trim().length === 2 &&
        !erroNomeRegiaoDuplicado
      : modalCadastro === 'categorias'
      ? Boolean(novaCategoria.nome.trim()) && !erroNomeCategoriaDuplicado
      : false;

  async function salvarCadastroRapido() {
    setTentouSalvarModal(true);
    if (!modalValido || !modalCadastro) return;

    try {
      if (modalCadastro === 'maoDeObra') {
        const novo = await maoDeObraTiposRepository.criar(novoTipoMO.trim());
        setTiposMO((prev) => [...prev, novo].sort((a, b) => a.nome.localeCompare(b.nome)));
        setNovoTipoMO('');
        fecharModalCadastro();
        return;
      }

      if (modalCadastro === 'disciplinas') {
        await criarDisciplina({
          codigo: novaDisciplina.codigo.trim().toUpperCase(),
          nome: novaDisciplina.nome.trim(),
          especialidade: novaDisciplina.especialidade.trim().toLowerCase() || 'geral',
          ativa: novaDisciplina.ativa,
        });
        setNovaDisciplina({ codigo: '', nome: '', especialidade: 'geral', ativa: true });
        fecharModalCadastro();
        return;
      }

      if (modalCadastro === 'tiposObra') {
        await criarTipoObra({
          nome: novoTipoObra.nome.trim(),
          descricao: novoTipoObra.descricao.trim() || undefined,
          ativo: novoTipoObra.ativo,
        });
        setNovoTipoObra({ nome: '', descricao: '', ativo: true });
        fecharModalCadastro();
        return;
      }

      if (modalCadastro === 'responsaveisComerciais') {
        const novo = await responsaveisComerciaisRepository.criar(novoResponsavelComercial.trim().toUpperCase());
        setResponsaveisComerciais((prev) => [...prev, novo].sort((a, b) => a.nome.localeCompare(b.nome)));
        setNovoResponsavelComercial('');
        fecharModalCadastro();
        return;
      }

      if (modalCadastro === 'unidades') {
        await criarUnidade({
          simbolo: novaUnidade.simbolo.trim(),
          descricao: novaUnidade.descricao.trim(),
          tipo: novaUnidade.tipo,
        });
        setNovaUnidade({ simbolo: '', descricao: '', tipo: 'unidade' });
        fecharModalCadastro();
        return;
      }

      if (modalCadastro === 'regioes') {
        await criarRegiao({
          nome: novaRegiao.nome.trim(),
          uf: novaRegiao.uf.trim().toUpperCase(),
          municipios: [],
        });
        setNovaRegiao({ nome: '', uf: '' });
        fecharModalCadastro();
        return;
      }

      if (modalCadastro === 'categorias') {
        await criarCategoria({
          nome: novaCategoria.nome.trim(),
          tipo: novaCategoria.tipo,
          descricao: novaCategoria.descricao.trim() || undefined,
        });
        setNovaCategoria({ nome: '', tipo: 'insumo', descricao: '' });
        fecharModalCadastro();
      }
    } catch (e: any) {
      console.error('Erro ao salvar cadastro mestre:', e);
      alert(`Não foi possível salvar: ${e?.message || e}`);
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
            onToggle: () => { void toggleAtivoTipoObra(t.id).catch(console.error); },
            onExcluir: () => { void excluirTipoObra(t.id).catch(console.error); },
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
            onToggle: () => { void toggleAtivaDisciplina(d.id).catch(console.error); },
            onExcluir: () => { void excluirDisciplina(d.id).catch(console.error); },
          }));
      case 'responsaveisComerciais':
        return responsaveisComerciais
          .filter((r) => r.nome.toLowerCase().includes(buscaNorm))
          .map((r) => ({
            id: r.id,
            status: r.ativo,
            codigo: '—',
            nome: r.nome,
            onToggle: () => {
              responsaveisComerciaisRepository.atualizarAtivo(r.id, !r.ativo)
                .then(() =>
                  setResponsaveisComerciais((prev) =>
                    prev.map((x) => (x.id === r.id ? { ...x, ativo: !x.ativo } : x))
                  )
                )
                .catch(console.error);
            },
            onExcluir: () => {
              responsaveisComerciaisRepository.excluir(r.id)
                .then(() => setResponsaveisComerciais((prev) => prev.filter((x) => x.id !== r.id)))
                .catch(console.error);
            },
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
            onExcluir: () => { void excluirUnidade(u.id).catch(console.error); },
          }));
      case 'regioes':
        return regioes
          .filter((r) => r.nome.toLowerCase().includes(buscaNorm))
          .map((r) => ({
            id: r.id,
            status: null,
            codigo: r.uf,
            nome: r.nome,
            onExcluir: () => { void excluirRegiao(r.id).catch(console.error); },
          }));
      case 'categorias':
        return categorias
          .filter((c) => c.nome.toLowerCase().includes(buscaNorm))
          .map((c) => ({
            id: c.id,
            status: null,
            codigo: c.tipo,
            nome: c.nome,
            onExcluir: () => { void excluirCategoria(c.id).catch(console.error); },
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

        <ConfigModalCadastro
          modalCadastro={modalCadastro}
          fecharModalCadastro={fecharModalCadastro}
          salvarCadastroRapido={salvarCadastroRapido}
          modalValido={modalValido}
          tentouSalvarModal={tentouSalvarModal}
          novoTipoObra={novoTipoObra}
          setNovoTipoObra={setNovoTipoObra}
          erroNomeTipoObraDuplicado={erroNomeTipoObraDuplicado}
          novoTipoMO={novoTipoMO}
          setNovoTipoMO={setNovoTipoMO}
          erroNomeTipoMODuplicado={erroNomeTipoMODuplicado}
          novaDisciplina={novaDisciplina}
          setNovaDisciplina={setNovaDisciplina}
          erroCodigoDisciplinaDuplicado={erroCodigoDisciplinaDuplicado}
          erroNomeDisciplinaDuplicado={erroNomeDisciplinaDuplicado}
          novoResponsavelComercial={novoResponsavelComercial}
          setNovoResponsavelComercial={setNovoResponsavelComercial}
          erroNomeResponsavelComercialDuplicado={erroNomeResponsavelComercialDuplicado}
          novaUnidade={novaUnidade}
          setNovaUnidade={setNovaUnidade}
          erroSimboloUnidadeDuplicado={erroSimboloUnidadeDuplicado}
          novaRegiao={novaRegiao}
          setNovaRegiao={setNovaRegiao}
          erroNomeRegiaoDuplicado={erroNomeRegiaoDuplicado}
          novaCategoria={novaCategoria}
          setNovaCategoria={setNovaCategoria}
          erroNomeCategoriaDuplicado={erroNomeCategoriaDuplicado}
        />
      </div>
    </div>
  );
}
