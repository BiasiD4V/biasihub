export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return res.status(500).json({ error: 'Not configured' });
  }

  // Verificar se o chamador tem um JWT válido
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = 'https://vzaabtzcilyoknksvhrc.supabase.co';
  const userToken = authHeader.split(' ')[1];

  try {
    // 1. Verificar o JWT do usuário para obter o user_id
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'apikey': serviceKey,
      },
    });

    if (!userRes.ok) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const userData = await userRes.json();
    const userId = userData.id;

    // 2. Verificar se o usuário é admin
    const perfilRes = await fetch(
      `${supabaseUrl}/rest/v1/usuarios?id=eq.${userId}&select=papel`,
      {
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey,
        },
      }
    );

    const perfilData = await perfilRes.json();
    if (!perfilData[0] || perfilData[0].papel !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // 3. Buscar todos os membros com service_role (bypass RLS)
    const membrosRes = await fetch(
      `${supabaseUrl}/rest/v1/usuarios?select=id,nome,email,papel,ativo,criado_em&order=criado_em.asc`,
      {
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'apikey': serviceKey,
        },
      }
    );

    const membros = await membrosRes.json();
    return res.status(200).json(membros);
  } catch (error) {
    console.error('Erro ao buscar membros:', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}
