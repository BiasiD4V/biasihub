import type { IDemandaRepository } from '../ports/IDemandaRepository';
import type { IAuditoriaRepository } from '../ports/IAuditoriaRepository';
import type { DemandaOrcamento, PrioridadeDemanda } from '../../domain/entities/DemandaOrcamento';
import type { PapelUsuario } from '../../domain/value-objects/PapelUsuario';
import { assertPermissao } from '../guards/verificarPermissao';
import { criarRegistrarEventoAuditoria } from './RegistrarEventoAuditoria';

interface Input {
  titulo: string;
  clienteId: string;
  descricao: string;
  escopo?: string;
  tiposObraIds: string[];
  regiaoId: string;
  obraId?: string;
  prazoResposta?: string;
  solicitadaPor: string;
  prioridade: PrioridadeDemanda;
  usuarioId: string;
  papel: PapelUsuario;
}

export function criarCriarDemandaOrcamento(
  demandaRepo: IDemandaRepository,
  auditoriaRepo: IAuditoriaRepository
) {
  const registrar = criarRegistrarEventoAuditoria(auditoriaRepo);

  return async function criarDemandaOrcamento(input: Input): Promise<DemandaOrcamento> {
    assertPermissao(input.papel, 'criar_demanda');

    const demanda: DemandaOrcamento = {
      id: crypto.randomUUID(),
      codigo: `DEM-${Date.now()}`,
      titulo: input.titulo,
      clienteId: input.clienteId,
      descricao: input.descricao,
      escopo: input.escopo,
      tiposObraIds: input.tiposObraIds,
      regiaoId: input.regiaoId,
      obraId: input.obraId,
      prazoResposta: input.prazoResposta,
      solicitadaPor: input.solicitadaPor,
      prioridade: input.prioridade,
      criadaEm: new Date().toISOString(),
      criadoPor: input.usuarioId,
    };

    await demandaRepo.salvar(demanda);
    await registrar({
      usuarioId: input.usuarioId,
      papel: input.papel,
      acao: 'CriarDemandaOrcamento',
      entidadeTipo: 'DemandaOrcamento',
      entidadeId: demanda.id,
      dadosDepois: demanda as unknown as Record<string, unknown>,
    });

    return demanda;
  };
}
