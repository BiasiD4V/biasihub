import { FileText } from 'lucide-react';
import { PaginaPlaceholder } from '../components/ui/PaginaPlaceholder';

export function Templates() {
  return (
    <PaginaPlaceholder
      titulo="Templates"
      subtitulo="Estruturas reutilizáveis de orçamentos por tipologia."
      icone={FileText}
      descricao="Crie e versione templates de orçamento com hierarquia de disciplinas, etapas e ambientes pré-definidos."
    />
  );
}
