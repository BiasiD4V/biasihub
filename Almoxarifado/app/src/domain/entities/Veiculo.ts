export type StatusVeiculo = 'disponivel' | 'em_uso' | 'manutencao';

export interface Veiculo {
  id: string;
  placa: string;
  modelo: string;
  marca: string | null;
  ano: number | null;
  cor: string | null;
  obra_atual: string | null;
  status: StatusVeiculo;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
}
