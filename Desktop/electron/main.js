const { app, BrowserWindow, ipcMain, protocol, net, shell, Notification } = require('electron');
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { pathToFileURL } = require('url');
let autoUpdater = null;
let mainWindow = null;
let automationServer = null;
let automationState = null;
const COMERCIAL_API_ORIGIN = 'https://biasihub-comercial.vercel.app';
const DESKTOP_ROOT_DIR = path.join(__dirname, '..');
const AUTOMATION_STATE_PATH = path.join(DESKTOP_ROOT_DIR, '.mcp-automation-state.json');
const AUTOMATION_ARTIFACTS_DIR = path.join(DESKTOP_ROOT_DIR, '.mcp-artifacts');
const UPDATER_LOG_PATH = path.join(DESKTOP_ROOT_DIR, 'updater.log');
const nativeConsole = {
  log: typeof console.log === 'function' ? console.log.bind(console) : null,
  warn: typeof console.warn === 'function' ? console.warn.bind(console) : null,
  error: typeof console.error === 'function' ? console.error.bind(console) : null,
};

function isBrokenPipeError(error) {
  return (
    error?.code === 'EPIPE' ||
    error?.errno === 'EPIPE' ||
    String(error?.message || '').includes('EPIPE: broken pipe')
  );
}

function safeConsoleWrite(method, ...args) {
  try {
    const writer = nativeConsole?.[method];
    if (typeof writer === 'function') {
      writer(...args);
      return;
    }
  } catch (error) {
    if (isBrokenPipeError(error)) return;
  }

  try {
    const text = args
      .map((value) => {
        if (value instanceof Error) return value.stack || value.message;
        if (typeof value === 'string') return value;
        try {
          return JSON.stringify(value);
        } catch {
          return String(value);
        }
      })
      .join(' ');
    fs.appendFileSync(UPDATER_LOG_PATH, `[${new Date().toISOString()}] [${method}] ${text}\n`, 'utf8');
  } catch {
    // ignora falhas de log para não derrubar o processo principal
  }
}

function updaterLog(...args) {
  safeConsoleWrite('log', ...args);
}

function updaterWarn(...args) {
  safeConsoleWrite('warn', ...args);
}

function updaterError(...args) {
  safeConsoleWrite('error', ...args);
}

console.log = (...args) => safeConsoleWrite('log', ...args);
console.warn = (...args) => safeConsoleWrite('warn', ...args);
console.error = (...args) => safeConsoleWrite('error', ...args);

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
  return dirPath;
}

function safeDeleteFile(filePath) {
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // ignora falhas na limpeza de estado local
  }
}

function normalizeAutomationTimeout(value, fallbackMs = 10000) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallbackMs;
  return Math.min(parsed, 5 * 60 * 1000);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getMainWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow;
  const fallbackWindow = BrowserWindow.getAllWindows().find((win) => !win.isDestroyed()) || null;
  if (fallbackWindow) mainWindow = fallbackWindow;
  return fallbackWindow;
}

function describeWindow(win = getMainWindow()) {
  if (!win || win.isDestroyed()) {
    return {
      available: false,
      title: null,
      url: null,
      isVisible: false,
      isFocused: false,
      isMinimized: false,
      isLoading: false,
      bounds: null,
    };
  }

  return {
    available: true,
    title: win.getTitle(),
    url: win.webContents.getURL(),
    isVisible: win.isVisible(),
    isFocused: win.isFocused(),
    isMinimized: win.isMinimized(),
    isLoading: win.webContents.isLoading() || win.webContents.isLoadingMainFrame(),
    bounds: win.getBounds(),
  };
}

function writeAutomationState() {
  if (!automationState) return;
  fs.writeFileSync(
    AUTOMATION_STATE_PATH,
    JSON.stringify(
      {
        ...automationState,
        window: describeWindow(),
      },
      null,
      2
    ),
    'utf-8'
  );
}

function clearAutomationState() {
  safeDeleteFile(AUTOMATION_STATE_PATH);
}

function normalizeRoute(route = '/') {
  const raw = String(route || '/').trim();
  if (!raw || raw === '#') return '/';
  const withoutHash = raw.startsWith('#') ? raw.slice(1) : raw;
  return withoutHash.startsWith('/') ? withoutHash : `/${withoutHash}`;
}

function buildAppAutomationUrl({ url, appName, route }) {
  if (url && String(url).startsWith('app://')) return String(url);

  const normalizedApp = String(appName || 'hub').trim() || 'hub';
  const normalizedRoute = normalizeRoute(route || '/');

  return `app://${normalizedApp}.local${normalizedRoute}`;
}

async function waitForMainWindowReady({ timeoutMs = 15000, settleMs = 350 } = {}) {
  const win = getMainWindow();
  if (!win) {
    throw new Error('Janela principal nao encontrada.');
  }

  if (win.isMinimized()) win.restore();
  if (!win.isVisible()) win.show();
  win.focus();

  if (win.webContents.isLoading() || win.webContents.isLoadingMainFrame()) {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('Timeout aguardando a janela concluir o carregamento.'));
      }, normalizeAutomationTimeout(timeoutMs, 15000));

      const cleanup = () => {
        clearTimeout(timer);
        win.webContents.removeListener('did-finish-load', handleFinish);
        win.webContents.removeListener('did-fail-load', handleFail);
      };

      const handleFinish = () => {
        cleanup();
        resolve();
      };

      const handleFail = (_event, code, description, validatedUrl) => {
        cleanup();
        reject(new Error(`Falha ao carregar a janela (${code} ${description}) ${validatedUrl || ''}`.trim()));
      };

      win.webContents.once('did-finish-load', handleFinish);
      win.webContents.once('did-fail-load', handleFail);
    });
  }

  if (settleMs > 0) {
    await delay(settleMs);
  }

  return win;
}

async function runScriptInWindow(script, timeoutMs = 10000) {
  const win = await waitForMainWindowReady({ timeoutMs, settleMs: 150 });
  const effectiveTimeout = normalizeAutomationTimeout(timeoutMs, 10000);

  return Promise.race([
    win.webContents.executeJavaScript(String(script), true),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout executando script na janela ativa.')), effectiveTimeout);
    }),
  ]);
}

function buildDomSnapshotScript(options = {}) {
  const serializedOptions = JSON.stringify({
    includeHtml: Boolean(options.includeHtml),
    maxItems: Math.max(1, Math.min(80, Number(options.maxItems) || 24)),
    maxTextLength: Math.max(400, Math.min(60000, Number(options.maxTextLength) || 12000)),
    maxHtmlLength: Math.max(400, Math.min(60000, Number(options.maxHtmlLength) || 15000)),
  });

  return `(() => {
    const options = ${serializedOptions};
    const truncate = (value, maxLength) => {
      const text = String(value || '').replace(/\\s+/g, ' ').trim();
      return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
    };
    const isVisible = (element) => {
      const style = window.getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden' && element.offsetParent !== null;
    };
    const collect = (selector, mapper) =>
      Array.from(document.querySelectorAll(selector))
        .filter(isVisible)
        .slice(0, options.maxItems)
        .map((element, index) => {
          try {
            return mapper(element, index);
          } catch (error) {
            return { error: String(error) };
          }
        });

    return {
      title: document.title,
      url: window.location.href,
      readyState: document.readyState,
      bodyText: truncate(document.body?.innerText || '', options.maxTextLength),
      headings: collect('h1, h2, h3, [role="heading"]', (element) => ({
        text: truncate(element.innerText || element.textContent || '', 300),
        tag: element.tagName,
      })),
      buttons: collect('button, [role="button"], input[type="button"], input[type="submit"], a[href]', (element) => ({
        text: truncate(element.innerText || element.textContent || element.value || element.getAttribute('aria-label') || '', 240),
        tag: element.tagName,
        id: element.id || null,
        href: element.getAttribute('href') || null,
        disabled: Boolean(element.disabled),
      })),
      inputs: collect('input, textarea, select', (element) => ({
        tag: element.tagName,
        type: element.getAttribute('type') || null,
        name: element.getAttribute('name') || null,
        id: element.id || null,
        placeholder: element.getAttribute('placeholder') || null,
        value: truncate(element.value || '', 160),
      })),
      links: collect('a[href]', (element) => ({
        text: truncate(element.innerText || element.textContent || '', 200),
        href: element.href,
      })),
      activeElement: document.activeElement
        ? {
            tag: document.activeElement.tagName,
            id: document.activeElement.id || null,
            name: document.activeElement.getAttribute('name') || null,
          }
        : null,
      html: options.includeHtml ? truncate(document.documentElement?.outerHTML || '', options.maxHtmlLength) : undefined,
      capturedAt: new Date().toISOString(),
    };
  })();`;
}

async function captureWindowScreenshot({ outputPath } = {}) {
  const win = await waitForMainWindowReady({ timeoutMs: 15000, settleMs: 250 });
  ensureDirectory(AUTOMATION_ARTIFACTS_DIR);

  const finalPath = outputPath
    ? path.isAbsolute(outputPath)
      ? outputPath
      : path.join(DESKTOP_ROOT_DIR, outputPath)
    : path.join(AUTOMATION_ARTIFACTS_DIR, `desktop-screenshot-${Date.now()}.png`);

  ensureDirectory(path.dirname(finalPath));
  const image = await win.webContents.capturePage();
  fs.writeFileSync(finalPath, image.toPNG());

  return {
    path: finalPath,
    ...describeWindow(win),
  };
}

function isLoopbackRequest(request) {
  const address = request.socket?.remoteAddress || '';
  return address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
}

function isAutomationAuthorized(request) {
  if (!automationState?.token) return false;

  const authHeader = request.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  const headerToken = request.headers['x-biasihub-automation-token'];

  return bearerToken === automationState.token || headerToken === automationState.token;
}

function sendAutomationJson(response, statusCode, payload) {
  const body = JSON.stringify(payload, null, 2);
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  response.end(body);
}

async function readAutomationBody(request) {
  return new Promise((resolve, reject) => {
    let rawBody = '';

    request.on('data', (chunk) => {
      rawBody += chunk;
      if (rawBody.length > 1024 * 1024) {
        reject(new Error('Payload excede 1MB.'));
        request.destroy();
      }
    });

    request.on('end', () => {
      if (!rawBody) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(rawBody));
      } catch {
        reject(new Error('JSON invalido.'));
      }
    });

    request.on('error', reject);
  });
}

async function handleAutomationRequest(request, response) {
  if (!isLoopbackRequest(request)) {
    sendAutomationJson(response, 403, { error: 'Loopback only.' });
    return;
  }

  if (!isAutomationAuthorized(request)) {
    sendAutomationJson(response, 401, { error: 'Unauthorized.' });
    return;
  }

  const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');

  try {
    if (request.method === 'GET' && requestUrl.pathname === '/health') {
      sendAutomationJson(response, 200, {
        ok: true,
        pid: process.pid,
        startedAt: automationState?.startedAt || null,
        appVersion: app.getVersion(),
        window: describeWindow(),
      });
      return;
    }

    if (request.method === 'POST' && requestUrl.pathname === '/navigate') {
      const body = await readAutomationBody(request);
      const targetUrl = buildAppAutomationUrl({
        url: body.url,
        appName: body.app_name,
        route: body.route,
      });

      const win = await waitForMainWindowReady({
        timeoutMs: body.timeout_ms || 20000,
        settleMs: 100,
      });

      await win.loadURL(targetUrl);
      await waitForMainWindowReady({
        timeoutMs: body.timeout_ms || 20000,
        settleMs: body.settle_ms || 500,
      });
      writeAutomationState();

      sendAutomationJson(response, 200, {
        ok: true,
        targetUrl,
        window: describeWindow(win),
      });
      return;
    }

    if (request.method === 'POST' && requestUrl.pathname === '/dom-snapshot') {
      const body = await readAutomationBody(request);
      const snapshot = await runScriptInWindow(
        buildDomSnapshotScript({
          includeHtml: body.include_html,
          maxItems: body.max_items,
          maxTextLength: body.max_text_length,
          maxHtmlLength: body.max_html_length,
        }),
        body.timeout_ms || 12000
      );

      sendAutomationJson(response, 200, {
        ok: true,
        window: describeWindow(),
        snapshot,
      });
      return;
    }

    if (request.method === 'POST' && requestUrl.pathname === '/screenshot') {
      const body = await readAutomationBody(request);
      const result = await captureWindowScreenshot({
        outputPath: body.output_path,
      });

      sendAutomationJson(response, 200, {
        ok: true,
        screenshot: result,
      });
      return;
    }

    if (request.method === 'POST' && requestUrl.pathname === '/eval') {
      const body = await readAutomationBody(request);
      if (!body.script || !String(body.script).trim()) {
        sendAutomationJson(response, 400, { error: 'script obrigatorio.' });
        return;
      }

      const result = await runScriptInWindow(body.script, body.timeout_ms || 12000);
      sendAutomationJson(response, 200, {
        ok: true,
        window: describeWindow(),
        result,
      });
      return;
    }

    sendAutomationJson(response, 404, { error: 'Not found.' });
  } catch (error) {
    sendAutomationJson(response, 500, {
      error: String(error?.message || error),
      stack: error?.stack || null,
    });
  }
}

async function setupAutomationServer() {
  if (automationServer) return;

  ensureDirectory(AUTOMATION_ARTIFACTS_DIR);

  automationServer = http.createServer((request, response) => {
    handleAutomationRequest(request, response).catch((error) => {
      sendAutomationJson(response, 500, {
        error: String(error?.message || error),
        stack: error?.stack || null,
      });
    });
  });

  await new Promise((resolve, reject) => {
    automationServer.once('error', reject);
    automationServer.listen(0, '127.0.0.1', () => {
      automationServer.removeListener('error', reject);
      resolve();
    });
  });

  const address = automationServer.address();
  automationState = {
    port: typeof address === 'object' && address ? address.port : null,
    token: crypto.randomBytes(24).toString('hex'),
    startedAt: new Date().toISOString(),
    pid: process.pid,
    stateFilePath: AUTOMATION_STATE_PATH,
    artifactsDir: AUTOMATION_ARTIFACTS_DIR,
  };

  writeAutomationState();
}

function stopAutomationServer() {
  if (automationServer) {
    automationServer.close();
    automationServer = null;
  }

  automationState = null;
  clearAutomationState();
}

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
const OPENAI_ASSISTANTS_API_URL = 'https://api.openai.com/v1/assistants';
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
    const ollamaModel = cfg.get('ollamaModel') || 'llama3.2:1b';

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

    let rawText = null;

    // ── 1. Tenta Ollama (IA local, sem custo) ────────────────────────────────
    try {
      const ollamaRes = await net.fetch('http://localhost:11434/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollamaModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          temperature: 0.2,
          max_tokens: 400,
        }),
      });
      if (ollamaRes.ok) {
        const ollamaData = await ollamaRes.json();
        rawText = ollamaData.choices?.[0]?.message?.content || null;
      }
    } catch {
      // Ollama não está rodando — fallback para Anthropic
    }

    // ── 2. Fallback: Anthropic ────────────────────────────────────────────────
    if (!rawText && anthropicKey) {
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
      if (anthropicRes.ok) {
        const data = await anthropicRes.json();
        rawText = data.content?.[0]?.text || null;
      }
    }

    // ── 3. Fallback local se nenhuma IA respondeu ────────────────────────────
    if (!rawText) {
      return new Response(JSON.stringify(fallbackClassificacao({ texto, categoria, subcategoria, urgente })), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let analise;
    try {
      // Remove markdown code blocks se o modelo retornar ```json ... ```
      const cleaned = rawText.replace(/```(?:json)?\n?/g, '').trim();
      analise = JSON.parse(cleaned);
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

function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sanitizeOwnerName(rawOwner) {
  const owner = String(rawOwner || '').trim();
  return owner || 'Sem responsavel';
}

function pickOwnerName(assistant) {
  const metadata = assistant?.metadata || {};
  const ownerCandidates = [
    metadata.responsavel_nome,
    metadata.responsavel,
    metadata.owner_name,
    metadata.owner,
    metadata.criador,
    metadata.gestor,
    assistant?.owner_name,
    assistant?.created_by?.name,
  ];

  for (const candidate of ownerCandidates) {
    const clean = String(candidate || '').trim();
    if (clean) return clean;
  }

  return 'Sem responsavel';
}

function buildGroupName(ownerName) {
  if (String(ownerName).toLowerCase() === 'sem responsavel') return 'Grupo Sem Responsavel';
  return `Grupo ${ownerName}`;
}

function buildAgentFunction(assistant) {
  const instructions = String(assistant?.instructions || '').trim();
  if (instructions) {
    const resumo = instructions.replace(/\s+/g, ' ').trim().slice(0, 180);
    return resumo || 'Agente sincronizado do ChatGPT.';
  }

  return 'Agente sincronizado do ChatGPT.';
}

async function readJsonResponse(response) {
  const raw = await response.text();
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}

async function supabaseRest(pathname, { method = 'GET', body, prefer } = {}) {
  const headers = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (prefer) {
    headers['Prefer'] = prefer;
  }

  const response = await net.fetch(`${SUPABASE_URL}${pathname}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const payload = await readJsonResponse(response);
  if (!response.ok) {
    const message = payload?.message || payload?.error_description || payload?.error || 'Erro no Supabase REST';
    throw new Error(`${message} (${response.status})`);
  }

  return payload;
}

async function fetchChatgptAssistants(openaiKey) {
  const allAssistants = [];
  let after = null;
  let hasMore = true;

  while (hasMore) {
    const query = after ? `?order=desc&limit=100&after=${encodeURIComponent(after)}` : '?order=desc&limit=100';
    const response = await net.fetch(`${OPENAI_ASSISTANTS_API_URL}${query}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2',
      },
    });

    const payload = await readJsonResponse(response);
    if (!response.ok) {
      const message =
        payload?.error?.message ||
        payload?.message ||
        payload?.error ||
        'Nao foi possivel listar agentes no OpenAI.';
      throw new Error(`${message} (${response.status})`);
    }

    const page = Array.isArray(payload?.data) ? payload.data : [];
    allAssistants.push(...page);
    hasMore = Boolean(payload?.has_more);
    after = page.length > 0 ? page[page.length - 1].id : null;

    if (!after) hasMore = false;
  }

  return allAssistants;
}

async function syncChatgptAgents({ openaiKey, importedByName } = {}) {
  const cfg = await getStore();
  const key =
    String(openaiKey || '').trim() ||
    String(cfg.get('openaiKey') || '').trim() ||
    String(process.env.OPENAI_API_KEY || '').trim();

  if (!key) {
    throw new Error('Chave OpenAI nao configurada. Informe a chave para sincronizar os agentes.');
  }

  const assistants = await fetchChatgptAssistants(key);
  if (!assistants.length) {
    return {
      synced: true,
      totalAssistants: 0,
      groupsCreated: 0,
      groupsUpdated: 0,
      agentsCreated: 0,
      agentsUpdated: 0,
      agentsPaused: 0,
      message: 'Nenhum agente encontrado na conta OpenAI.',
    };
  }

  const grouped = new Map();

  assistants.forEach((assistant) => {
    const owner = sanitizeOwnerName(pickOwnerName(assistant));
    const groupName = buildGroupName(owner);
    const slug = slugify(groupName) || `grupo-${slugify(owner) || 'sem-responsavel'}`;
    const current = grouped.get(slug) || {
      nome: groupName,
      slug,
      descricao: `Grupo sincronizado automaticamente do ChatGPT. Responsavel: ${owner}.`,
      origem: 'chatgpt',
      ativo: true,
      atualizado_em: new Date().toISOString(),
      ownerName: owner,
      agentes: [],
    };

    current.agentes.push({
      nome: String(assistant?.name || assistant?.id || 'Agente sem nome').trim(),
      funcao: buildAgentFunction(assistant),
      descricao: String(assistant?.description || '').trim(),
      status: 'ativo',
      requer_validacao: Boolean(assistant?.metadata?.requer_validacao || assistant?.metadata?.requires_validation),
      etapa_atual: 'Sincronizado do ChatGPT',
      ultima_execucao: null,
      ordem: current.agentes.length,
    });

    grouped.set(slug, current);
  });

  const groupsPayload = [...grouped.values()].map((group) => ({
    nome: group.nome,
    slug: group.slug,
    descricao: group.descricao,
    origem: group.origem,
    ativo: true,
    atualizado_em: group.atualizado_em,
  }));

  const existingGroupsBefore = await supabaseRest('/rest/v1/agente_grupos?select=id,slug,nome&origem=eq.chatgpt');
  const existingSlugsBefore = new Set(
    (Array.isArray(existingGroupsBefore) ? existingGroupsBefore : []).map((group) => String(group.slug || ''))
  );

  const groupsCreated = groupsPayload.filter((group) => !existingSlugsBefore.has(group.slug)).length;
  const groupsUpdated = groupsPayload.length - groupsCreated;

  await supabaseRest('/rest/v1/agente_grupos?on_conflict=slug', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=representation',
    body: groupsPayload,
  });

  const existingGroups = await supabaseRest('/rest/v1/agente_grupos?select=id,slug,nome&origem=eq.chatgpt');
  const groupBySlug = new Map((Array.isArray(existingGroups) ? existingGroups : []).map((group) => [group.slug, group]));

  const targetGroupIds = [];
  const targetNames = [];

  grouped.forEach((group, slug) => {
    const match = groupBySlug.get(slug);
    if (!match?.id) return;
    targetGroupIds.push(match.id);
    targetNames.push(match.nome);
  });

  if (!targetGroupIds.length) {
    throw new Error('Nao foi possivel resolver os grupos apos sincronizar no Supabase.');
  }

  const agentsByGroup = new Map();
  for (const groupId of targetGroupIds) {
    const rows = await supabaseRest(`/rest/v1/agentes?select=id,nome,status,grupo_id&grupo_id=eq.${groupId}`);
    agentsByGroup.set(groupId, Array.isArray(rows) ? rows : []);
  }

  let agentsCreated = 0;
  let agentsUpdated = 0;
  let agentsPaused = 0;

  for (const [slug, group] of grouped.entries()) {
    const dbGroup = groupBySlug.get(slug);
    if (!dbGroup?.id) continue;

    const existingAgents = agentsByGroup.get(dbGroup.id) || [];
    const existingByName = new Map();

    existingAgents.forEach((agent) => {
      const keyName = String(agent.nome || '').trim().toLowerCase();
      if (!keyName || existingByName.has(keyName)) return;
      existingByName.set(keyName, agent);
    });

    const importedNames = new Set();

    for (const importedAgent of group.agentes) {
      const keyName = String(importedAgent.nome || '').trim().toLowerCase();
      if (!keyName) continue;
      importedNames.add(keyName);

      const current = existingByName.get(keyName);
      if (current?.id) {
        await supabaseRest(`/rest/v1/agentes?id=eq.${current.id}`, {
          method: 'PATCH',
          prefer: 'return=minimal',
          body: {
            funcao: importedAgent.funcao,
            descricao: importedAgent.descricao,
            status: 'ativo',
            requer_validacao: importedAgent.requer_validacao,
            etapa_atual: importedAgent.etapa_atual,
            ultima_execucao: importedAgent.ultima_execucao,
            ordem: importedAgent.ordem,
            atualizado_em: new Date().toISOString(),
          },
        });
        agentsUpdated += 1;
      } else {
        await supabaseRest('/rest/v1/agentes', {
          method: 'POST',
          prefer: 'return=minimal',
          body: {
            grupo_id: dbGroup.id,
            nome: importedAgent.nome,
            funcao: importedAgent.funcao,
            descricao: importedAgent.descricao,
            status: 'ativo',
            requer_validacao: importedAgent.requer_validacao,
            etapa_atual: importedAgent.etapa_atual,
            ultima_execucao: importedAgent.ultima_execucao,
            ordem: importedAgent.ordem,
          },
        });
        agentsCreated += 1;
      }
    }

    for (const staleAgent of existingAgents) {
      const keyName = String(staleAgent.nome || '').trim().toLowerCase();
      if (!keyName || importedNames.has(keyName)) continue;
      if (String(staleAgent.status || '') === 'pausado') continue;

      await supabaseRest(`/rest/v1/agentes?id=eq.${staleAgent.id}`, {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: {
          status: 'pausado',
          etapa_atual: 'Nao encontrado na ultima sincronizacao',
          atualizado_em: new Date().toISOString(),
        },
      });
      agentsPaused += 1;
    }
  }

  return {
    synced: true,
    totalAssistants: assistants.length,
    groupsCreated,
    groupsUpdated,
    agentsCreated,
    agentsUpdated,
    agentsPaused,
    groups: targetNames,
    importedByName: importedByName || null,
    importedAt: new Date().toISOString(),
    message: `Sincronizacao concluida: ${assistants.length} agentes em ${groupsPayload.length} grupos.`,
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

// ── Handler da API de Membros (Atualizar) ──────────────────────────────────────
async function handleMembrosUpdate(request) {
  try {
    const authHeader = request.headers['authorization'] || request.headers.get?.('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const userToken = authHeader.split(' ')[1];

    const perfilRes = await net.fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { 'Authorization': `Bearer ${userToken}`, 'apikey': SUPABASE_SERVICE_KEY }
    });

    if (!perfilRes.ok) return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    const userData = await perfilRes.json();
    const callerId = userData.id;

    const callerPapelRes = await net.fetch(`${SUPABASE_URL}/rest/v1/usuarios?id=eq.${callerId}&select=papel`, {
      headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'apikey': SUPABASE_SERVICE_KEY }
    });
    
    if (!callerPapelRes.ok) return new Response(JSON.stringify({ error: 'Permission denied' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    const callerPapelData = await callerPapelRes.json();
    const callerPapel = callerPapelData[0]?.papel;

    if (!callerPapel || !['admin', 'dono', 'gestor'].includes(callerPapel)) {
      return new Response(JSON.stringify({ error: 'Acesso restrito' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const body = await request.json();
    const {
      userId,
      papel,
      departamento,
      isActive,
      ativo,
      password,
      novaSenha,
    } = body;

    const senhaParaAtualizar = password ?? novaSenha;
    const ativoParaAtualizar = isActive ?? ativo;

    if (!userId) {
      return new Response(JSON.stringify({ error: 'userId é obrigatório' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isSuper = callerPapel === 'admin' || callerPapel === 'dono';
    if (!isSuper && papel && ['admin', 'dono'].includes(papel)) {
      return new Response(JSON.stringify({ error: 'Nao pode atribuir papel superior' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    const resultado = {};

    if (senhaParaAtualizar) {
      const updateAuthRes = await net.fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'apikey': SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: senhaParaAtualizar })
      });
      if (!updateAuthRes.ok) return new Response(JSON.stringify({ error: 'Erro de senha' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      
      await net.fetch(`${SUPABASE_URL}/rest/v1/usuarios?id=eq.${userId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'apikey': SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha_definida: true })
      });
      resultado.senhaRedefinida = true;
    }

    let ops = {};
    if (papel !== undefined) {
      ops.papel = papel;
      resultado.papel = papel;
    }
    if (departamento !== undefined) {
      ops.departamento = departamento;
      resultado.departamento = departamento;
    }
    if (ativoParaAtualizar !== undefined) {
      ops.ativo = !!ativoParaAtualizar;
      resultado.ativo = !!ativoParaAtualizar;
    }

    if (Object.keys(ops).length > 0) {
      const patchRes = await net.fetch(`${SUPABASE_URL}/rest/v1/usuarios?id=eq.${userId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'apikey': SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify(ops)
      });
      if (!patchRes.ok) return new Response(JSON.stringify({ error: 'Erro DB' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true, ...resultado }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal Error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
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
const appDirsChecked = new Set();

function getStaticContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.webmanifest': 'application/manifest+json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
  };
  return map[ext] || 'application/octet-stream';
}

function setupProtocol() {
  protocol.handle('app', async (request) => {
    const url = new URL(request.url);
    const host = url.hostname;
    const appName = host.replace('.local', ''); // hub, almoxarifado, comercial
    const pathname = decodeURIComponent(url.pathname);

    // Desktop deve funcionar em modo app local (app://) sem depender de servidor web.

    // Rota da API de solicitações (POST)
    if (appName === 'almoxarifado' && pathname === '/api/solicitar') {
      return handleSolicitar(request);
    }

    // Rota da API de membros (GET)
    if (pathname === '/api/membros') {
      return handleMembros(request);
    }

    // Rota da API de atualização de membros (POST/PATCH)
    if (pathname === '/api/membros-update') {
      return handleMembrosUpdate(request);
    }

    // Roteia as APIs do Comercial para o backend em producao (Jira/RDO)
    if (appName === 'comercial' && pathname.startsWith('/api/')) {
      const targetUrl = `${COMERCIAL_API_ORIGIN}${pathname}${url.search}`;
      return proxyExternalRequest(request, targetUrl);
    }

    // Serve arquivos estáticos
    const appsDir = getAppsDir();
    const appDir = path.join(appsDir, appName);

    // Cache de existência do diretório do app para evitar hits excessivos no servidor de arquivos
    if (!appDirsChecked.has(appDir)) {
      if (!fs.existsSync(appDir)) {
        return new Response(`App "${appName}" não encontrado. Execute o build primeiro.`, {
          status: 404,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
      appDirsChecked.add(appDir);
    }

    // Resolve o caminho do arquivo de forma robusta e segura
    // Usamos pathname.slice(1) se começar com barra para o path.join funcionar melhor em rede
    const cleanPath = pathname.startsWith('/') ? pathname.slice(1) : pathname;
    let filePath = path.join(appDir, cleanPath || 'index.html');

    const hasExtension = pathname.includes('.');
    const isRoot = pathname === '/' || pathname === '';

    // Lógica Defensiva:
    // 1. Se o arquivo existe fisicamente, usamos ele.
    // 2. Se NÃO existe:
    //    a. Se for uma rota (sem extensão ou raiz), servimos index.html (SPA).
    //    b. Se tiver extensão (ex: .js, .css), NÃO servimos index.html senão causamos "Syntax Error <"
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      if (isRoot || !hasExtension) {
        filePath = path.join(appDir, 'index.html');
      } else {
        return new Response(`Arquivo "${pathname}" não encontrado no App "${appName}".`, {
          status: 404,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    }

    const body = fs.readFileSync(filePath);
    return new Response(body, {
      headers: {
        'Content-Type': getStaticContentType(filePath),
        'Cache-Control': 'no-store',
      },
    });
  });
}

// ── Criação da janela principal ──────────────────────────────────────────────
function resolveInitialUrl() {
  const cliUrl = process.argv.find((arg) => typeof arg === 'string' && arg.startsWith('app://'));
  const envUrl = process.env.BIASI_START_URL;
  return cliUrl || envUrl || 'app://hub.local/';
}

function isInternalAppUrl(url) {
  return typeof url === 'string' && url.startsWith('app://');
}

function recoverElectronWindow(win, reason, targetUrl) {
  if (!win || win.isDestroyed()) return;

  const now = Date.now();
  if (win.__lastRecoveryReloadAt && now - win.__lastRecoveryReloadAt < 5000) return;
  win.__lastRecoveryReloadAt = now;

  const currentUrl = win.webContents.getURL();
  const recoveryUrl = isInternalAppUrl(targetUrl)
    ? targetUrl
    : isInternalAppUrl(currentUrl)
      ? currentUrl
      : resolveInitialUrl();

  console.warn(`[Electron] Recuperando janela (${reason}) em ${recoveryUrl}`);

  setTimeout(() => {
    if (win.isDestroyed()) return;

    if (isInternalAppUrl(recoveryUrl) && recoveryUrl !== win.webContents.getURL()) {
      win.loadURL(recoveryUrl).catch((error) => {
        console.error('[Electron] Falha ao recarregar URL de recuperacao:', error);
      });
      return;
    }

    win.webContents.reloadIgnoringCache();
  }, 600);
}

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

  mainWindow = win;

  // Sempre carrega via app:// (builds estáticos — sem dev servers)
  win.loadURL(resolveInitialUrl());

  // Abre links externos no browser padrão do sistema
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Permite navegação somente entre os apps internos
  win.webContents.on('will-navigate', (event, url) => {
    if (url.startsWith('app://') || url.includes('localhost') || url.includes('127.0.0.1')) return; // permitido
    event.preventDefault();
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
  });

  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedUrl, isMainFrame) => {
    if (!isMainFrame || errorCode === -3) return;
    if (!isInternalAppUrl(validatedUrl)) return;

    console.warn(`[Electron] Falha no carregamento principal (${errorCode} ${errorDescription}) ${validatedUrl}`);
    recoverElectronWindow(win, `did-fail-load ${errorCode}`, validatedUrl);
  });

  win.webContents.on('render-process-gone', (_event, details) => {
    console.warn(`[Electron] Renderer finalizado (${details.reason || 'unknown'}).`);
    recoverElectronWindow(win, `render-process-gone ${details.reason || 'unknown'}`);
  });

  win.on('unresponsive', () => {
    recoverElectronWindow(win, 'unresponsive');
  });

  win.webContents.on('did-finish-load', () => {
    writeAutomationState();
  });

  win.webContents.on('did-navigate', () => {
    writeAutomationState();
  });

  win.webContents.on('did-navigate-in-page', () => {
    writeAutomationState();
  });

  win.on('closed', () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
    writeAutomationState();
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

  ipcMain.handle('config:getOpenAiKey', async () => {
    const cfg = await getStore();
    return cfg.get('openaiKey') || '';
  });

  ipcMain.handle('config:setOpenAiKey', async (_event, key) => {
    const cfg = await getStore();
    cfg.set('openaiKey', String(key || '').trim());
    return true;
  });

  ipcMain.handle('config:getOllamaModel', async () => {
    const cfg = await getStore();
    return cfg.get('ollamaModel') || 'llama3.2:1b';
  });

  ipcMain.handle('config:setOllamaModel', async (_event, model) => {
    const cfg = await getStore();
    cfg.set('ollamaModel', (model || 'llama3.2').trim());
    return true;
  });

  ipcMain.handle('config:checkOllama', async () => {
    try {
      const res = await net.fetch('http://localhost:11434/api/tags', { method: 'GET' });
      if (res.ok) {
        const data = await res.json();
        const models = (data.models || []).map(m => m.name);
        return { online: true, models };
      }
      return { online: false, models: [] };
    } catch {
      return { online: false, models: [] };
    }
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
        const result = await autoUpdater?.checkForUpdates();
        latestVersion = result?.updateInfo?.version;

        // Validar que latestVersion é diferente de currentVersion
        if (latestVersion && latestVersion !== currentVersion && isVersionNewer(latestVersion, currentVersion)) {
          hasUpdate = true;
        }
      } catch (checkError) {
        updaterError('[updater] erro ao verificar releases:', checkError);
        // Continua sem erro crítico
      }

      return {
        hasUpdate,
        version: latestVersion || currentVersion,
        currentVersion,
      };
    } catch (error) {
      updaterError('[updater] erro ao verificar:', error);
      return { hasUpdate: false, error: error.message };
    }
  });

  ipcMain.handle('updater:downloadAndInstall', async () => {
    try {
      // Apenas inicia o download — o quit acontece via evento 'update-downloaded'
      autoUpdater?.downloadUpdate();
      return { success: true };
    } catch (error) {
      updaterError('[updater] erro ao iniciar download:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('updater:quitAndInstall', () => {
    // isSilent=true: instala sem mostrar assistente; isForceRunAfter=true: reabre o app
    autoUpdater?.quitAndInstall(true, true);
  });

  // ── Criar usuário quando admin aprova acesso ──────────────────
  ipcMain.handle('agentes:syncChatgpt', async (_event, payload = {}) => {
    try {
      const result = await syncChatgptAgents({
        openaiKey: payload?.apiKey,
        importedByName: payload?.usuarioNome || null,
      });
      return { sucesso: true, ...result };
    } catch (error) {
      return {
        sucesso: false,
        erro: String(error?.message || error),
      };
    }
  });

  ipcMain.handle('admin:criarUsuario', async (_event, { email, nome, papel, senhaTemp }) => {
    try {
      // 1. Criar usuário no Supabase Auth com senha temporária
      const body = {
        email: email.trim().toLowerCase(),
        email_confirm: true,
        user_metadata: { nome: nome.trim() },
      };
      if (senhaTemp) body.password = senhaTemp;

      const createRes = await net.fetch(
        `${SUPABASE_URL}/auth/v1/admin/users`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          },
          body: JSON.stringify(body),
        }
      );

      const createData = await createRes.json();
      let userId = createData.id;

      if (!createRes.ok || !userId) {
        // Usuário já existe — busca pelo email e atualiza senha
        const listRes = await net.fetch(
          `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email.trim().toLowerCase())}`,
          {
            method: 'GET',
            headers: {
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            },
          }
        );
        const listData = await listRes.json();
        const existingUser = listData?.users?.[0];

        if (!existingUser?.id) {
          return { sucesso: false, erro: createData.msg || createData.message || 'Erro ao criar usuário no Auth.' };
        }

        userId = existingUser.id;

        // Atualiza senha temporária no usuário existente
        if (senhaTemp) {
          await net.fetch(
            `${SUPABASE_URL}/auth/v1/admin/users/${userId}`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_SERVICE_KEY,
                'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              },
              body: JSON.stringify({ password: senhaTemp, email_confirm: true }),
            }
          );
        }
      }

      // 2. Criar/atualizar registro em usuarios
      const upsertRes = await net.fetch(
        `${SUPABASE_URL}/rest/v1/usuarios`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_SERVICE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
            'Prefer': 'resolution=merge-duplicates',
          },
          body: JSON.stringify({
            id: userId,
            nome: nome.trim(),
            email: email.trim().toLowerCase(),
            papel,
            ativo: true,
            senha_definida: false,  // força troca de senha no primeiro acesso
          }),
        }
      );

      if (!upsertRes.ok) {
        const err = await upsertRes.json().catch(() => ({}));
        return { sucesso: false, erro: err.message || 'Erro ao criar perfil.' };
      }

      return { sucesso: true, userId };
    } catch (err) {
      console.error('[admin:criarUsuario] erro:', err);
      return { sucesso: false, erro: 'Erro interno ao criar usuário.' };
    }
  });
}

// ── Setup Auto-updater ──────────────────────────────────────────────────────────
function setupUpdater() {
  try {
    autoUpdater = require('electron-updater').autoUpdater;
  } catch (e) {
    console.warn('[updater] electron-updater não disponível:', e.message);
    return;
  }

  // Mudamos para TRUE para garantir que todos os usuários recebam a atualização em background
  autoUpdater.autoDownload = true;
  autoUpdater.allowPrerelease = false;
  autoUpdater.logger = {
    info: (...args) => updaterLog(...args),
    warn: (...args) => updaterWarn(...args),
    error: (...args) => updaterError(...args),
    debug: (...args) => updaterLog(...args),
  };

  autoUpdater.on('update-available', (info) => {
    console.log('[updater] Atualização disponível:', info.version);
    new Notification({
      title: 'BiasíHub - Atualização Disponível',
      body: `A versão ${info.version} está sendo baixada e será instalada automaticamente.`,
      icon: path.join(__dirname, '..', 'resources', 'icon.png'),
    }).show();
  });

  // Envia progresso de download para o renderer
  autoUpdater.on('download-progress', (info) => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('update:progress', {
        percent: Math.round(info.percent),
        transferred: info.transferred,
        total: info.total,
      });
    });
  });

  // Quando o download terminar, avisa o renderer (ele mostrará botão "Reiniciar")
  autoUpdater.on('update-downloaded', () => {
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('update:downloaded');
    });
  });

  autoUpdater.checkForUpdates().catch((error) => {
    console.error('[updater] erro no check inicial:', error);
  });

  // Verifica atualizações a cada 1 hora
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
  setupAutomationServer().catch((error) => {
    console.error('[automation] erro ao iniciar ponte local:', error);
  });
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('before-quit', () => {
  stopAutomationServer();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
