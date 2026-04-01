#!/usr/bin/env node

/**
 * CHECKLIST DE CONFIGURAÇÃO - OrcaBiasi
 * 
 * Execute este checklist para garantir que tudo está configurado:
 * 
 * ⬜ = Não feito
 * 🔶 = Em progresso  
 * ✅ = Concluído
 */

console.log(`
╔════════════════════════════════════════════════════════════════╗
║         CHECKLIST DE CONFIGURAÇÃO - OrcaBiasi                 ║
║                                                                ║
║  Sistema de Orçamentação com Autenticação Supabase            ║
╚════════════════════════════════════════════════════════════════╝

FASE 1: PREPARAÇÃO
─────────────────────────────────────────────────────────────────
⬜ 1. Instalar dependências
     $ npm install

⬜ 2. Definir variáveis de ambiente
     Arquivo: .env
     VITE_SUPABASE_URL=https://vzaabtzcilyoknksvhrc.supabase.co
     VITE_SUPABASE_ANON_KEY=eyJhbGciOi...

✅ 3. Variáveis já estão configuradas (.env existe)


FASE 2: BANCO DE DADOS
─────────────────────────────────────────────────────────────────
⬜ 4. Executar migração 04-auth-usuarios.sql
     Local: scripts/sql/04-auth-usuarios.sql
     Ação: Copiar conteúdo e executar no Supabase SQL Editor
     
⬜ 5. Cria tabela 'usuarios' com RLS


FASE 3: AUTENTICAÇÃO NO SUPABASE
─────────────────────────────────────────────────────────────────
⬜ 6. Acessar Supabase Dashboard
     URL: https://supabase.com/dashboard
     
⬜ 7. Ir para: Authentication → Users → "Add user"
     ⚠️  IMPORTANTE: Marque "Auto Confirm User"
     
⬜ 8. Criar 3 usuários:
     
     Usuário 1:
     ├─ Email:      guilherme@biasiengenharia.com
     ├─ Senha:      1234
     └─ UUID:       [COPIE E COLE AQUI APÓS CRIAR]
     
     Usuário 2:
     ├─ Email:      pauloconfar@biasiengenharia.com
     ├─ Senha:      1234
     └─ UUID:       [COPIE E COLE AQUI APÓS CRIAR]
     
     Usuário 3:
     ├─ Email:      ryan.stradioto@biasiengenharia.com
     ├─ Senha:      1234
     └─ UUID:       [COPIE E COLE AQUI APÓS CRIAR]


FASE 4: POPULAR BANCO DE DADOS
─────────────────────────────────────────────────────────────────
⬜ 9. Editar arquivo: scripts/sql/05-seed-usuarios.sql
     
     Substituir:
     ├─ <uuid-guilherme> → [UUID do usuário 1]
     ├─ <uuid-paulo>     → [UUID do usuário 2]
     └─ <uuid-ryan>      → [UUID do usuário 3]

⬜ 10. Executar 05-seed-usuarios.sql
      Local: scripts/sql/05-seed-usuarios.sql
      Ação: Copiar conteúdo atualizado
      Executar no Supabase SQL Editor


FASE 5: TESTE
─────────────────────────────────────────────────────────────────
⬜ 11. Verificar configuração
      $ npm run dev
      Abrir: http://localhost:5173/debug
      ✅ Deve mostrar usuários cadastrados
      
⬜ 12. Testar autenticação
      URL: http://localhost:5173
      Login com:
      ├─ Email: guilherme@biasiengenharia.com
      ├─ Senha: 1234
      └─ Resultado: DEVE acessar o dashboard
      
⬜ 13. Testar senha errada
      Email: guilherme@biasiengenharia.com
      Senha: 9999
      Resultado: DEVE aparecer erro! 🔒


FASE 6: PRODUÇÃO
─────────────────────────────────────────────────────────────────
⬜ 14. Build do projeto
      $ npm run build
      
⬜ 15. Deploy (Vercel, Netlify, etc)
      Lembre de copiar as variáveis .env para o ambiente


CHECKLIST CONCLUÍDO? ✅
─────────────────────────────────────────────────────────────────
Se todos os passos acima estão feitos, o sistema funcionará
corretamente e REJEITARÁ qualquer login com credenciais inválidas!

Precisa de ajuda? Execute:
$ npm run dev
Abra devtools com F12 para ver logs detalhados de erro.

═════════════════════════════════════════════════════════════════
`);
