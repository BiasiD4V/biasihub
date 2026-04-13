export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'PATCH') return res.status(405).json({ error: 'Method not allowed' });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) return res.status(500).json({ error: 'Not configured' });

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const supabaseUrl = 'https://vzaabtzcilyoknksvhrc.supabase.co';
  const userToken = authHeader.split(' ')[1];

  const PAPEIS_SUPERIORES = ['admin', 'dono'];
  const PAPEIS_GESTORES = ['gestor'];
  const PAPEIS_VALIDOS = ['admin', 'dono', 'gestor', 'orcamentista', 'comercial', 'engenheiro', 'membro'];

  try {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { 'Authorization': `Bearer ${userToken}`, 'apikey': serviceKey },
    });

    if (!userRes.ok) return res.status(401).json({ error: 'Invalid token' });

    const userData = await userRes.json();
    const callerId = userData.id;

    const perfilRes = await fetch(
      `${supabaseUrl}/rest/v1/usuarios?id=eq.${callerId}&select=papel,departamento`,
      { headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey } }
    );

    const perfilData = await perfilRes.json();
    if (!perfilData[0]) return res.status(403).json({ error: 'Profile not found' });

    const callerPapel = perfilData[0].papel;
    const callerDepto = perfilData[0].departamento;
    const isSuper = PAPEIS_SUPERIORES.includes(callerPapel);
    const isGestor = PAPEIS_GESTORES.includes(callerPapel);

    if (!isSuper && !isGestor) {
      return res.status(403).json({ error: 'Acesso negado. Você precisa ser admin, dono ou gestor.' });
    }

    const { userId, papel, novaSenha, ativo, departamento } = req.body || {};

    if (!userId) return res.status(400).json({ error: 'userId is required' });
    if (userId === callerId) return res.status(400).json({ error: 'Não é possível alterar o próprio usuário' });

    const targetRes = await fetch(
      `${supabaseUrl}/rest/v1/usuarios?id=eq.${userId}&select=papel,departamento`,
      { headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey } }
    );
    const targetData = await targetRes.json();
    if (!targetData[0]) return res.status(404).json({ error: 'Usuário não encontrado' });

    const targetPapel = targetData[0].papel;
    const targetDepto = targetData[0].departamento;

    if (isGestor && !isSuper) {
      if (PAPEIS_SUPERIORES.includes(targetPapel) || PAPEIS_GESTORES.includes(targetPapel)) {
        return res.status(403).json({ error: 'Gestores não podem gerenciar outros gestores, admins ou o dono' });
      }
      if (targetDepto !== callerDepto) {
        return res.status(403).json({ error: `Você só pode gerenciar membros do departamento "${callerDepto}"` });
      }
    }

    if (PAPEIS_SUPERIORES.includes(targetPapel) && callerPapel !== 'dono' && callerPapel !== 'admin') {
      return res.status(403).json({ error: 'Apenas o dono ou admin pode gerenciar administradores' });
    }

    const results = {};

    if (papel) {
      if (!PAPEIS_VALIDOS.includes(papel)) return res.status(400).json({ error: 'Papel inválido' });

      const updateRes = await fetch(
        `${supabaseUrl}/rest/v1/usuarios?id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({ papel }),
        }
      );

      if (!updateRes.ok) {
        const err = await updateRes.text();
        return res.status(500).json({ error: 'Erro ao atualizar papel', detail: err });
      }
      results.papel = papel;
    }

    if (departamento !== undefined) {
      const deptRes = await fetch(
        `${supabaseUrl}/rest/v1/usuarios?id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({ departamento }),
        }
      );

      if (!deptRes.ok) {
        const err = await deptRes.text();
        return res.status(500).json({ error: 'Erro ao atualizar departamento', detail: err });
      }
      results.departamento = departamento;
    }

    if (ativo !== undefined) {
      const ativoRes = await fetch(
        `${supabaseUrl}/rest/v1/usuarios?id=eq.${userId}`,
        {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
          body: JSON.stringify({ ativo: !!ativo }),
        }
      );

      if (!ativoRes.ok) {
        const err = await ativoRes.text();
        return res.status(500).json({ error: 'Erro ao alterar status', detail: err });
      }
      results.ativo = !!ativo;
    }

    if (novaSenha) {
      if (novaSenha.length < 4) return res.status(400).json({ error: 'Senha deve ter no mínimo 4 caracteres' });

      const authUpdateRes = await fetch(
        `${supabaseUrl}/auth/v1/admin/users/${userId}`,
        {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${serviceKey}`, 'apikey': serviceKey, 'Content-Type': 'application/json' },
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
