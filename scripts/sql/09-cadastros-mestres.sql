-- Cadastros mestres no Supabase
-- Executar no SQL Editor antes de usar a tela Configuracoes em producao.

create extension if not exists pgcrypto;

create table if not exists public.tipos_obra (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  descricao text,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.disciplinas (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  nome text not null unique,
  especialidade text not null default 'geral',
  ativa boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.unidades (
  id uuid primary key default gen_random_uuid(),
  simbolo text not null unique,
  descricao text not null,
  tipo text not null check (tipo in ('comprimento', 'area', 'volume', 'unidade', 'outro')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create table if not exists public.regioes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  uf text not null,
  municipios text[] not null default '{}',
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint regioes_nome_uf_unique unique (nome, uf)
);

create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique,
  descricao text,
  tipo text not null check (tipo in ('insumo', 'servico', 'equipamento')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.tipos_obra enable row level security;
alter table public.disciplinas enable row level security;
alter table public.unidades enable row level security;
alter table public.regioes enable row level security;
alter table public.categorias enable row level security;

-- Politicas simples para usuarios autenticados
drop policy if exists "tipos_obra_select_auth" on public.tipos_obra;
drop policy if exists "tipos_obra_insert_auth" on public.tipos_obra;
drop policy if exists "tipos_obra_update_auth" on public.tipos_obra;
drop policy if exists "tipos_obra_delete_auth" on public.tipos_obra;

create policy "tipos_obra_select_auth" on public.tipos_obra for select to authenticated using (true);
create policy "tipos_obra_insert_auth" on public.tipos_obra for insert to authenticated with check (true);
create policy "tipos_obra_update_auth" on public.tipos_obra for update to authenticated using (true) with check (true);
create policy "tipos_obra_delete_auth" on public.tipos_obra for delete to authenticated using (true);

drop policy if exists "disciplinas_select_auth" on public.disciplinas;
drop policy if exists "disciplinas_insert_auth" on public.disciplinas;
drop policy if exists "disciplinas_update_auth" on public.disciplinas;
drop policy if exists "disciplinas_delete_auth" on public.disciplinas;

create policy "disciplinas_select_auth" on public.disciplinas for select to authenticated using (true);
create policy "disciplinas_insert_auth" on public.disciplinas for insert to authenticated with check (true);
create policy "disciplinas_update_auth" on public.disciplinas for update to authenticated using (true) with check (true);
create policy "disciplinas_delete_auth" on public.disciplinas for delete to authenticated using (true);

drop policy if exists "unidades_select_auth" on public.unidades;
drop policy if exists "unidades_insert_auth" on public.unidades;
drop policy if exists "unidades_update_auth" on public.unidades;
drop policy if exists "unidades_delete_auth" on public.unidades;

create policy "unidades_select_auth" on public.unidades for select to authenticated using (true);
create policy "unidades_insert_auth" on public.unidades for insert to authenticated with check (true);
create policy "unidades_update_auth" on public.unidades for update to authenticated using (true) with check (true);
create policy "unidades_delete_auth" on public.unidades for delete to authenticated using (true);

drop policy if exists "regioes_select_auth" on public.regioes;
drop policy if exists "regioes_insert_auth" on public.regioes;
drop policy if exists "regioes_update_auth" on public.regioes;
drop policy if exists "regioes_delete_auth" on public.regioes;

create policy "regioes_select_auth" on public.regioes for select to authenticated using (true);
create policy "regioes_insert_auth" on public.regioes for insert to authenticated with check (true);
create policy "regioes_update_auth" on public.regioes for update to authenticated using (true) with check (true);
create policy "regioes_delete_auth" on public.regioes for delete to authenticated using (true);

drop policy if exists "categorias_select_auth" on public.categorias;
drop policy if exists "categorias_insert_auth" on public.categorias;
drop policy if exists "categorias_update_auth" on public.categorias;
drop policy if exists "categorias_delete_auth" on public.categorias;

create policy "categorias_select_auth" on public.categorias for select to authenticated using (true);
create policy "categorias_insert_auth" on public.categorias for insert to authenticated with check (true);
create policy "categorias_update_auth" on public.categorias for update to authenticated using (true) with check (true);
create policy "categorias_delete_auth" on public.categorias for delete to authenticated using (true);

-- Seed inicial (mesmos valores que existiam nos mocks)
insert into public.tipos_obra (nome, descricao, ativo) values
  ('Industrial', 'Galpoes, fabricas e plantas industriais', true),
  ('Hospitalar', 'Hospitais, clinicas e unidades de saude', true),
  ('Comercial', 'Escritorios, lojas e centros comerciais', true),
  ('Residencial', 'Edificacoes residenciais e condominios', true),
  ('Infraestrutura', 'Obras publicas e de infraestrutura urbana', true)
on conflict (nome) do nothing;

insert into public.disciplinas (codigo, nome, especialidade, ativa) values
  ('ELE', 'Eletrica de Forca', 'eletrica', true),
  ('CAB', 'Cabeamento Estruturado', 'eletrica', true),
  ('HID', 'Hidrossanitario', 'hidrossanitario', true),
  ('ILU', 'Iluminacao', 'eletrica', true),
  ('CLI', 'Climatizacao', 'climatizacao', true)
on conflict (codigo) do nothing;

insert into public.unidades (simbolo, descricao, tipo) values
  ('un', 'Unidade', 'unidade'),
  ('m', 'Metro linear', 'comprimento'),
  ('m2', 'Metro quadrado', 'area'),
  ('m3', 'Metro cubico', 'volume'),
  ('pt', 'Ponto', 'unidade'),
  ('cx', 'Caixa', 'unidade'),
  ('vb', 'Verba', 'outro')
on conflict (simbolo) do nothing;

insert into public.regioes (nome, uf, municipios) values
  ('Grande Sao Paulo', 'SP', array['Sao Paulo','Guarulhos','Osasco','Santo Andre']),
  ('Interior SP', 'SP', array['Campinas','Ribeirao Preto','Sao Jose dos Campos']),
  ('Rio de Janeiro', 'RJ', array['Rio de Janeiro','Niteroi','Nova Iguacu']),
  ('Minas Gerais', 'MG', array['Belo Horizonte','Uberlandia','Contagem'])
on conflict (nome, uf) do nothing;

insert into public.categorias (nome, tipo, descricao) values
  ('Material Eletrico', 'insumo', null),
  ('Material Hidraulico', 'insumo', null),
  ('Mao de Obra', 'servico', null),
  ('Equipamento de Medicao', 'equipamento', null),
  ('Ferramenta Especializada', 'equipamento', null)
on conflict (nome) do nothing;
