import type { IComposicaoRepository } from '../ports/IComposicaoRepository';
import type { IAuditoriaRepository } from '../ports/IAuditoriaRepository';
import type { PapelUsuario } from '../../domain/value-objects/PapelUsuario';
import { assertPermissao } from '../guards/verificarPermissao';
import { criarRegistrarEventoAuditoria } from './RegistrarEventoAuditoria';

interface Input {
  composicaoId: string;
  versaoId: string;
  usuarioId: string;
  papel: PapelUsuario;
}

export function criarPublicarComposicaoVersao(
  composicaoRepo: IComposicaoRepository,
  auditoriaRepo: IAuditoriaRepository
) {
  const registrar = criarRegistrarEventoAuditoria(auditoriaRepo);

  return async function publicarComposicaoVersao(input: Input): Promise<void> {
    assertPermissao(input.papel, 'publicar_composicao_versao');

    const composicao = await composicaoRepo.buscarPorId(input.composicaoId);
    if (!composicao) throw new Error(`Composição "${input.composicaoId}" não encontrada.`);

    const versao = await composicaoRepo.buscarVersao(input.versaoId);
    if (!versao) throw new Error(`Versão "${input.versaoId}" não encontrada.`);

    if (versao.status !== 'rascunho') {
      throw new Error('Apenas versões em rascunho podem ser publicadas.');
    }

    // Obsoleta a versão atual
    if (composicao.versaoAtualId && composicao.versaoAtualId !== input.versaoId) {
      const versaoAtual = await composicaoRepo.buscarVersao(composicao.versaoAtualId);
      if (versaoAtual) {
        versaoAtual.status = 'obsoleta';
        await composicaoRepo.salvarVersao(versaoAtual);
      }
    }

    versao.status = 'ativa';
    versao.publicadaEm = new Date().toISOString();
    versao.publicadaPor = input.usuarioId;
    composicao.versaoAtualId = versao.id;

    await composicaoRepo.salvarVersao(versao);
    await composicaoRepo.salvar(composicao);

    await registrar({
      usuarioId: input.usuarioId,
      papel: input.papel,
      acao: 'PublicarComposicaoVersao',
      entidadeTipo: 'ComposicaoVersao',
      entidadeId: versao.id,
      dadosDepois: { status: 'ativa', versaoId: versao.id },
    });
  };
}
