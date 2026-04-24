-- ============================================================================
--  Requisições: colunas de separação + bucket de Storage
--  Suporta: cronômetro de separação, atendimento parcial (via itens jsonb),
--           anexos (fotos/vídeos/áudios) carregados pelo app web que precisam
--           chegar também no app Electron do almoxarifado.
-- ============================================================================

-- 1) Colunas de separação (idempotente)
alter table if exists public.requisicoes_almoxarifado
  add column if not exists iniciado_em      timestamptz,
  add column if not exists finalizado_em    timestamptz,
  add column if not exists separador_id     uuid references public.usuarios(id) on delete set null;

create index if not exists idx_requisicoes_almox_iniciado_em   on public.requisicoes_almoxarifado (iniciado_em);
create index if not exists idx_requisicoes_almox_finalizado_em on public.requisicoes_almoxarifado (finalizado_em);
create index if not exists idx_requisicoes_almox_separador_id  on public.requisicoes_almoxarifado (separador_id);

-- 2) Bucket público "requisicoes" para fotos/vídeos/áudios/PDFs
insert into storage.buckets (id, name, public)
values ('requisicoes', 'requisicoes', true)
on conflict (id) do update set public = true;

-- 3) Policies de Storage: qualquer usuário autenticado pode enviar, todo mundo pode ler
-- (Ajuste conforme política da empresa; leitura pública facilita o Electron exibir.)
do $$
begin
  -- leitura pública
  begin
    create policy "requisicoes_read_public"
      on storage.objects for select
      using (bucket_id = 'requisicoes');
  exception when duplicate_object then null; end;

  -- upload por autenticados
  begin
    create policy "requisicoes_insert_auth"
      on storage.objects for insert to authenticated
      with check (bucket_id = 'requisicoes');
  exception when duplicate_object then null; end;

  -- autenticados podem atualizar/remover seus próprios arquivos
  begin
    create policy "requisicoes_update_auth_own"
      on storage.objects for update to authenticated
      using (bucket_id = 'requisicoes' and auth.uid()::text = (storage.foldername(name))[1])
      with check (bucket_id = 'requisicoes' and auth.uid()::text = (storage.foldername(name))[1]);
  exception when duplicate_object then null; end;

  begin
    create policy "requisicoes_delete_auth_own"
      on storage.objects for delete to authenticated
      using (bucket_id = 'requisicoes' and auth.uid()::text = (storage.foldername(name))[1]);
  exception when duplicate_object then null; end;
end $$;
