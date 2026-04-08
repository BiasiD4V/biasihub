-- Comentários em tarefas Kanban
CREATE TABLE IF NOT EXISTS tarefas_comentarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id UUID NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  autor_id UUID NOT NULL REFERENCES perfis(id),
  comentario TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Histórico de alterações em tarefas Kanban
CREATE TABLE IF NOT EXISTS tarefas_historico (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id UUID NOT NULL REFERENCES tarefas(id) ON DELETE CASCADE,
  acao TEXT NOT NULL, -- ex: status, responsavel, prioridade, comentario
  valor_anterior TEXT,
  valor_novo TEXT,
  alterado_por UUID REFERENCES perfis(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
