// Vercel Serverless: proxy para API do Diário de Obra
import { verificarAuth, setCorsHeaders } from './_auth.js';

const RDO_TOKEN = process.env.RDO_TOKEN;
const BASE = 'https://apiexterna.diariodeobra.app/v1';

export default async function handler(req, res) {
  setCorsHeaders(res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = await verificarAuth(req, res);
  if (!user) return;

  if (!RDO_TOKEN) {
    return res.status(500).json({ error: 'RDO_TOKEN not configured' });
  }

  const { path, ...queryParams } = req.query;
  if (!path) {
    return res.status(400).json({ error: 'Missing path parameter' });
  }

  // Sanitize: only allow alphanumeric, hyphens, slashes
  if (!/^[a-zA-Z0-9\-\/]+$/.test(path)) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  const qs = Object.entries(queryParams)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');

  const url = `${BASE}/${path}${qs ? '?' + qs : ''}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        token: RDO_TOKEN,
      },
    });

    const data = await response.json();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(502).json({ error: 'Failed to fetch from RDO API', detail: err.message });
  }
}
