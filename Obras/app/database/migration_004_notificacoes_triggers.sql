-- ============================================================
-- MIGRAÇÃO 004: Triggers automáticos para notificações
-- ============================================================

-- TRIGGER 1: Quando um contrato é atualizado/criado, verifica se vence em 30 dias
CREATE OR REPLACE FUNCTION trigger_contrato_vencer()
RETURNS TRIGGER AS $$
BEGIN
  -- Se a data de término muda e está dentro de 30 dias
  IF (NEW.data_termino::DATE BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days')
    AND (OLD IS NULL OR NEW.data_termino IS DISTINCT FROM OLD.data_termino)
  THEN
    -- Verifica se já não existe notificação para hoje
    IF NOT EXISTS (
      SELECT 1 FROM notificacoes n
      WHERE n.referencia_tipo = 'contrato'
        AND n.referencia_id = NEW.id
        AND DATE(n.criada_em) = CURRENT_DATE
        AND n.titulo = 'Contrato a vencer'
    ) THEN
      INSERT INTO notificacoes (tipo, titulo, mensagem, referencia_tipo, referencia_id, expira_em)
      VALUES (
        'alerta',
        'Contrato a vencer',
        'Contrato ' || COALESCE(NEW.numero, NEW.id::TEXT) || ' vence em ' ||
        EXTRACT(DAY FROM NEW.data_termino::DATE - CURRENT_DATE)::INT || ' dia(s).',
        'contrato',
        NEW.id,
        NEW.data_termino::TIMESTAMP + INTERVAL '1 day'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_contrato_vencer ON contratos;
CREATE TRIGGER trig_contrato_vencer
  AFTER INSERT OR UPDATE ON contratos
  FOR EACH ROW
  EXECUTE FUNCTION trigger_contrato_vencer();

-- TRIGGER 2: Quando uma medição muda de status → pendente, gera notificação
CREATE OR REPLACE FUNCTION trigger_medicao_pendente()
RETURNS TRIGGER AS $$
BEGIN
  -- Se status mudou para "Pendente de Aprovação"
  IF NEW.status = 'Pendente de Aprovação'
    AND (OLD IS NULL OR OLD.status IS DISTINCT FROM NEW.status)
  THEN
    -- Verifica se já existe alerta hoje genérico (não por medição específica)
    IF NOT EXISTS (
      SELECT 1 FROM notificacoes n
      WHERE n.referencia_tipo = 'medicao'
        AND n.titulo = 'Medição pendente'
        AND DATE(n.criada_em) = CURRENT_DATE
    ) THEN
      -- Conta quantas medições estão pendentes
      DECLARE
        qtde_pendentes INT;
      BEGIN
        SELECT COUNT(*) INTO qtde_pendentes
        FROM mediacoes
        WHERE status = 'Pendente de Aprovação';

        INSERT INTO notificacoes (tipo, titulo, mensagem, referencia_tipo, referencia_id)
        VALUES (
          'info',
          'Medição pendente',
          qtde_pendentes || ' medição(ões) aguardando aprovação.',
          'medicao',
          NEW.id
        );
      END;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_medicao_pendente ON mediacoes;
CREATE TRIGGER trig_medicao_pendente
  AFTER INSERT OR UPDATE ON mediacoes
  FOR EACH ROW
  EXECUTE FUNCTION trigger_medicao_pendente();

-- TRIGGER 3: Quando baseline é congelada, gera notificação
CREATE OR REPLACE FUNCTION trigger_baseline_congelada()
RETURNS TRIGGER AS $$
BEGIN
  -- Se baseline_congelada muda de FALSE para TRUE
  IF NEW.baseline_congelada = TRUE
    AND (OLD IS NULL OR OLD.baseline_congelada IS DISTINCT FROM NEW.baseline_congelada)
  THEN
    -- Busca nome da obra
    DECLARE
      nome_obra TEXT;
    BEGIN
      SELECT o.nome INTO nome_obra
      FROM planejamentos p
      JOIN obras o ON o.id = p.obra_id
      WHERE p.id = NEW.id;

      INSERT INTO notificacoes (tipo, titulo, mensagem, referencia_tipo, referencia_id)
      VALUES (
        'sucesso',
        'Baseline congelada',
        'Obra ' || COALESCE(nome_obra, 'ID:' || NEW.id::TEXT) || ' teve baseline congelada.',
        'obra',
        (SELECT obra_id FROM planejamentos WHERE id = NEW.id)
      );
    END;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trig_baseline_congelada ON planejamentos;
CREATE TRIGGER trig_baseline_congelada
  AFTER UPDATE ON planejamentos
  FOR EACH ROW
  EXECUTE FUNCTION trigger_baseline_congelada();

-- ============================================================
-- CRON JOB: Limpar notificações expiradas
-- ============================================================

-- Função para limpar notificações
CREATE OR REPLACE FUNCTION limpar_notificacoes_expiradas()
RETURNS void AS $$
BEGIN
  -- Marca como inativas notificações que expiraram
  UPDATE notificacoes
  SET ativa = FALSE
  WHERE expira_em IS NOT NULL
    AND expira_em < NOW()
    AND ativa = TRUE;

  -- Deleta registros de leitura órfãos (opcional, para limpeza)
  DELETE FROM notificacoes_usuario_lida nul
  WHERE NOT EXISTS (
    SELECT 1 FROM notificacoes n WHERE n.id = nul.notificacao_id
  );
END;
$$ LANGUAGE plpgsql;

-- Cron job: executa 1x por dia às 02:00 BRT (05:00 UTC)
SELECT cron.schedule(
  'limpar-notificacoes-expiradas',
  '0 5 * * *', -- 05:00 UTC = 02:00 BRT (no horário padrão)
  'SELECT limpar_notificacoes_expiradas()'
);

-- ============================================================
-- CRON JOB: Gerar notificações de contratos vencendo (diário)
-- ============================================================

-- Função para verificar contratos vencendo
CREATE OR REPLACE FUNCTION gerar_alertas_contratos_diario()
RETURNS void AS $$
BEGIN
  -- Busca contratos que vencem nos próximos 30 dias e ainda não têm alerta hoje
  INSERT INTO notificacoes (tipo, titulo, mensagem, referencia_tipo, referencia_id, expira_em)
  SELECT DISTINCT
    'alerta',
    'Contrato a vencer',
    COUNT(*) || ' contrato(s) vence(m) nos próximos 30 dias.',
    'contrato',
    NULL,
    CURRENT_DATE::TIMESTAMP + INTERVAL '35 days' -- Expira em 5 dias
  FROM contratos c
  WHERE c.data_termino::DATE BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
    AND c.ativo = TRUE
    AND NOT EXISTS (
      SELECT 1 FROM notificacoes n
      WHERE n.referencia_tipo = 'contrato'
        AND n.titulo = 'Contrato a vencer'
        AND DATE(n.criada_em) = CURRENT_DATE
    );
END;
$$ LANGUAGE plpgsql;

-- Cron: 03:00 BRT (06:00 UTC) — após limpeza
SELECT cron.schedule(
  'gerar-alertas-contratos-diario',
  '0 6 * * *',
  'SELECT gerar_alertas_contratos_diario()'
);

-- ============================================================
-- CRON JOB: Gerar notificações de medições pendentes (diário)
-- ============================================================

-- Cron: 03:30 BRT (06:30 UTC)
SELECT cron.schedule(
  'gerar-alertas-medicoes-diario',
  '30 6 * * *',
  $$INSERT INTO notificacoes (tipo, titulo, mensagem, referencia_tipo, expira_em)
    SELECT
      'info',
      'Medição pendente',
      COUNT(*) || ' medição(ões) aguardando aprovação.',
      'medicao',
      CURRENT_DATE::TIMESTAMP + INTERVAL '1 day'
    FROM mediacoes
    WHERE status = 'Pendente de Aprovação'
      AND NOT EXISTS (
        SELECT 1 FROM notificacoes n
        WHERE n.titulo = 'Medição pendente'
          AND DATE(n.criada_em) = CURRENT_DATE
      )$$
);

-- ============================================================
-- COMENTÁRIOS
-- ============================================================

COMMENT ON FUNCTION trigger_contrato_vencer() IS 'Gera alerta quando contrato está para vencer (< 30 dias)';
COMMENT ON FUNCTION trigger_medicao_pendente() IS 'Gera alerta quando medição muda para pendente de aprovação';
COMMENT ON FUNCTION trigger_baseline_congelada() IS 'Gera alerta quando baseline de planejamento é congelada';
COMMENT ON FUNCTION limpar_notificacoes_expiradas() IS 'Remove notificações expiradas (expira_em < NOW)';
COMMENT ON FUNCTION gerar_alertas_contratos_diario() IS 'Cron job: gera alerta agregado de contratos vencendo';
