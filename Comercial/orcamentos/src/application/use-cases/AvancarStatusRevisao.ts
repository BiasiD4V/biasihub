import type { IOrcamentoRepository } from '../ports/IOrcamentoRepository';
import type { IAuditoriaRepository } from '../ports/IAuditoriaRepository';
import type { StatusRevisao } from '../../domain/value-objects/StatusRevisao';
import type { PapelUsuario } from '../../domain/value-objects/PapelUsuario';
import type { Aprovacao } from '../../domain/entities/Aprovacao';
import { validarTransicaoStatus } from '../../domain/rules/validarTransicaoStatus';
import { assertPermissao } from '../guards/verificarPermissao';
import { criarRegistrarEventoAuditoria } from './RegistrarEventoAuditoria';

const ACAO_POR_DESTINO: Record<StatusRevisao, Parameters<typeof assertPermissao>[1] | null> = {
  em_elaboracao: 'editar_revisao',
  em_revisao: 'solicitar_revisao',
  aguardando_aprovacao: 'encaminhar_aprovacao',
  aprovado: 'aprovar_revisao',
  reprovado: 'aprovar_revisao',
  proposta_emitida: 'emitir_proposta',
};

interface Input {
  orcamentoId: string;
  revisaoId: string;
  destino: StatusRevisao;
  comentario?: string;
  usuarioId: string;
  papel: PapelUsuario;
}

export function criarAvancarStatusRevisao(
  orcamentoRepo: IOrcamentoRepository,
  auditoriaRepo: IAuditoriaRepository
) {
  const registrar = criarRegistrarEventoAuditoria(auditoriaRepo);

  return async function avancarStatusRevisao(input: Input): Promise<void> {
    const orcamento = await orcamentoRepo.buscarPorId(input.orcamentoId);
    if (!orcamento) throw new Error(`Orçamento "${input.orcamentoId}" não encontrado.`);

    const revisao = orcamento.revisoes.find((r) => r.id === input.revisaoId);
    if (!revisao) throw new Error(`Revisão "${input.revisaoId}" não encontrada.`);

    const { valida, motivo } = validarTransicaoStatus(revisao.status, input.destino);
    if (!valida) throw new Error(motivo);

    const acaoNecessaria = ACAO_POR_DESTINO[input.destino];
    if (acaoNecessaria) assertPermissao(input.papel, acaoNecessaria);

    const statusAnterior = revisao.status;
    revisao.status = input.destino;

    if (input.destino === 'aprovado' || input.destino === 'reprovado') {
      const aprovacao: Aprovacao = {
        id: crypto.randomUUID(),
        entidadeTipo: 'RevisaoOrcamento',
        entidadeId: input.revisaoId,
        aprovadorId: input.usuarioId,
        papel: input.papel,
        decisao: input.destino === 'aprovado' ? 'aprovado' : 'reprovado',
        comentario: input.comentario,
        timestamp: new Date().toISOString(),
      };
      revisao.aprovacoes.push(aprovacao);
    }

    await orcamentoRepo.salvar(orcamento);

    await registrar({
      usuarioId: input.usuarioId,
      papel: input.papel,
      acao: 'AvancarStatusRevisao',
      entidadeTipo: 'RevisaoOrcamento',
      entidadeId: input.revisaoId,
      dadosAntes: { status: statusAnterior },
      dadosDepois: { status: input.destino },
    });
  };
}
