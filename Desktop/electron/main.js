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

// ── Handler do Paulo (IA com contexto real da empresa) ───────────────────────
async function handlePaulo(request) {
  try {
    const body = await request.json();
    const { mensagem, historico = [] } = body;

    const cfg = await getStore();
    const anthropicKey = cfg.get('anthropicKey') || '';

    if (!anthropicKey) {
      return new Response(JSON.stringify({
        resposta: 'Preciso de uma chave de IA para funcionar. Peça ao administrador configurar em Meus Dispositivos.',
      }), { headers: { 'Content-Type': 'application/json' } });
    }

    // Busca dados reais do Supabase para montar o contexto do Paulo
    const headers = { apikey: SUPABASE_SERVICE_KEY, Authorization: `Bearer ${SUPABASE_SERVICE_KEY}` };
    const [stockRes, reqRes, epiRes, frotaRes, movsRes] = await Promise.allSettled([
      net.fetch(`${SUPABASE_URL}/rest/v1/itens_almoxarifado?ativo=eq.true&select=codigo,descricao,estoque_atual,estoque_minimo,unidade&order=descricao`, { headers }),
      net.fetch(`${SUPABASE_URL}/rest/v1/requisicoes_almoxarifado?status=eq.pendente&select=titulo,solicitante,urgente,criado_em&order=criado_em.desc&limit=15`, { headers }),
      net.fetch(`${SUPABASE_URL}/rest/v1/entregas_epi?status=eq.ativo&select=colaborador_nome,data_validade,epi:epis_catalogo(nome)&order=data_validade.asc&limit=30`, { headers }),
      net.fetch(`${SUPABASE_URL}/rest/v1/veiculos?ativo=eq.true&select=modelo,placa,km_atual,proxima_manutencao_km,status&order=modelo`, { headers }),
      net.fetch(`${SUPABASE_URL}/rest/v1/movimentacoes_almoxarifado?select=tipo,quantidade,obra,criado_em,item:itens_almoxarifado(descricao)&order=criado_em.desc&limit=10`, { headers }),
    ]);

    const safeJson = async (res) => {
      if (res.status === 'fulfilled' && res.value.ok) return res.value.json();
      return [];
    };
    const [itens, requisicoes, epis, veiculos, movs] = await Promise.all([
      safeJson(stockRes), safeJson(reqRes), safeJson(epiRes), safeJson(frotaRes), safeJson(movsRes),
    ]);

    const hoje = new Date();
    const em30dias = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000);
    const itensBaixos = itens.filter(i => Number(i.estoque_atual) <= Number(i.estoque_minimo));
    const itensZerados = itensBaixos.filter(i => Number(i.estoque_atual) === 0);
    const episVencendo = epis.filter(e => new Date(e.data_validade) <= em30dias);
    const frotaProblemas = veiculos.filter(v => v.status !== 'ativo' || (v.proxima_manutencao_km && v.km_atual >= v.proxima_manutencao_km));

    const systemPrompt = `Você é Igor, o assistente inteligente do Almoxarifado da Biasi Engenharia.
Você estuda os dados da empresa o tempo todo e os conhece de cor.
Você é amigável, direto, fala em português do Brasil natural (não formal demais).
Use os dados abaixo para responder perguntas com precisão. Seja proativo: se notar algo importante, mencione.
Não invente dados — use apenas o que está aqui. Se não souber, diga honestamente.

=== DADOS DE HOJE (${hoje.toLocaleDateString('pt-BR')}) ===

📦 ESTOQUE: ${itens.length} itens ativos
${itensZerados.length > 0 ? `🔴 ZERADOS (${itensZerados.length}): ${itensZerados.map(i => `${i.descricao} (${i.codigo})`).join(', ')}` : ''}
${itensBaixos.length > itensZerados.length ? `🟡 ESTOQUE BAIXO (${itensBaixos.length - itensZerados.length}): ${itensBaixos.filter(i => Number(i.estoque_atual) > 0).map(i => `${i.descricao}: ${i.estoque_atual}${i.unidade} / mín ${i.estoque_minimo}${i.unidade}`).join(' | ')}` : ''}
${itensBaixos.length === 0 ? '✅ Todos os itens com estoque adequado' : ''}

📋 REQUISIÇÕES PENDENTES: ${requisicoes.length}
${requisicoes.length > 0 ? requisicoes.map(r => `- "${r.titulo}" por ${r.solicitante}${r.urgente ? ' ⚠️ URGENTE' : ''}`).join('\n') : 'Nenhuma pendente'}

🦺 EPI VENCENDO EM 30 DIAS: ${episVencendo.length}
${episVencendo.length > 0 ? episVencendo.map(e => `- ${e.epi?.nome || 'EPI'} de ${e.colaborador_nome}: ${new Date(e.data_validade).toLocaleDateString('pt-BR')}`).join('\n') : 'Nenhum'}

🚛 FROTA: ${veiculos.length} veículos
${veiculos.map(v => `- ${v.modelo} ${v.placa}: ${v.km_atual ? v.km_atual.toLocaleString('pt-BR') + ' km' : 'km não informado'}${v.status !== 'ativo' ? ` (${v.status})` : ''}`).join('\n')}
${frotaProblemas.length > 0 ? `⚠️ ${frotaProblemas.length} veículo(s) com atenção necessária` : ''}

🔄 ÚLTIMAS MOVIMENTAÇÕES:
${movs.map(m => `- ${m.tipo === 'entrada' ? '↑' : '↓'} ${m.item?.descricao}: ${m.quantidade} ${m.obra ? `(${m.obra})` : ''}`).join('\n')}`;

    const messages = [
      ...historico.slice(-12),
      { role: 'user', content: mensagem },
    ];

    const resp = await net.fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });

    if (!resp.ok) {
      return new Response(JSON.stringify({ resposta: 'Erro ao conectar com a IA. Tente novamente.' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = await resp.json();
    const resposta = data.content?.[0]?.text || 'Não consegui processar sua mensagem.';

    return new Response(JSON.stringify({ resposta }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[igor] erro:', err);
    return new Response(JSON.stringify({ resposta: 'Ocorreu um erro interno. Tente novamente.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
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
    const { userId, papel, departamento, isActive, password } = body;

    const isSuper = callerPapel === 'admin' || callerPapel === 'dono';
    if (!isSuper && papel && ['admin', 'dono'].includes(papel)) {
      return new Response(JSON.stringify({ error: 'Nao pode atribuir papel superior' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    if (password) {
      const updateAuthRes = await net.fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'apikey': SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (!updateAuthRes.ok) return new Response(JSON.stringify({ error: 'Erro de senha' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      
      await net.fetch(`${SUPABASE_URL}/rest/v1/usuarios?id=eq.${userId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'apikey': SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha_definida: true })
      });
    }

    let ops = {};
    if (papel !== undefined) ops.papel = papel;
    if (departamento !== undefined) ops.departamento = departamento;
    if (isActive !== undefined) ops.ativo = isActive;

    if (Object.keys(ops).length > 0) {
      const patchRes = await net.fetch(`${SUPABASE_URL}/rest/v1/usuarios?id=eq.${userId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`, 'apikey': SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
        body: JSON.stringify(ops)
      });
      if (!patchRes.ok) return new Response(JSON.stringify({ error: 'Erro DB' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
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
function setupProtocol() {
  protocol.handle('app', async (request) => {
    const url = new URL(request.url);
    const appName = url.hostname.replace('.local', ''); // hub, almoxarifado, comercial
    const pathname = decodeURIComponent(url.pathname);

    // Rota da API de solicitações (POST)
    if (appName === 'almoxarifado' && pathname === '/api/solicitar') {
      return handleSolicitar(request);
    }

    // Rota do Paulo (IA com contexto real)
    if (appName === 'almoxarifado' && pathname === '/api/paulo') {
      return handlePaulo(request);
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
      // Apenas inicia o download — o quit acontece via evento 'update-downloaded'
      autoUpdater.downloadUpdate();
      return { success: true };
    } catch (error) {
      console.error('[updater] erro ao iniciar download:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('updater:quitAndInstall', () => {
    // isSilent=true: instala sem mostrar assistente; isForceRunAfter=true: reabre o app
    autoUpdater.quitAndInstall(true, true);
  });

  // ── Criar usuário quando admin aprova acesso ──────────────────
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
  autoUpdater.autoDownload = false;

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
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
