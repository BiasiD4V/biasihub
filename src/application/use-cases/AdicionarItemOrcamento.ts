import type { IOrcamentoRepository } from '../ports/IOrcamentoRepository';
import type { IComposicaoRepository } from '../ports/IComposicaoRepository';
import type { IAuditoriaRepository } from '../ports/IAuditoriaRepository';
import type { ItemOrcamento } from '../../domain/entities/ItemOrcamento';
import type { ComposicaoSnapshot } from '../../domain/entities/ComposicaoSnapshot';
import type { TipoItem } from '../../domain/value-objects/TipoItem';
import type { PapelUsuario } from '../../domain/value-objects/PapelUsuario';
import { assertPermissao } from '../guards/verificarPermissao';
import { criarRegistrarEventoAuditoria } from './RegistrarEventoAuditoria';

interface InputBase {
  orcamentoId: string;
  revisaoId: string;
  disciplinaId: string;
  etapaId: string;
  ambienteId: string;
  tipo: TipoItem;
  quantidade: number;
  valorUnitario: number;
  ordem: number;
  usuarioId: string;
  papel: PapelUsuario;
}

interface InputComposicao extends InputBase {
  tipo: 'composicao';
  composicaoId: string;
}

interface InputAvulso extends InputBase {
  tipo: 'avulso' | 'textoLivre' | 'subtotalManual';
  descricao: string;
  unidade?: string;
}

type Input = InputComposicao | InputAvulso;

export function criarAdicionarItemOrcamento(
  orcamentoRepo: IOrcamentoRepository,
  composicaoRepo: IComposicaoRepository,
  auditoriaRepo: IAuditoriaRepository
) {
  const registrar = criarRegistrarEventoAuditoria(auditoriaRepo);

  return async function adicionarItemOrcamento(input: Input): Promise<ItemOrcamento> {
    assertPermissao(input.papel, 'editar_revisao');

    const orcamento = await orcamentoRepo.buscarPorId(input.orcamentoId);
    if (!orcamento) throw new Error(`Orçamento "${input.orcamentoId}" não encontrado.`);

    const revisao = orcamento.revisoes.find((r) => r.id === input.revisaoId);
    if (!revisao) throw new Error(`Revisão "${input.revisaoId}" não encontrada.`);

    if (revisao.status !== 'em_elaboracao') {
      throw new Error('Só é possível adicionar itens em revisões com status "Em elaboração".');
    }

    const disciplina = revisao.disciplinas.find((d) => d.id === input.disciplinaId);
    if (!disciplina) throw new Error(`Disciplina "${input.disciplinaId}" não encontrada.`);

    const etapa = disciplina.etapas.find((e) => e.id === input.etapaId);
    if (!etapa) throw new Error(`Etapa "${input.etapaId}" não encontrada.`);

    const ambiente = etapa.ambientes.find((a) => a.id === input.ambienteId);
    if (!ambiente) throw new Error(`Ambiente "${input.ambienteId}" não encontrado.`);

    let composicaoSnapshot: ComposicaoSnapshot | undefined;

    if (input.tipo === 'composicao') {
      const composicao = await composicaoRepo.buscarPorId(input.composicaoId);
      if (!composicao) throw new Error(`Composição "${input.composicaoId}" não encontrada.`);

      const versao = await composicaoRepo.buscarVersao(composicao.versaoAtualId);
      if (!versao) throw new Error('Versão ativa da composição não encontrada.');

      composicaoSnapshot = {
        composicaoId: composicao.id,
        versaoId: versao.id,
        descricao: versao.descricao,
        unidade: versao.unidade,
        insumos: versao.insumos.map((i) => ({
          insumoId: i.insumoId,
          descricao: i.insumoId,
          unidade: i.unidadeId,
          quantidade: i.quantidade,
          valorUnitario: i.valorUnitario ?? 0,
        })),
        encargos: { percentualTotal: versao.encargos.percentualTotal },
        produtividade: 0,
        condicoesExecucao: [],
        equipesExigidas: [],
        equipamentosAuxiliares: [],
        capturadaEm: new Date().toISOString(),
      };
    }

    const item: ItemOrcamento = {
      id: crypto.randomUUID(),
      ambienteId: input.ambienteId,
      tipo: input.tipo,
      composicaoSnapshot,
      descricao: input.tipo !== 'composicao' ? (input as InputAvulso).descricao : undefined,
      unidade: input.tipo !== 'composicao' ? (input as InputAvulso).unidade : undefined,
      quantidade: input.quantidade,
      valorUnitario: input.valorUnitario,
      excecoes: [],
      ordem: input.ordem,
    };

    ambiente.itens.push(item);
    await orcamentoRepo.salvar(orcamento);

    await registrar({
      usuarioId: input.usuarioId,
      papel: input.papel,
      acao: 'AdicionarItemOrcamento',
      entidadeTipo: 'ItemOrcamento',
      entidadeId: item.id,
      dadosDepois: { revisaoId: input.revisaoId, tipo: item.tipo },
    });

    return item;
  };
}
