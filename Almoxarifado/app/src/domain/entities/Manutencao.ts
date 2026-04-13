export interface Manutencao {
  id: string;
  veiculo_id: string;
  tipo: string;
  data: string;
  km: number | null;
  custo: number;
  descricao: string | null;
  oficina: string | null;
  criado_por: string | null;
  criado_em: string;
  // join
  criado_por_usuario?: { nome: string };
}
