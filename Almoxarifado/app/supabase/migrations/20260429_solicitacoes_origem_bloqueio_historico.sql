-- =====================================================================
-- 20260429_solicitacoes_origem_bloqueio_historico.sql
--
-- Origem da solicitação, bloqueio/congelamento de ferramentas e histórico
-- operacional das respostas/correções do almoxarifado.
-- =====================================================================

alter table public.itens_almoxarifado
  add column if not exists bloqueado_solicitacao boolean not null default false,
  add column if not exists bloqueio_motivo text,
  add column if not exists bloqueio_observacao text,
  add column if not exists bloqueado_em timestamptz,
  add column if not exists bloqueado_por uuid;

create index if not exists idx_itens_almox_bloqueio_solicitacao
  on public.itens_almoxarifado (tipo, ativo, bloqueado_solicitacao);

comment on column public.itens_almoxarifado.bloqueado_solicitacao is
  'Quando true, ferramenta/material não pode ser solicitado pelos formulários.';
comment on column public.itens_almoxarifado.bloqueio_motivo is
  'Motivo simples do congelamento: manutenção, aferição, indisponível, emprestada, quebrada, reservada ou outro.';
comment on column public.itens_almoxarifado.bloqueio_observacao is
  'Complemento livre exibido como tooltip/aviso para o solicitante e gestor.';

create table if not exists public.requisicoes_almoxarifado_historico (
  id uuid primary key default gen_random_uuid(),
  requisicao_id uuid null references public.requisicoes_almoxarifado(id) on delete cascade,
  acao text not null,
  ator_id uuid null,
  ator_nome text,
  solicitante_nome text,
  telefone text,
  mensagem text,
  detalhes jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

create index if not exists idx_req_almox_hist_req
  on public.requisicoes_almoxarifado_historico (requisicao_id, criado_em desc);

create index if not exists idx_req_almox_hist_acao
  on public.requisicoes_almoxarifado_historico (acao, criado_em desc);

alter table public.requisicoes_almoxarifado_historico enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'requisicoes_almoxarifado_historico'
      and policyname = 'historico_req_select_authenticated'
  ) then
    create policy historico_req_select_authenticated
      on public.requisicoes_almoxarifado_historico
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'requisicoes_almoxarifado_historico'
      and policyname = 'historico_req_insert_authenticated'
  ) then
    create policy historico_req_insert_authenticated
      on public.requisicoes_almoxarifado_historico
      for insert
      to authenticated
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'requisicoes_almoxarifado_historico'
      and policyname = 'historico_req_insert_public_attempts'
  ) then
    create policy historico_req_insert_public_attempts
      on public.requisicoes_almoxarifado_historico
      for insert
      to anon
      with check (acao in ('tentativa_fora_horario', 'tentativa_ferramenta_bloqueada'));
  end if;
end $$;

comment on table public.requisicoes_almoxarifado_historico is
  'Histórico de respostas/correções e tentativas bloqueadas do fluxo de requisições do almoxarifado.';

comment on column public.requisicoes_almoxarifado.observacao is
  'Texto livre + meta no formato "chave:valor | chave:valor". Chaves incluem cargo, prazo, devolucao, prioridade, entrega, obs, anexos_urls, origem_modulo, origem_area, origem_contexto, resposta_almox, resposta_almox_por, resposta_almox_em, decisao, frete_tipo e rastreios operacionais.';

create or replace function public.validar_requisicao_almoxarifado()
returns trigger
language plpgsql
as $$
declare
  hora_local time;
  item jsonb;
  bloqueio record;
begin
  hora_local := (now() at time zone 'America/Sao_Paulo')::time;

  if hora_local < time '07:00' or hora_local > time '16:00' then
    raise exception 'Solicitação fora do horário permitido. As solicitações só podem ser feitas entre 07:00 e 16:00. Procure o almoxarifado em caso de dúvida.'
      using errcode = 'P0001';
  end if;

  if jsonb_typeof(to_jsonb(new.itens)) = 'array' then
    for item in select value from jsonb_array_elements(to_jsonb(new.itens)) as t(value)
    loop
      select i.codigo, i.descricao, i.bloqueio_motivo, i.bloqueio_observacao
        into bloqueio
      from public.itens_almoxarifado i
      where i.id::text = item->>'item_id'
        and i.tipo = 'ferramenta'
        and coalesce(i.bloqueado_solicitacao, false) = true
      limit 1;

      if found then
        raise exception 'Essa ferramenta está indisponível: %. Procure o almoxarifado em caso de dúvida.',
          coalesce(nullif(trim(bloqueio.bloqueio_motivo || ' — ' || coalesce(bloqueio.bloqueio_observacao, '')), ' — '), 'Ferramenta indisponível para solicitação')
          using errcode = 'P0001';
      end if;
    end loop;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validar_requisicao_almoxarifado on public.requisicoes_almoxarifado;
create trigger trg_validar_requisicao_almoxarifado
  before insert on public.requisicoes_almoxarifado
  for each row
  execute function public.validar_requisicao_almoxarifado();
