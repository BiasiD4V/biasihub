import { Layers } from 'lucide-react';
import { PaginaPlaceholder } from '../components/ui/PaginaPlaceholder';

export function Composicoes() {
  return (
    <PaginaPlaceholder
      titulo="Composições"
      subtitulo="Biblioteca de composições de serviços com versionamento."
      icone={Layers}
      descricao="Gestão de composições e versões, com insumos, equipes, produtividade e condições de execução por disciplina."
    />
  );
}
