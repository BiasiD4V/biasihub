import { useState } from 'react';
import { Search, Pencil, Power, Trash2, PlusCircle } from 'lucide-react';
import { useCadastrosMestres } from '../context/CadastrosMestresContext';

type AbaConfig = 'tiposObra' | 'disciplinas' | 'unidades' | 'regioes' | 'categorias';

const ABAS: { id: AbaConfig; rotulo: string }[] = [
  { id: 'tiposObra', rotulo: 'Tipos de Obra' },
  { id: 'disciplinas', rotulo: 'Disciplinas' },
  { id: 'unidades', rotulo: 'Unidades' },
  { id: 'regioes', rotulo: 'Regiões' },
  { id: 'categorias', rotulo: 'Categorias' },
];

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
  const {
    tiposObra,
    disciplinas,
    unidades,
    regioes,
    categorias,
    toggleAtivoTipoObra,
    toggleAtivaDisciplina,
    excluirTipoObra,
    excluirDisciplina,
    excluirUnidade,
    excluirRegiao,
    excluirCategoria,
  } = useCadastrosMestres();

  const [abaAtiva, setAbaAtiva] = useState<AbaConfig>('tiposObra');
  const [busca, setBusca] = useState('');

  const buscaNorm = busca.toLowerCase();

  const linhas: {
    id: string;
    status: boolean | null;
    codigo: string;
    nome: string;
    onToggle?: () => void;
    onExcluir: () => void;
  }[] =
    abaAtiva === 'tiposObra'
      ? tiposObra
          .filter((t) => t.nome.toLowerCase().includes(buscaNorm))
          .map((t) => ({
            id: t.id,
            status: t.ativo,
            codigo: '—',
            nome: t.nome,
            onToggle: () => toggleAtivoTipoObra(t.id),
            onExcluir: () => excluirTipoObra(t.id),
          }))
      : abaAtiva === 'disciplinas'
      ? disciplinas
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
          }))
      : abaAtiva === 'unidades'
      ? unidades
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
            onToggle: undefined,
            onExcluir: () => excluirUnidade(u.id),
          }))
      : abaAtiva === 'regioes'
      ? regioes
          .filter((r) => r.nome.toLowerCase().includes(buscaNorm))
          .map((r) => ({
            id: r.id,
            status: null,
            codigo: r.uf,
            nome: r.nome,
            onToggle: undefined,
            onExcluir: () => excluirRegiao(r.id),
          }))
      : categorias
          .filter((c) => c.nome.toLowerCase().includes(buscaNorm))
          .map((c) => ({
            id: c.id,
            status: null,
            codigo: c.tipo,
            nome: c.nome,
            onToggle: undefined,
            onExcluir: () => excluirCategoria(c.id),
          }));

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
        <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shadow-sm">
          <PlusCircle size={16} />
          Novo Tipo de Obra
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
            placeholder="Pesquisar..."
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
                  Cód / Simb.
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
                        <button
                          title="Editar"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
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
                        <button
                          title="Excluir"
                          onClick={linha.onExcluir}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
