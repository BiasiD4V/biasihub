export interface MembroEquipe {
  funcao: string;
  quantidadeHH: number;
}

export interface EquipePadrao {
  id: string;
  nome: string;
  descricao?: string;
  membros: MembroEquipe[];
}
