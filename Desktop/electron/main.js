const { app, BrowserWindow, ipcMain, protocol, net, shell, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { autoUpdater } = require('electron-updater');
const COMERCIAL_API_ORIGIN = 'https://biasihub-comercial.vercel.app';

function isVersionNewer(nextVersion, currentVersion) {
  const nextParts = String(nextVersion).split('.').map((value) => Number.parseInt(value, 10) || 0);
  const currentParts = String(currentVersion).split('.').map((value) => Number.parseInt(value, 10) || 0);
  const maxLength = Math.max(nextParts.length, currentParts.length);

  for (let i = 0; i < maxLength; i += 1) {
    const next = nextParts[i] ?? 0;
    const current = currentParts[i] ?? 0;
    if (next > current) return true;
    if (next < current) return false;
  }

  return false;
}

// ── Registro do protocolo ANTES do app.whenReady() ──────────────────────────
// Necessário para o protocolo ser tratado como "seguro" (suporta fetch, CORS, etc.)
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'app',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

// ── Configuração de caminhos ─────────────────────────────────────────────────
function getAppsDir() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'apps');
  }
  return path.join(app.getAppPath(), 'apps');
}

// ── Electron Store (persistência de config) ──────────────────────────────────
let store;
async function getStore() {
  if (!store) {
    // electron-store é ESM em versões recentes; usa import() dinâmico
    const { default: Store } = await import('electron-store');
    store = new Store({ name: 'biasihub-config' });
  }
  return store;
}

// ── Handler da API de Solicitações (substitui Vercel serverless) ─────────────
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const SUPABASE_URL = 'https://vzaabtzcilyoknksvhrc.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6YWFidHpjaWx5b2tua3N2aHJjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDUyNDI0NiwiZXhwIjoyMDkwMTAwMjQ2fQ.b0QCcqqIJMrx8li0g_uRXoJ9z114YWyiHvu5QPjMG7o';

async function handleSolicitar(request) {
  try {
    const body = await request.json();
    const { texto, categoria, subcategoria, urgente } = body;

    if (!texto || !categoria) {
      return new Response(JSON.stringify({ error: 'texto e categoria são obrigatórios' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Tenta usar a chave da IA armazenada localmente
    const cfg = await getStore();
    const anthropicKey = cfg.get('anthropicKey') || '';

    if (!anthropicKey) {
      return new Response(JSON.stringify(fallbackClassificacao({ texto, categoria, subcategoria, urgente })), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Busca demandas existentes no Supabase
    let demandasExistentes = [];
    try {
      const demandasRes = await net.fetch(
        `${SUPABASE_URL}/rest/v1/solicitacoes_almoxarifado?status=in.(pendente,em_andamento)&select=categoria,subcategoria,prazo_sugerido,urgente&order=criado_em.desc&limit=10`,
        {
          headers: {
            apikey: SUPABASE_SERVICE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
        }
      );
      if (demandasRes.ok) demandasExistentes = await demandasRes.json();
    } catch {
      // ignora erro de busca de demandas
    }

    const hoje = new Date();
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const systemPrompt = `Você é o assistente de almoxarifado da Biasi Engenharia.
Analisa solicitações e decide prioridade, disponibilidade e prazo.

Regras:
- Frete de material: capacidade máxima 2 fretes/dia
- Separação de materiais: capacidade máxima 5 separações/dia
- Urgente = automaticamente alta prioridade
- Hora atual: ${hoje.toISOString()}
- Amanhã: ${amanha.toLocaleDateString('pt-BR')}

Demandas já programadas: ${JSON.stringify(demandasExistentes, null, 2)}

Responda APENAS em JSON válido, sem markdown:
{
  "prioridade": "baixa|normal|alta|urgente",
  "disponivel_amanha": true|false,
  "prazo_sugerido": "DD/MM/YYYY",
  "mensagem": "mensagem amigável ao usuário (max 120 chars)",
  "observacoes_internas": "notas para o time de almoxarifado"
}`;

    const userMessage = `Solicitação: "${texto}"
Categoria: ${categoria}
Subcategoria: ${subcategoria || 'não especificada'}
Urgente: ${urgente ? 'sim' : 'não'}`;

    const anthropicRes = await net.fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!anthropicRes.ok) {
      return new Response(JSON.stringify(fallbackClassificacao({ texto, categoria, subcategoria, urgente })), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await anthropicRes.json();
    const rawText = data.content?.[0]?.text || '{}';

    let analise;
    try {
      analise = JSON.parse(rawText);
    } catch {
      return new Response(JSON.stringify(fallbackClassificacao({ texto, categoria, subcategoria, urgente })), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      prioridade: analise.prioridade || 'normal',
      disponivel_amanha: analise.disponivel_amanha ?? true,
      prazo_sugerido: analise.prazo_sugerido || amanha.toLocaleDateString('pt-BR'),
      mensagem: analise.mensagem || 'Solicitação recebida com sucesso.',
      observacoes_internas: analise.observacoes_internas || '',
      processado_por_ia: true,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[solicitar] erro:', err);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

function fallbackClassificacao({ texto, categoria, subcategoria, urgente }) {
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  const prioridade = urgente ? 'urgente' : 'normal';
  const prazo = amanha.toLocaleDateString('pt-BR');

  let mensagem = 'Solicitação registrada. O almoxarifado entrará em contato.';
  if (categoria === 'materiais') {
    if (subcategoria?.includes('frete')) mensagem = 'Solicitação de frete registrada. Confirmaremos disponibilidade.';
    else if (subcategoria?.includes('separar')) mensagem = 'Separação agendada. O almoxarifado será notificado.';
    else if (subcategoria?.includes('buscar')) mensagem = 'Solicitação de busca em obra registrada.';
    else mensagem = 'Material registrado. Verificaremos o estoque.';
  } else if (categoria === 'ferramentas') {
    mensagem = 'Solicitação de ferramenta registrada.';
  }

  return {
    prioridade,
    disponivel_amanha: true,
    prazo_sugerido: prazo,
    mensagem,
    observacoes_internas: `Processado sem IA. Texto: "${texto}"`,
    processado_por_ia: false,
  };
}

async function proxyExternalRequest(request, targetUrl) {
  const method = (request.method || 'GET').toUpperCase();
  const headers = new Headers(request.headers || {});
  headers.delete('host');
  headers.delete('origin');

  const init = { method, headers };
  if (method !== 'GET' && method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  return net.fetch(targetUrl, init);
}

// ── Handler da API de Membros ──────────────────────────────────────────────────
async function handleMembros(request) {
  try {
    const authHeader = request.headers['authorization'] || request.headers.get?.('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userToken = authHeader.split(' ')[1];

    // Verifica se o usuário tem permissão (admin, dono, gestor)
    const perfilRes = await net.fetch(
      `${SUPABASE_URL}/auth/v1/user`,
      {
        headers: {
          'Authorization': `Bearer ${userToken}`,
          'apikey': SUPABASE_SERVICE_KEY,
        },
      }
    );

    if (!perfilRes.ok) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userData = await perfilRes.json();
    const userId = userData.id;

    // Busca o papel do usuário
    const userPapelRes = await net.fetch(
      `${SUPABASE_URL}/rest/v1/usuarios?id=eq.${userId}&select=papel`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY,
        },
      }
    );

    if (!userPapelRes.ok) {
      return new Response(JSON.stringify({ error: 'Permission denied' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userPapelData = await userPapelRes.json();
    const userPapel = userPapelData[0]?.papel;

    if (!userPapel || !['admin', 'dono', 'gestor'].includes(userPapel)) {
      return new Response(JSON.stringify({ error: 'Acesso restrito a admin, dono ou gestor' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Busca todos os membros
    const membrosRes = await net.fetch(
      `${SUPABASE_URL}/rest/v1/usuarios?select=id,nome,email,papel,ativo,criado_em,departamento&order=criado_em.asc`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY,
        },
      }
    );

    if (!membrosRes.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch members' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const membros = await membrosRes.json();

    // Busca o último login de cada usuário
    const sessionsRes = await net.fetch(
      `${SUPABASE_URL}/rest/v1/device_sessions?select=user_id,last_login_at&order=last_login_at.desc`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY,
        },
      }
    );

    let ultimoLoginMap = {};
    if (sessionsRes.ok) {
      const sessions = await sessionsRes.json();
      for (const s of sessions) {
        if (s.user_id && s.last_login_at && !ultimoLoginMap[s.user_id]) {
          ultimoLoginMap[s.user_id] = s.last_login_at;
        }
      }
    }

    const membrosComLogin = membros.map(m => ({
      ...m,
      ultimo_login: ultimoLoginMap[m.id] || null,
    }));

    return new Response(JSON.stringify(membrosComLogin), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[membros] erro:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// ── Protocol handler: serve arquivos dos apps ────────────────────────────────
function setupProtocol() {
  protocol.handle('app', async (request) => {
    const url = new URL(request.url);
    const appName = url.hostname.replace('.local', ''); // hub, almoxarifado, comercial
    const pathname = decodeURIComponent(url.pathname);

    // Rota da API de solicitações (POST)
    if (appName === 'almoxarifado' && pathname === '/api/solicitar') {
      return handleSolicitar(request);
    }

    // Rota da API de membros (GET)
    if (pathname === '/api/membros') {
      return handleMembros(request);
    }

    // Roteia as APIs do Comercial para o backend em producao (Jira/RDO)
    if (appName === 'comercial' && pathname.startsWith('/api/')) {
      const targetUrl = `${COMERCIAL_API_ORIGIN}${pathname}${url.search}`;
      return proxyExternalRequest(request, targetUrl);
    }

    // Serve arquivos estáticos
    const appsDir = getAppsDir();
    const appDir = path.join(appsDir, appName);

    if (!fs.existsSync(appDir)) {
      return new Response(`App "${appName}" não encontrado. Execute o build primeiro.`, {
        status: 404,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Resolve o caminho do arquivo
    let filePath = path.join(appDir, pathname === '/' ? 'index.html' : pathname);

    // SPA fallback: se o arquivo não existe, serve o index.html
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(appDir, 'index.html');
    }

    return net.fetch(pathToFileURL(filePath).href);
  });
}

// ── Criação da janela principal ──────────────────────────────────────────────
function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'BiasíHub',
    icon: path.join(__dirname, '..', 'resources', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // necessário para o preload acessar o ipcRenderer
    },
    backgroundColor: '#f8fafc',
  });

  // Carrega o Hub como tela inicial
  win.loadURL('app://hub.local/');

  // Abre links externos no browser padrão do sistema
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Permite navegação somente entre os apps internos
  win.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('app://')) return; // permitido
    event.preventDefault();
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
  });

  return win;
}

// ── IPC handlers ─────────────────────────────────────────────────────────────
function setupIPC() {
  ipcMain.handle('config:getAnthropicKey', async () => {
    const cfg = await getStore();
    return cfg.get('anthropicKey') || '';
  });

  ipcMain.handle('config:setAnthropicKey', async (_event, key) => {
    const cfg = await getStore();
    cfg.set('anthropicKey', key.trim());
    return true;
  });

  ipcMain.handle('app:getVersion', () => {
    return app.getVersion();
  });

  ipcMain.handle('updater:checkForUpdates', async () => {
    try {
      const currentVersion = app.getVersion();
      let latestVersion = null;
      let hasUpdate = false;

      try {
        const result = await autoUpdater.checkForUpdates();
        latestVersion = result?.updateInfo?.version;

        // Validar que latestVersion é diferente de currentVersion
        if (latestVersion && latestVersion !== currentVersion && isVersionNewer(latestVersion, currentVersion)) {
          hasUpdate = true;
        }
      } catch (checkError) {
        console.error('[updater] erro ao verificar releases:', checkError);
        // Continua sem erro crítico
      }

      return {
        hasUpdate,
        version: latestVersion || currentVersion,
        currentVersion,
      };
    } catch (error) {
      console.error('[updater] erro ao verificar:', error);
      return { hasUpdate: false, error: error.message };
    }
  });

  ipcMain.handle('updater:downloadAndInstall', async () => {
    try {
      const currentVersion = app.getVersion();
      let latestVersion = null;
      let hasUpdate = false;

      try {
        const checkResult = await autoUpdater.checkForUpdates();
        latestVersion = checkResult?.updateInfo?.version;

        if (latestVersion && latestVersion !== currentVersion && isVersionNewer(latestVersion, currentVersion)) {
          hasUpdate = true;
        }
      } catch (checkError) {
        console.error('[updater] erro ao verificar antes de instalar:', checkError);
      }

      if (!hasUpdate) {
        return { success: false, error: 'Sua versão está atualizada (v' + currentVersion + ').' };
      }

      await autoUpdater.downloadUpdate();
      autoUpdater.quitAndInstall();
      return { success: true };
    } catch (error) {
      console.error('[updater] erro ao instalar:', error);
      return { success: false, error: error.message };
    }
  });
}

// ── Setup Auto-updater ──────────────────────────────────────────────────────────
function setupUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.checkForUpdates().catch((error) => {
    console.error('[updater] erro no check inicial:', error);
  });
  // Verifica atualizacoes a cada 1 hora
  setInterval(() => {
    autoUpdater.checkForUpdates().catch((error) => {
      console.error('[updater] erro no check agendado:', error);
    });
  }, 60 * 60 * 1000);
}

// ── Inicialização ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  setupProtocol();
  setupIPC();
  setupUpdater();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
