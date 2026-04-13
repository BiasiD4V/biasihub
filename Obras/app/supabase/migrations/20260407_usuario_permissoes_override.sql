-- ============================================================================
-- Migração: Override de Permissões por Usuário
-- Data: 2026-04-07
-- Descrição: Permite personalizar permissões individualmente além do perfil padrão.
--            Armazena apenas deltas (adicionadas ou removidas) em relação ao perfil.
-- ============================================================================

-- Tabela principal de overrides
CREATE TABLE IF NOT EXISTS usuario_permissoes_override (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id    uuid        NOT NULL REFERENCES perfis(id) ON DELETE CASCADE,
  permissao     text        NOT NULL,   -- chave snake_case da permissão, ex: 'ver_evm'
  concedida     boolean     NOT NULL,   -- true = adiciona ao perfil, false = remove do perfil
  motivo        text,                   -- razão do override (auditoria)
  validade_em   timestamptz,            -- null = permanente; data = expira automaticamente
  criado_por    uuid        REFERENCES perfis(id) ON DELETE SET NULL,
  criado_em     timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now(),

  -- Garante 1 override por (usuário, permissão) — sem duplicatas
  CONSTRAINT uq_usuario_permissao UNIQUE (usuario_id, permissao)
);

-- Índices para queries frequentes
CREATE INDEX IF NOT EXISTS idx_upo_usuario ON usuario_permissoes_override(usuario_id);
CREATE INDEX IF NOT EXISTS idx_upo_validade ON usuario_permissoes_override(validade_em)
  WHERE validade_em IS NOT NULL;

-- Trigger: atualiza atualizado_em automaticamente
CREATE OR REPLACE FUNCTION set_atualizado_em()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_upo_atualizado_em ON usuario_permissoes_override;
CREATE TRIGGER trg_upo_atualizado_em
  BEFORE UPDATE ON usuario_permissoes_override
  FOR EACH ROW EXECUTE FUNCTION set_atualizado_em();

-- Comentários documentando a tabela
COMMENT ON TABLE usuario_permissoes_override IS
  'Override de permissões individuais por usuário. Armazena apenas deltas em relação ao perfil padrão.';
COMMENT ON COLUMN usuario_permissoes_override.concedida IS
  'true = adiciona a permissão ao perfil (mesmo que o perfil não tenha). false = remove do perfil (mesmo que o perfil tenha).';
COMMENT ON COLUMN usuario_permissoes_override.validade_em IS
  'Se preenchido, o override expira nesta data/hora e é ignorado automaticamente pela query.';
