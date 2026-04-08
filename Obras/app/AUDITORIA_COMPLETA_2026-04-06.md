# AUDITORIA COMPLETA - ERP Gestão Obras
**Data:** 06/04/2026 | **Status:** 18 problemas identificados

## ⚠️ PROBLEMAS CRÍTICOS (4)

### 1. **Queries N+1 em ChatWindow.jsx**
- **Impacto:** Até 15+ queries sequenciais causam travamento
- **Solução:** Usar `Promise.all()` para paralelizar
- **Tempo:** 2 horas

### 2. **Validação de Permissões Insuficiente em ObraContext.jsx**
- **Risco:** Usuário pode acessar obras sem permissão se RLS falhar
- **Solução:** Validar `podeVerObra()` antes de usar `obraSelecionadaId`
- **Tempo:** 3 horas

### 3. **Promises Não Tratadas em ObraContext.jsx**
- **Problema:** Erros desaparecem silenciosamente (`.catch(() => {})`)
- **Solução:** Adicionar feedback visual ao usuário e logging adequado
- **Tempo:** 2 horas

### 4. **Tratamento Insuficiente em AuthContext.jsx (SSO)**
- **Problema:** Race condition na criação de perfil + silenciamento de erros
- **Solução:** Try-catch adequado + verificação de perfil ativo
- **Tempo:** 2 horas

---

## 🔴 PROBLEMAS GRAVES (4)

### 5. **Queries Sem Limite**
- **Localização:** ObraContext.jsx, supabase.js
- **Problema:** `select('*').range(0, 9999)` falha se >10K registros
- **Solução:** Implementar paginação com limite padrão de 500
- **Tempo:** 3 horas

### 6. **Logs de Debug em Produção**
- **Risco:** IDs de usuário, emails expostos no console do navegador
- **Localização:** AuthContext.jsx (5 instâncias), ProtectedRoute.jsx
- **Solução:** Usar `import.meta.env.DEV` para controlar
- **Tempo:** 0.5 hora

### 7. **localStorage Sem Validação**
- **Problema:** Pode ser manipulado por XSS; JSON.parse sem try-catch
- **Solução:** Validar UUID + try-catch + verificar permissões ao carregar
- **Tempo:** 2 horas

### 8. **Falta de Validação de Entrada (Usuarios.jsx)**
- **Problema:** Email/nome/perfil sem validação antes de enviar
- **Solução:** Implementar regex de email + verificação de campos vazios
- **Tempo:** 2 horas

---

## 🟠 PROBLEMAS MÉDIOS (4)

### 9. **Catch Genérico Sem Diferenciação** (43 instâncias)
- **Problema:** Todos os erros tratados igual; mensagens genéricas
- **Solução:** Diferenciar por tipo (NETWORK, CORS, timeout)
- **Tempo:** 2 horas

### 10. **useEffect com Memory Leak** (ObraContext.jsx)
- **Problema:** Query async sem cleanup ao unmount
- **Solução:** Adicionar `isMounted` flag e retornar função cleanup
- **Tempo:** 1 hora

### 11. **Paginação em Queries Grandes**
- **Problema:** Múltiplas funções em supabase.js sem limite
- **Solução:** Refatorar para retornar `{dados, total, pagina}`
- **Tempo:** 3 horas

### 12. **Sem Validação de RLS em Frontend**
- **Problema:** RLS é "segurança de verdade", frontend apenas UX
- **Solução:** Estender RLS para tarefas, tarefas_comentarios, contratos
- **Tempo:** 1 hora

---

## 🟡 QUALIDADE DE CÓDIGO (3)

### 13. **Código Duplicado em Permissões**
- **Localização:** AuthContext.jsx + Usuarios.jsx
- **Solução:** Centralizar em `src/lib/permissoes.js`
- **Tempo:** 1 hora

### 14. **TODOs Não Implementados**
- **Exemplos:** "TODO: Calcular caminho crítico", "TODO: Implementar baseline EAP"
- **Solução:** Converter em issues do repositório
- **Tempo:** 8 horas (implementação futura)

### 15. **Gerador de Senha Fraco**
- **Problema:** 10 caracteres = 2^59 bits (insuficiente)
- **Solução:** Usar 16 caracteres + crypto.getRandomValues()
- **Tempo:** 0.5 hora

---

## 📋 CHECKLIST RLS

✅ RLS habilitada em `obra_planejamentos`  
✅ RLS habilitada em `planejamento_eap`  
✅ Função `usuario_pode_acessar_obra()` implementada  
❌ RLS **NÃO** habilitada em: tarefas, tarefas_comentarios, tarefas_historico, contratos

**Recomendação:** Ativar RLS nessas tabelas antes de produção

---

## 📊 CRONOGRAMA RECOMENDADO

### Sprint 1 (Próxima semana) - 10 horas
- [ ] 1.1 Resolver N+1 queries (2h)
- [ ] 1.2 Validação de permissões (3h)
- [ ] 1.3 Promises tratadas (2h)
- [ ] 1.4 AuthContext SSO (2h)
- [ ] 6 Remover logs de debug (0.5h)

### Sprint 2 (Semana seguinte) - 10 horas
- [ ] 2 Adicionar validação localStorage (2h)
- [ ] 4 Validação de entrada (2h)
- [ ] 5 Implementar paginação (3h)
- [ ] 10 Memory leak fix (1h)
- [ ] 15 Gerador de senha (0.5h)
- [ ] 13 Centralizar permissões (1.5h)

### Sprint 3+ (Médio prazo)
- [ ] 9 Diferenciar catches
- [ ] 11 Refatorar queries
- [ ] 12 Estender RLS
- [ ] 14 Implementar TODOs

---

## 🎯 AÇÃO IMEDIATA

**Antes de qualquer deploy em produção:**
1. ✋ Desabilitar ChatWindow (problema 1.1)
2. ✅ Remover console.log com dados sensíveis (problema 6)
3. ✅ Ativar RLS em tarefas, contratos
4. ✅ Validar localStorage em ObraContext
5. ✅ Validar permissões antes de renderizar

---

**Gerado por:** Claude Code Audit Agent  
**Modelo:** claude-haiku-4-5-20251001
