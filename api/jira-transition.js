// POST /api/jira-transition — muda o status de um issue
import { verificarAuth, setCorsHeaders } from './_auth.js';

export default async function handler(req, res) {
  setCorsHeaders(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const user = await verificarAuth(req, res);
  if (!user) return;

  const domain = process.env.JIRA_DOMAIN;
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  if (!domain || !email || !token) return res.status(500).json({ error: 'Jira não configurado' });

  const { key, transitionId } = req.body;
  if (!key || !transitionId) return res.status(400).json({ error: 'key e transitionId são obrigatórios' });

  const credentials = Buffer.from(`${email}:${token}`).toString('base64');
  const url = `https://${domain}/rest/api/3/issue/${key}/transitions`;

  try {
    const jiraRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transition: { id: transitionId } }),
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
