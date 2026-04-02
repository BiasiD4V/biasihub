// POST /api/jira-create — cria um novo issue no projeto ORC
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const domain = process.env.JIRA_DOMAIN;
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  if (!domain || !email || !token) return res.status(500).json({ error: 'Jira não configurado' });

  const { summary, issuetypeId, priorityId, parentKey, description } = req.body;
  if (!summary || !issuetypeId) return res.status(400).json({ error: 'summary e issuetypeId são obrigatórios' });

  const credentials = Buffer.from(`${email}:${token}`).toString('base64');
  const url = `https://${domain}/rest/api/3/issue`;

  const fields = {
    project: { key: 'ORC' },
    summary: summary.trim(),
    issuetype: { id: issuetypeId },
    priority: { id: priorityId || '3' },
  };

  if (parentKey) fields.parent = { key: parentKey };

  if (description) {
    fields.description = {
      version: 1,
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: description }] }],
    };
  }

  try {
    const jiraRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields }),
    });
    if (!jiraRes.ok) {
      const err = await jiraRes.text();
      return res.status(502).json({ error: `Jira error ${jiraRes.status}: ${err}` });
    }
    const data = await jiraRes.json();
    return res.status(200).json({ key: data.key, id: data.id });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno' });
  }
}
