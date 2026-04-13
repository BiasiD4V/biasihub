const SUPABASE_URL = 'https://vzaabtzcilyoknksvhrc.supabase.co';

export async function verificarAuth(req, res) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    res.status(500).json({ error: 'Not configured' });
    return null;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  const userToken = authHeader.split(' ')[1];

  try {
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'apikey': serviceKey,
      },
    });

    if (!userRes.ok) {
      res.status(401).json({ error: 'Invalid token' });
      return null;
    }

    return await userRes.json();
  } catch {
    res.status(401).json({ error: 'Auth validation failed' });
    return null;
  }
}

export function setCorsHeaders(res, methods = 'GET, POST, PUT, PATCH, OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
