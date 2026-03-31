import { Package } from 'lucide-react';
import { PaginaPlaceholder } from '../components/ui/PaginaPlaceholder';

export function Insumos() {
  return (
    <PaginaPlaceholder
      titulo="Insumos"
      subtitulo="Catálogo de materiais, serviços e equipamentos."
      icone={Package}
      descricao="Base de insumos com categorias, unidades de medida, cotações vinculadas e histórico de preços."
    />
  );
}
