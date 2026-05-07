create table if not exists public.comercial_calendario_eventos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null check (length(trim(titulo)) > 0),
  tipo text not null check (
    tipo in (
      'visita_tecnica',
      'ferias',
      'pessoal',
      'externo',
      'treinamento',
      'plantao',
      'outro'
    )
  ),
  descricao text,
  pessoa text not null check (length(trim(pessoa)) > 0),
  substituto text,
  inicio date not null,
  fim date,
  dia_inteiro boolean not null default true,
  criado_por uuid references public.usuarios(id) on delete set null,
  criado_por_nome text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint comercial_calendario_eventos_periodo_check check (fim is null or fim >= inicio)
);

create index if not exists idx_comercial_calendario_eventos_inicio
  on public.comercial_calendario_eventos(inicio);

create index if not exists idx_comercial_calendario_eventos_pessoa
  on public.comercial_calendario_eventos(pessoa);

create or replace function public.set_comercial_calendario_eventos_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

drop trigger if exists trg_comercial_calendario_eventos_updated_at
  on public.comercial_calendario_eventos;

create trigger trg_comercial_calendario_eventos_updated_at
before update on public.comercial_calendario_eventos
for each row execute function public.set_comercial_calendario_eventos_updated_at();

alter table public.comercial_calendario_eventos enable row level security;

drop policy if exists "comercial_calendario_eventos_select"
  on public.comercial_calendario_eventos;
create policy "comercial_calendario_eventos_select"
on public.comercial_calendario_eventos
for select
to authenticated
using (true);

drop policy if exists "comercial_calendario_eventos_insert"
  on public.comercial_calendario_eventos;
create policy "comercial_calendario_eventos_insert"
on public.comercial_calendario_eventos
for insert
to authenticated
with check (true);

drop policy if exists "comercial_calendario_eventos_update"
  on public.comercial_calendario_eventos;
create policy "comercial_calendario_eventos_update"
on public.comercial_calendario_eventos
for update
to authenticated
using (true)
with check (true);

drop policy if exists "comercial_calendario_eventos_delete"
  on public.comercial_calendario_eventos;
create policy "comercial_calendario_eventos_delete"
on public.comercial_calendario_eventos
for delete
to authenticated
using (true);
