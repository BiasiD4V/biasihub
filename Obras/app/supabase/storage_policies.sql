-- Policies para bucket 'usuarios' (fotos de perfil)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Leitura publica usuarios') THEN
    EXECUTE 'CREATE POLICY "Leitura publica usuarios" ON storage.objects FOR SELECT USING (bucket_id = ''usuarios'')';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Upload autenticado usuarios') THEN
    EXECUTE 'CREATE POLICY "Upload autenticado usuarios" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = ''usuarios'')';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Update autenticado usuarios') THEN
    EXECUTE 'CREATE POLICY "Update autenticado usuarios" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = ''usuarios'')';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Delete autenticado usuarios') THEN
    EXECUTE 'CREATE POLICY "Delete autenticado usuarios" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = ''usuarios'')';
  END IF;
END$$;
