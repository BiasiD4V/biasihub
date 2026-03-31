import { CheckSquare } from 'lucide-react';
import { PaginaPlaceholder } from '../components/ui/PaginaPlaceholder';

export function Aprovacoes() {
  return (
    <PaginaPlaceholder
      titulo="Aprovações"
      subtitulo="Fila de revisões aguardando aprovação."
      icone={CheckSquare}
      descricao="Visualize todas as revisões de orçamentos em status 'Aguardando aprovação', tome decisões e registre comentários."
    />
  );
}
