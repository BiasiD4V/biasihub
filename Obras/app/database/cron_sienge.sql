-- Habilita extensões necessárias
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove job anterior se existir (ignora erro se não existir)
DO $$
BEGIN
  PERFORM cron.unschedule('sienge-sync-diario');
EXCEPTION WHEN OTHERS THEN
  NULL;
END;
$$;

-- Agenda sincronia Sienge: todo dia às 01h BRT (= 04h UTC)
SELECT cron.schedule(
  'sienge-sync-diario',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url     := 'https://mzepeedobbbmmlidzsob.supabase.co/functions/v1/sienge-sync',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...Bjl1KE7fTL321QFr7HqRTlJmikguDXVU1UNHWh1rrXw"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);

-- Verifica o agendamento
SELECT jobid, jobname, schedule, command FROM cron.job WHERE jobname = 'sienge-sync-diario';
