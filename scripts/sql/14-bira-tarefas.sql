-- =============================================================
-- 14 - BIRA (Board de tarefas - estilo Jira)
-- =============================================================

-- Tabela de tarefas (tickets)
CREATE TABLE IF NOT EXISTS bira_tarefas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo text NOT NULL,
  titulo text NOT NULL,
  descricao text,
  status text NOT NULL DEFAULT 'backlog' CHECK (status IN ('backlog', 'a_fazer', 'em_andamento', 'revisao', 'concluido')),
  prioridade text NOT NULL DEFAULT 'media' CHECK (prioridade IN ('critica', 'alta', 'media', 'baixa')),
  tipo text NOT NULL DEFAULT 'tarefa' CHECK (tipo IN ('tarefa', 'bug', 'melhoria', 'historia')),
  responsavel_id uuid REFERENCES auth.users(id),
  responsavel_nome text,
  criador_id uuid NOT NULL REFERENCES auth.users(id),
  criador_nome text NOT NULL,
  data_limite date,
  ordem int DEFAULT 0,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
);

-- Sequência para código legível (BIRA-001, BIRA-002...)
CREATE SEQUENCE IF NOT EXISTS bira_seq START 1;

-- Índices
CREATE INDEX IF NOT EXISTS idx_bira_status ON bira_tarefas(status);
CREATE INDEX IF NOT EXISTS idx_bira_responsavel ON bira_tarefas(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_bira_ordem ON bira_tarefas(status, ordem);

-- RLS
ALTER TABLE bira_tarefas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bira_select" ON bira_tarefas FOR SELECT TO authenticated USING (true);
CREATE POLICY "bira_insert" ON bira_tarefas FOR INSERT TO authenticated WITH CHECK (auth.uid() = criador_id);
CREATE POLICY "bira_update" ON bira_tarefas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "bira_delete" ON bira_tarefas FOR DELETE TO authenticated USING (auth.uid() = criador_id);

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE bira_tarefas;

NOTIFY pgrst, 'reload schema';
