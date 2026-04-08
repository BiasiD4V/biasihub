# 🧪 Plano de Teste — RBAC + RLS System

## ⏱️ Checklist Pré-Teste

- [ ] Vercel deployment completado (check em https://vercel.com)
- [ ] SQL executado em Supabase (este arquivo tem instruções)
- [ ] Você com acesso Supabase + GitHub

---

## 📍 PASSO 1: Executar SQL no Supabase

### 1.1 Abrir Supabase SQL Editor
1. Acesse: https://app.supabase.com
2. Selecione projeto: **biasi** (mzepeedobbbmmlidzsob)
3. Menu esquerdo → **SQL Editor**

### 1.2 Copiar SQL
Abra arquivo: `database/rls_planejamento.sql`

**Ou execute direto:**
```bash
A partir de: database/rls_planejamento.sql
Copie TODO o conteúdo (355 linhas)
```

### 1.3 Colar e Executar
1. Cole na query area do Supabase
2. Botão **RUN** (canto direito)
3. **Aguarde:** `Success. Rows affected: 0`

### 1.4 Validar RLS Ativado
```sql
SELECT
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('obra_planejamentos', 'planejamento_eap', 'planejamento_atividades', 'avancos_fisicos', 'reprogramacoes', 'evm_snapshots', 'usuario_obra')
ORDER BY tablename;
```

**Esperado:** Coluna `rowsecurity` = `t` (true) para todas as 7 tabelas ✅

---

## 🧑 PASSO 2: Preparar Usuários de Teste

### 2.1 Usuários Necessários

Você precisa ter esses usuários criados no Supabase Auth:

| Email | Perfil | Papel Obra | Objetivo |
|---|---|---|---|
| `admin@biasi.com.br` | admin | — | Admin do sistema |
| `diretor@biasi.com.br` | diretor | — | Visualiza + aprova |
| `gerente@biasi.com.br` | gerente | — | Solicita + aprova |
| `planejamento@biasi.com.br` | planejamento | — | Edita + registra |
| `supervisor@biasi.com.br` | supervisor | (vincular) | Registra avanços |
| `visualizador@biasi.com.br` | visualizador | (vincular) | Read-only |

### 2.2 Verificar Usuários Existentes
```sql
-- Em Supabase SQL Editor
SELECT id, email, perfil FROM perfis ORDER BY perfil;
```

Se faltarem, crie manualmente em **Authentication → Users** ou use:
```sql
-- Criar via SQL (ideal para teste)
INSERT INTO auth.users (email, email_confirmed_at, encrypted_password, raw_app_metadata, role, aud)
VALUES (
  'supervisor@biasi.com.br',
  now(),
  crypt('SenhaTesteSup123!', gen_salt('bf')),
  '{"provider":"email","providers":["email"]}',
  'authenticated',
  'authenticated'
) ON CONFLICT DO NOTHING;

-- Depois inserir em perfis
INSERT INTO perfis (id, nome, email, perfil, ativo)
SELECT id, 'Supervisor Teste', email, 'supervisor', true
FROM auth.users
WHERE email = 'supervisor@biasi.com.br'
ON CONFLICT DO NOTHING;
```

---

## 🏗️ PASSO 3: Vincular Usuários a Obras

### 3.1 Abrir App em Produção
https://biasiobras.vercel.app

### 3.2 Login como **Admin**
- Email: `admin@biasi.com.br`
- Senha: (seu setup)

### 3.3 Ir para `/admin/acessos`
1. Sidebar → **ADMINISTRAÇÃO** → **Acessos Planejamento**
2. Clique **"Adicionar Acesso"**

### 3.4 Vincular Supervisor a Obra A
1. **Usuário:** Supervisor Teste
2. **Obra:** (seleciona primeira obra)
3. **Papel:** supervisor
4. Clique **Adicionar**

**Resultado esperado:** ✅ Alert `"Acesso adicionado!"`

### 3.5 Vincular Visualizador a Mesma Obra
1. Clique **"Adicionar Acesso"** novamente
2. **Usuário:** Visualizador Teste
3. **Obra:** (mesma obra)
4. **Papel:** visualizador
5. Clique **Adicionar**

---

## 🧪 PASSO 4: Testes Funcionais

### TESTE 1: Supervisor — Acesso Restrito à Obra
```
Cenário: Login como Supervisor
Esperado: Só vê uma obra
Passos:
  1. Logout do Admin
  2. Login: supervisor@biasi.com.br
  3. Dashboard aparece
  4. Clica "Obras" → vê APENAS sua obra ✅
  5. Clica Cronograma → vê dados da obra ✅
  6. Tenta criar atividade → bloqueado (sem botão) ✅
  7. Vai para Avanços → clica Adicionar → apareceformulário ✅
  8. Registra avanço → salvo ✅
```

**Validar RLS:**
```sql
-- Como supervisor no Supabase (via página)
-- Tente query nessa tabela:
SELECT COUNT(*) FROM obra_planejamentos;
-- Se RLS está funcionando: só vê sua obra
```

---

### TESTE 2: Visualizador — Read-Only Completo
```
Cenário: Login como Visualizador
Esperado: Acesso read-only
Passos:
  1. Logout do Supervisor
  2. Login: visualizador@biasi.com.br
  3. Clica Cronograma → vê dados ✅
  4. Tenta clicar "Editar Atividade" → nada (desabilitado) ✅
  5. Tenta registrar avanço → nada (desabilitado) ✅
  6. Acessa /admin/acessos → redireciona 403 ✅
```

---

### TESTE 3: Diretor — Aprova, Não Edita
```
Cenário: Login como Diretor
Esperado: Vê tudo, aprova, não edita
Passos:
  1. Logout do Visualizador
  2. Login: diretor@biasi.com.br
  3. Clica Cronograma → vê dados de TODAS as obras ✅
  4. Tenta criar atividade → bloqueado ❌
  5. Vai para Reprogramação → vê "Pendentes"
  6. Clica "Aprovar" em reprogramação → salvo ✅
  7. Status muda para "Aprovada" ✅
```

---

### TESTE 4: Gerente — Solicita + Aprova
```
Cenário: Login como Gerente
Esperado: Gerencia mudanças
Passos:
  1. Logout do Diretor
  2. Login: gerente@biasi.com.br
  3. Clica Reprogramação → formulário "Nova Solicitação" ✅
  4. Seleciona: Atividade, Nova Data, Motivo
  5. Clica "Solicitar Reprogramação" → criado ✅
  6. Status: "Pendente" ✅
  7. Como gerente, clica "Aprovar" → aprovado ✅
```

---

### TESTE 5: Planejamento — Edita + Opera
```
Cenário: Login como Planejamento
Esperado: Acesso operacional completo
Passos:
  1. Logout do Gerente
  2. Login: planejamento@biasi.com.br
  3. Clica Cronograma → vê TODAS as obras ✅
  4. Seleciona primeira obra
  5. Clica em atividade → "Editar" habilitado ✅
  6. Muda data → salva ✅
  7. Vai para Avanços → Adiciona registros ✅
  8. Vai para Reprogramação → Solicita mudança ✅
```

---

### TESTE 6: Admin — Acesso Total
```
Cenário: Login como Admin
Esperado: Tudo funciona
Passos:
  1. Logout do Planejamento
  2. Login: admin@biasi.com.br
  3. Todos os botões/funcionalidades habilitados ✅
  4. Acessa /admin/acessos → gerencia acessos ✅
  5. Pode editar/remover/adicionar papel qualquer ✅
```

---

## 🔐 TESTE 7: Validar RLS em Nível SQL

### 7.1 Teste com Supervisor
```sql
-- Como supervisor (simulado via JavaScript)
-- SELECT em obra_planejamentos
-- Esperado: Apenas linhas onde existe vínculo em usuario_obra

-- Verifique no Console do Navegador:
// Substituir com dados reais
const { data, error } = await supabase
  .from('obra_planejamentos')
  .select('*')

console.log(data) // Deve filtrar por acesso
```

### 7.2 Teste Negativo — Sem Acesso
```sql
-- Tente acessar obra que NÃO tem vínculo
-- SELECT deve retornar vazio (RLS bloqueando)

-- Query:
SELECT * FROM obra_planejamentos WHERE obra_id = 'uuid_não_vinculada';
-- Esperado: [] (vazio)
```

---

## 📊 Checklist de Sucesso

- [ ] SQL executado sem erros
- [ ] RLS habilitado em 7 tabelas (rowsecurity = t)
- [ ] Helper function `usuario_pode_acessar_obra()` criada
- [ ] Supervisor vê apenas sua obra
- [ ] Visualizador não consegue editar
- [ ] Diretor aprova reprogramação
- [ ] Gerente solicita e aprova
- [ ] Planejamento edita cronograma
- [ ] Admin gerencia acessos em `/admin/acessos`
- [ ] RLS bloqueia acesso não autorizado em SQL

---

## 🐛 Se Algo Falhar

| Problema | Solução |
|---|---|
| "Tabela não existe" | Verificar se schema_planejamento.sql foi executado antes |
| RLS retorna vazio | `usuario_obra` vazio. Usar `/admin/acessos` para vincular |
| "Coluna user_id não existe" | RLS SQL tinha erro. Reexecute rls_planejamento.sql |
| Supervisor vê todas obras | RLS não ativado. Verificar `rowsecurity = t` |
| Botões não desabilitam | usePermissoes retorna permissão. Verificar localStorage/cache |

---

## 🚀 Próximos Passos Após Testes

1. ✅ Se tudo passar → documenta cenários em TESTE_PASSED.md
2. ❌ Se algo falhar → fornece erro + stacktrace
3. Integrar em Cronograma.jsx/Evm.jsx/Reprogramacao.jsx
4. Adicionar ProtectedByObra em rotas críticas
5. Deploy final em produção

---

## 📞 Suporte Rápido

**Arquivo SQL deletado acidentalmente?**
```bash
git show HEAD:database/rls_planejamento.sql > rls_backup.sql
```

**Precisa reexecute RLS?**
```bash
# Drop todas as policies
psql -h db.supabase.co -U postgres -c "
  DROP POLICY IF EXISTS planejamento_select ON obra_planejamentos;
  DROP POLICY IF EXISTS planejamento_insert ON obra_planejamentos;
  -- ... etc
"
# Depois reexecuta rls_planejamento.sql
```

---

**Status:** Pronto para testar! Execute SQL no Supabase e siga os testes acima. 🚀
