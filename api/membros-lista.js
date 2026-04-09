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
    // Validar JWT — qualquer usuário autenticado pode listar membros para o chat
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'apikey': serviceKey,
      },
    });

    if (!userRes.ok) return res.status(401).json({ error: 'Invalid token' });

    // Buscar todos os usuários (bypass RLS com service_role)
    const [membrosRes, presencaRes] = await Promise.all([
      fetch(
        `${supabaseUrl}/rest/v1/usuarios?select=id,nome,email,papel,ativo&order=nome.asc`,
        {
          headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'apikey': serviceKey,
          },
        }
      ),
      fetch(
        `${supabaseUrl}/rest/v1/presenca_usuarios?select=user_id,esta_online,ultimo_heartbeat,ultima_entrada`,
        {
          headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'apikey': serviceKey,
          },
        }
      ),
    ]);

    const membros = await membrosRes.json();
    const presencas = await presencaRes.json();

    // Montar mapa de presença (com server-side staleness check)
    const presencaMap = {};
    const agora = Date.now();
    const TIMEOUT_MS = 2 * 60 * 1000; // 2 minutos sem heartbeat = offline
    if (Array.isArray(presencas)) {
      for (const p of presencas) {
        const ultimoHb = p.ultimo_heartbeat ? new Date(p.ultimo_heartbeat).getTime() : 0;
        const stale = (agora - ultimoHb) > TIMEOUT_MS;
        presencaMap[p.user_id] = {
          ...p,
          esta_online: p.esta_online && !stale, // se heartbeat expirou, forçar offline
        };
      }
    }

    // Unir dados
    const resultado = (Array.isArray(membros) ? membros : []).map(m => ({
      id: m.id,
      nome: m.nome,
      email: m.email,
      papel: m.papel,
      ativo: m.ativo,
      esta_online: presencaMap[m.id]?.esta_online ?? false,
      ultimo_visto: presencaMap[m.id]?.ultimo_heartbeat ?? null,
      conectado_desde: presencaMap[m.id]?.ultima_entrada ?? null,
    }));

    return res.status(200).json(resultado);
  } catch (error) {
    console.error('Erro em membros-lista:', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}
