import type { Composicao } from '../../domain/entities/Composicao';
import type { ComposicaoVersao } from '../../domain/entities/ComposicaoVersao';

export interface IComposicaoRepository {
  listar(): Promise<Composicao[]>;
  buscarPorId(id: string): Promise<Composicao | null>;
  buscarVersao(versaoId: string): Promise<ComposicaoVersao | null>;
  listarVersoes(composicaoId: string): Promise<ComposicaoVersao[]>;
  salvar(composicao: Composicao): Promise<void>;
  salvarVersao(versao: ComposicaoVersao): Promise<void>;
}
