-- Permite que a página pública (/req) envie fotos, áudio, vídeo e arquivos
-- para o bucket de requisições. A leitura continua pública porque os anexos
-- precisam aparecer no app interno e na fila do solicitante.

insert into storage.buckets (id, name, public)
values ('requisicoes', 'requisicoes', true)
on conflict (id) do update set public = true;

do $$
begin
  begin
    create policy "requisicoes_insert_anon_public"
    on storage.objects
    for insert
    to anon
    with check (
      bucket_id = 'requisicoes'
      and (storage.foldername(name))[1] = 'public'
    );
  exception
    when duplicate_object then null;
  end;
end $$;

