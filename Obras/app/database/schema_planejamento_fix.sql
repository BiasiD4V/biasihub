-- ============================================================================
-- SCHEMA PLANEJAMENTO: Módulo de Planejamento e Controle de Obras (PCO)
-- Metodologia: Aldo Dorea
-- ============================================================================

-- 1. TABELA: obra_planejamentos (Metadados de versão + aprovação)
-- ============================================================================
CREATE TABLE IF NOT EXISTS obra_planejamentos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id             UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  versao              INTEGER NOT NULL DEFAULT 1,
  data_base_assinada  TIMESTAMPTZ,
  criado_por          UUID REFERENCES perfis(id),
  aprovado_por        UUID REFERENCES perfis(id),
  data_aprovacao      TIMESTAMPTZ,
  status              TEXT CHECK (status IN ('rascunho', 'em_revisao', 'aprovado', 'supercedido')) DEFAULT 'rascunho',
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (obra_id, versao)
);

CREATE INDEX idx_obra_planejamentos_obra_id ON obra_planejamentos(obra_id);
CREATE INDEX idx_obra_planejamentos_versao ON obra_planejamentos(obra_id, versao DESC);
CREATE INDEX idx_obra_planejamentos_status ON obra_planejamentos(status);

-- 2. TABELA: planejamento_eap (Estrutura Analítica do Projeto - WBS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS planejamento_eap (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planejamento_id     UUID NOT NULL REFERENCES obra_planejamentos(id) ON DELETE CASCADE,
  codigo              TEXT NOT NULL,
  nome                TEXT NOT NULL,
  descricao           TEXT,
  nivel               INTEGER NOT NULL CHECK (nivel BETWEEN 1 AND 4),
  parent_id           UUID REFERENCES planejamento_eap(id) ON DELETE CASCADE,
  hierarquia          TEXT,
  peso_percentual     NUMERIC(5,2) CHECK (peso_percentual >= 0 AND peso_percentual <= 100),
  valor_orcado        NUMERIC(15,2) DEFAULT 0,
  valor_contratado    NUMERIC(15,2) DEFAULT 0,
  ordem               INTEGER DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (planejamento_id, codigo)
);

CREATE INDEX idx_planejamento_eap_planejamento_id ON planejamento_eap(planejamento_id);
CREATE INDEX idx_planejamento_eap_parent_id ON planejamento_eap(planejamento_id, parent_id);
CREATE INDEX idx_planejamento_eap_nivel ON planejamento_eap(planejamento_id, nivel);
CREATE INDEX idx_planejamento_eap_hierarquia ON planejamento_eap(planejamento_id, hierarquia);

-- 3. TABELA: planejamento_atividades (Atividades detalhadas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS planejamento_atividades (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eap_item_id         UUID NOT NULL REFERENCES planejamento_eap(id) ON DELETE CASCADE,
  planejamento_id     UUID NOT NULL REFERENCES obra_planejamentos(id) ON DELETE CASCADE,
  nome                TEXT NOT NULL,
  descricao           TEXT,
  duracao_dias        INTEGER NOT NULL CHECK (duracao_dias > 0),
  data_inicio         DATE NOT NULL,
  data_fim            DATE NOT NULL,
  predecessores_json  JSONB DEFAULT '[]',
  recursos_json       JSONB DEFAULT '{}',
  criterio_medicao    TEXT,
  status              TEXT CHECK (status IN ('nao_iniciada', 'em_andamento', 'concluida', 'suspensa')) DEFAULT 'nao_iniciada',
  peso_realizado_perc NUMERIC(5,2) DEFAULT 0 CHECK (peso_realizado_perc >= 0 AND peso_realizado_perc <= 100),
  data_inicio_real    DATE,
  data_fim_real       DATE,
  ordem               INTEGER DEFAULT 0,
  criado_por          UUID REFERENCES perfis(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT data_fim_after_inicio CHECK (data_fim >= data_inicio)
);

CREATE INDEX idx_planejamento_atividades_eap_item_id ON planejamento_atividades(eap_item_id);
CREATE INDEX idx_planejamento_atividades_planejamento_id ON planejamento_atividades(planejamento_id);
CREATE INDEX idx_planejamento_atividades_status ON planejamento_atividades(planejamento_id, status);
CREATE INDEX idx_planejamento_atividades_data_inicio ON planejamento_atividades(data_inicio, data_fim);

-- 4. TABELA: avancos_fisicos (Apontamento semanal de progresso)
-- ============================================================================
CREATE TABLE IF NOT EXISTS avancos_fisicos (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  atividade_id            UUID NOT NULL REFERENCES planejamento_atividades(id) ON DELETE CASCADE,
  planejamento_id         UUID NOT NULL REFERENCES obra_planejamentos(id) ON DELETE CASCADE,
  data_ref                DATE NOT NULL,
  peso_realizado_perc     NUMERIC(5,2) NOT NULL CHECK (peso_realizado_perc >= 0 AND peso_realizado_perc <= 100),
  peso_realizado_anterior NUMERIC(5,2) DEFAULT 0,
  observacoes             TEXT,
  registrado_por          UUID NOT NULL REFERENCES perfis(id),
  data_registro           TIMESTAMPTZ DEFAULT NOW(),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (atividade_id, data_ref),
  CONSTRAINT progresso_monotono CHECK (peso_realizado_perc >= peso_realizado_anterior)
);

CREATE INDEX idx_avancos_fisicos_atividade_id ON avancos_fisicos(atividade_id);
CREATE INDEX idx_avancos_fisicos_planejamento_id ON avancos_fisicos(planejamento_id);
CREATE INDEX idx_avancos_fisicos_data_ref ON avancos_fisicos(planejamento_id, data_ref DESC);
CREATE INDEX idx_avancos_fisicos_registrado_por ON avancos_fisicos(registrado_por);

-- 5. TABELA: reprogramacoes (Ajustes no cronograma)
-- ============================================================================
CREATE TABLE IF NOT EXISTS reprogramacoes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planejamento_id     UUID NOT NULL REFERENCES obra_planejamentos(id) ON DELETE CASCADE,
  atividade_id        UUID NOT NULL REFERENCES planejamento_atividades(id) ON DELETE CASCADE,
  data_original       DATE NOT NULL,
  data_nova           DATE NOT NULL,
  motivo              TEXT NOT NULL,
  justificativa       TEXT,
  solicitado_por      UUID NOT NULL REFERENCES perfis(id),
  status              TEXT CHECK (status IN ('pendente', 'aprovada', 'rejeitada', 'cancelada')) DEFAULT 'pendente',
  aprovado_por        UUID REFERENCES perfis(id),
  motivo_rejeicao     TEXT,
  data_solicitacao    TIMESTAMPTZ DEFAULT NOW(),
  data_aprovacao      TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT data_nova_valida CHECK (data_nova > data_original),
  UNIQUE (planejamento_id, atividade_id, data_original)
);

CREATE INDEX idx_reprogramacoes_planejamento_id ON reprogramacoes(planejamento_id);
CREATE INDEX idx_reprogramacoes_atividade_id ON reprogramacoes(atividade_id);
CREATE INDEX idx_reprogramacoes_status ON reprogramacoes(planejamento_id, status);
CREATE INDEX idx_reprogramacoes_solicitado_por ON reprogramacoes(solicitado_por);

-- 6. TABELA: evm_snapshots (Baseline EVM semanal/mensal)
-- ============================================================================
CREATE TABLE IF NOT EXISTS evm_snapshots (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planejamento_id     UUID NOT NULL REFERENCES obra_planejamentos(id) ON DELETE CASCADE,
  semana_ref          DATE NOT NULL,
  periodo             TEXT CHECK (periodo IN ('semanal', 'mensal')) DEFAULT 'semanal',
  vp                  NUMERIC(15,2) NOT NULL,
  va                  NUMERIC(15,2) NOT NULL,
  cr                  NUMERIC(15,2) NOT NULL,
  idc                 NUMERIC(5,4),
  idp                 NUMERIC(5,4),
  desvio_custo        NUMERIC(15,2) GENERATED ALWAYS AS (va - cr) STORED,
  desvio_prazo        NUMERIC(15,2) GENERATED ALWAYS AS (va - vp) STORED,
  eac                 NUMERIC(15,2),
  descargos           JSONB DEFAULT '{}',
  observacoes         TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (planejamento_id, semana_ref, periodo)
);

CREATE INDEX idx_evm_snapshots_planejamento_id ON evm_snapshots(planejamento_id);
CREATE INDEX idx_evm_snapshots_semana_ref ON evm_snapshots(planejamento_id, semana_ref DESC);
CREATE INDEX idx_evm_snapshots_periodo ON evm_snapshots(planejamento_id, periodo);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION atualizar_updated_at_planejamento()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_updated_at_obra_planejamentos
  BEFORE UPDATE ON obra_planejamentos
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_updated_at_planejamento();

CREATE TRIGGER trigger_updated_at_planejamento_eap
  BEFORE UPDATE ON planejamento_eap
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_updated_at_planejamento();

CREATE TRIGGER trigger_updated_at_planejamento_atividades
  BEFORE UPDATE ON planejamento_atividades
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_updated_at_planejamento();

CREATE TRIGGER trigger_updated_at_avancos_fisicos
  BEFORE UPDATE ON avancos_fisicos
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_updated_at_planejamento();

CREATE TRIGGER trigger_updated_at_reprogramacoes
  BEFORE UPDATE ON reprogramacoes
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_updated_at_planejamento();

CREATE TRIGGER trigger_updated_at_evm_snapshots
  BEFORE UPDATE ON evm_snapshots
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_updated_at_planejamento();

-- Trigger: Agregar peso realizado na atividade quando apontamento é registrado
CREATE OR REPLACE FUNCTION atualizar_peso_atividade_ao_apontamento()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE planejamento_atividades
  SET peso_realizado_perc = NEW.peso_realizado_perc,
      updated_at = NOW()
  WHERE id = NEW.atividade_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_atualizar_peso_atividade
  AFTER INSERT OR UPDATE ON avancos_fisicos
  FOR EACH ROW
  EXECUTE FUNCTION atualizar_peso_atividade_ao_apontamento();

-- Trigger: Validar que data_nova em reprogramação está após predecessores
CREATE OR REPLACE FUNCTION validar_reprogramacao()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.data_nova = OLD.data_original THEN
    RAISE EXCEPTION 'Nova data deve ser diferente da data original';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_validar_reprogramacao
  BEFORE INSERT OR UPDATE ON reprogramacoes
  FOR EACH ROW
  EXECUTE FUNCTION validar_reprogramacao();

-- ============================================================================
-- VIEWS
-- ============================================================================

CREATE OR REPLACE VIEW vw_eap_completo AS
SELECT
  e.id,
  e.planejamento_id,
  e.codigo,
  e.nome,
  e.descricao,
  e.nivel,
  e.parent_id,
  e.hierarquia,
  e.peso_percentual,
  e.valor_orcado,
  e.valor_contratado,
  e.ordem,
  COALESCE(
    MAX(a.peso_realizado_perc) FILTER (WHERE a.status = 'concluida'),
    AVG(a.peso_realizado_perc) FILTER (WHERE a.status IN ('em_andamento', 'concluida')),
    0
  ) AS peso_realizado_agregado,
  COUNT(a.id) FILTER (WHERE a.status = 'em_andamento') AS atividades_em_andamento,
  COUNT(a.id) AS total_atividades,
  MAX(COALESCE(a.data_fim_real, a.data_fim)) AS data_fim_latest,
  e.created_at,
  e.updated_at
FROM planejamento_eap e
LEFT JOIN planejamento_atividades a ON e.id = a.eap_item_id
GROUP BY e.id, e.planejamento_id, e.codigo, e.nome, e.descricao, e.nivel, e.parent_id,
         e.hierarquia, e.peso_percentual, e.valor_orcado, e.valor_contratado, e.ordem,
         e.created_at, e.updated_at;

-- View: Atividades críticas (caminho crítico)
CREATE OR REPLACE VIEW vw_atividades_criticas AS
WITH atividades_com_folga AS (
  SELECT
    pa.id,
    pa.planejamento_id,
    pa.nome,
    pa.data_inicio,
    pa.data_fim,
    pa.duracao_dias,
    pa.predecessores_json,
    COALESCE(
      MAX(DATE_PART('day', pap_pred.data_fim)::INTEGER),
      DATE_PART('day', pa.data_inicio)::INTEGER
    ) AS early_start,
    COALESCE(
      MAX(DATE_PART('day', pap_pred.data_fim)::INTEGER),
      DATE_PART('day', pa.data_inicio)::INTEGER
    ) + pa.duracao_dias AS early_finish
  FROM planejamento_atividades pa
  LEFT JOIN LATERAL jsonb_array_elements(pa.predecessores_json) AS pred ON true
  LEFT JOIN planejamento_atividades pap_pred ON pap_pred.id = (pred->>'id')::UUID
  GROUP BY pa.id, pa.planejamento_id, pa.nome, pa.data_inicio, pa.data_fim,
           pa.duracao_dias, pa.predecessores_json
)
SELECT
  id,
  planejamento_id,
  nome,
  data_inicio,
  data_fim,
  duracao_dias,
  early_start,
  early_finish,
  CASE WHEN duracao_dias = (data_fim - data_inicio) THEN 'SIM' ELSE 'NAO' END AS e_critica
FROM atividades_com_folga
ORDER BY planejamento_id, early_start;

-- View: EVM agregado mensalmente
CREATE OR REPLACE VIEW vw_evm_mensal AS
SELECT
  es.planejamento_id,
  DATE_TRUNC('month', es.semana_ref)::DATE AS mes,
  SUM(es.vp) AS vp_total,
  SUM(es.va) AS va_total,
  SUM(es.cr) AS cr_total,
  ROUND(SUM(es.va) / NULLIF(SUM(es.cr), 0), 4) AS idc_mensal,
  ROUND(SUM(es.va) / NULLIF(SUM(es.vp), 0), 4) AS idp_mensal,
  SUM(es.desvio_custo) AS desvio_custo_mensal,
  SUM(es.desvio_prazo) AS desvio_prazo_mensal,
  COUNT(*) AS semanas_no_mes
FROM evm_snapshots es
WHERE es.periodo = 'semanal'
GROUP BY es.planejamento_id, DATE_TRUNC('month', es.semana_ref)
ORDER BY es.planejamento_id, mes DESC;

-- ============================================================================
-- COMENTÁRIOS
-- ============================================================================

COMMENT ON TABLE obra_planejamentos IS 'Versionamento e aprovação de planejamentos por obra';
COMMENT ON TABLE planejamento_eap IS 'Estrutura Analítica do Projeto (WBS) - até 4 níveis';
COMMENT ON TABLE planejamento_atividades IS 'Atividades detalh. com durações, predecessores e recursos';
COMMENT ON TABLE avancos_fisicos IS 'Apontamento semanal de progresso físico de atividades';
COMMENT ON TABLE reprogramacoes IS 'Solicitações de mudança de datas com workflow de aprovação';
COMMENT ON TABLE evm_snapshots IS 'Baseline EVM (VP, VA, CR) para análise de desempenho';
