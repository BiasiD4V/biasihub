import type { ITemplateRepository } from '../../application/ports/ITemplateRepository';
import type { Template } from '../../domain/entities/Template';
import type { TemplateVersao } from '../../domain/entities/TemplateVersao';
import { mockTemplates, mockTemplateVersoes } from './dados/templates.mock';

export class MockTemplateRepository implements ITemplateRepository {
  private templates: Template[] = structuredClone(mockTemplates);
  private versoes: TemplateVersao[] = structuredClone(mockTemplateVersoes);

  async listar(): Promise<Template[]> {
    return [...this.templates];
  }

  async buscarPorId(id: string): Promise<Template | null> {
    return this.templates.find((t) => t.id === id) ?? null;
  }

  async buscarVersao(versaoId: string): Promise<TemplateVersao | null> {
    return this.versoes.find((v) => v.id === versaoId) ?? null;
  }

  async listarVersoes(templateId: string): Promise<TemplateVersao[]> {
    return this.versoes.filter((v) => v.templateId === templateId);
  }

  async salvar(template: Template): Promise<void> {
    const idx = this.templates.findIndex((t) => t.id === template.id);
    if (idx >= 0) {
      this.templates[idx] = template;
    } else {
      this.templates.push(template);
    }
  }

  async salvarVersao(versao: TemplateVersao): Promise<void> {
    const idx = this.versoes.findIndex((v) => v.id === versao.id);
    if (idx >= 0) {
      this.versoes[idx] = versao;
    } else {
      this.versoes.push(versao);
    }
  }
}
