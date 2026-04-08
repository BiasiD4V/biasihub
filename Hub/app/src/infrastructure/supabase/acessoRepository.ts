import { supabase } from './client';

export interface Solicitacao {
  id: string;
  nome: string;
  email: string;
  status: 'pendente' | 'aprovado' | 'negado';
  cargo_id: string | null;
  analisado_por: string | null;
  analisado_em: string | null;
  observacao: string | null;
  criado_em: string;
  cargo?: { nome: string; papel: string } | null;
}

export interface Cargo {
  id: string;
  nome: string;
  papel: string;
  descricao: string | null;
  ativo: boolean;
  criado_em: string;
}

export interface ModuloAcesso {
  id: string;
  modulo_key: string;
  papeis: string[];
  disponivel: boolean;
  atualizado_por: string | null;
  atualizado_em: string | null;
}

export const acessoRepository = {
  async listarSolicitacoes(status?: string): Promise<Solicitacao[]> {
    let query = supabase
      .from('solicitacoes_acesso')
      .select('*, cargo:cargos(nome, papel)')
      .order('criado_em', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Erro ao listar solicitações:', error);
      return [];
    }
    return (data ?? []) as Solicitacao[];
  },

  async aprovarSolicitacao(id: string, cargoId: string, adminId: string): Promise<{ sucesso: boolean; erro?: string }> {
    // 1. Busca dados da solicitação e do cargo
    const { data: sol } = await supabase
      .from('solicitacoes_acesso')
      .select('nome, email')
      .eq('id', id)
      .single();

    const { data: cargo } = await supabase
      .from('cargos')
      .select('papel')
      .eq('id', cargoId)
      .single();

    // 2. Cria usuário no Auth via Electron bridge (service role)
    const bridge = (window as any).electronBridge;
    if (sol && cargo && bridge?.criarUsuario) {
      const res = await bridge.criarUsuario({
        email: sol.email,
        nome: sol.nome,
        papel: cargo.papel,
      });
      if (!res.sucesso) return { sucesso: false, erro: res.erro };
    }

    // 3. Marca solicitação como aprovada
    const { error } = await supabase
      .from('solicitacoes_acesso')
      .update({
        status: 'aprovado',
        cargo_id: cargoId,
        analisado_por: adminId,
        analisado_em: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) return { sucesso: false, erro: error.message };
    return { sucesso: true };
  },

  async negarSolicitacao(id: string, adminId: string, observacao?: string): Promise<{ sucesso: boolean; erro?: string }> {
    const { error } = await supabase
      .from('solicitacoes_acesso')
      .update({
        status: 'negado',
        analisado_por: adminId,
        analisado_em: new Date().toISOString(),
        observacao: observacao ?? null,
      })
      .eq('id', id);

    if (error) return { sucesso: false, erro: error.message };
    return { sucesso: true };
  },

  async contarPendentes(): Promise<number> {
    const { count, error } = await supabase
      .from('solicitacoes_acesso')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pendente');

    if (error) return 0;
    return count ?? 0;
  },

  async listarCargos(): Promise<Cargo[]> {
    const { data, error } = await supabase
      .from('cargos')
      .select('*')
      .eq('ativo', true)
      .order('nome', { ascending: true });

    if (error) {
      console.error('Erro ao listar cargos:', error);
      return [];
    }
    return (data ?? []) as Cargo[];
  },

  async listarTodosCargos(): Promise<Cargo[]> {
    const { data, error } = await supabase
      .from('cargos')
      .select('*')
      .order('nome', { ascending: true });

    if (error) {
      console.error('Erro ao listar cargos:', error);
      return [];
    }
    return (data ?? []) as Cargo[];
  },

  async criarCargo(nome: string, papel: string, descricao: string): Promise<{ sucesso: boolean; erro?: string; cargo?: Cargo }> {
    const { data, error } = await supabase
      .from('cargos')
      .insert({ nome, papel, descricao, ativo: true })
      .select()
      .single();

    if (error) return { sucesso: false, erro: error.message };
    return { sucesso: true, cargo: data as Cargo };
  },

  async desativarCargo(id: string): Promise<{ sucesso: boolean; erro?: string }> {
    const { error } = await supabase
      .from('cargos')
      .update({ ativo: false })
      .eq('id', id);

    if (error) return { sucesso: false, erro: error.message };
    return { sucesso: true };
  },

  async listarModulos(): Promise<ModuloAcesso[]> {
    const { data, error } = await supabase
      .from('modulo_acesso')
      .select('*')
      .order('modulo_key', { ascending: true });

    if (error) {
      console.error('Erro ao listar módulos:', error);
      return [];
    }
    return (data ?? []) as ModuloAcesso[];
  },

  async salvarModulo(
    moduloKey: string,
    papeis: string[],
    disponivel: boolean,
    adminId: string
  ): Promise<{ sucesso: boolean; erro?: string }> {
    const { error } = await supabase
      .from('modulo_acesso')
      .upsert(
        {
          modulo_key: moduloKey,
          papeis,
          disponivel,
          atualizado_por: adminId,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: 'modulo_key' }
      );

    if (error) return { sucesso: false, erro: error.message };
    return { sucesso: true };
  },

  async criarSolicitacao(nome: string, email: string): Promise<{ sucesso: boolean; erro?: string }> {
    const { error } = await supabase
      .from('solicitacoes_acesso')
      .insert({
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        status: 'pendente',
      });

    if (error) {
      if (error.code === '23505') {
        return { sucesso: false, erro: 'Já existe uma solicitação com este e-mail.' };
      }
      return { sucesso: false, erro: error.message };
    }
    return { sucesso: true };
  },
};
