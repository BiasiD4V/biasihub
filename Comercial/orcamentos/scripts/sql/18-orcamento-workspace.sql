-- Central dinâmica do orçamento.
-- Guarda áreas, escopo, cotações, documentos, histórico e estratégia por proposta.
-- A tela não usa localStorage: todo estado editável fica nesta tabela.

create table if not exists public.orcamento_workspace (
  id uuid primary key default gen_random_uuid(),
  proposta_id uuid not null references public.propostas(id) on delete cascade,
  dados jsonb not null default '{}'::jsonb,
  atualizado_por text,
  atualizado_em timestamptz not null default now(),
  criado_em timestamptz not null default now(),
  constraint orcamento_workspace_proposta_unique unique (proposta_id)
);

alter table public.orcamento_workspace enable row level security;

drop policy if exists "orcamento_workspace_select" on public.orcamento_workspace;
drop policy if exists "orcamento_workspace_insert" on public.orcamento_workspace;
drop policy if exists "orcamento_workspace_update" on public.orcamento_workspace;
drop policy if exists "orcamento_workspace_delete" on public.orcamento_workspace;

create policy "orcamento_workspace_select"
  on public.orcamento_workspace for select
  to authenticated
  using (true);

create policy "orcamento_workspace_insert"
  on public.orcamento_workspace for insert
  to authenticated
  with check (true);

create policy "orcamento_workspace_update"
  on public.orcamento_workspace for update
  to authenticated
  using (true)
  with check (true);

create policy "orcamento_workspace_delete"
  on public.orcamento_workspace for delete
  to authenticated
  using (
    exists (
      select 1
      from public.usuarios u
      where u.id = auth.uid()
        and lower(coalesce(u.papel, '')) in ('dono', 'admin', 'gestor')
    )
  );

grant all on public.orcamento_workspace to authenticated;

create index if not exists idx_orcamento_workspace_proposta
  on public.orcamento_workspace(proposta_id);

notify pgrst, 'reload schema';
