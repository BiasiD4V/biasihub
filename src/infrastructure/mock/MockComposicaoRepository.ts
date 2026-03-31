import type { IComposicaoRepository } from '../../application/ports/IComposicaoRepository';
import type { Composicao } from '../../domain/entities/Composicao';
import type { ComposicaoVersao } from '../../domain/entities/ComposicaoVersao';
import { mockComposicoes, mockComposicaoVersoes } from './dados/composicoes.mock';

export class MockComposicaoRepository implements IComposicaoRepository {
  private composicoes: Composicao[] = structuredClone(mockComposicoes);
  private versoes: ComposicaoVersao[] = structuredClone(mockComposicaoVersoes);

  async listar(): Promise<Composicao[]> {
    return [...this.composicoes];
  }

  async buscarPorId(id: string): Promise<Composicao | null> {
    return this.composicoes.find((c) => c.id === id) ?? null;
  }

  async buscarVersao(versaoId: string): Promise<ComposicaoVersao | null> {
    return this.versoes.find((v) => v.id === versaoId) ?? null;
  }

  async listarVersoes(composicaoId: string): Promise<ComposicaoVersao[]> {
    return this.versoes.filter((v) => v.composicaoId === composicaoId);
  }

  async salvar(composicao: Composicao): Promise<void> {
    const idx = this.composicoes.findIndex((c) => c.id === composicao.id);
    if (idx >= 0) {
      this.composicoes[idx] = composicao;
    } else {
      this.composicoes.push(composicao);
    }
  }

  async salvarVersao(versao: ComposicaoVersao): Promise<void> {
    const idx = this.versoes.findIndex((v) => v.id === versao.id);
    if (idx >= 0) {
      this.versoes[idx] = versao;
    } else {
      this.versoes.push(versao);
    }
  }
}
