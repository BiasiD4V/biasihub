import type { Template } from '../../domain/entities/Template';
import type { TemplateVersao } from '../../domain/entities/TemplateVersao';

export interface ITemplateRepository {
  listar(): Promise<Template[]>;
  buscarPorId(id: string): Promise<Template | null>;
  buscarVersao(versaoId: string): Promise<TemplateVersao | null>;
  listarVersoes(templateId: string): Promise<TemplateVersao[]>;
  salvar(template: Template): Promise<void>;
  salvarVersao(versao: TemplateVersao): Promise<void>;
}
