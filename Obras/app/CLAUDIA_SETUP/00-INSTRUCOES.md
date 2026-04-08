# 🤖 ClaudIA — Integração no ERP Biasi

**Assistente de IA especializada em Planejamento e Controle de Obras**

---

## 📋 Conteúdo do Pacote

Este pacote contém **todos os arquivos necessários** para integrar o ClaudIA no seu React ERP:

1. `01-geminiService.js` — API Gemini integrada
2. `02-ChatContext.jsx` — Estado global do chat
3. `03-ChatMessage.jsx` — Componente de mensagem
4. `04-ChatInput.jsx` — Input de mensagens
5. `05-ChatWindow.jsx` — Widget principal
6. `06-useChat.js` — Hook customizado
7. `.env.example` — Variáveis de ambiente
8. `00-INSTRUCOES.md` — Este arquivo

---

## ⚡ 8 Passos para Integrar

### **Passo 1: Criar pasta de componentes**

No VS Code, crie a pasta:
```
src/components/claudia/
```

### **Passo 2: Colar os 6 arquivos JavaScript/JSX**

Copie estes arquivos para `src/components/claudia/`:

- `01-geminiService.js` → `src/components/claudia/geminiService.js`
- `02-ChatContext.jsx` → `src/components/claudia/ChatContext.jsx`
- `03-ChatMessage.jsx` → `src/components/claudia/ChatMessage.jsx`
- `04-ChatInput.jsx` → `src/components/claudia/ChatInput.jsx`
- `05-ChatWindow.jsx` → `src/components/claudia/ChatWindow.jsx`
- `06-useChat.js` → `src/components/claudia/useChat.js`

**Dica**: Use Ctrl+C para copiar o conteúdo de cada arquivo do CLAUDIA_SETUP

### **Passo 3: Configurar variáveis de ambiente**

1. No root do projeto, abra ou crie `.env.local`
2. Copie o conteúdo de `.env.example`
3. A chave já está configurada (não mude)

```env
VITE_GEMINI_API_KEY=AIzaSyAAf24DOuCuG8MO4Pwjk0NI-If83aGkAUc
```

### **Passo 4: Envolver a app em ChatProvider**

Abra `src/App.jsx` (ou o componente raiz) e:

```jsx
import { ChatProvider } from '@/components/claudia/ChatContext'

export default function App() {
  return (
    <ChatProvider>
      {/* resto da app */}
    </ChatProvider>
  )
}
```

### **Passo 5: Adicionar ChatWindow na página**

Em qualquer página onde quer o chat (recomendado: `Layout.jsx` ou `App.jsx`):

```jsx
import ChatWindow from '@/components/claudia/ChatWindow'

export default function Layout({ children }) {
  return (
    <>
      {children}
      <ChatWindow /> {/* Widget flutuante no bottom-right */}
    </>
  )
}
```

### **Passo 6: Instalar dependências (se não tiver)**

```bash
npm install lucide-react
```

Se já tiver `lucide-react`, pode pular esse passo.

### **Passo 7: Testar no navegador**

1. Salve todos os arquivos
2. No terminal: `npm run dev`
3. Abra o app no navegador
4. Procure pelo botão flutuante **ClaudIA** no bottom-right
5. Clique para abrir
6. Envie uma mensagem de teste

**Teste sugerido:**
```
O que é caminho crítico em planejamento de obras?
```

### **Passo 8: Configurar no Vercel (se for fazer deploy)**

Se vai fazer deploy no Vercel:

1. Vá para **Settings → Environment Variables**
2. Adicione:
   - **Key**: `VITE_GEMINI_API_KEY`
   - **Value**: `AIzaSyAAf24DOuCuG8MO4Pwjk0NI-If83aGkAUc`
3. Redeploy o projeto

---

## 🎨 Customização

### **Mudar cores (brand color)**

Em `ChatWindow.jsx`, procure por `#233772` (azul Biasi) e mude para sua cor:

```jsx
style={{ backgroundColor: '#sua_cor_aqui' }}
```

### **Mudar nome do assistente**

Em `geminiService.js`, no `SYSTEM_PROMPT`, mude:
```javascript
const SYSTEM_PROMPT = `Você é ClaudIA, assistente...`
```

Para:
```javascript
const SYSTEM_PROMPT = `Você é [Seu Nome], assistente...`
```

### **Adicionar contexto de obra**

Para injetar dados da obra atual, em `ChatWindow.jsx`:

```jsx
const handleSendMessage = async (text) => {
  // ...
  const response = await geminiChat(text, {
    obraAtual: {
      nome: 'Obra X',
      cliente: 'Cliente Y',
      data_inicio: '2024-01-01',
      // ... mais dados
    }
  })
}
```

---

## 🔧 Troubleshooting

### **"VITE_GEMINI_API_KEY não configurada"**

- Verifique se `.env.local` existe
- Restart o servidor (`npm run dev`)
- Limpe o cache do navegador (Ctrl+Shift+Delete)

### **"Erro ao conectar ao ClaudIA"**

- Verifique a chave da API no `.env.local`
- Teste em https://console.cloud.google.com (verifique se Gemini API está habilitada)
- Verifique a conexão de internet

### **Mensagens aparecem mas sem resposta**

- Abra o DevTools (F12) → Console
- Procure por erros em vermelho
- Copie o erro e debug

### **Widget não aparece**

- Verifique se `<ChatWindow />` está adicionado
- Verifique se `<ChatProvider>` envolve toda a app
- Restart o servidor

---

## 📚 Referências

- **Gemini API**: https://ai.google.dev/
- **React Docs**: https://react.dev
- **Tailwind CSS**: https://tailwindcss.com

---

## ✅ Checklist Final

- [ ] Pasta `src/components/claudia/` criada
- [ ] 6 arquivos copiados para a pasta
- [ ] `.env.local` configurado com VITE_GEMINI_API_KEY
- [ ] `<ChatProvider>` envolve a app
- [ ] `<ChatWindow />` adicionado na página
- [ ] `lucide-react` instalado
- [ ] Servidor rodando (`npm run dev`)
- [ ] Widget ClaudIA aparece no bottom-right
- [ ] Teste de mensagem funcionou

---

## 🚀 Pronto!

ClaudIA está pronto para usar. Boa sorte com suas obras!

**Dúvidas?** Revise este documento ou check no console do navegador.
