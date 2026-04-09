-- =============================================================
-- 18 - BIRA V2 (Nativo e Independente)
-- =============================================================

-- Tabela de tarefas principal
CREATE TABLE IF NOT EXISTS bira_tarefas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo text NOT NULL UNIQUE,
  titulo text NOT NULL,
  descricao text,
  status text NOT NULL DEFAULT 'ideia' 
    CHECK (status IN ('ideia', 'a_fazer', 'em_andamento', 'em_analise', 'concluido')),
  prioridade text NOT NULL DEFAULT 'Medium' 
    CHECK (prioridade IN ('Highest', 'High', 'Medium', 'Low', 'Lowest')),
  tipo text NOT NULL DEFAULT 'tarefa' 
    CHECK (tipo IN ('epic', 'feature', 'tarefa', 'historia', 'bug', 'recurso', 'subtask')),
  responsavel_id uuid REFERENCES auth.users(id),
  responsavel_nome text,
  criador_id uuid REFERENCES auth.users(id),
  criador_nome text,
  parent_id uuid REFERENCES bira_tarefas(id) ON DELETE CASCADE,
  data_inicio date,
  data_limite date,
  etiquetas text[] DEFAULT '{}',
  ordem int DEFAULT 0,
  criado_em timestamptz DEFAULT now(),
  atualizado_em timestamptz DEFAULT now()
 );

-- Tabela de comentários
CREATE TABLE IF NOT EXISTS bira_comentarios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tarefa_id uuid NOT NULL REFERENCES bira_tarefas(id) ON DELETE CASCADE,
  autor_id uuid REFERENCES auth.users(id),
  autor_nome text NOT NULL,
  autor_avatar text,
  corpo text NOT NULL,
  criado_em timestamptz DEFAULT now()
);

-- Sequência para códigos BIRA-001...
CREATE SEQUENCE IF NOT EXISTS bira_codigo_seq START 1;

-- Função para gerar o código automático (BIRA-001)
CREATE OR REPLACE FUNCTION generate_bira_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.codigo IS NULL OR NEW.codigo = '' THEN
    NEW.codigo := 'BIRA-' || LPAD(nextval('bira_codigo_seq')::text, 3, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_bira_code
BEFORE INSERT ON bira_tarefas
FOR EACH ROW EXECUTE FUNCTION generate_bira_code();

-- Habilitar RLS
ALTER TABLE bira_tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE bira_comentarios ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (Simplificadas para ambiente BiasiHub)
CREATE POLICY "bira_tarefas_permissoes" ON bira_tarefas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "bira_comentarios_permissoes" ON bira_comentarios FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE bira_tarefas;
ALTER PUBLICATION supabase_realtime ADD TABLE bira_comentarios;

-- Triggers de timestamp
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_bira_timestamp
BEFORE UPDATE ON bira_tarefas
FOR EACH ROW EXECUTE FUNCTION update_timestamp();
