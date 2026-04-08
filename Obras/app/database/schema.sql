-- ============================================================
-- ERP BIASI ENGENHARIA — Schema Supabase
-- Versão: 1.0 | Data: 2025
-- ============================================================

-- PERFIS DE USUÁRIOS (extends auth.users do Supabase)
CREATE TABLE IF NOT EXISTS perfis (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  email       TEXT NOT NULL,
  perfil      TEXT NOT NULL DEFAULT 'supervisor'
              CHECK (perfil IN ('admin','diretor','gerente','planejamento','supervisor','visualizador')),
  ativo       BOOLEAN NOT NULL DEFAULT true,
  avatar      TEXT,
  ultimo_acesso TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE perfis IS 'Perfis e permissões dos usuários do sistema';

-- OBRAS
CREATE TABLE IF NOT EXISTS obras (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo           TEXT NOT NULL UNIQUE,
  nome             TEXT NOT NULL,
  cliente          TEXT NOT NULL,
  contrato         TEXT,
  descricao        TEXT,
  data_inicio      DATE NOT NULL,
  data_fim_prevista DATE NOT NULL,
  data_fim_real    DATE,
  valor_contrato   NUMERIC(15,2) DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'ativa'
                   CHECK (status IN ('planejamento','ativa','suspensa','concluida','cancelada')),
  responsavel_id   UUID REFERENCES perfis(id),
  cidade           TEXT,
  estado           TEXT DEFAULT 'SP',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE obras IS 'Cadastro de obras da Biasi Engenharia';

-- VÍNCULO USUÁRIO-OBRA (quem acessa qual obra)
CREATE TABLE IF NOT EXISTS usuario_obra (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  obra_id     UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  papel       TEXT NOT NULL DEFAULT 'supervisor'
              CHECK (papel IN ('gerente','planejamento','supervisor','visualizador')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(usuario_id, obra_id)
);
COMMENT ON TABLE usuario_obra IS 'Vínculo usuário-obra com papel específico';

-- EAP (Estrutura Analítica do Projeto / WBS)
CREATE TABLE IF NOT EXISTS eap_itens (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id          UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  codigo           TEXT NOT NULL,
  descricao        TEXT NOT NULL,
  nivel            INTEGER NOT NULL DEFAULT 1,
  parent_id        UUID REFERENCES eap_itens(id),
  peso_percentual  NUMERIC(5,2) DEFAULT 0 CHECK (peso_percentual >= 0 AND peso_percentual <= 100),
  valor_orcado     NUMERIC(15,2) DEFAULT 0,
  unidade          TEXT DEFAULT '%',
  ordem            INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE eap_itens IS 'Estrutura Analítica do Projeto por obra';

-- PERÍODOS (meses de referência)
CREATE TABLE IF NOT EXISTS periodos (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id     UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  numero      INTEGER NOT NULL,
  nome        TEXT NOT NULL,
  data_inicio DATE NOT NULL,
  data_fim    DATE NOT NULL,
  tipo        TEXT DEFAULT 'mensal' CHECK (tipo IN ('semanal','quinzenal','mensal')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(obra_id, numero)
);

-- CRONOGRAMA BASELINE (input do Planejamento)
CREATE TABLE IF NOT EXISTS cronograma (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eap_item_id             UUID NOT NULL REFERENCES eap_itens(id) ON DELETE CASCADE,
  periodo_id              UUID NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
  perc_previsto_periodo   NUMERIC(5,2) DEFAULT 0,
  perc_previsto_acumulado NUMERIC(5,2) DEFAULT 0,
  criado_por              UUID REFERENCES perfis(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(eap_item_id, periodo_id)
);
COMMENT ON TABLE cronograma IS 'Baseline do cronograma — inserido pelo Planejamento';

-- MEDIÇÕES (input da Supervisão)
CREATE TABLE IF NOT EXISTS medicoes (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eap_item_id              UUID NOT NULL REFERENCES eap_itens(id) ON DELETE CASCADE,
  periodo_id               UUID NOT NULL REFERENCES periodos(id) ON DELETE CASCADE,
  perc_realizado           NUMERIC(5,2) NOT NULL DEFAULT 0
                           CHECK (perc_realizado >= 0 AND perc_realizado <= 100),
  perc_realizado_anterior  NUMERIC(5,2) DEFAULT 0,
  observacao               TEXT,
  status                   TEXT NOT NULL DEFAULT 'rascunho'
                           CHECK (status IN ('rascunho','enviado','aprovado','rejeitado')),
  enviado_por              UUID REFERENCES perfis(id),
  aprovado_por             UUID REFERENCES perfis(id),
  data_envio               TIMESTAMPTZ,
  data_aprovacao           TIMESTAMPTZ,
  motivo_rejeicao          TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(eap_item_id, periodo_id)
);
COMMENT ON TABLE medicoes IS 'Medições de % físico — inseridas pelos Supervisores';

-- DIÁRIO DE OBRA
CREATE TABLE IF NOT EXISTS diario_obra (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id              UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  data                 DATE NOT NULL,
  clima                TEXT NOT NULL CHECK (clima IN ('sol','nublado','chuva','chuva_forte')),
  temperatura_max      INTEGER,
  temperatura_min      INTEGER,
  efetivo_previsto     INTEGER DEFAULT 0,
  efetivo_presente     INTEGER DEFAULT 0,
  atividades_executadas JSONB DEFAULT '[]',
  ocorrencias          TEXT,
  fotos                JSONB DEFAULT '[]',
  criado_por           UUID REFERENCES perfis(id),
  aprovado_por         UUID REFERENCES perfis(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(obra_id, data)
);

-- TAREFAS (Kanban)
CREATE TABLE IF NOT EXISTS tarefas (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id          UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  titulo           TEXT NOT NULL,
  descricao        TEXT,
  status           TEXT NOT NULL DEFAULT 'liberado'
                   CHECK (status IN ('liberado','em_andamento','impedimento','concluido')),
  prioridade       TEXT DEFAULT 'media'
                   CHECK (prioridade IN ('baixa','media','alta','critica')),
  responsavel_id   UUID REFERENCES perfis(id),
  prazo            DATE,
  impedimento_motivo TEXT,
  criado_por       UUID REFERENCES perfis(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- IMPORTAÇÕES SIENGE (para rastreabilidade)
CREATE TABLE IF NOT EXISTS importacoes_sienge (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo          TEXT NOT NULL CHECK (tipo IN ('obras','contratos','orcamento','medicoes')),
  arquivo_nome  TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'processando' CHECK (status IN ('processando','concluido','erro')),
  registros_total INTEGER DEFAULT 0,
  registros_importados INTEGER DEFAULT 0,
  erros         JSONB DEFAULT '[]',
  importado_por UUID REFERENCES perfis(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE importacoes_sienge IS 'Log de importações de arquivos do sistema Sienge';

-- ÍNDICES
CREATE INDEX IF NOT EXISTS idx_eap_obra ON eap_itens(obra_id);
CREATE INDEX IF NOT EXISTS idx_eap_parent ON eap_itens(parent_id);
CREATE INDEX IF NOT EXISTS idx_cronograma_item ON cronograma(eap_item_id);
CREATE INDEX IF NOT EXISTS idx_cronograma_periodo ON cronograma(periodo_id);
CREATE INDEX IF NOT EXISTS idx_medicoes_item ON medicoes(eap_item_id);
CREATE INDEX IF NOT EXISTS idx_medicoes_status ON medicoes(status);
CREATE INDEX IF NOT EXISTS idx_diario_obra_data ON diario_obra(obra_id, data);
CREATE INDEX IF NOT EXISTS idx_tarefas_obra ON tarefas(obra_id);
CREATE INDEX IF NOT EXISTS idx_tarefas_status ON tarefas(status);
CREATE INDEX IF NOT EXISTS idx_usuario_obra_usuario ON usuario_obra(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuario_obra_obra ON usuario_obra(obra_id);

-- VIEWS
CREATE OR REPLACE VIEW vw_resumo_obras AS
SELECT
  o.id, o.codigo, o.nome, o.cliente, o.status,
  o.data_inicio, o.data_fim_prevista, o.valor_contrato,
  COUNT(DISTINCT uo.usuario_id) AS total_usuarios,
  COUNT(DISTINCT ei.id) AS total_itens_eap,
  COALESCE(
    SUM(m.perc_realizado * ei.peso_percentual / 100.0) FILTER (WHERE m.status = 'aprovado'), 0
  ) AS perc_fisico_realizado
FROM obras o
LEFT JOIN usuario_obra uo ON o.id = uo.obra_id
LEFT JOIN eap_itens ei ON o.id = ei.obra_id AND ei.nivel = 1
LEFT JOIN medicoes m ON ei.id = m.eap_item_id
GROUP BY o.id;

CREATE OR REPLACE VIEW vw_medicoes_pendentes AS
SELECT
  m.*,
  ei.descricao AS item_descricao,
  ei.codigo AS item_codigo,
  o.nome AS obra_nome,
  o.codigo AS obra_codigo,
  p.nome AS periodo_nome,
  per.nome AS enviado_por_nome
FROM medicoes m
JOIN eap_itens ei ON m.eap_item_id = ei.id
JOIN obras o ON ei.obra_id = o.id
JOIN periodos p ON m.periodo_id = p.id
LEFT JOIN perfis per ON m.enviado_por = per.id
WHERE m.status = 'enviado'
ORDER BY m.data_envio DESC;

-- RLS (Row Level Security)
ALTER TABLE perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE eap_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE cronograma ENABLE ROW LEVEL SECURITY;
ALTER TABLE medicoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE diario_obra ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_obra ENABLE ROW LEVEL SECURITY;

-- Admin e Diretor: acesso total
CREATE POLICY "admin_diretor_full" ON obras FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil IN ('admin','diretor') AND ativo = true));

-- Usuários vinculados: leitura
CREATE POLICY "usuario_obras_leitura" ON obras FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM usuario_obra WHERE usuario_id = auth.uid() AND obra_id = obras.id));

-- Supervisores: inserir medições nas suas obras
CREATE POLICY "supervisor_medicoes_insert" ON medicoes FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuario_obra uo
      JOIN eap_itens ei ON ei.obra_id = uo.obra_id
      WHERE uo.usuario_id = auth.uid() AND ei.id = medicoes.eap_item_id
    )
  );

-- Gerentes: aprovar medições das suas obras
CREATE POLICY "gerente_medicoes_update" ON medicoes FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuario_obra uo
      JOIN eap_itens ei ON ei.obra_id = uo.obra_id
      WHERE uo.usuario_id = auth.uid() AND uo.papel IN ('gerente','planejamento')
      AND ei.id = medicoes.eap_item_id
    )
  );

-- Perfis: cada um vê o próprio + admin vê todos
CREATE POLICY "perfil_proprio_leitura" ON perfis FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "admin_perfis_full" ON perfis FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'admin'));

-- FUNÇÃO: atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION atualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_obras_updated BEFORE UPDATE ON obras FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();
CREATE TRIGGER trg_eap_updated BEFORE UPDATE ON eap_itens FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();
CREATE TRIGGER trg_medicoes_updated BEFORE UPDATE ON medicoes FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();
CREATE TRIGGER trg_tarefas_updated BEFORE UPDATE ON tarefas FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();
CREATE TRIGGER trg_perfis_updated BEFORE UPDATE ON perfis FOR EACH ROW EXECUTE FUNCTION atualizar_updated_at();
