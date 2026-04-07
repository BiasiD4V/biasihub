export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return res.status(500).json({ error: 'Not configured' });

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = 'https://vzaabtzcilyoknksvhrc.supabase.co';
  const userToken = authHeader.split(' ')[1];

  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { 'Authorization': `Bearer ${userToken}`, 'apikey': serviceKey },
    });

    if (!userRes.ok) return res.status(401).json({ error: 'Invalid token' });

    const userData = await userRes.json();
    const userId = userData.id;

    const perfilRes = await fetch(
      `${supabaseUrl}/rest/v1/usuarios?id=eq.${userId}&select=papel,departamento`,
      { headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey } }
    );

    const perfilData = await perfilRes.json();
    const callerPapel = perfilData[0]?.papel;
    if (!callerPapel || !['admin', 'dono', 'gestor'].includes(callerPapel)) {
      return res.status(403).json({ error: 'Acesso restrito a admin, dono ou gestor' });
    }

    const membrosRes = await fetch(
      `${supabaseUrl}/rest/v1/usuarios?select=id,nome,email,papel,ativo,criado_em,departamento&order=criado_em.asc`,
      { headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey } }
    );

    const membros = await membrosRes.json();

    const sessionsRes = await fetch(
      `${supabaseUrl}/rest/v1/device_sessions?select=user_id,last_login_at&order=last_login_at.desc`,
      { headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey } }
    );

    let ultimoLoginMap = {};
    if (sessionsRes.ok) {
      const sessions = await sessionsRes.json();
      for (const s of sessions) {
        if (s.user_id && s.last_login_at && !ultimoLoginMap[s.user_id]) {
          ultimoLoginMap[s.user_id] = s.last_login_at;
        }
      }
    }

    const membrosComLogin = membros.map(m => ({
      ...m,
      ultimo_login: ultimoLoginMap[m.id] || null,
    }));

    return res.status(200).json(membrosComLogin);
  } catch (error) {
    console.error('Erro ao buscar membros:', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}
