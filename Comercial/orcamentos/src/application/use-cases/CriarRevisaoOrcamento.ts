import type { IOrcamentoRepository } from '../ports/IOrcamentoRepository';
import type { IAuditoriaRepository } from '../ports/IAuditoriaRepository';
import type { RevisaoOrcamento, PoliticaComercialSnapshot } from '../../domain/entities/RevisaoOrcamento';
import type { ConfiguracaoBDI } from '../../domain/entities/ConfiguracaoBDI';
import type { PapelUsuario } from '../../domain/value-objects/PapelUsuario';
import { assertPermissao } from '../guards/verificarPermissao';
import { criarRegistrarEventoAuditoria } from './RegistrarEventoAuditoria';

interface Input {
  orcamentoId: string;
  bdi: ConfiguracaoBDI;
  politicaComercialSnapshot: PoliticaComercialSnapshot;
  observacoes?: string;
  usuarioId: string;
  papel: PapelUsuario;
}

export function criarCriarRevisaoOrcamento(
  orcamentoRepo: IOrcamentoRepository,
  auditoriaRepo: IAuditoriaRepository
) {
  const registrar = criarRegistrarEventoAuditoria(auditoriaRepo);

  return async function criarRevisaoOrcamento(input: Input): Promise<RevisaoOrcamento> {
    assertPermissao(input.papel, 'criar_orcamento');

    const orcamento = await orcamentoRepo.buscarPorId(input.orcamentoId);
    if (!orcamento) throw new Error(`Orçamento "${input.orcamentoId}" não encontrado.`);

    const numeroRevisao = orcamento.revisoes.length + 1;

    const revisao: RevisaoOrcamento = {
      id: crypto.randomUUID(),
      orcamentoId: input.orcamentoId,
      numeroRevisao,
      status: 'em_elaboracao',
      bdi: input.bdi,
      politicaComercialSnapshot: input.politicaComercialSnapshot,
      excecoes: [],
      observacoes: input.observacoes ?? '',
      criadaEm: new Date().toISOString(),
      criadoPor: input.usuarioId,
      aprovacoes: [],
      disciplinas: [],
    };

    orcamento.revisoes.push(revisao);
    await orcamentoRepo.salvar(orcamento);

    await registrar({
      usuarioId: input.usuarioId,
      papel: input.papel,
      acao: 'CriarRevisaoOrcamento',
      entidadeTipo: 'RevisaoOrcamento',
      entidadeId: revisao.id,
      dadosDepois: { orcamentoId: input.orcamentoId, numeroRevisao },
    });

    return revisao;
  };
}
