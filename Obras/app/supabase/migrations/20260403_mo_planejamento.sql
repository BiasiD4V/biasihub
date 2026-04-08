-- ============================================================
-- Módulo: Custos e Provisões de Mão de Obra
-- ERP Biasi Engenharia
-- Ref: ANX001-2026_Escada_Salarial + CALCULO_DE_IMPOSTOS_E_BDI
-- ============================================================

-- ─── TABELA DE CARGOS (Escada Salarial Biasi) ────────────────
CREATE TABLE IF NOT EXISTS mo_cargos (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  cargo         TEXT        NOT NULL,
  codigo_cargo  TEXT,
  salario_base  NUMERIC(10,2) NOT NULL,
  tem_periculosidade BOOLEAN DEFAULT false,
  rateio        TEXT        NOT NULL CHECK (rateio IN ('ELÉTRICA','HIDRÁULICA','MEIOAMEIO','INDIRETA')),
  categoria     TEXT,
  ativo         BOOLEAN     DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ─── TABELA DE PARÂMETROS DE ENCARGOS ────────────────────────
-- Permite atualizar os percentuais sem alterar o código
CREATE TABLE IF NOT EXISTS mo_config_encargos (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo        TEXT        NOT NULL UNIQUE,  -- 'decimo_terceiro', 'fgts', etc.
  nome          TEXT        NOT NULL,
  percentual    NUMERIC(8,4),                  -- % (e.g. 8.33)
  valor_fixo    NUMERIC(10,2),                 -- R$ (para benefícios fixos)
  tipo          TEXT        NOT NULL CHECK (tipo IN ('encargo_percentual','beneficio_fixo','parametro')),
  ativo         BOOLEAN     DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ─── PLANEJAMENTO DE MO POR OBRA ─────────────────────────────
CREATE TABLE IF NOT EXISTS mo_planejamento (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id       UUID        NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
  cargo_id      UUID        NOT NULL REFERENCES mo_cargos(id),
  quantidade    INTEGER     NOT NULL DEFAULT 1,
  dias_uteis    INTEGER     NOT NULL,
  observacoes   TEXT,
  -- snapshot do custo no momento da criação (para histórico)
  salario_base_snapshot  NUMERIC(10,2),
  custo_mensal_snapshot  NUMERIC(10,2),
  custo_total_snapshot   NUMERIC(10,2),
  created_by    UUID        REFERENCES perfis(id),
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- ─── ÍNDICES ─────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_mo_planejamento_obra  ON mo_planejamento(obra_id);
CREATE INDEX IF NOT EXISTS idx_mo_cargos_rateio      ON mo_cargos(rateio);
CREATE INDEX IF NOT EXISTS idx_mo_cargos_ativo       ON mo_cargos(ativo);

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────
ALTER TABLE mo_cargos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE mo_config_encargos  ENABLE ROW LEVEL SECURITY;
ALTER TABLE mo_planejamento     ENABLE ROW LEVEL SECURITY;

-- Cargos: leitura para autenticados, escrita para admin/gerente/planejamento
CREATE POLICY "mo_cargos_select" ON mo_cargos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "mo_cargos_write" ON mo_cargos
  FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil IN ('admin','gerente')))
  WITH CHECK (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil IN ('admin','gerente')));

-- Config encargos: leitura para autenticados, escrita apenas admin
CREATE POLICY "mo_config_select" ON mo_config_encargos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "mo_config_write" ON mo_config_encargos
  FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil = 'admin'));

-- Planejamento: acesso por obra
CREATE POLICY "mo_plan_select" ON mo_planejamento
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "mo_plan_write" ON mo_planejamento
  FOR ALL TO authenticated
  USING  (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil IN ('admin','gerente','planejamento')))
  WITH CHECK (EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil IN ('admin','gerente','planejamento')));

-- ─── SEED: PARÂMETROS DE ENCARGOS BIASI 2026 ─────────────────
INSERT INTO mo_config_encargos (codigo, nome, percentual, tipo) VALUES
  ('decimo_terceiro',           '13º Salário',                    8.33,   'encargo_percentual'),
  ('ferias',                    'Férias',                         11.11,  'encargo_percentual'),
  ('aviso_previo_indenizado',   'Aviso Prévio Indenizado',        3.64,   'encargo_percentual'),
  ('fgts',                      'FGTS',                           8.00,   'encargo_percentual'),
  ('fgts_aviso_previo',         'FGTS Aviso Prévio',              0.2912, 'encargo_percentual'),
  ('fgts_rescisao',             'FGTS Rescisão',                  4.00,   'encargo_percentual'),
  ('sat',                       'SAT (Acidente de Trabalho)',      3.00,   'encargo_percentual'),
  ('sal_educacao',              'Salário Educação',               2.50,   'encargo_percentual'),
  ('sistema_s',                 'Sistema S',                      3.30,   'encargo_percentual'),
  ('adicional_periculosidade',  'Adicional de Periculosidade',    30.00,  'encargo_percentual')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO mo_config_encargos (codigo, nome, valor_fixo, tipo) VALUES
  ('plr',                'PLR (Participação nos Lucros)',           62.50,  'beneficio_fixo'),
  ('exames',             'Exames Médicos',                        163.97,  'beneficio_fixo'),
  ('cafe',               'Café / Alimentação Local',              220.00,  'beneficio_fixo'),
  ('ajuda_custo',        'Ajuda de Custo',                        205.00,  'beneficio_fixo'),
  ('plano_saude',        'Plano de Saúde',                        182.68,  'beneficio_fixo'),
  ('seguro_vida',        'Seguro de Vida',                         16.80,  'beneficio_fixo'),
  ('cartao_alimentacao', 'Cartão Alimentação',                    462.00,  'beneficio_fixo'),
  ('ferramentas',        'Ferramentas',                           105.00,  'beneficio_fixo'),
  ('epi',                'EPI',                                   155.00,  'beneficio_fixo')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO mo_config_encargos (codigo, nome, valor_fixo, tipo) VALUES
  ('dias_uteis_mensais', 'Dias Úteis Mensais',  22, 'parametro'),
  ('dsr_medio',          'DSR Médio (dias)',      5, 'parametro')
ON CONFLICT (codigo) DO NOTHING;
