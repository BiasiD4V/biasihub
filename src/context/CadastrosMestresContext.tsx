import { createContext, useContext, useState, type ReactNode } from 'react';
import type { TipoObra } from '../domain/entities/TipoObra';
import type { Disciplina } from '../domain/entities/Disciplina';
import type { Unidade } from '../domain/entities/Unidade';
import type { Regiao } from '../domain/entities/Regiao';
import type { Categoria } from '../domain/entities/Categoria';
import { mockTiposObra } from '../infrastructure/mock/dados/tiposObra.mock';
import { mockDisciplinas } from '../infrastructure/mock/dados/disciplinas.mock';
import { mockUnidades } from '../infrastructure/mock/dados/unidades.mock';
import { mockRegioes } from '../infrastructure/mock/dados/regioes.mock';
import { mockCategorias } from '../infrastructure/mock/dados/categorias.mock';

interface CadastrosMestresContextType {
  tiposObra: TipoObra[];
  disciplinas: Disciplina[];
  unidades: Unidade[];
  regioes: Regiao[];
  categorias: Categoria[];
  toggleAtivoTipoObra: (id: string) => void;
  toggleAtivaDisciplina: (id: string) => void;
  excluirTipoObra: (id: string) => void;
  excluirDisciplina: (id: string) => void;
  excluirUnidade: (id: string) => void;
  excluirRegiao: (id: string) => void;
  excluirCategoria: (id: string) => void;
}

const CadastrosMestresContext = createContext<CadastrosMestresContextType | null>(null);

export function CadastrosMestresProvider({ children }: { children: ReactNode }) {
  const [tiposObra, setTiposObra] = useState<TipoObra[]>(structuredClone(mockTiposObra));
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>(structuredClone(mockDisciplinas));
  const [unidades, setUnidades] = useState<Unidade[]>(structuredClone(mockUnidades));
  const [regioes, setRegioes] = useState<Regiao[]>(structuredClone(mockRegioes));
  const [categorias, setCategorias] = useState<Categoria[]>(structuredClone(mockCategorias));

  const toggleAtivoTipoObra = (id: string) =>
    setTiposObra((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ativo: !t.ativo } : t))
    );

  const toggleAtivaDisciplina = (id: string) =>
    setDisciplinas((prev) =>
      prev.map((d) => (d.id === id ? { ...d, ativa: !d.ativa } : d))
    );

  const excluirTipoObra = (id: string) =>
    setTiposObra((prev) => prev.filter((t) => t.id !== id));

  const excluirDisciplina = (id: string) =>
    setDisciplinas((prev) => prev.filter((d) => d.id !== id));

  const excluirUnidade = (id: string) =>
    setUnidades((prev) => prev.filter((u) => u.id !== id));

  const excluirRegiao = (id: string) =>
    setRegioes((prev) => prev.filter((r) => r.id !== id));

  const excluirCategoria = (id: string) =>
    setCategorias((prev) => prev.filter((c) => c.id !== id));

  return (
    <CadastrosMestresContext.Provider
      value={{
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
      }}
    >
      {children}
    </CadastrosMestresContext.Provider>
  );
}

export function useCadastrosMestres() {
  const ctx = useContext(CadastrosMestresContext);
  if (!ctx) throw new Error('useCadastrosMestres must be used within CadastrosMestresProvider');
  return ctx;
}
