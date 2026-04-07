// GET /api/jira — proxy seguro para Jira REST API (projeto ORC)
import { verificarAuth, setCorsHeaders } from './_auth.js';

export default async function handler(req, res) {
  setCorsHeaders(res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const user = await verificarAuth(req, res);
  if (!user) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const domain = process.env.JIRA_DOMAIN;
  const email = process.env.JIRA_EMAIL;
  const token = process.env.JIRA_API_TOKEN;

  if (!domain || !email || !token) {
    return res.status(500).json({ error: 'Jira não configurado. Adicione JIRA_DOMAIN, JIRA_EMAIL e JIRA_API_TOKEN nas variáveis de ambiente.' });
  }

  const credentials = Buffer.from(`${email}:${token}`).toString('base64');
  const fields = ['summary','status','issuetype','priority','assignee','created','updated','duedate','parent','labels'];

  try {
    let allIssues = [];
    let nextPageToken = undefined;
    const maxResults = 100;

    while (true) {
      const body = {
        jql: 'project = ORC ORDER BY created DESC',
        fields,
        maxResults,
        ...(nextPageToken ? { nextPageToken } : {}),
      };
      const jiraRes = await fetch(`https://${domain}/rest/api/3/search/jql`, {
        method: 'POST',
        headers: { 'Authorization': `Basic ${credentials}`, 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!jiraRes.ok) {
        const err = await jiraRes.text();
        console.error('Jira error:', jiraRes.status, err);
        return res.status(502).json({ error: `Erro ao acessar Jira: ${jiraRes.status}` });
      }

      const data = await jiraRes.json();
      const issues = data.issues || [];
      allIssues = allIssues.concat(issues);

      if (data.isLast || !data.nextPageToken || issues.length === 0) {
        break;
      }
      nextPageToken = data.nextPageToken;
    }

    // Normalizar dados — não expor credenciais ao frontend
    const normalized = allIssues.map(issue => ({
      key: issue.key,
      summary: issue.fields.summary || '',
      status: issue.fields.status?.name || '',
      statusCategory: issue.fields.status?.statusCategory?.key || 'new',
      issuetype: issue.fields.issuetype?.name || '',
      issuetypeIcon: issue.fields.issuetype?.iconUrl || '',
      assigneeName: issue.fields.assignee?.displayName || null,
      assigneeAvatar: issue.fields.assignee?.avatarUrls?.['24x24'] || null,
      priority: issue.fields.priority?.name || 'Medium',
      created: issue.fields.created || null,
      updated: issue.fields.updated || null,
      duedate: issue.fields.duedate || null,
      parentKey: issue.fields.parent?.key || null,
      parentSummary: issue.fields.parent?.fields?.summary || null,
      labels: issue.fields.labels || [],
      webUrl: `https://${domain}/browse/${issue.key}`,
    }));

    return res.status(200).json(normalized);
  } catch (error) {
    console.error('Erro ao buscar Jira:', error);
    return res.status(500).json({ error: 'Erro interno ao acessar Jira' });
  }
}
