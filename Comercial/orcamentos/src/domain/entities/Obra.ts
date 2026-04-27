export interface Obra {
  id: string;
  codigo: string;
  nome: string;
  clienteId: string;
  endereco?: string;
  municipio: string;
  uf: string;
  tipologia?: string;
  ativa: boolean;
}
