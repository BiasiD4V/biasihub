-- =====================================================================
-- 20260506_kanban_almoxarifado.sql
--
-- Quadro Kanban de tarefas operacionais do Almoxarifado.
-- =====================================================================

create table if not exists public.tarefas_almoxarifado (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  type text not null default 'outro',
  priority text not null default 'media',
  status text not null default 'a_fazer',
  responsible_user_id uuid null constraint tarefas_almox_responsible_user_id_fkey references public.usuarios(id) on delete set null,
  responsible_name text not null default '',
  obra_id uuid null constraint tarefas_almox_obra_id_fkey references public.obras(id) on delete set null,
  obra_name text not null default '',
  related_requisition_id uuid null constraint tarefas_almox_related_requisition_id_fkey references public.requisicoes_almoxarifado(id) on delete set null,
  due_date date null,
  observations text not null default '',
  created_by uuid null constraint tarefas_almox_created_by_fkey references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz null,
  canceled_at timestamptz null,
  constraint tarefas_almox_priority_check check (priority in ('baixa', 'media', 'alta', 'urgente')),
  constraint tarefas_almox_status_check check (status in ('a_fazer', 'em_andamento', 'aguardando', 'concluido', 'cancelado')),
  constraint tarefas_almox_type_check check (type in (
    'separacao_material',
    'entrega_obra',
    'conferencia_estoque',
    'recebimento_material',
    'organizacao_almoxarifado',
    'controle_ferramentas',
    'manutencao_veiculo',
    'compra_solicitacao_material',
    'inventario',
    'outro'
  ))
);

create table if not exists public.tarefas_almoxarifado_historico (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tarefas_almoxarifado(id) on delete cascade,
  user_id uuid null references public.usuarios(id) on delete set null,
  action text not null,
  old_value text,
  new_value text,
  created_at timestamptz not null default now()
);

alter table public.tarefas_almoxarifado
  add column if not exists responsible_name text not null default '';

alter table public.tarefas_almoxarifado
  add column if not exists obra_name text not null default '';

alter table public.tarefas_almoxarifado
  add column if not exists related_requisition_id uuid null;

alter table public.tarefas_almoxarifado
  alter column responsible_user_id drop not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'tarefas_almox_related_requisition_id_fkey'
  ) then
    alter table public.tarefas_almoxarifado
      add constraint tarefas_almox_related_requisition_id_fkey
      foreign key (related_requisition_id)
      references public.requisicoes_almoxarifado(id)
      on delete set null;
  end if;
end $$;

update public.tarefas_almoxarifado t
set responsible_name = coalesce(nullif(t.responsible_name, ''), u.nome, 'Sem responsavel')
from public.usuarios u
where t.responsible_user_id = u.id
  and nullif(t.responsible_name, '') is null;

update public.tarefas_almoxarifado t
set obra_name = coalesce(nullif(t.obra_name, ''), o.nome, '')
from public.obras o
where t.obra_id = o.id
  and nullif(t.obra_name, '') is null;

create index if not exists idx_tarefas_almox_status
  on public.tarefas_almoxarifado (status, updated_at desc);

create index if not exists idx_tarefas_almox_responsavel
  on public.tarefas_almoxarifado (responsible_user_id, status, due_date);

create index if not exists idx_tarefas_almox_responsavel_nome
  on public.tarefas_almoxarifado (lower(responsible_name));

create index if not exists idx_tarefas_almox_obra
  on public.tarefas_almoxarifado (obra_id);

create index if not exists idx_tarefas_almox_obra_nome
  on public.tarefas_almoxarifado (lower(obra_name));

create index if not exists idx_tarefas_almox_requisicao
  on public.tarefas_almoxarifado (related_requisition_id);

create index if not exists idx_tarefas_almox_prazo
  on public.tarefas_almoxarifado (due_date)
  where due_date is not null;

create index if not exists idx_tarefas_almox_hist_task
  on public.tarefas_almoxarifado_historico (task_id, created_at desc);

create or replace function public.tarefas_almox_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();

  if new.status = 'concluido' and old.status is distinct from 'concluido' then
    new.completed_at := now();
  elsif new.status is distinct from 'concluido' then
    new.completed_at := null;
  end if;

  if new.status = 'cancelado' and old.status is distinct from 'cancelado' then
    new.canceled_at := now();
  elsif new.status is distinct from 'cancelado' then
    new.canceled_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_tarefas_almox_touch_updated_at on public.tarefas_almoxarifado;
create trigger trg_tarefas_almox_touch_updated_at
  before update on public.tarefas_almoxarifado
  for each row
  execute function public.tarefas_almox_touch_updated_at();

alter table public.tarefas_almoxarifado enable row level security;
alter table public.tarefas_almoxarifado_historico enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tarefas_almoxarifado'
      and policyname = 'tarefas_almox_select_authenticated'
  ) then
    create policy tarefas_almox_select_authenticated
      on public.tarefas_almoxarifado
      for select
      to authenticated
      using (
        responsible_user_id = auth.uid()
        or exists (
          select 1
          from public.usuarios u
          where u.id = auth.uid()
            and lower(trim(tarefas_almoxarifado.responsible_name)) = lower(trim(u.nome))
        )
        or exists (
          select 1
          from public.usuarios u
          where u.id = auth.uid()
            and lower(coalesce(u.papel::text, '')) in ('admin', 'dono', 'gestor')
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tarefas_almoxarifado'
      and policyname = 'tarefas_almox_insert_gestores'
  ) then
    create policy tarefas_almox_insert_gestores
      on public.tarefas_almoxarifado
      for insert
      to authenticated
      with check (
        exists (
          select 1
          from public.usuarios u
          where u.id = auth.uid()
            and lower(coalesce(u.papel::text, '')) in ('admin', 'dono', 'gestor')
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tarefas_almoxarifado'
      and policyname = 'tarefas_almox_update_gestores_ou_responsavel'
  ) then
    create policy tarefas_almox_update_gestores_ou_responsavel
      on public.tarefas_almoxarifado
      for update
      to authenticated
      using (
        responsible_user_id = auth.uid()
        or exists (
          select 1
          from public.usuarios u
          where u.id = auth.uid()
            and lower(trim(tarefas_almoxarifado.responsible_name)) = lower(trim(u.nome))
        )
        or exists (
          select 1
          from public.usuarios u
          where u.id = auth.uid()
            and lower(coalesce(u.papel::text, '')) in ('admin', 'dono', 'gestor')
        )
      )
      with check (
        responsible_user_id = auth.uid()
        or exists (
          select 1
          from public.usuarios u
          where u.id = auth.uid()
            and lower(trim(tarefas_almoxarifado.responsible_name)) = lower(trim(u.nome))
        )
        or exists (
          select 1
          from public.usuarios u
          where u.id = auth.uid()
            and lower(coalesce(u.papel::text, '')) in ('admin', 'dono', 'gestor')
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tarefas_almoxarifado'
      and policyname = 'tarefas_almox_delete_gestores'
  ) then
    create policy tarefas_almox_delete_gestores
      on public.tarefas_almoxarifado
      for delete
      to authenticated
      using (
        exists (
          select 1
          from public.usuarios u
          where u.id = auth.uid()
            and lower(coalesce(u.papel::text, '')) in ('admin', 'dono', 'gestor')
        )
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tarefas_almoxarifado_historico'
      and policyname = 'tarefas_almox_hist_select_authenticated'
  ) then
    create policy tarefas_almox_hist_select_authenticated
      on public.tarefas_almoxarifado_historico
      for select
      to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tarefas_almoxarifado_historico'
      and policyname = 'tarefas_almox_hist_insert_authenticated'
  ) then
    create policy tarefas_almox_hist_insert_authenticated
      on public.tarefas_almoxarifado_historico
      for insert
      to authenticated
      with check (true);
  end if;
end $$;

comment on table public.tarefas_almoxarifado is
  'Tarefas do quadro Kanban operacional do Almoxarifado.';

comment on table public.tarefas_almoxarifado_historico is
  'Historico simples de criacao, edicao e movimentacao das tarefas do Kanban do Almoxarifado.';
