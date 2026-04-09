/**
 * Shared authentication helper for Vercel serverless API endpoints.
 * Validates Supabase JWT tokens.
 */

const SUPABASE_URL = 'https://vzaabtzcilyoknksvhrc.supabase.co';

/**
 * Validate the Authorization Bearer token against Supabase.
 * Returns the user object on success, null on failure.
 * Sets appropriate error responses on the res object when auth fails.
 */
export async function verificarAuth(req, res) {
  const apiKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (!apiKey) {
    res.status(500).json({ error: 'Not configured: missing Supabase API key' });
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
        'apikey': apiKey,
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

/**
 * Standard CORS headers for API endpoints.
 */
export function setCorsHeaders(res, methods = 'GET, POST, PUT, PATCH, OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
