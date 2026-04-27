-- 16-paulo-conhecimento.sql
-- Base de conhecimento aprendida pelo Paulo IA ao longo das conversas
-- O Paulo grava automaticamente insights uteis de cada conversa

create table if not exists public.paulo_conhecimento (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  pergunta text not null,
  resposta text not null,
  rota text not null default 'global',
  categoria text not null default 'conversa',
  ativo boolean not null default true
);

create index if not exists idx_paulo_conhecimento_rota
  on public.paulo_conhecimento (rota);

create index if not exists idx_paulo_conhecimento_ativo
  on public.paulo_conhecimento (ativo) where ativo = true;

create index if not exists idx_paulo_conhecimento_criado
  on public.paulo_conhecimento (criado_em desc);

alter table public.paulo_conhecimento enable row level security;

-- Sem policies: apenas service_role (backend) consegue inserir/ler por bypass de RLS.
