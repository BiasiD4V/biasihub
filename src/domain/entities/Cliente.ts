export type TipoCliente = 'PF' | 'PJ';

export interface Cliente {
  id: string;
  tipo: TipoCliente;
  razaoSocial: string;       // Nome legal (PJ) ou nome completo (PF)
  nomeFantasia?: string;     // Nome comercial (PJ) ou apelido (PF)
  cnpjCpf: string;           // Formatado: 00.000.000/0001-00 ou 000.000.000-00
  segmento: string;          // Ex: 'Construção Civil', 'Indústria', etc.
  contatoPrincipal?: string; // Nome da pessoa de contato
  telefone?: string;
  email?: string;
  cidade?: string;
  uf?: string;               // Sigla com 2 letras
  observacoes?: string;
  ativo: boolean;
  criadoEm: string;          // ISO datetime
}
