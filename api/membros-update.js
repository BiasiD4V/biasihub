export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return res.status(500).json({ error: 'Not configured' });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = 'https://vzaabtzcilyoknksvhrc.supabase.co';
  const userToken = authHeader.split(' ')[1];

  try {
    // 1. Verificar JWT do chamador
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
    const callerId = userData.id;

    // 2. Verificar se o chamador é admin
    const perfilRes = await fetch(
      `${supabaseUrl}/rest/v1/usuarios?id=eq.${callerId}&select=papel`,
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

    const { userId, papel, novaSenha } = req.body || {};

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    // Impedir admin de alterar a si mesmo
    if (userId === callerId) {
      return res.status(400).json({ error: 'Não é possível alterar o próprio usuário' });
    }

    const results = {};

    // 3. Atualizar papel se fornecido
    if (papel) {
      const papeisValidos = ['admin', 'gestor', 'orcamentista'];
      if (!papeisValidos.includes(papel)) {
        return res.status(400).json({ error: 'Papel inválido' });
      }

      const updateRes = await fetch(
        `${supabaseUrl}/rest/v1/usuarios?id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'apikey': serviceKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({ papel }),
        }
      );

      if (!updateRes.ok) {
        const err = await updateRes.text();
        return res.status(500).json({ error: 'Erro ao atualizar papel', detail: err });
      }

      results.papel = papel;
    }

    // 4. Redefinir senha se fornecida
    if (novaSenha) {
      if (novaSenha.length < 6) {
        return res.status(400).json({ error: 'Senha deve ter no mínimo 6 caracteres' });
      }

      const authUpdateRes = await fetch(
        `${supabaseUrl}/auth/v1/admin/users/${userId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${serviceKey}`,
            'apikey': serviceKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ password: novaSenha }),
        }
      );

      if (!authUpdateRes.ok) {
        const err = await authUpdateRes.text();
        return res.status(500).json({ error: 'Erro ao redefinir senha', detail: err });
      }

      results.senhaRedefinida = true;
    }

    return res.status(200).json({ success: true, ...results });
  } catch (error) {
    console.error('Erro ao atualizar membro:', error);
    return res.status(500).json({ error: 'Internal error' });
  }
}
