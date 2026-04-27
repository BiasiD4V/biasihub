import type { TipoUnidade } from '../../domain/entities/Unidade';
import type { TipoCategoria } from '../../domain/entities/Categoria';
import type { ModalCadastro } from './configTypes';
import { TIPOS_UNIDADE, TIPOS_CATEGORIA } from './configTypes';

export interface ConfigModalProps {
  modalCadastro: ModalCadastro;
  fecharModalCadastro: () => void;
  salvarCadastroRapido: () => void;
  modalValido: boolean;
  tentouSalvarModal: boolean;

  // tiposObra
  novoTipoObra: { nome: string; descricao: string; ativo: boolean };
  setNovoTipoObra: React.Dispatch<React.SetStateAction<{ nome: string; descricao: string; ativo: boolean }>>;
  erroNomeTipoObraDuplicado: boolean;

  // maoDeObra
  novoTipoMO: string;
  setNovoTipoMO: React.Dispatch<React.SetStateAction<string>>;
  erroNomeTipoMODuplicado: boolean;

  // disciplinas
  novaDisciplina: { codigo: string; nome: string; especialidade: string; ativa: boolean };
  setNovaDisciplina: React.Dispatch<React.SetStateAction<{ codigo: string; nome: string; especialidade: string; ativa: boolean }>>;
  erroCodigoDisciplinaDuplicado: boolean;
  erroNomeDisciplinaDuplicado: boolean;

  // responsaveisComerciais
  novoResponsavelComercial: string;
  setNovoResponsavelComercial: React.Dispatch<React.SetStateAction<string>>;
  erroNomeResponsavelComercialDuplicado: boolean;

  // unidades
  novaUnidade: { simbolo: string; descricao: string; tipo: TipoUnidade };
  setNovaUnidade: React.Dispatch<React.SetStateAction<{ simbolo: string; descricao: string; tipo: TipoUnidade }>>;
  erroSimboloUnidadeDuplicado: boolean;

  // regioes
  novaRegiao: { nome: string; uf: string };
  setNovaRegiao: React.Dispatch<React.SetStateAction<{ nome: string; uf: string }>>;
  erroNomeRegiaoDuplicado: boolean;

  // categorias
  novaCategoria: { nome: string; tipo: TipoCategoria; descricao: string };
  setNovaCategoria: React.Dispatch<React.SetStateAction<{ nome: string; tipo: TipoCategoria; descricao: string }>>;
  erroNomeCategoriaDuplicado: boolean;
}

export function ConfigModalCadastro({
  modalCadastro,
  fecharModalCadastro,
  salvarCadastroRapido,
  modalValido,
  tentouSalvarModal,
  novoTipoObra, setNovoTipoObra, erroNomeTipoObraDuplicado,
  novoTipoMO, setNovoTipoMO, erroNomeTipoMODuplicado,
  novaDisciplina, setNovaDisciplina, erroCodigoDisciplinaDuplicado, erroNomeDisciplinaDuplicado,
  novoResponsavelComercial, setNovoResponsavelComercial, erroNomeResponsavelComercialDuplicado,
  novaUnidade, setNovaUnidade, erroSimboloUnidadeDuplicado,
  novaRegiao, setNovaRegiao, erroNomeRegiaoDuplicado,
  novaCategoria, setNovaCategoria, erroNomeCategoriaDuplicado,
}: ConfigModalProps) {
  if (!modalCadastro) return null;

  return (
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
            {modalCadastro === 'tiposObra' && 'Novo Tipo de Obra'}
            {modalCadastro === 'maoDeObra' && 'Novo Tipo de Mão de Obra'}
            {modalCadastro === 'disciplinas' && 'Nova Disciplina'}
            {modalCadastro === 'responsaveisComerciais' && 'Novo Responsável Comercial'}
            {modalCadastro === 'unidades' && 'Nova Unidade'}
            {modalCadastro === 'regioes' && 'Nova Região'}
            {modalCadastro === 'categorias' && 'Nova Categoria'}
          </h3>
        </div>

        <div className="p-5 space-y-4">
          {modalCadastro === 'tiposObra' && (
            <>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Nome</label>
                <input
                  autoFocus
                  value={novoTipoObra.nome}
                  onChange={(e) =>
                    setNovoTipoObra((prev) => ({ ...prev, nome: e.target.value }))
                  }
                  onKeyDown={(e) => e.key === 'Enter' && salvarCadastroRapido()}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Hospitalar"
                />
                {tentouSalvarModal && !novoTipoObra.nome.trim() && (
                  <p className="mt-1 text-xs text-red-600">Informe o nome.</p>
                )}
                {tentouSalvarModal && erroNomeTipoObraDuplicado && (
                  <p className="mt-1 text-xs text-red-600">Tipo de obra já cadastrado.</p>
                )}
              </div>

              <div>
                <label className="block text-xs text-slate-500 mb-1">Descrição (opcional)</label>
                <textarea
                  value={novoTipoObra.descricao}
                  onChange={(e) =>
                    setNovoTipoObra((prev) => ({ ...prev, descricao: e.target.value }))
                  }
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Descrição rápida desse tipo de obra"
                />
              </div>
            </>
          )}

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

          {modalCadastro === 'responsaveisComerciais' && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">Nome do responsável</label>
              <input
                autoFocus
                value={novoResponsavelComercial}
                onChange={(e) => setNovoResponsavelComercial(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && salvarCadastroRapido()}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: ANTONIO"
              />
              {tentouSalvarModal && !novoResponsavelComercial.trim() && (
                <p className="mt-1 text-xs text-red-600">Informe o nome.</p>
              )}
              {tentouSalvarModal && erroNomeResponsavelComercialDuplicado && (
                <p className="mt-1 text-xs text-red-600">Responsável já cadastrado.</p>
              )}
            </div>
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
  );
}
