# 🚀 Enviando para GitHub

## Opção 1: Pelo GitHub Web (mais simples)

1. **Acesse** https://github.com/new
2. **Crie um novo repositório:**
   - Nome: `biasihub`
   - Descrição: `Sistema ERP - Biasi Engenharia`
   - Visibilidade: **Private** (só para você e seus amigos)
   - NÃO inicialize com README (já temos)
3. **Copie o comando que aparece:**
   ```
   git remote add origin https://github.com/BiasiHub/biasihub.git
   git branch -M main
   git push -u origin main
   ```

4. **Cole no Git Bash/PowerShell:**
   ```bash
   cd "/c/Users/guilherme.moreira/BIASI/BE - FILESERVER/10 - DOCUMENTOS PADRÃO/21 - BIASIHUB"
   git remote add origin https://github.com/BiasiHub/biasihub.git
   git branch -M main
   git push -u origin main
   ```

5. **Pronto!** Seu código está no GitHub

---

## Opção 2: Pelo Git CLI (linha de comando)

```bash
# Configure seu Git com suas credenciais GitHub
git config --global user.name "Seu Nome"
git config --global user.email "seu.email@github.com"

# Navegue até a pasta
cd "/c/Users/guilherme.moreira/BIASI/BE - FILESERVER/10 - DOCUMENTOS PADRÃO/21 - BIASIHUB"

# Adicione o remote (substitua com seu repositório)
git remote add origin https://github.com/BiasiHub/biasihub.git

# Envie para GitHub
git branch -M main
git push -u origin main
```

---

## 📦 Compartilhar o Instalador

### Com seus amigos via GitHub Releases

1. **Acesse** https://github.com/BiasiHub/biasihub/releases
2. **Clique em "Create a new release"**
3. **Preencha:**
   - Tag: `v1.0.0`
   - Title: `BiasíHub v1.0.0 - First Release`
   - Description:
   ```
   # BiasíHub Desktop v1.0.0

   Primeira versão do app desktop! 🎉

   ## Instalação

   1. Baixe: BiasíHub Setup 1.0.0.exe
   2. Execute e instale
   3. Abra e faça login

   ## Novidades
   - ✅ App desktop totalmente funcional
   - ✅ Hub (Portal)
   - ✅ Almoxarifado com solicitações IA
   - ✅ Comercial
   - ✅ Zero dependência do Vercel
   ```

4. **Faça upload do instalador:**
   - Arraste `Desktop/dist-installer/BiasíHub Setup 1.0.0.exe` para o campo de upload
5. **Clique em "Publish release"**

### Link para compartilhar:
```
https://github.com/BiasiHub/biasihub/releases
```

Seus amigos clicam em "BiasíHub Setup 1.0.0.exe" e pronto!

---

## ✅ Checklist Após Push

- [ ] Repositório criado em GitHub
- [ ] Código enviado para `main`
- [ ] Release criado com v1.0.0
- [ ] Instalador anexado à release
- [ ] Link compartilhado com amigos

---

## 💡 Próximas atualizações

Sempre que fizer mudanças:

```bash
git add .
git commit -m "feat: sua mudança aqui"
git push origin main
```

E crie uma nova release se quiser novo instalador:

```bash
Desktop\build.bat  # Gera novo .exe
# Depois suba nova release no GitHub
```

---

**Dúvidas? Veja INSTALL.md ou README.md**
