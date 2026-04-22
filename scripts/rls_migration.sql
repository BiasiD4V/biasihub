-- ================================================================
-- BIASIHUB — RLS MIGRATION
-- Projeto Supabase: vzaabtzcilyoknksvhrc
-- Apps cobertos: Almoxarifado · Hub · Comercial · Obras
--
-- Como rodar:
--   Supabase Dashboard → SQL Editor → colar e executar
--
-- Regras gerais:
--   SELECT  → qualquer usuário autenticado (logado)
--   INSERT  → qualquer usuário autenticado (salvo exceções)
--   UPDATE  → próprio registro OU gestor/admin
--   DELETE  → somente admin / dono
-- ================================================================


-- ----------------------------------------------------------------
-- 1. FUNÇÕES AUXILIARES
--    SECURITY DEFINER = roda como superuser, evita recursão no RLS
-- ----------------------------------------------------------------

CREATE OR REPLACE FUNCTION auth_papel()
  RETURNS text
  LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT papel FROM usuarios WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION auth_is_admin()
  RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(auth_papel() IN ('admin', 'dono'), false)
$$;

CREATE OR REPLACE FUNCTION auth_is_gestor()
  RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT COALESCE(auth_papel() IN ('admin', 'dono', 'gestor'), false)
$$;


-- ----------------------------------------------------------------
-- 2. ENABLE RLS EM TODAS AS TABELAS
-- ----------------------------------------------------------------

ALTER TABLE usuarios                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE modulo_acesso               ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_sessions             ENABLE ROW LEVEL SECURITY;
ALTER TABLE presenca_usuarios           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes_almoxarifado   ENABLE ROW LEVEL SECURITY;

-- Almoxarifado
ALTER TABLE itens_almoxarifado          ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_almoxarifado  ENABLE ROW LEVEL SECURITY;
ALTER TABLE requisicoes_almoxarifado    ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitacoes_almoxarifado   ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamentos_almoxarifado   ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordens_compra               ENABLE ROW LEVEL SECURITY;
ALTER TABLE itens_ordem_compra          ENABLE ROW LEVEL SECURITY;
ALTER TABLE epis_catalogo               ENABLE ROW LEVEL SECURITY;
ALTER TABLE entregas_epi                ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores                ENABLE ROW LEVEL SECURITY;
ALTER TABLE veiculos                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE manutencoes_veiculo         ENABLE ROW LEVEL SECURITY;
ALTER TABLE abastecimentos_veiculo      ENABLE ROW LEVEL SECURITY;
ALTER TABLE acidentes_veiculo           ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras                       ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversas_paulo             ENABLE ROW LEVEL SECURITY;

-- Chat (compartilhado)
ALTER TABLE chat_canais                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_membros                ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_mensagens              ENABLE ROW LEVEL SECURITY;

-- Hub
ALTER TABLE agenda_eventos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE bira_tarefas                ENABLE ROW LEVEL SECURITY;
ALTER TABLE bira_comentarios            ENABLE ROW LEVEL SECURITY;
ALTER TABLE cargos                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitacoes_acesso         ENABLE ROW LEVEL SECURITY;
ALTER TABLE comercial_reunioes          ENABLE ROW LEVEL SECURITY;

-- Comercial
ALTER TABLE propostas                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE planilhas_orcamentarias     ENABLE ROW LEVEL SECURITY;
ALTER TABLE planilha_itens              ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogo_categorias         ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogo_subcategorias      ENABLE ROW LEVEL SECURITY;
ALTER TABLE disciplinas                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE tipos_obra                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE regioes                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE unidades                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE responsaveis_comerciais     ENABLE ROW LEVEL SECURITY;
ALTER TABLE follow_ups                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE pendencias                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE mudancas_etapa              ENABLE ROW LEVEL SECURITY;
ALTER TABLE incluso_excluso             ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicacoes                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE aprendizados                ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfis                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumos                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE insumos_historico           ENABLE ROW LEVEL SECURITY;
ALTER TABLE mao_de_obra_tipos           ENABLE ROW LEVEL SECURITY;
ALTER TABLE mao_de_obra_profissionais   ENABLE ROW LEVEL SECURITY;
ALTER TABLE mao_de_obra_composicoes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores_abc            ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendedor_atividades         ENABLE ROW LEVEL SECURITY;


-- ----------------------------------------------------------------
-- 3. POLÍTICAS
-- ----------------------------------------------------------------

-- ── USUARIOS ────────────────────────────────────────────────────
-- Todos veem; só admin cria/apaga; usuário edita o próprio perfil
CREATE POLICY "usuarios_select"
  ON usuarios FOR SELECT TO authenticated USING (true);

CREATE POLICY "usuarios_insert"
  ON usuarios FOR INSERT TO authenticated
  WITH CHECK (auth_is_admin());

CREATE POLICY "usuarios_update"
  ON usuarios FOR UPDATE TO authenticated
  USING (id = auth.uid() OR auth_is_admin())
  WITH CHECK (id = auth.uid() OR auth_is_admin());

CREATE POLICY "usuarios_delete"
  ON usuarios FOR DELETE TO authenticated
  USING (auth_is_admin());


-- ── MODULO_ACESSO ────────────────────────────────────────────────
CREATE POLICY "modulo_acesso_select"
  ON modulo_acesso FOR SELECT TO authenticated USING (true);

CREATE POLICY "modulo_acesso_write"
  ON modulo_acesso FOR ALL TO authenticated
  USING (auth_is_admin()) WITH CHECK (auth_is_admin());


-- ── DEVICE_SESSIONS ─────────────────────────────────────────────
-- Cada usuário vê/gerencia só suas próprias sessões
CREATE POLICY "device_sessions_own"
  ON device_sessions FOR ALL TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());


-- ── PRESENCA_USUARIOS ────────────────────────────────────────────
CREATE POLICY "presenca_select"
  ON presenca_usuarios FOR SELECT TO authenticated USING (true);

CREATE POLICY "presenca_own_write"
  ON presenca_usuarios FOR ALL TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());


-- ── NOTIFICACOES ─────────────────────────────────────────────────
-- Cada usuário só vê as suas próprias notificações
CREATE POLICY "notificacoes_own"
  ON notificacoes_almoxarifado FOR ALL TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());


-- ── ITENS ALMOXARIFADO ───────────────────────────────────────────
CREATE POLICY "itens_alm_select"
  ON itens_almoxarifado FOR SELECT TO authenticated USING (true);

CREATE POLICY "itens_alm_insert_update"
  ON itens_almoxarifado FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "itens_alm_update"
  ON itens_almoxarifado FOR UPDATE TO authenticated
  USING (auth_is_gestor()) WITH CHECK (auth_is_gestor());

CREATE POLICY "itens_alm_delete"
  ON itens_almoxarifado FOR DELETE TO authenticated
  USING (auth_is_admin());


-- ── MOVIMENTACOES ────────────────────────────────────────────────
CREATE POLICY "movim_select"
  ON movimentacoes_almoxarifado FOR SELECT TO authenticated USING (true);

CREATE POLICY "movim_insert"
  ON movimentacoes_almoxarifado FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "movim_update_delete"
  ON movimentacoes_almoxarifado FOR DELETE TO authenticated
  USING (auth_is_gestor());


-- ── REQUISICOES ──────────────────────────────────────────────────
CREATE POLICY "req_select"
  ON requisicoes_almoxarifado FOR SELECT TO authenticated USING (true);

CREATE POLICY "req_insert"
  ON requisicoes_almoxarifado FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "req_update"
  ON requisicoes_almoxarifado FOR UPDATE TO authenticated
  USING (solicitante_id = auth.uid() OR auth_is_gestor())
  WITH CHECK (solicitante_id = auth.uid() OR auth_is_gestor());

CREATE POLICY "req_delete"
  ON requisicoes_almoxarifado FOR DELETE TO authenticated
  USING (auth_is_gestor());


-- ── SOLICITACOES ─────────────────────────────────────────────────
CREATE POLICY "solic_select"
  ON solicitacoes_almoxarifado FOR SELECT TO authenticated USING (true);

CREATE POLICY "solic_insert"
  ON solicitacoes_almoxarifado FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "solic_update"
  ON solicitacoes_almoxarifado FOR UPDATE TO authenticated
  USING (solicitante_id = auth.uid() OR auth_is_gestor())
  WITH CHECK (solicitante_id = auth.uid() OR auth_is_gestor());

CREATE POLICY "solic_delete"
  ON solicitacoes_almoxarifado FOR DELETE TO authenticated
  USING (auth_is_gestor());


-- ── AGENDAMENTOS ─────────────────────────────────────────────────
CREATE POLICY "agenda_alm_select"
  ON agendamentos_almoxarifado FOR SELECT TO authenticated USING (true);

CREATE POLICY "agenda_alm_insert"
  ON agendamentos_almoxarifado FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "agenda_alm_update_delete"
  ON agendamentos_almoxarifado FOR DELETE TO authenticated
  USING (auth_is_gestor());


-- ── ORDENS DE COMPRA ────────────────────────────────────────────
CREATE POLICY "oc_select"
  ON ordens_compra FOR SELECT TO authenticated USING (true);

CREATE POLICY "oc_insert_update"
  ON ordens_compra FOR INSERT TO authenticated WITH CHECK (auth_is_gestor());

CREATE POLICY "oc_update"
  ON ordens_compra FOR UPDATE TO authenticated
  USING (auth_is_gestor()) WITH CHECK (auth_is_gestor());

CREATE POLICY "oc_delete"
  ON ordens_compra FOR DELETE TO authenticated USING (auth_is_admin());

CREATE POLICY "oc_itens_select"
  ON itens_ordem_compra FOR SELECT TO authenticated USING (true);

CREATE POLICY "oc_itens_write"
  ON itens_ordem_compra FOR ALL TO authenticated
  USING (auth_is_gestor()) WITH CHECK (auth_is_gestor());


-- ── EPIs ─────────────────────────────────────────────────────────
CREATE POLICY "epi_catalogo_select"
  ON epis_catalogo FOR SELECT TO authenticated USING (true);

CREATE POLICY "epi_catalogo_write"
  ON epis_catalogo FOR ALL TO authenticated
  USING (auth_is_gestor()) WITH CHECK (auth_is_gestor());

CREATE POLICY "entregas_epi_select"
  ON entregas_epi FOR SELECT TO authenticated USING (true);

CREATE POLICY "entregas_epi_insert"
  ON entregas_epi FOR INSERT TO authenticated WITH CHECK (auth_is_gestor());

CREATE POLICY "entregas_epi_delete"
  ON entregas_epi FOR DELETE TO authenticated USING (auth_is_admin());


-- ── FORNECEDORES ─────────────────────────────────────────────────
CREATE POLICY "fornecedores_select"
  ON fornecedores FOR SELECT TO authenticated USING (true);

CREATE POLICY "fornecedores_write"
  ON fornecedores FOR ALL TO authenticated
  USING (auth_is_gestor()) WITH CHECK (auth_is_gestor());

CREATE POLICY "fornecedores_abc_select"
  ON fornecedores_abc FOR SELECT TO authenticated USING (true);

CREATE POLICY "fornecedores_abc_write"
  ON fornecedores_abc FOR ALL TO authenticated
  USING (auth_is_gestor()) WITH CHECK (auth_is_gestor());


-- ── FROTA ────────────────────────────────────────────────────────
CREATE POLICY "veiculos_select"
  ON veiculos FOR SELECT TO authenticated USING (true);

CREATE POLICY "veiculos_write"
  ON veiculos FOR ALL TO authenticated
  USING (auth_is_gestor()) WITH CHECK (auth_is_gestor());

CREATE POLICY "manutencoes_select"
  ON manutencoes_veiculo FOR SELECT TO authenticated USING (true);

CREATE POLICY "manutencoes_insert"
  ON manutencoes_veiculo FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "manutencoes_update_delete"
  ON manutencoes_veiculo FOR DELETE TO authenticated USING (auth_is_gestor());

CREATE POLICY "abastecimentos_select"
  ON abastecimentos_veiculo FOR SELECT TO authenticated USING (true);

CREATE POLICY "abastecimentos_insert"
  ON abastecimentos_veiculo FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "abastecimentos_delete"
  ON abastecimentos_veiculo FOR DELETE TO authenticated USING (auth_is_gestor());

CREATE POLICY "acidentes_select"
  ON acidentes_veiculo FOR SELECT TO authenticated USING (true);

CREATE POLICY "acidentes_insert"
  ON acidentes_veiculo FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "acidentes_delete"
  ON acidentes_veiculo FOR DELETE TO authenticated USING (auth_is_admin());


-- ── OBRAS ────────────────────────────────────────────────────────
CREATE POLICY "obras_select"
  ON obras FOR SELECT TO authenticated USING (true);

CREATE POLICY "obras_write"
  ON obras FOR ALL TO authenticated
  USING (auth_is_gestor()) WITH CHECK (auth_is_gestor());


-- ── CONVERSAS PAULO ──────────────────────────────────────────────
-- Cada usuário só vê as suas próprias conversas
CREATE POLICY "paulo_own"
  ON conversas_paulo FOR ALL TO authenticated
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());


-- ── CHAT ─────────────────────────────────────────────────────────
CREATE POLICY "chat_canais_select"
  ON chat_canais FOR SELECT TO authenticated USING (true);

CREATE POLICY "chat_canais_write"
  ON chat_canais FOR ALL TO authenticated
  USING (auth_is_gestor()) WITH CHECK (auth_is_gestor());

CREATE POLICY "chat_membros_select"
  ON chat_membros FOR SELECT TO authenticated USING (true);

CREATE POLICY "chat_membros_insert"
  ON chat_membros FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "chat_membros_delete"
  ON chat_membros FOR DELETE TO authenticated USING (auth_is_gestor());

CREATE POLICY "chat_mensagens_select"
  ON chat_mensagens FOR SELECT TO authenticated USING (true);

CREATE POLICY "chat_mensagens_insert"
  ON chat_mensagens FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "chat_mensagens_update_delete"
  ON chat_mensagens FOR DELETE TO authenticated
  USING (remetente_id = auth.uid() OR auth_is_admin());


-- ── AGENDA ───────────────────────────────────────────────────────
CREATE POLICY "agenda_select"
  ON agenda_eventos FOR SELECT TO authenticated USING (true);

CREATE POLICY "agenda_insert"
  ON agenda_eventos FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "agenda_update_delete"
  ON agenda_eventos FOR DELETE TO authenticated
  USING (criado_por = auth.uid() OR auth_is_gestor());


-- ── BIRA ─────────────────────────────────────────────────────────
CREATE POLICY "bira_tarefas_select"
  ON bira_tarefas FOR SELECT TO authenticated USING (true);

CREATE POLICY "bira_tarefas_insert"
  ON bira_tarefas FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "bira_tarefas_update"
  ON bira_tarefas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "bira_tarefas_delete"
  ON bira_tarefas FOR DELETE TO authenticated USING (auth_is_gestor());

CREATE POLICY "bira_comentarios_select"
  ON bira_comentarios FOR SELECT TO authenticated USING (true);

CREATE POLICY "bira_comentarios_insert"
  ON bira_comentarios FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "bira_comentarios_delete"
  ON bira_comentarios FOR DELETE TO authenticated
  USING (autor_id = auth.uid() OR auth_is_gestor());


-- ── HUB GERAL ────────────────────────────────────────────────────
CREATE POLICY "cargos_select"
  ON cargos FOR SELECT TO authenticated USING (true);

CREATE POLICY "cargos_write"
  ON cargos FOR ALL TO authenticated
  USING (auth_is_admin()) WITH CHECK (auth_is_admin());

CREATE POLICY "solic_acesso_select"
  ON solicitacoes_acesso FOR SELECT TO authenticated USING (true);

CREATE POLICY "solic_acesso_insert"
  ON solicitacoes_acesso FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "solic_acesso_update_delete"
  ON solicitacoes_acesso FOR DELETE TO authenticated USING (auth_is_gestor());

CREATE POLICY "reunioes_select"
  ON comercial_reunioes FOR SELECT TO authenticated USING (true);

CREATE POLICY "reunioes_insert"
  ON comercial_reunioes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "reunioes_update_delete"
  ON comercial_reunioes FOR DELETE TO authenticated
  USING (criado_por = auth.uid() OR auth_is_gestor());


-- ── COMERCIAL ────────────────────────────────────────────────────
CREATE POLICY "propostas_select"
  ON propostas FOR SELECT TO authenticated USING (true);

CREATE POLICY "propostas_insert"
  ON propostas FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "propostas_update"
  ON propostas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "propostas_delete"
  ON propostas FOR DELETE TO authenticated USING (auth_is_admin());

CREATE POLICY "planilhas_select"
  ON planilhas_orcamentarias FOR SELECT TO authenticated USING (true);

CREATE POLICY "planilhas_insert"
  ON planilhas_orcamentarias FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "planilhas_update"
  ON planilhas_orcamentarias FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "planilhas_delete"
  ON planilhas_orcamentarias FOR DELETE TO authenticated USING (auth_is_admin());

CREATE POLICY "planilha_itens_select"
  ON planilha_itens FOR SELECT TO authenticated USING (true);

CREATE POLICY "planilha_itens_write"
  ON planilha_itens FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Tabelas de catálogo (somente gestor+ modifica)
CREATE POLICY "clientes_select"     ON clientes FOR SELECT TO authenticated USING (true);
CREATE POLICY "clientes_write"      ON clientes FOR ALL TO authenticated USING (auth_is_gestor()) WITH CHECK (auth_is_gestor());

CREATE POLICY "categorias_select"   ON categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY "categorias_write"    ON categorias FOR ALL TO authenticated USING (auth_is_gestor()) WITH CHECK (auth_is_gestor());

CREATE POLICY "cat_cat_select"      ON catalogo_categorias FOR SELECT TO authenticated USING (true);
CREATE POLICY "cat_cat_write"       ON catalogo_categorias FOR ALL TO authenticated USING (auth_is_gestor()) WITH CHECK (auth_is_gestor());

CREATE POLICY "cat_sub_select"      ON catalogo_subcategorias FOR SELECT TO authenticated USING (true);
CREATE POLICY "cat_sub_write"       ON catalogo_subcategorias FOR ALL TO authenticated USING (auth_is_gestor()) WITH CHECK (auth_is_gestor());

CREATE POLICY "disciplinas_select"  ON disciplinas FOR SELECT TO authenticated USING (true);
CREATE POLICY "disciplinas_write"   ON disciplinas FOR ALL TO authenticated USING (auth_is_gestor()) WITH CHECK (auth_is_gestor());

CREATE POLICY "tipos_obra_select"   ON tipos_obra FOR SELECT TO authenticated USING (true);
CREATE POLICY "tipos_obra_write"    ON tipos_obra FOR ALL TO authenticated USING (auth_is_gestor()) WITH CHECK (auth_is_gestor());

CREATE POLICY "regioes_select"      ON regioes FOR SELECT TO authenticated USING (true);
CREATE POLICY "regioes_write"       ON regioes FOR ALL TO authenticated USING (auth_is_gestor()) WITH CHECK (auth_is_gestor());

CREATE POLICY "unidades_select"     ON unidades FOR SELECT TO authenticated USING (true);
CREATE POLICY "unidades_write"      ON unidades FOR ALL TO authenticated USING (auth_is_gestor()) WITH CHECK (auth_is_gestor());

CREATE POLICY "resp_com_select"     ON responsaveis_comerciais FOR SELECT TO authenticated USING (true);
CREATE POLICY "resp_com_write"      ON responsaveis_comerciais FOR ALL TO authenticated USING (auth_is_gestor()) WITH CHECK (auth_is_gestor());

CREATE POLICY "perfis_select"       ON perfis FOR SELECT TO authenticated USING (true);
CREATE POLICY "perfis_write"        ON perfis FOR ALL TO authenticated USING (auth_is_admin()) WITH CHECK (auth_is_admin());

-- Insumos
CREATE POLICY "insumos_select"      ON insumos FOR SELECT TO authenticated USING (true);
CREATE POLICY "insumos_write"       ON insumos FOR ALL TO authenticated USING (auth_is_gestor()) WITH CHECK (auth_is_gestor());

CREATE POLICY "insumos_hist_select" ON insumos_historico FOR SELECT TO authenticated USING (true);
CREATE POLICY "insumos_hist_insert" ON insumos_historico FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "insumos_hist_delete" ON insumos_historico FOR DELETE TO authenticated USING (auth_is_admin());

CREATE POLICY "mob_tipos_select"    ON mao_de_obra_tipos FOR SELECT TO authenticated USING (true);
CREATE POLICY "mob_tipos_write"     ON mao_de_obra_tipos FOR ALL TO authenticated USING (auth_is_gestor()) WITH CHECK (auth_is_gestor());

CREATE POLICY "mob_prof_select"     ON mao_de_obra_profissionais FOR SELECT TO authenticated USING (true);
CREATE POLICY "mob_prof_write"      ON mao_de_obra_profissionais FOR ALL TO authenticated USING (auth_is_gestor()) WITH CHECK (auth_is_gestor());

CREATE POLICY "mob_comp_select"     ON mao_de_obra_composicoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "mob_comp_write"      ON mao_de_obra_composicoes FOR ALL TO authenticated USING (auth_is_gestor()) WITH CHECK (auth_is_gestor());

-- Atividades comerciais
CREATE POLICY "follow_ups_select"   ON follow_ups FOR SELECT TO authenticated USING (true);
CREATE POLICY "follow_ups_insert"   ON follow_ups FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "follow_ups_delete"   ON follow_ups FOR DELETE TO authenticated USING (auth_is_gestor());

CREATE POLICY "pendencias_select"   ON pendencias FOR SELECT TO authenticated USING (true);
CREATE POLICY "pendencias_insert"   ON pendencias FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "pendencias_update"   ON pendencias FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "pendencias_delete"   ON pendencias FOR DELETE TO authenticated USING (auth_is_gestor());

CREATE POLICY "mudancas_select"     ON mudancas_etapa FOR SELECT TO authenticated USING (true);
CREATE POLICY "mudancas_insert"     ON mudancas_etapa FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "mudancas_delete"     ON mudancas_etapa FOR DELETE TO authenticated USING (auth_is_admin());

CREATE POLICY "incluso_select"      ON incluso_excluso FOR SELECT TO authenticated USING (true);
CREATE POLICY "incluso_write"       ON incluso_excluso FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "indicacoes_select"   ON indicacoes FOR SELECT TO authenticated USING (true);
CREATE POLICY "indicacoes_write"    ON indicacoes FOR ALL TO authenticated USING (auth_is_gestor()) WITH CHECK (auth_is_gestor());

CREATE POLICY "aprendizados_select" ON aprendizados FOR SELECT TO authenticated USING (true);
CREATE POLICY "aprendizados_insert" ON aprendizados FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "aprendizados_update" ON aprendizados FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "aprendizados_delete" ON aprendizados FOR DELETE TO authenticated USING (auth_is_gestor());

CREATE POLICY "vend_ativ_select"    ON vendedor_atividades FOR SELECT TO authenticated USING (true);
CREATE POLICY "vend_ativ_insert"    ON vendedor_atividades FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "vend_ativ_delete"    ON vendedor_atividades FOR DELETE TO authenticated USING (auth_is_gestor());
