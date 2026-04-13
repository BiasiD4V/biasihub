# Auditoria de Segurança – ERP Biasi

Marque cada item conforme for auditando:
- [ ] OK – Item verificado e seguro
- [ ] Ajustar – Precisa de correção
- [ ] N/A – Não se aplica

---

## 1. Autenticação e Login
- [x] Uso de HTTPS em produção
- [x] Senhas nunca armazenadas em texto puro
- [x] Limite de tentativas e bloqueio temporário no login
- [x] Tokens de sessão seguros (httpOnly, Secure, SameSite)
- [x] Logout efetivo (invalidação de sessão)
- [x] Não expor dados sensíveis em erros de login

## 2. Autorização e Controle de Acesso (RBAC/RLS)
- [x] Perfis de usuário e permissões mapeados
- [x] Rotas e APIs sensíveis exigem autenticação e autorização
- [x] Testes de acesso não autorizado realizados
- [x] Implementação de RLS (Row Level Security) no banco
- [x] Regras de frontend para menus/botões conforme perfil

> **Observação:**
> As políticas de RLS estão implementadas para tabelas sensíveis conforme scripts SQL do projeto. Recomenda-se revisar periodicamente as políticas e garantir que todas as tabelas críticas estejam protegidas por RLS.

## 3. Banco de Dados
- [ ] Credenciais e strings de conexão protegidas
- [ ] Criptografia de dados sensíveis
- [ ] Backups regulares e protegidos
- [ ] Proteção contra SQL Injection
- [ ] Uso de RLS/views para limitar acesso

## 4. Uploads e Arquivos
- [ ] Tipos e tamanhos de arquivos restritos
- [ ] Uploads não públicos por padrão
- [ ] Sanitização de nomes de arquivos/paths
- [ ] Arquivos sensíveis protegidos por autenticação

## 5. Segurança de API e Frontend
- [ ] Validação e sanitização de entradas
- [ ] Proteção contra XSS, CSRF, etc
- [ ] Headers de segurança configurados
- [ ] Não expor dados sensíveis em erros/logs

## 6. Monitoramento, Logs e Alertas
- [ ] Logs de acesso e tentativas de login
- [ ] Alertas para atividades suspeitas
- [ ] Logs não expõem dados sensíveis

## 7. Revisão de Código e Dependências
- [ ] Análise estática (ESLint, SonarQube, npm audit)
- [ ] Dependências vulneráveis atualizadas
- [ ] Permissões de scripts/arquivos revisadas

## 8. Testes Práticos (Pentest)
- [ ] Testes de acesso não autorizado
- [ ] Testes de uploads maliciosos
- [ ] Simulação de ataques comuns (XSS, CSRF, SQLi)

---

> Use este checklist para documentar o progresso da auditoria e registrar evidências de cada verificação.
