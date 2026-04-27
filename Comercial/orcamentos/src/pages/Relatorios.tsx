import { BarChart2 } from 'lucide-react';
import { PaginaPlaceholder } from '../components/ui/PaginaPlaceholder';

export function Relatorios() {
  return (
    <PaginaPlaceholder
      titulo="Relatórios"
      subtitulo="Análises e exportações gerenciais."
      icone={BarChart2}
      descricao="Relatórios de produtividade, comparativos de orçamentos, análise de BDI e indicadores por disciplina e período."
    />
  );
}
