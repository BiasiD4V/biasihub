# Sistema de "Lembrar de Mim" com IP do Computador

## 📋 Visão Geral

Sistema que permite que múltiplos usuários usando a mesma conta do Google sejam diferenciados pelo **IP do computador** para login automático (Remember Me).

### Como Funciona

1. **Ao fazer login**, o usuário pode marcar "Lembrar de mim neste computador"
2. **Sistema captura**: Email + IP do PC + Device Name + UserAgent
3. **Armazena** uma sessão por 30 dias no banco de dados
4. **Na próxima visita** do mesmo IP, o login é automático se a sessão ainda for válida
5. **Usuário pode gerenciar** quais dispositivos têm acesso salvo

## 🔧 Implementação

### 1. Criar Tabela no Supabase

Execute o SQL em `orcamentos/scripts/sql/08-device-sessions.sql`:

```bash
# Via Supabase Dashboard:
1. Abra SQL Editor
2. Cole todo o conteúdo de 08-device-sessions.sql
3. Execute
```

**Ou via script:**
```bash
cd orcamentos
npm run migrate:device-sessions
```

### 2. Arquivos Criados/Modificados

#### Serviços (infraestrutura)
- `src/infrastructure/services/deviceService.ts` - Captura IP e características do dispositivo
- `src/infrastructure/services/deviceSessionService.ts` - Gerencia sessões no banco

#### Contexto de Autenticação
- `src/context/AuthContext.tsx` - Atualizado com:
  - Validação automática de Remember Me na inicialização
  - Suporte a parâmetro `rememberMe` no método `login()`
  - Limpeza de tokens ao fazer logout

#### Páginas
- `src/pages/Login.tsx` - Adicionado checkbox "Lembrar de mim"
- `src/pages/MeusDispositivos.tsx` - Gerenciar dispositivos salvos

#### Banco de Dados
- `scripts/sql/08-device-sessions.sql` - Tabela e políticas RLS

### 3. Fluxo de Autenticação

```
┌─────────────────────────────────────┐
│  Usuário acessa o site              │
└────────────┬────────────────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│  AuthContext verifica:              │
│  - Sessão Supabase válida?          │
│  - Token Remember Me no localStorage?│
└────────────┬────────────────────────┘
             │
        ┌────┴────────────┐
        │                 │
        ▼                 ▼
    SIM        NÃO/EXPIRADO
    │          │
    ▼          ▼
  Autenticado  Tela de Login
              │
              ▼
        ┌─────────────────────┐
        │ Usuário faz login   │
        │ + marca "Lembrar"   │
        └────────┬────────────┘
                 │
                 ▼
        ┌─────────────────────┐
        │ Captura:            │
        │ - Email             │
        │ - IP do PC          │
        │ - Device Name       │
        │ - UserAgent         │
        └────────┬────────────┘
                 │
                 ▼
        ┌─────────────────────┐
        │ Salva no banco:     │
        │ device_sessions     │
        │ (30 dias)           │
        └────────┬────────────┘
                 │
                 ▼
        ┌─────────────────────┐
        │ Próxima visita do   │
        │ mesmo IP → Auto-    │
        │ login automático    │
        └─────────────────────┘
```

### 4. Features Implementadas

✅ **Captura de IP**
- Usa apiify.org e ipapi.co como fallback
- Cache local por 24 horas
- Fingerprint do navegador se IP indisponível

✅ **Gerenciamento de Sessões**
- Armazena até 30 dias
- Valida IP, email e integridade do token
- Lista todas as sessões do usuário
- Revoga sessões individuais ou todas

✅ **Segurança**
- Row Level Security (RLS) no Supabase
- Tokens únicos criptograficamente gerados
- Valida expiração automática
- IP mudou = sessão inválida

✅ **UX**
- Login automático se IP + token válidos
- Página "Meus Dispositivos" para gerenciar
- Mensagens claras sobre o que está acontecendo

### 5. API de Serviços

#### deviceService.ts
```typescript
getDeviceIP(): Promise<string>
getDeviceName(): string
getUserAgent(): string
generateSessionToken(): string
```

#### deviceSessionService.ts
```typescript
createDeviceSession(userId, email): Promise<DeviceSession | null>
validateRememberedSession(): Promise<{valid, userId, email}>
listUserSessions(userId): Promise<DeviceSession[]>
revokeDeviceSession(sessionId): Promise<boolean>
revokeAllDeviceSessions(userId): Promise<boolean>
clearRememberedSession(): void
```

### 6. Como Adicionar à Navegação

No seu arquivo de rotas, adicione:

```typescript
import { MeusDispositivos } from '../pages/MeusDispositivos';

// Dentro do router:
{
  path: '/meus-dispositivos',
  element: <MeusDispositivos />,
  requiresAuth: true
}
```

E na página de Configurações, adicione um link:
```typescript
<NavLink to="/meus-dispositivos" className="...">
  Meus Dispositivos
</NavLink>
```

### 7. Considerações de Segurança

⚠️ **IP Dinâmico**
- Se o usuário trocar de Wi-Fi ou Mobile, o IP muda
- A sessão será invalidada (segurança > conveniência)

⚠️ **Múltiplos Usuários Mesmo PC**
- Cada usuário tem seu próprio token no localStorage
- Navegadores diferentes = localStorage diferentes

⚠️ **Duração da Sessão**
- Padrão: 30 dias
- Modifique `SESSION_DURATION` em `deviceSessionService.ts` se necessário

⚠️ **Logout Remoto**
- Quando revoga um dispositivo, a sessão é marcada como inativa
- O token se torna inválido na próxima validação

### 8. Testando

```typescript
// 1. Fazer login com "Lembrar de mim"
// 2. Fechar o navegador e reabrir
// 3. Deve entrar automaticamente

// 4. Ir para /meus-dispositivos
// 5. Deve ver este computador na lista

// 6. Clicar em remover
// 7. Na próxima visita, pedir login novamente
```

### 9. Troubleshooting

**Antes de usar Remember Me:**
- Execute o SQL `08-device-sessions.sql` no Supabase
- Verifique que a tabela foi criada: `SELECT * FROM device_sessions;`
- Verifique que o RLS está habilitado

**Remember Me não funciona:**
- Verifique localStorage: `localStorage.getItem('remember_me_token')`
- Verifique permissões RLS na tabela
- Verifique console.log para erros de conexão com IP

**IP não é capturado:**
- Retirado de cache: `localStorage.removeItem('user_device_ip')`
- Se ainda não funcionar, usa fingerprint do navegador como fallback

---

**Desenvolvido para:** BiasihHub - Sistema de Orçamentos  
**Data:** Março 2026
