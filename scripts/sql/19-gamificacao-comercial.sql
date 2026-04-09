-- ══════════════════════════════════════════════════════════════════════
-- 19 - Arena Comercial: Gamificação
-- Tabela para registrar atividades dos vendedores (Mecânica de Energia)
-- ══════════════════════════════════════════════════════════════════════

-- Tabela de atividades (fonte da Energia dos Vendedores)
CREATE TABLE IF NOT EXISTS vendedor_atividades (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendedor_nome TEXT NOT NULL,
  vendedor_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  tipo          TEXT NOT NULL CHECK (tipo IN (
    'orcamento_enviado',   -- +20 pts
    'followup_realizado',  -- +15 pts
    'contrato_fechado',    -- +50 pts
    'orcamento_criado'     -- +10 pts
  )),
  orcamento_id  UUID REFERENCES orcamentos(id) ON DELETE SET NULL,
  pontos        INTEGER NOT NULL DEFAULT 0,
  criado_em     TIMESTAMPTZ DEFAULT NOW()
);

-- Índice por vendedor e data (busca de atividades do dia)
CREATE INDEX IF NOT EXISTS idx_vendedor_atividades_nome_data 
  ON vendedor_atividades(vendedor_nome, criado_em DESC);

-- RLS: todos autenticados podem ler, inserir suas próprias
ALTER TABLE vendedor_atividades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Leitura de atividades para autenticados"
  ON vendedor_atividades FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Inserção de atividades para autenticados"
  ON vendedor_atividades FOR INSERT
  TO authenticated WITH CHECK (true);

-- View auxiliar: energia atual de cada vendedor (calculada em SQL)
CREATE OR REPLACE VIEW vendedor_energia_hoje AS
WITH atividades_hoje AS (
  SELECT
    vendedor_nome,
    SUM(pontos) AS pontos_ganhos
  FROM vendedor_atividades
  WHERE criado_em >= CURRENT_DATE
  GROUP BY vendedor_nome
),
horas_passadas AS (
  SELECT
    LEAST(
      GREATEST(
        EXTRACT(EPOCH FROM (NOW() - (CURRENT_DATE + INTERVAL '8 hours'))) / 3600,
        0
      ),
      10 -- max 10h de horário comercial
    ) AS horas
)
SELECT
  a.vendedor_nome,
  GREATEST(
    0,
    LEAST(
      100,
      100
      - (SELECT horas FROM horas_passadas) * 5  -- -5pts/hora
      + COALESCE(a.pontos_ganhos, 0)
    )
  )::INTEGER AS energia
FROM (
  SELECT DISTINCT vendedor_nome FROM vendedor_atividades
  WHERE criado_em >= CURRENT_DATE - INTERVAL '7 days'
) a
LEFT JOIN atividades_hoje ON atividades_hoje.vendedor_nome = a.vendedor_nome;

COMMENT ON TABLE vendedor_atividades IS 'Registra ações dos vendedores para o sistema de gamificação (Mecânica de Energia)';
