// PUT /api/jira-update — atualiza campos de um issue (duedate, summary, etc.)
import { verificarAuth, setCorsHeaders } from './_auth.js';

export default async function handler(req, res) {
  setCorsHeaders(res, 'PUT, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PUT') return res.status(405).json({ error: 'Method not allowed' });

  const user = await verificarAuth(req, res);
  if (!user) return;

  const domain = process.env.JIRA_DOMAIN;
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  if (!domain || !email || !token) return res.status(500).json({ error: 'Jira não configurado' });

  const { key, fields } = req.body;
  if (!key || !fields) return res.status(400).json({ error: 'key e fields são obrigatórios' });

  // Whitelist allowed fields to prevent abuse
  const ALLOWED_FIELDS = ['duedate', 'summary', 'priority', 'labels'];
  const sanitized = {};
  for (const [k, v] of Object.entries(fields)) {
    if (ALLOWED_FIELDS.includes(k)) sanitized[k] = v;
  }
  if (Object.keys(sanitized).length === 0) {
    return res.status(400).json({ error: 'Nenhum campo permitido fornecido' });
  }

  const credentials = Buffer.from(`${email}:${token}`).toString('base64');
  const url = `https://${domain}/rest/api/3/issue/${encodeURIComponent(key)}`;

  try {
    const jiraRes = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields: sanitized }),
    });
    if (!jiraRes.ok) {
      const err = await jiraRes.text();
      return res.status(502).json({ error: `Jira error ${jiraRes.status}: ${err}` });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno' });
  }
}
