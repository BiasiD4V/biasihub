-- ============================================================
-- Migration 007: Tabela de configurações + fix perfil Rodrigo
-- Execute no Supabase SQL Editor
-- ============================================================

-- 1. Cria tabela de configurações genéricas (chave → JSONB)
CREATE TABLE IF NOT EXISTS public.configuracoes (
  chave        TEXT PRIMARY KEY,
  valor        JSONB NOT NULL,
  atualizado_por UUID REFERENCES public.perfis(id) ON DELETE SET NULL,
  atualizado_em  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Habilita RLS
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

-- 3. Qualquer usuário autenticado pode LER as configurações
DROP POLICY IF EXISTS "Leitura autenticados" ON public.configuracoes;
CREATE POLICY "Leitura autenticados" ON public.configuracoes
  FOR SELECT USING (auth.role() = 'authenticated');

-- 4. Apenas admin pode ESCREVER
DROP POLICY IF EXISTS "Escrita admin" ON public.configuracoes;
CREATE POLICY "Escrita admin" ON public.configuracoes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.perfis
      WHERE id = auth.uid() AND perfil = 'admin'
    )
  );

-- 5. Seed: permissões padrão (espelho do PERMISSOES_PADRAO do código)
INSERT INTO public.configuracoes (chave, valor)
VALUES ('permissoes_perfil', '{
  "admin":        ["ver_dashboard","ver_todas_obras","cadastrar_obras","ver_contratos","lancar_medicao","aprovar_medicoes","diario_obra","gestao_tarefas","ver_planejamento","editar_cronograma","ver_recursos","registrar_avancos","ver_curva_s","ver_evm","solicitar_reprogramacao","aprovar_reprogramacao","ver_relatorio","ver_financeiro","ver_previsto_realizado","ver_custos_mo","ver_curva_abc","gerenciar_usuarios","sienge_sync","ver_orcamento","editar_planejamento"],
  "diretor":      ["ver_dashboard","ver_todas_obras","cadastrar_obras","ver_contratos","lancar_medicao","aprovar_medicoes","diario_obra","gestao_tarefas","ver_planejamento","editar_cronograma","ver_recursos","ver_curva_s","ver_evm","aprovar_reprogramacao","solicitar_reprogramacao","ver_relatorio","ver_financeiro","ver_previsto_realizado","ver_curva_abc","ver_orcamento"],
  "gerente":      ["ver_dashboard","ver_todas_obras","ver_contratos","lancar_medicao","aprovar_medicoes","diario_obra","gestao_tarefas","ver_planejamento","editar_cronograma","ver_recursos","ver_curva_s","ver_evm","aprovar_reprogramacao","solicitar_reprogramacao","ver_relatorio","ver_financeiro","ver_previsto_realizado","ver_curva_abc","ver_orcamento"],
  "planejamento": ["ver_todas_obras","ver_planejamento","editar_cronograma","editar_planejamento","ver_recursos","registrar_avancos","ver_curva_s","ver_evm","solicitar_reprogramacao","ver_relatorio","ver_orcamento"],
  "supervisor":   ["ver_obras_proprias","lancar_medicao","diario_obra","gestao_tarefas","ver_planejamento","registrar_avancos","ver_curva_s","solicitar_reprogramacao","ver_orcamento"],
  "visualizador": ["ver_obras_proprias","ver_planejamento","ver_curva_s"],
  "viewer":       ["ver_obras_proprias","ver_planejamento","ver_curva_s"]
}')
ON CONFLICT (chave) DO NOTHING;

-- 6. Corrige perfil do usuário Rodrigo (viewer → supervisor, ativo)
--    Ajuste o e-mail se necessário
UPDATE public.perfis
SET
  perfil = 'supervisor',
  ativo  = true
WHERE email ILIKE '%rodrigo%'
  AND perfil IN ('viewer', 'visualizador');

-- Confirma o resultado
SELECT id, nome, email, perfil, ativo FROM public.perfis WHERE email ILIKE '%rodrigo%';
