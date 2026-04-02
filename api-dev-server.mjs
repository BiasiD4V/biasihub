// Servidor local de desenvolvimento para as funções /api/jira*
// Roda na porta 3001, Vite faz proxy /api/ -> localhost:3001
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Carregar .env.local
function loadEnv() {
  try {
    const content = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf-8');
    for (const line of content.split('\n')) {
      const match = line.match(/^([^#=]+)=["']?([^"'\n]*)["']?/);
      if (match) process.env[match[1].trim()] = match[2].trim();
    }
  } catch {}
}
loadEnv();

const DOMAIN = process.env.JIRA_DOMAIN;
const EMAIL = process.env.JIRA_EMAIL;
const TOKEN = process.env.JIRA_API_TOKEN;

function credentials() {
  return Buffer.from(`${EMAIL}:${TOKEN}`).toString('base64');
}

function adfToText(node) {
  if (!node) return '';
  if (node.type === 'text') return node.text || '';
  if (node.type === 'hardBreak') return '\n';
  if (node.type === 'paragraph') return (node.content || []).map(adfToText).join('') + '\n';
  if (node.type === 'bulletList' || node.type === 'orderedList')
    return (node.content || []).map(adfToText).join('');
  if (node.type === 'listItem') return '• ' + (node.content || []).map(adfToText).join('');
  if (node.content) return (node.content || []).map(adfToText).join('');
  return '';
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function json(res, code, data) {
  cors(res);
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

async function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } });
  });
}

async function handleJira(req, res) {
  const fields = ['summary','status','issuetype','priority','assignee','created','updated','duedate','parent','labels'];
  let all = [], nextPageToken = undefined;
  while (true) {
    const body = { jql: 'project = ORC ORDER BY created DESC', fields, maxResults: 100 };
    if (nextPageToken) body.nextPageToken = nextPageToken;
    const url = `https://${DOMAIN}/rest/api/3/search/jql`;
    const r = await fetch(url, { method: 'POST', headers: { 'Authorization': `Basic ${credentials()}`, 'Accept': 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) return json(res, 502, { error: `Jira error ${r.status}` });
    const data = await r.json();
    const issues = data.issues || [];
    all = all.concat(issues.map(i => ({
      key: i.key,
      summary: i.fields.summary || '',
      status: i.fields.status?.name || '',
      statusCategory: i.fields.status?.statusCategory?.key || 'new',
      issuetype: i.fields.issuetype?.name || '',
      issuetypeIcon: i.fields.issuetype?.iconUrl || '',
      assigneeName: i.fields.assignee?.displayName || null,
      assigneeAvatar: i.fields.assignee?.avatarUrls?.['24x24'] || null,
      priority: i.fields.priority?.name || 'Medium',
      created: i.fields.created || null,
      updated: i.fields.updated || null,
      duedate: i.fields.duedate || null,
      parentKey: i.fields.parent?.key || null,
      parentSummary: i.fields.parent?.fields?.summary || null,
      labels: i.fields.labels || [],
      webUrl: `https://${DOMAIN}/browse/${i.key}`,
    })));
    if (data.isLast || issues.length === 0) break;
    nextPageToken = data.nextPageToken;
  }
  json(res, 200, all);
}

async function handleJiraIssue(req, res, key) {
  const url = `https://${DOMAIN}/rest/api/3/issue/${key}?fields=summary,description,status,issuetype,priority,assignee,parent,comment,created,updated,duedate,labels`;
  const r = await fetch(url, { headers: { 'Authorization': `Basic ${credentials()}`, 'Accept': 'application/json' } });
  if (!r.ok) return json(res, 502, { error: `Jira error ${r.status}` });
  const data = await r.json();
  const f = data.fields;
  const comments = (f.comment?.comments || []).map(c => ({
    id: c.id, author: c.author?.displayName || 'Desconhecido',
    authorAvatar: c.author?.avatarUrls?.['24x24'] || null,
    body: adfToText(c.body), created: c.created,
  }));
  json(res, 200, {
    key: data.key, summary: f.summary || '',
    description: adfToText(f.description).trim(),
    status: f.status?.name || '', statusCategory: f.status?.statusCategory?.key || 'new',
    issuetype: f.issuetype?.name || '',
    assigneeName: f.assignee?.displayName || null,
    assigneeAvatar: f.assignee?.avatarUrls?.['32x32'] || null,
    priority: f.priority?.name || 'Medium',
    parentKey: f.parent?.key || null, parentSummary: f.parent?.fields?.summary || null,
    created: f.created || null, updated: f.updated || null, duedate: f.duedate || null,
    labels: f.labels || [], comments, webUrl: `https://${DOMAIN}/browse/${data.key}`,
  });
}

async function handleTransition(req, res) {
  const { key, transitionId } = await readBody(req);
  if (!key || !transitionId) return json(res, 400, { error: 'key e transitionId obrigatórios' });
  const r = await fetch(`https://${DOMAIN}/rest/api/3/issue/${key}/transitions`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${credentials()}`, 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ transition: { id: transitionId } }),
  });
  if (!r.ok) return json(res, 502, { error: `Jira error ${r.status}` });
  json(res, 200, { ok: true });
}

async function handleCreate(req, res) {
  const { summary, issuetypeId, priorityId, parentKey, description } = await readBody(req);
  if (!summary || !issuetypeId) return json(res, 400, { error: 'summary e issuetypeId obrigatórios' });
  const fields = { project: { key: 'ORC' }, summary: summary.trim(), issuetype: { id: issuetypeId }, priority: { id: priorityId || '3' } };
  if (parentKey) fields.parent = { key: parentKey };
  if (description) fields.description = { version: 1, type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }] };
  const r = await fetch(`https://${DOMAIN}/rest/api/3/issue`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${credentials()}`, 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!r.ok) { const e = await r.text(); return json(res, 502, { error: `Jira error ${r.status}: ${e}` }); }
  const data = await r.json();
  json(res, 200, { key: data.key, id: data.id });
}

async function handleComment(req, res) {
  const { key, body: commentText } = await readBody(req);
  if (!key || !commentText) return json(res, 400, { error: 'key e body obrigatórios' });
  const adfBody = { version: 1, type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: commentText }] }] };
  const r = await fetch(`https://${DOMAIN}/rest/api/3/issue/${key}/comment`, {
    method: 'POST',
    headers: { 'Authorization': `Basic ${credentials()}`, 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({ body: adfBody }),
  });
  if (!r.ok) { const e = await r.text(); return json(res, 502, { error: `Jira error ${r.status}: ${e}` }); }
  const data = await r.json();
  json(res, 200, { id: data.id, created: data.created });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { cors(res); res.writeHead(200); res.end(); return; }
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname === '/api/jira' && req.method === 'GET') return await handleJira(req, res);
    if (url.pathname === '/api/jira-issue' && req.method === 'GET') return await handleJiraIssue(req, res, url.searchParams.get('key'));
    if (url.pathname === '/api/jira-transition' && req.method === 'POST') return await handleTransition(req, res);
    if (url.pathname === '/api/jira-create' && req.method === 'POST') return await handleCreate(req, res);
    if (url.pathname === '/api/jira-comment' && req.method === 'POST') return await handleComment(req, res);
    json(res, 404, { error: 'Not found' });
  } catch (e) {
    console.error(e);
    json(res, 500, { error: 'Erro interno' });
  }
});

server.listen(3001, () => console.log('API dev server rodando em http://localhost:3001'));
