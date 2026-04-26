-- =====================================================================
-- 20260426_frota_meta_e_indices.sql
--
-- Migração defensiva e idempotente para a fase 1 do módulo Frota/Almox.
--
-- Esta migração NÃO altera o schema das tabelas existentes (todos os
-- novos campos continuam vivendo dentro de `requisicoes_almoxarifado.
-- observacao` no formato `chave:valor | chave:valor`). O objetivo aqui
-- é apenas:
--
--   1. Garantir que `agendamentos_almoxarifado` existe e tem as colunas
--      mínimas usadas pelo Gerenciador / Calendário / Requisições.
--   2. Criar índice para a consulta de "carros disponíveis no período"
--      (sobrepõe data_inicio <= fim AND data_fim >= inicio quando
--      status='ativo' e tipo='veiculo').
--   3. Documentar (via COMMENT) as chaves de meta usadas em
--      `requisicoes_almoxarifado.observacao`, para que futuros agentes /
--      analistas saibam o contrato sem precisar caçar no código.
--
-- Convenções da meta em observacao (todas opcionais, separador " | "):
--   cargo:<string>
--   prazo:<datetime ISO>
--   devolucao:<datetime ISO>            -- frota: data prevista de devolução
--   prioridade:<normal|urgente|baixo>
--   entrega:<sim|nao>
--   obs:<texto livre>
--   anexos_urls:<url1,url2>
--   decisao:<aprovada|negada|frota_liberada|frota_negada>
--   aprovado_em / negado_em:<ISO>
--   decidido_por:<nome>
--   motivo_negativa:<texto>
--   frota_status:<liberada|negada|cancelada>
--   frota_liberado_em:<ISO>
--   frota_motivo_negativa:<texto>
--   frota_decidido_por:<nome>
--   cancelado_em:<ISO>
--   cancelado_por:<solicitante|almoxarifado>
--   motivo_cancelamento:<texto>
--   frete_tipo:<biasi|terceiro>          -- preenchido na liberação da frota
--   frete_terceiro_nome:<texto>
--   frete_terceiro_contato:<texto>
--   recebido_por_nome:<texto>            -- preenchido na entrega final
--   recebido_em:<ISO>
-- =====================================================================

-- 1) agendamentos_almoxarifado: garante existência mínima e índices
create table if not exists public.agendamentos_almoxarifado (
  id uuid primary key default gen_random_uuid(),
  tipo text not null,                -- 'veiculo' | 'ferramenta' | etc.
  item_id text not null,
  item_descricao text,
  solicitante_id uuid,
  solicitante_nome text,
  data_inicio date not null,
  data_fim date not null,
  descricao text,
  status text not null default 'ativo', -- 'ativo' | 'concluido' | 'cancelado'
  criado_em timestamptz not null default now()
);

-- Coluna pode não existir em bancos antigos; cada ALTER é idempotente.
alter table public.agendamentos_almoxarifado
  add column if not exists item_descricao text,
  add column if not exists solicitante_id uuid,
  add column if not exists solicitante_nome text,
  add column if not exists descricao text,
  add column if not exists status text not null default 'ativo',
  add column if not exists criado_em timestamptz not null default now();

-- Índice para a consulta de conflitos de período por veículo:
--   .eq('tipo','veiculo').eq('status','ativo')
--   .lte('data_inicio', fim).gte('data_fim', inicio)
create index if not exists idx_agend_almox_veiculo_periodo
  on public.agendamentos_almoxarifado (tipo, status, item_id, data_inicio, data_fim);

-- 2) Comentários documentando o contrato de observacao
comment on column public.requisicoes_almoxarifado.observacao is
  'Texto livre + meta no formato "chave:valor | chave:valor". Chaves: '
  'cargo, prazo, devolucao, prioridade, entrega, obs, anexos_urls, '
  'decisao, aprovado_em, negado_em, decidido_por, motivo_negativa, '
  'frota_status, frota_liberado_em, frota_motivo_negativa, frota_decidido_por, '
  'cancelado_em, cancelado_por, motivo_cancelamento, '
  'frete_tipo, frete_terceiro_nome, frete_terceiro_contato, '
  'recebido_por_nome, recebido_em.';

comment on table public.agendamentos_almoxarifado is
  'Reservas/agendamentos do almoxarifado e da frota. status=ativo bloqueia '
  'o item no período [data_inicio, data_fim]. Veículos negados ou cancelados '
  'devem ter status=cancelado e não bloqueiam a agenda.';
