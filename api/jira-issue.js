// GET /api/jira-issue?key=ORC-123 — retorna detalhes completos de um issue (descrição + comentários)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const domain = process.env.JIRA_DOMAIN;
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;
  if (!domain || !email || !token) return res.status(500).json({ error: 'Jira não configurado' });

  const { key } = req.query;
  if (!key) return res.status(400).json({ error: 'key é obrigatório' });

  const credentials = Buffer.from(`${email}:${token}`).toString('base64');
  const url = `https://${domain}/rest/api/3/issue/${key}?fields=summary,description,status,issuetype,priority,assignee,parent,comment,created,updated,duedate,labels`;

  function adfToText(node) {
    if (!node) return '';
    if (node.type === 'text') return node.text || '';
    if (node.type === 'hardBreak') return '\n';
    if (node.type === 'paragraph') return (node.content || []).map(adfToText).join('') + '\n';
    if (node.type === 'bulletList' || node.type === 'orderedList')
      return (node.content || []).map(adfToText).join('');
    if (node.type === 'listItem') return '• ' + (node.content || []).map(adfToText).join('') ;
    if (node.content) return (node.content || []).map(adfToText).join('');
    return '';
  }

  try {
    const jiraRes = await fetch(url, {
      headers: { 'Authorization': `Basic ${credentials}`, 'Accept': 'application/json' },
    });
    if (!jiraRes.ok) return res.status(502).json({ error: `Jira error ${jiraRes.status}` });

    const data = await jiraRes.json();
    const f = data.fields;

    const comments = (f.comment?.comments || []).map(c => ({
      id: c.id,
      author: c.author?.displayName || 'Desconhecido',
      authorAvatar: c.author?.avatarUrls?.['24x24'] || null,
      body: adfToText(c.body),
      created: c.created,
    }));

    return res.status(200).json({
      key: data.key,
      summary: f.summary || '',
      description: adfToText(f.description).trim(),
      status: f.status?.name || '',
      statusCategory: f.status?.statusCategory?.key || 'new',
      issuetype: f.issuetype?.name || '',
      assigneeName: f.assignee?.displayName || null,
      assigneeAvatar: f.assignee?.avatarUrls?.['32x32'] || null,
      priority: f.priority?.name || 'Medium',
      parentKey: f.parent?.key || null,
      parentSummary: f.parent?.fields?.summary || null,
      created: f.created || null,
      updated: f.updated || null,
      duedate: f.duedate || null,
      labels: f.labels || [],
      comments,
      webUrl: `https://${domain}/browse/${data.key}`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Erro interno' });
  }
}
