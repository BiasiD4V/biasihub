import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { Cliente } from '../domain/entities/Cliente';
import { clientesRepository, type ClienteSupabase } from '../infrastructure/supabase/clientesRepository';

export type CriarClienteInput = Omit<Cliente, 'id' | 'criadoEm'>;
export type EditarClienteInput = Partial<Omit<Cliente, 'id' | 'criadoEm'>>;

interface ClientesContextType {
  clientes: Cliente[];
  criarCliente: (input: CriarClienteInput) => Promise<string>;
  editarCliente: (id: string, input: EditarClienteInput) => Promise<void>;
  toggleAtivoCliente: (id: string) => Promise<void>;
  buscarCliente: (id: string) => Cliente | null;
  buscarPorTermo: (termo: string) => Promise<Cliente[]>;
  carregando: boolean;
  erro: string | null;
}

const ClientesContext = createContext<ClientesContextType | null>(null);

// Mapear dados do Supabase para o tipo local
function mapearClienteSupabase(cli: ClienteSupabase): Cliente {
  const tipoPessoa = cli.tipo_pessoa?.toLowerCase();
  const tipo: 'PF' | 'PJ' = tipoPessoa === 'física' || tipoPessoa === 'fisica' ? 'PF' : 'PJ';

  const segmentoMap: Record<string, string> = {
    privado: 'Privado',
    publico: 'Público',
    construtora: 'Construção Civil',
    industria: 'Indústria',
    prefeitura: 'Público',
    predial: 'Predial',
    comercio: 'Comércio',
    residencial: 'Residencial',
  };

  return {
    id: cli.id,
    tipo,
    razaoSocial: cli.nome,
    nomeFantasia: cli.nome_fantasia || undefined,
    cnpjCpf: cli.cnpj_cpf || '',
    segmento: segmentoMap[cli.tipo || ''] || 'Outro',
    contatoPrincipal: cli.contato_nome || undefined,
    telefone: cli.contato_telefone || undefined,
    email: cli.contato_email || undefined,
    cidade: cli.cidade || undefined,
    uf: cli.estado || undefined,
    ativo: cli.ativo,
    criadoEm: cli.criado_em,
  };
}

export function ClientesProvider({ children }: { children: ReactNode }) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Carregar clientes do Supabase na montagem
  useEffect(() => {
    async function carregarClientes() {
      try {
        setCarregando(true);
        setErro(null);
        const dados = await clientesRepository.listarTodos();
        const clientesMapeados = dados.map(mapearClienteSupabase);
        setClientes(clientesMapeados);
      } catch (err) {
        const mensagem = err instanceof Error ? err.message : 'Erro ao carregar clientes';
        setErro(mensagem);
        console.error('Erro ao carregar clientes:', err);
      } finally {
        setCarregando(false);
      }
    }

    carregarClientes();
  }, []);

  async function criarCliente(input: CriarClienteInput): Promise<string> {
    try {
      setErro(null);
      const segmentoMap: Record<string, string> = {
        'Privado': 'privado',
        'Público': 'publico',
        'Construção Civil': 'construtora',
        'Indústria': 'industria',
        'Predial': 'predial',
        'Comércio': 'comercio',
        'Residencial': 'residencial',
        'Outro': 'outro',
      };
      const novoCliente = await clientesRepository.criar({
        nome: input.razaoSocial,
        nome_fantasia: input.nomeFantasia || null,
        cnpj_cpf: input.cnpjCpf || null,
        tipo_pessoa: input.tipo === 'PF' ? 'Física' : 'Jurídica',
        tipo: segmentoMap[input.segmento] || input.segmento || null,
        cidade: input.cidade || null,
        estado: input.uf || null,
        contato_nome: input.contatoPrincipal || null,
        contato_email: input.email || null,
        contato_telefone: input.telefone || null,
        ativo: input.ativo,
      });
      const mapeado = mapearClienteSupabase(novoCliente);
      setClientes((prev) => [mapeado, ...prev]);
      return novoCliente.id;
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : 'Erro ao criar cliente';
      setErro(mensagem);
      console.error('Erro ao criar cliente:', err);
      throw err;
    }
  }

  async function editarCliente(id: string, input: EditarClienteInput): Promise<void> {
    try {
      setErro(null);
      const segmentoMap: Record<string, string> = {
        'Privado': 'privado',
        'Público': 'publico',
        'Construção Civil': 'construtora',
        'Indústria': 'industria',
        'Predial': 'predial',
        'Comércio': 'comercio',
        'Residencial': 'residencial',
        'Outro': 'outro',
      };
      const clienteAtualizado = await clientesRepository.atualizar(id, {
        nome: input.razaoSocial,
        nome_fantasia: input.nomeFantasia || null,
        cnpj_cpf: input.cnpjCpf || null,
        tipo_pessoa: input.tipo === 'PF' ? 'Física' : input.tipo === 'PJ' ? 'Jurídica' : null,
        tipo: input.segmento ? (segmentoMap[input.segmento] || input.segmento) : null,
        cidade: input.cidade || null,
        estado: input.uf || null,
        contato_nome: input.contatoPrincipal || null,
        contato_email: input.email || null,
        contato_telefone: input.telefone || null,
        ativo: input.ativo,
      });
      const mapeado = mapearClienteSupabase(clienteAtualizado);
      setClientes((prev) =>
        prev.map((c) => (c.id === id ? mapeado : c))
      );
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : 'Erro ao editar cliente';
      setErro(mensagem);
      console.error('Erro ao editar cliente:', err);
      throw err;
    }
  }

  async function toggleAtivoCliente(id: string): Promise<void> {
    const cliente = clientes.find((c) => c.id === id);
    if (!cliente) throw new Error('Cliente não encontrado');
    await editarCliente(id, { ativo: !cliente.ativo });
  }

  function buscarCliente(id: string): Cliente | null {
    return clientes.find((c) => c.id === id) ?? null;
  }

  async function buscarPorTermo(termo: string): Promise<Cliente[]> {
    try {
      setErro(null);
      const dados = await clientesRepository.buscar(termo);
      return dados.map(mapearClienteSupabase);
    } catch (err) {
      const mensagem = err instanceof Error ? err.message : 'Erro ao buscar clientes';
      setErro(mensagem);
      console.error('Erro ao buscar clientes:', err);
      return [];
    }
  }

  return (
    <ClientesContext.Provider
      value={{
        clientes,
        criarCliente,
        editarCliente,
        toggleAtivoCliente,
        buscarCliente,
        buscarPorTermo,
        carregando,
        erro,
      }}
    >
      {children}
    </ClientesContext.Provider>
  );
}

export function useClientes() {
  const ctx = useContext(ClientesContext);
  if (!ctx) throw new Error('useClientes must be used within ClientesProvider');
  return ctx;
}
