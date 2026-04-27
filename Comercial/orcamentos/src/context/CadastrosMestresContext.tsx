import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { TipoObra } from '../domain/entities/TipoObra';
import type { Disciplina } from '../domain/entities/Disciplina';
import type { Unidade } from '../domain/entities/Unidade';
import type { Regiao } from '../domain/entities/Regiao';
import type { Categoria } from '../domain/entities/Categoria';
import { cadastrosMestresRepository } from '../infrastructure/supabase/cadastrosMestresRepository';

interface CadastrosMestresContextType {
  tiposObra: TipoObra[];
  disciplinas: Disciplina[];
  unidades: Unidade[];
  regioes: Regiao[];
  categorias: Categoria[];
  criarTipoObra: (input: Omit<TipoObra, 'id'>) => Promise<void>;
  criarDisciplina: (input: Omit<Disciplina, 'id'>) => Promise<void>;
  criarUnidade: (input: Omit<Unidade, 'id'>) => Promise<void>;
  criarRegiao: (input: Omit<Regiao, 'id'>) => Promise<void>;
  criarCategoria: (input: Omit<Categoria, 'id'>) => Promise<void>;
  toggleAtivoTipoObra: (id: string) => Promise<void>;
  toggleAtivaDisciplina: (id: string) => Promise<void>;
  excluirTipoObra: (id: string) => Promise<void>;
  excluirDisciplina: (id: string) => Promise<void>;
  excluirUnidade: (id: string) => Promise<void>;
  excluirRegiao: (id: string) => Promise<void>;
  excluirCategoria: (id: string) => Promise<void>;
}

const CadastrosMestresContext = createContext<CadastrosMestresContextType | null>(null);

export function CadastrosMestresProvider({ children }: { children: ReactNode }) {
  const [tiposObra, setTiposObra] = useState<TipoObra[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [regioes, setRegioes] = useState<Regiao[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  const carregar = useCallback(async () => {
    const [tipos, discs, unids, regs, cats] = await Promise.all([
      cadastrosMestresRepository.listarTiposObra(),
      cadastrosMestresRepository.listarDisciplinas(),
      cadastrosMestresRepository.listarUnidades(),
      cadastrosMestresRepository.listarRegioes(),
      cadastrosMestresRepository.listarCategorias(),
    ]);

    setTiposObra(tipos);
    setDisciplinas(discs);
    setUnidades(unids);
    setRegioes(regs);
    setCategorias(cats);
  }, []);

  useEffect(() => {
    carregar().catch((error) => {
      console.error('Erro ao carregar cadastros mestres do Supabase:', error);
    });
  }, [carregar]);

  const criarDisciplina = async (input: Omit<Disciplina, 'id'>) => {
    const criada = await cadastrosMestresRepository.criarDisciplina(input);
    setDisciplinas((prev) => [...prev, criada]);
  };

  const criarTipoObra = async (input: Omit<TipoObra, 'id'>) => {
    const criada = await cadastrosMestresRepository.criarTipoObra(input);
    setTiposObra((prev) => [...prev, criada]);
  };

  const criarUnidade = async (input: Omit<Unidade, 'id'>) => {
    const criada = await cadastrosMestresRepository.criarUnidade(input);
    setUnidades((prev) => [...prev, criada]);
  };

  const criarRegiao = async (input: Omit<Regiao, 'id'>) => {
    const criada = await cadastrosMestresRepository.criarRegiao(input);
    setRegioes((prev) => [...prev, criada]);
  };

  const criarCategoria = async (input: Omit<Categoria, 'id'>) => {
    const criada = await cadastrosMestresRepository.criarCategoria(input);
    setCategorias((prev) => [...prev, criada]);
  };

  const toggleAtivoTipoObra = async (id: string) => {
    const alvo = tiposObra.find((t) => t.id === id);
    if (!alvo) return;
    const proximoAtivo = !alvo.ativo;
    await cadastrosMestresRepository.atualizarTipoObraAtivo(id, proximoAtivo);
    setTiposObra((prev) => prev.map((t) => (t.id === id ? { ...t, ativo: proximoAtivo } : t)));
  };

  const toggleAtivaDisciplina = async (id: string) => {
    const alvo = disciplinas.find((d) => d.id === id);
    if (!alvo) return;
    const proximaAtiva = !alvo.ativa;
    await cadastrosMestresRepository.atualizarDisciplinaAtiva(id, proximaAtiva);
    setDisciplinas((prev) => prev.map((d) => (d.id === id ? { ...d, ativa: proximaAtiva } : d)));
  };

  const excluirTipoObra = async (id: string) => {
    await cadastrosMestresRepository.excluirTipoObra(id);
    setTiposObra((prev) => prev.filter((t) => t.id !== id));
  };

  const excluirDisciplina = async (id: string) => {
    await cadastrosMestresRepository.excluirDisciplina(id);
    setDisciplinas((prev) => prev.filter((d) => d.id !== id));
  };

  const excluirUnidade = async (id: string) => {
    await cadastrosMestresRepository.excluirUnidade(id);
    setUnidades((prev) => prev.filter((u) => u.id !== id));
  };

  const excluirRegiao = async (id: string) => {
    await cadastrosMestresRepository.excluirRegiao(id);
    setRegioes((prev) => prev.filter((r) => r.id !== id));
  };

  const excluirCategoria = async (id: string) => {
    await cadastrosMestresRepository.excluirCategoria(id);
    setCategorias((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <CadastrosMestresContext.Provider
      value={{
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
