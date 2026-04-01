-- 12-paulo-aprendizado.sql
-- Base de treinamento continuo do Paulo IA (termos/botoes nao reconhecidos)

create table if not exists public.paulo_feedback_termos (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  usuario_id uuid null,
  rota text null,
  pergunta_original text not null,
  tipo text not null default 'termo',
  termo text null,
  origem text not null default 'paulo-chat',
  resolvido boolean not null default false,
  observacao text null
);

create index if not exists idx_paulo_feedback_criado_em
  on public.paulo_feedback_termos (criado_em desc);

create index if not exists idx_paulo_feedback_rota
  on public.paulo_feedback_termos (rota);

create index if not exists idx_paulo_feedback_tipo
  on public.paulo_feedback_termos (tipo);

create index if not exists idx_paulo_feedback_resolvido
  on public.paulo_feedback_termos (resolvido);

alter table public.paulo_feedback_termos enable row level security;

-- Sem policies: apenas service_role (backend) consegue inserir/ler por bypass de RLS.
