-- ================================================================
-- BIASIHUB - OPERACAO DE AGENTE CENTRADA NO SUPABASE
-- Projeto Supabase: vzaabtzcilyoknksvhrc
--
-- Arquitetura alvo:
--   APP <-> SUPABASE <-> AGENTE (via MCP)
--
-- Supabase = fonte unica de verdade.
-- Nada de seed local/mock.
-- ================================================================

create extension if not exists pgcrypto;

-- ================================================================
-- 1) FLUXOS OBSERVADOS PELO AGENTE
-- ================================================================
create table if not exists agente_fluxos (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null,
  descricao text,
  tabela_origem text not null,
  tabela_destino text not null default 'agente_fila',
  filtro jsonb not null default '{}'::jsonb,
  ativo boolean not null default true,
  criado_por uuid references usuarios(id) on delete set null,
  criado_em timestamptz not null default timezone('utc', now()),
  atualizado_em timestamptz not null default timezone('utc', now())
);

-- ================================================================
-- 2) FILA OPERACIONAL (EVENTOS/TAREFAS)
-- ================================================================
create table if not exists agente_fila (
  id uuid primary key default gen_random_uuid(),
  fluxo_id uuid not null references agente_fluxos(id) on delete cascade,
  entidade_tipo text not null,
  entidade_id text not null,
  origem text not null default 'app',
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'novo'
    check (status in ('novo', 'processando', 'aguardando_aprovacao', 'concluido', 'erro', 'cancelado')),
  prioridade text not null default 'media'
    check (prioridade in ('baixa', 'media', 'alta', 'critica')),
  reservado_por text,
  reservado_em timestamptz,
  processar_ate timestamptz,
  tentativas integer not null default 0,
  proxima_tentativa_em timestamptz,
  resultado jsonb,
  erro text,
  criado_por uuid references usuarios(id) on delete set null,
  criado_em timestamptz not null default timezone('utc', now()),
  atualizado_em timestamptz not null default timezone('utc', now())
);

-- ================================================================
-- 3) EXECUCOES DO AGENTE (MCP)
-- ================================================================
create table if not exists agente_execucoes (
  id uuid primary key default gen_random_uuid(),
  fila_id uuid references agente_fila(id) on delete set null,
  fluxo_id uuid not null references agente_fluxos(id) on delete cascade,
  agente_nome text not null,
  origem_executor text not null default 'mcp',
  status text not null check (status in ('iniciado', 'concluido', 'erro')),
  entrada jsonb not null default '{}'::jsonb,
  saida jsonb not null default '{}'::jsonb,
  erro text,
  iniciado_em timestamptz not null default timezone('utc', now()),
  finalizado_em timestamptz
);

-- ================================================================
-- 4) TRILHA DE ACOES (AUDITORIA)
-- ================================================================
create table if not exists agente_acoes (
  id uuid primary key default gen_random_uuid(),
  fila_id uuid not null references agente_fila(id) on delete cascade,
  execucao_id uuid references agente_execucoes(id) on delete set null,
  ator_tipo text not null check (ator_tipo in ('usuario', 'agente', 'sistema')),
  ator_id text,
  ator_nome text,
  acao text not null,
  detalhes jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default timezone('utc', now())
);

create index if not exists idx_agente_fluxos_ativo on agente_fluxos(ativo);
create index if not exists idx_agente_fila_fluxo_status on agente_fila(fluxo_id, status, atualizado_em desc);
create index if not exists idx_agente_fila_prioridade_criado on agente_fila(prioridade, criado_em);
create index if not exists idx_agente_execucoes_fluxo_inicio on agente_execucoes(fluxo_id, iniciado_em desc);
create index if not exists idx_agente_execucoes_fila on agente_execucoes(fila_id);
create index if not exists idx_agente_acoes_fila_data on agente_acoes(fila_id, criado_em desc);

-- ================================================================
-- 5) TRIGGERS DE updated_at
-- ================================================================
create or replace function agente_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_agente_fluxos_touch on agente_fluxos;
create trigger trg_agente_fluxos_touch
before update on agente_fluxos
for each row execute function agente_touch_updated_at();

drop trigger if exists trg_agente_fila_touch on agente_fila;
create trigger trg_agente_fila_touch
before update on agente_fila
for each row execute function agente_touch_updated_at();

-- ================================================================
-- 6) FUNCOES PARA O AGENTE VIA MCP
-- ================================================================
create or replace function agent_claim_fila(
  p_agente_nome text,
  p_fluxo_id uuid default null,
  p_limite integer default 10
)
returns setof agente_fila
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidatos as (
    select f.id
    from agente_fila f
    where f.status in ('novo', 'erro')
      and (f.status <> 'erro' or coalesce(f.proxima_tentativa_em, timezone('utc', now())) <= timezone('utc', now()))
      and (p_fluxo_id is null or f.fluxo_id = p_fluxo_id)
    order by
      case f.prioridade
        when 'critica' then 4
        when 'alta' then 3
        when 'media' then 2
        else 1
      end desc,
      f.criado_em asc
    for update skip locked
    limit greatest(p_limite, 1)
  ),
  atualizados as (
    update agente_fila f
      set status = 'processando',
          reservado_por = p_agente_nome,
          reservado_em = timezone('utc', now()),
          tentativas = f.tentativas + 1,
          atualizado_em = timezone('utc', now())
    from candidatos c
    where f.id = c.id
    returning f.*
  )
  select * from atualizados;
end;
$$;

create or replace function agent_finalizar_fila(
  p_fila_id uuid,
  p_agente_nome text,
  p_resultado jsonb default '{}'::jsonb
)
returns agente_fila
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item agente_fila;
begin
  update agente_fila
    set status = 'concluido',
        resultado = coalesce(p_resultado, '{}'::jsonb),
        erro = null,
        reservado_por = p_agente_nome,
        atualizado_em = timezone('utc', now())
  where id = p_fila_id
  returning * into v_item;

  insert into agente_acoes (fila_id, ator_tipo, ator_nome, acao, detalhes)
  values (
    p_fila_id,
    'agente',
    p_agente_nome,
    'agent_finalizar_fila',
    jsonb_build_object('resultado', coalesce(p_resultado, '{}'::jsonb))
  );

  return v_item;
end;
$$;

create or replace function agent_falhar_fila(
  p_fila_id uuid,
  p_agente_nome text,
  p_erro text,
  p_reprocessar_em timestamptz default null
)
returns agente_fila
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item agente_fila;
begin
  update agente_fila
    set status = 'erro',
        erro = p_erro,
        proxima_tentativa_em = p_reprocessar_em,
        reservado_por = p_agente_nome,
        atualizado_em = timezone('utc', now())
  where id = p_fila_id
  returning * into v_item;

  insert into agente_acoes (fila_id, ator_tipo, ator_nome, acao, detalhes)
  values (
    p_fila_id,
    'agente',
    p_agente_nome,
    'agent_falhar_fila',
    jsonb_build_object('erro', p_erro, 'reprocessar_em', p_reprocessar_em)
  );

  return v_item;
end;
$$;

-- ================================================================
-- 7) RLS
-- ================================================================
alter table agente_fluxos enable row level security;
alter table agente_fila enable row level security;
alter table agente_execucoes enable row level security;
alter table agente_acoes enable row level security;

drop policy if exists agente_fluxos_select on agente_fluxos;
create policy agente_fluxos_select
  on agente_fluxos
  for select
  to authenticated
  using (true);

drop policy if exists agente_fluxos_insert on agente_fluxos;
create policy agente_fluxos_insert
  on agente_fluxos
  for insert
  to authenticated
  with check (auth_is_gestor() or auth_is_admin());

drop policy if exists agente_fluxos_update on agente_fluxos;
create policy agente_fluxos_update
  on agente_fluxos
  for update
  to authenticated
  using (auth_is_gestor() or auth_is_admin() or criado_por = auth.uid())
  with check (auth_is_gestor() or auth_is_admin() or criado_por = auth.uid());

drop policy if exists agente_fluxos_delete on agente_fluxos;
create policy agente_fluxos_delete
  on agente_fluxos
  for delete
  to authenticated
  using (auth_is_admin());

drop policy if exists agente_fila_select on agente_fila;
create policy agente_fila_select
  on agente_fila
  for select
  to authenticated
  using (true);

drop policy if exists agente_fila_insert on agente_fila;
create policy agente_fila_insert
  on agente_fila
  for insert
  to authenticated
  with check (true);

drop policy if exists agente_fila_update on agente_fila;
create policy agente_fila_update
  on agente_fila
  for update
  to authenticated
  using (auth_is_gestor() or auth_is_admin() or criado_por = auth.uid())
  with check (auth_is_gestor() or auth_is_admin() or criado_por = auth.uid());

drop policy if exists agente_fila_delete on agente_fila;
create policy agente_fila_delete
  on agente_fila
  for delete
  to authenticated
  using (auth_is_admin());

drop policy if exists agente_execucoes_select on agente_execucoes;
create policy agente_execucoes_select
  on agente_execucoes
  for select
  to authenticated
  using (true);

drop policy if exists agente_execucoes_insert on agente_execucoes;
create policy agente_execucoes_insert
  on agente_execucoes
  for insert
  to authenticated
  with check (true);

drop policy if exists agente_execucoes_update on agente_execucoes;
create policy agente_execucoes_update
  on agente_execucoes
  for update
  to authenticated
  using (auth_is_gestor() or auth_is_admin())
  with check (auth_is_gestor() or auth_is_admin());

drop policy if exists agente_execucoes_delete on agente_execucoes;
create policy agente_execucoes_delete
  on agente_execucoes
  for delete
  to authenticated
  using (auth_is_admin());

drop policy if exists agente_acoes_select on agente_acoes;
create policy agente_acoes_select
  on agente_acoes
  for select
  to authenticated
  using (true);

drop policy if exists agente_acoes_insert on agente_acoes;
create policy agente_acoes_insert
  on agente_acoes
  for insert
  to authenticated
  with check (true);

drop policy if exists agente_acoes_update on agente_acoes;
create policy agente_acoes_update
  on agente_acoes
  for update
  to authenticated
  using (auth_is_admin())
  with check (auth_is_admin());

drop policy if exists agente_acoes_delete on agente_acoes;
create policy agente_acoes_delete
  on agente_acoes
  for delete
  to authenticated
  using (auth_is_admin());

comment on table agente_fluxos is 'Configuracao dos fluxos observados pelo agente no Supabase.';
comment on table agente_fila is 'Fila unica de trabalho: app cria, agente processa via MCP, app acompanha.';
comment on table agente_execucoes is 'Historico de execucoes do agente sobre itens da fila.';
comment on table agente_acoes is 'Trilha de auditoria de acoes de usuario/agente/sistema.';

