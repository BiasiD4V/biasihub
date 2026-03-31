import type { ITemplateRepository } from '../ports/ITemplateRepository';
import type { IAuditoriaRepository } from '../ports/IAuditoriaRepository';
import type { PapelUsuario } from '../../domain/value-objects/PapelUsuario';
import { assertPermissao } from '../guards/verificarPermissao';
import { criarRegistrarEventoAuditoria } from './RegistrarEventoAuditoria';

interface Input {
  templateId: string;
  versaoId: string;
  usuarioId: string;
  papel: PapelUsuario;
}

export function criarPublicarTemplateVersao(
  templateRepo: ITemplateRepository,
  auditoriaRepo: IAuditoriaRepository
) {
  const registrar = criarRegistrarEventoAuditoria(auditoriaRepo);

  return async function publicarTemplateVersao(input: Input): Promise<void> {
    assertPermissao(input.papel, 'publicar_template_versao');

    const template = await templateRepo.buscarPorId(input.templateId);
    if (!template) throw new Error(`Template "${input.templateId}" não encontrado.`);

    const versao = await templateRepo.buscarVersao(input.versaoId);
    if (!versao) throw new Error(`Versão "${input.versaoId}" não encontrada.`);

    if (versao.status !== 'rascunho') {
      throw new Error('Apenas versões em rascunho podem ser publicadas.');
    }

    if (template.versaoAtualId && template.versaoAtualId !== input.versaoId) {
      const versaoAtual = await templateRepo.buscarVersao(template.versaoAtualId);
      if (versaoAtual) {
        versaoAtual.status = 'obsoleta';
        await templateRepo.salvarVersao(versaoAtual);
      }
    }

    versao.status = 'ativa';
    versao.publicadaEm = new Date().toISOString();
    versao.publicadaPor = input.usuarioId;
    template.versaoAtualId = versao.id;

    await templateRepo.salvarVersao(versao);
    await templateRepo.salvar(template);

    await registrar({
      usuarioId: input.usuarioId,
      papel: input.papel,
      acao: 'PublicarTemplateVersao',
      entidadeTipo: 'TemplateVersao',
      entidadeId: versao.id,
      dadosDepois: { status: 'ativa', versaoId: versao.id },
    });
  };
}
