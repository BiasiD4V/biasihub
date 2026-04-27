import type { TipoUnidade } from '../../domain/entities/Unidade';
import type { TipoCategoria } from '../../domain/entities/Categoria';

export type AbaConfig =
  | 'tiposObra'
  | 'disciplinas'
  | 'responsaveisComerciais'
  | 'unidades'
  | 'regioes'
  | 'categorias'
  | 'maoDeObra'
  | 'clientes';

export type ModalCadastro =
  | 'tiposObra'
  | 'disciplinas'
  | 'responsaveisComerciais'
  | 'unidades'
  | 'regioes'
  | 'categorias'
  | 'maoDeObra'
  | null;

export const ABAS: { id: AbaConfig; rotulo: string }[] = [
  { id: 'tiposObra', rotulo: 'Tipos de Obra' },
  { id: 'disciplinas', rotulo: 'Disciplinas' },
  { id: 'responsaveisComerciais', rotulo: 'Responsáveis Comerciais' },
  { id: 'unidades', rotulo: 'Unidades' },
  { id: 'regioes', rotulo: 'Regiões' },
  { id: 'categorias', rotulo: 'Categorias' },
  { id: 'maoDeObra', rotulo: 'Mão de Obra' },
  { id: 'clientes', rotulo: 'Clientes' },
];

export const ROTULO_BOTAO_NOVO: Record<AbaConfig, string> = {
  tiposObra: 'Novo Tipo de Obra',
  disciplinas: 'Nova Disciplina',
  responsaveisComerciais: 'Novo Responsável',
  unidades: 'Nova Unidade',
  regioes: 'Nova Região',
  categorias: 'Nova Categoria',
  maoDeObra: 'Novo Tipo de Mão de Obra',
  clientes: 'Novo Cliente',
};

export const PLACEHOLDER_BUSCA: Record<AbaConfig, string> = {
  tiposObra: 'Pesquisar tipo de obra...',
  disciplinas: 'Pesquisar disciplina ou código...',
  responsaveisComerciais: 'Pesquisar responsável...',
  unidades: 'Pesquisar unidade ou símbolo...',
  regioes: 'Pesquisar região ou UF...',
  categorias: 'Pesquisar categoria...',
  maoDeObra: 'Pesquisar tipo de mão de obra...',
  clientes: 'Pesquisar cliente ou CNPJ/CPF...',
};

export const ROTULO_COLUNA_CODIGO: Record<AbaConfig, string> = {
  tiposObra: 'Cód / Simb.',
  disciplinas: 'Cód / Simb.',
  responsaveisComerciais: 'Cód / Simb.',
  unidades: 'Cód / Simb.',
  regioes: 'Cód / Simb.',
  categorias: 'Tipo',
  maoDeObra: '—',
  clientes: 'CNPJ / CPF',
};

export const TIPOS_UNIDADE: TipoUnidade[] = ['unidade', 'comprimento', 'area', 'volume', 'outro'];
export const TIPOS_CATEGORIA: TipoCategoria[] = ['insumo', 'servico', 'equipamento'];

export function BadgeAtivo({ ativo }: { ativo: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
        ativo ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${ativo ? 'bg-green-500' : 'bg-slate-400'}`} />
      {ativo ? 'Ativo' : 'Inativo'}
    </span>
  );
}
