# ClaudIA — Assistente de IA para Planejamento de Obras

![ClaudIA](https://img.shields.io/badge/ClaudIA-AI--Powered-blue?style=flat-square&color=233772)
![Gemini](https://img.shields.io/badge/Powered%20by-Google%20Gemini-blue?style=flat-square)
![React](https://img.shields.io/badge/Built%20with-React-blue?style=flat-square&color=61DAFB)

**ClaudIA** é um assistente de IA embarcado no ERP Biasi, especializado em Planejamento e Controle de Obras.

---

## ✨ Características

✅ **Especializado em Planejamento de Obras**
- Metodologia CPM/PERT
- Cálculo de folgas e caminho crítico
- Análise de Valor Agregado (EVM)
- Corrente Crítica (CCPM)
- Linha de balanço

✅ **Integrado no ERP Biasi**
- Widget flutuante no bottom-right
- Histórico persistente em localStorage
- Contexto de obra automático
- Markdown rendering

✅ **Powered by Google Gemini**
- IA avançada e rápida
- Responde em português claro
- Análise contextual

✅ **Pronto para Produção**
- Código limpo e documentado
- Sem dependências pesadas
- Production-ready

---

## 🚀 Quick Start

1. Copie os 6 arquivos JavaScript para `src/components/claudia/`
2. Configure `.env.local` com a API key
3. Envolver app em `<ChatProvider>`
4. Adicione `<ChatWindow />` na página
5. Pronto! ✅

**Veja `00-INSTRUCOES.md` para passo-a-passo completo.**

---

## 📦 Arquivos Incluídos

### Core

| Arquivo | Descrição |
|---------|-----------|
| `geminiService.js` | Integração com Google Gemini API, system prompt, contexto |
| `ChatContext.jsx` | Estado global do chat, localStorage, provider |
| `ChatWindow.jsx` | Widget principal flutuante, interface |

### Componentes

| Arquivo | Descrição |
|---------|-----------|
| `ChatMessage.jsx` | Renderização de mensagens com markdown |
| `ChatInput.jsx` | Input com Shift+Enter, form handling |
| `useChat.js` | Hook customizado com injeção de contexto |

### Config

| Arquivo | Descrição |
|---------|-----------|
| `.env.example` | Template de variáveis de ambiente |
| `00-INSTRUCOES.md` | Guia de integração (8 passos) |
| `README.md` | Este arquivo |

---

## 🔧 Configuração

### Variáveis de Ambiente

```env
# Obrigatória
VITE_GEMINI_API_KEY=AIzaSyAAf24DOuCuG8MO4Pwjk0NI-If83aGkAUc

# Opcional (para contexto de obra)
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### Dependências

```json
{
  "dependencies": {
    "react": "^18.0.0",
    "lucide-react": "^0.263.0"
  }
}
```

---

## 📚 Arquitetura

```
ClaudIA
├── geminiService.js (API integration)
├── ChatContext.jsx (Global state + localStorage)
├── ChatWindow.jsx (Main UI)
│   ├── ChatMessage.jsx (Message rendering)
│   └── ChatInput.jsx (Input form)
├── useChat.js (Hook for components)
└── Assets (icons via lucide-react)
```

### Flow

```
User Message
    ↓
ChatWindow → ChatInput (submit)
    ↓
geminiService.chat() → Gemini API
    ↓
Response → ChatContext (addMessage)
    ↓
ChatWindow (re-render) → ChatMessage (display)
    ↓
localStorage (persist)
```

---

## 🎨 Customização

### Cores
Mude `#233772` (azul Biasi) para sua cor em:
- `ChatWindow.jsx` (header, buttons)
- `ChatInput.jsx` (send button)
- `ChatMessage.jsx` (avatar)

### System Prompt
Edite o `SYSTEM_PROMPT` em `geminiService.js` para:
- Mudar expertise/especialidade
- Adicionar guidelines específicos
- Ajustar tom de resposta

### Contexto de Obra
Passe dados da obra ao enviar mensagem:
```jsx
const response = await geminiChat(text, {
  obraAtual: {
    nome: 'Obra X',
    cliente: 'Cliente Y',
    data_inicio: '2024-01-01',
    data_termino: '2024-06-30',
    valor: 150000,
    status: 'Em andamento'
  }
})
```

---

## 🧪 Testes

### Perguntas de Teste Recomendadas

1. "O que é caminho crítico?"
2. "Como calcular folga total?"
3. "Qual a diferença entre EAP e cronograma?"
4. "Como usar linha de balanço?"
5. "Explique corrente crítica (CCPM)"

### Verificações

- [ ] Widget aparece no bottom-right
- [ ] Botão abre/fecha o chat
- [ ] Mensagens aparecem e desaparecem
- [ ] Histórico persiste ao recarregar
- [ ] Status de conexão mostra verde ✅
- [ ] Markdown (bold, italic) renderiza
- [ ] Botões de copiar/deletar funcionam

---

## 🔒 Segurança

⚠️ **IMPORTANTE: API Key**

- A chave do Gemini está em `.env.local` (nunca em git)
- Nunca commite `.env.local`
- Revogue a chave se for exposta
- Para Vercel, configure em Settings → Environment Variables

---

## 📈 Performance

- **Bundle size**: ~5KB (sem Gemini API)
- **Histórico**: Até 100 mensagens em localStorage (~100KB)
- **Latência**: ~1-2s por resposta (dependente da IA)
- **Streaming**: Simulated via chunks (Gemini Flash não suporta true streaming)

---

## 🐛 Troubleshooting

### Widget não aparece
```
✓ Verificar se <ChatProvider> envolve a app
✓ Verificar se <ChatWindow /> foi adicionado
✓ Restart servidor: npm run dev
```

### Erro de API key
```
✓ Verificar .env.local existe
✓ Copiar chave corretamente de Google Console
✓ Verificar se Gemini API está ativada
```

### Mensagens não enviam
```
✓ Abrir DevTools (F12)
✓ Verificar Console por erros
✓ Verificar conexão de internet
✓ Testar em incognito (sem cache)
```

---

## 📖 Referências

- [Google Gemini API](https://ai.google.dev/)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Lucide Icons](https://lucide.dev)
- [Aldo Mattos — Planejamento e Controle de Obras](https://www.pini.com.br)

---

## 📝 Licença

Desenvolvido para Biasi Engenharia e Instalações Ltda.

---

## 🤝 Suporte

Para dúvidas ou problemas:
1. Revise `00-INSTRUCOES.md`
2. Check no console do navegador (F12)
3. Verifique as variáveis de ambiente
4. Teste em abas privadas/incognito

---

**Desenvolvido com ❤️ para melhorar o planejamento de obras na Biasi.**

v1.0.0 — Abril 2026
