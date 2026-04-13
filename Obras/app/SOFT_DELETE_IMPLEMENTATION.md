# Implementação de Soft Delete para Usuários

## 📋 Resumo das Mudanças

Implementada prática de segurança padrão: **soft delete com auditoria** para exclusão de usuários.

### O que foi modificado:

#### 1. **Frontend (React)**

**Arquivo: `src/pages/Usuarios.jsx`**
- ✅ Função `excluir()` modificada para fazer soft delete
- ✅ Marca usuário com `deletado_em` (timestamp) e `deletado_por` (admin)
- ✅ Função `carregarUsuarios()` filtra usuários deletados automaticamente
- ✅ Usuários deletados não aparecem na lista, mas dados estão preservados no banco

**Arquivo: `src/context/AuthContext.jsx`**
- ✅ Função `carregarPerfil()` detecta usuários deletados
- ✅ Se usuário foi deletado: faz logout automático
- ✅ Mostra mensagem: "Seu acesso foi removido. Contate o administrador para reverter."
- ✅ Valida `deletado_em` em ambos os fluxos (auth normal e SSO)

#### 2. **Banco de Dados**

**Arquivo: `migrations/002_add_soft_delete_to_perfis.sql`**
- ✅ Adiciona coluna `deletado_em` (TIMESTAMP)
- ✅ Adiciona coluna `deletado_por` (UUID - referência ao admin)
- ✅ Cria índices para performance
- ✅ Cria views para auditoria:
  - `v_perfis_ativos`: apenas usuários não deletados
  - `v_perfis_deletados`: histórico de deletados com quem deletou

---

## 🔒 Segurança & Auditoria

### O que agora é registrado quando um usuário é deletado:

```
deletado_em: "2026-04-07T14:35:22.123Z"  (quando foi deletado)
deletado_por: "uuid-do-admin"              (quem deletou - rastreável)
```

### Cenários cobertos:

| Cenário | Comportamento |
|---------|---------------|
| **Deletar usuário ativo** | Marca como `deletado_em` + `ativo: false` |
| **Usuário deletado tenta login normal** | ❌ Logout automático + mensagem de erro |
| **Usuário deletado tenta SSO** | ❌ Bloqueia + mensagem de erro (não recria) |
| **Admin quer reativar** | ✅ Simples: limpa `deletado_em` e `ativo: true` |
| **Auditoria/Compliance** | ✅ Dados preservados com rastreamento completo |

---

## 🛠️ Como Aplicar as Mudanças

### Passo 1: Executar Migração SQL

Abra o **Supabase Console** → SQL Editor e execute:

```bash
# Opção A: Copiar todo o arquivo migrations/002_add_soft_delete_to_perfis.sql
# Opção B: Executar cada comando abaixo:

ALTER TABLE perfis
ADD COLUMN deletado_em TIMESTAMP WITH TIME ZONE DEFAULT NULL;

ALTER TABLE perfis
ADD COLUMN deletado_por UUID DEFAULT NULL;

CREATE INDEX idx_perfis_deletado_em ON perfis(deletado_em);
CREATE INDEX idx_perfis_deletado_por ON perfis(deletado_por);

ALTER TABLE perfis
ADD CONSTRAINT fk_perfis_deletado_por
  FOREIGN KEY (deletado_por) REFERENCES perfis(id) ON DELETE SET NULL;

CREATE OR REPLACE VIEW v_perfis_ativos AS
SELECT * FROM perfis WHERE deletado_em IS NULL;

CREATE OR REPLACE VIEW v_perfis_deletados AS
SELECT
  id, nome, email, perfil, ativo, deletado_em, deletado_por,
  (SELECT nome FROM perfis WHERE id = perfis.deletado_por) as deletado_por_nome,
  ultimo_acesso
FROM perfis
WHERE deletado_em IS NOT NULL
ORDER BY deletado_em DESC;
```

### Passo 2: Recarregar Frontend

A aplicação React agora automaticamente:
- Filtra usuários deletados da lista
- Bloqueia login de usuários deletados
- Registra quem deletou e quando

---

## 📊 Verificar Auditoria

### No Supabase Console:

```sql
-- Ver todos os usuários deletados
SELECT * FROM v_perfis_deletados;

-- Ver quem deletou cada usuário
SELECT
  id, nome, email, deletado_em,
  (SELECT nome FROM perfis WHERE id = perfis.deletado_por) as deletado_por_nome
FROM perfis
WHERE deletado_em IS NOT NULL;
```

---

## ↩️ Como Reverter uma Exclusão

Se precisa reativar um usuário deletado:

```sql
-- Opção 1: SQL direto
UPDATE perfis
SET deletado_em = NULL, deletado_por = NULL, ativo = true
WHERE id = 'uuid-do-usuario';

-- Opção 2: Criar feature no admin (recomendado)
-- Cria botão "Restaurar" que faz a query acima
```

---

## 🧪 Testar Fluxo Completo

1. **Login como admin**
2. **Ir para Gerenciar Usuários**
3. **Clicar botão 🗑️ (Excluir) em um usuário teste**
4. **Confirmar deleção**
5. **Verificar:**
   - ✅ Usuário desaparece da lista
   - ✅ Dados ainda existem no banco (`v_perfis_deletados`)
   - ✅ `deletado_em` e `deletado_por` preenchidos
6. **Logout e tentar login com conta deletada:**
   - ❌ Mostra erro: "Seu acesso foi removido"

---

## 📝 Notas Importantes

- **Não há remoção física**: Dados preservados para compliance (GDPR, SOX, etc)
- **RLS Policies**: Considere adicionar policies para que usuários deletados não vejam dados
- **Cascata**: Não usa DELETE, então vínculos em `usuario_obra` não são removidos
- **Reversível**: A qualquer momento pode-se restaurar deletando `deletado_em`

---

## ✅ Checklist

- [ ] Executar migração SQL no Supabase
- [ ] Recarregar aplicação React
- [ ] Testar exclusão de usuário
- [ ] Testar login de usuário deletado
- [ ] Verificar auditoria em `v_perfis_deletados`
- [ ] Documente em seu sistema de conformidade/auditoria
