import { verificarAuth, setCorsHeaders } from './_auth.js';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const SUPABASE_URL = 'https://vzaabtzcilyoknksvhrc.supabase.co';

export default async function handler(req, res) {
  setCorsHeaders(res, 'POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authUser = await verificarAuth(req, res);
  if (!authUser) return;

  const { texto, categoria, subcategoria, urgente } = req.body;

  if (!texto || !categoria) {
    return res.status(400).json({ error: 'texto e categoria são obrigatórios' });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    // Fallback sem IA: classifica com regras simples
    return res.status(200).json(fallbackClassificacao({ texto, categoria, subcategoria, urgente }));
  }

  try {
    // Buscar demandas já programadas para verificar disponibilidade
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const demandasRes = await fetch(
      `${SUPABASE_URL}/rest/v1/solicitacoes_almoxarifado?status=in.(pendente,em_andamento)&select=categoria,subcategoria,data_prazo,urgente&order=criado_em.desc&limit=10`,
      {
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
      }
    );
    const demandasExistentes = demandasRes.ok ? await demandasRes.json() : [];

    const hoje = new Date();
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const systemPrompt = `Você é o assistente de almoxarifado da Biasi Engenharia.
Você analisa solicitações dos colaboradores e decide:
1. Classificação: qual categoria e subcategoria se encaixa melhor
2. Prioridade: baixa, normal, alta ou urgente
3. Disponibilidade: se é possível atender na data desejada
4. Prazo sugerido: data realista para atendimento

Regras:
- Frete de material: verificar se há motorista disponível (capacidade: 2 fretes/dia)
- Separação de materiais: verificar carga de trabalho (capacidade: 5 separações/dia)
- Urgente = automaticamente alta prioridade
- Hora atual: ${hoje.toISOString()}
- Amanhã: ${amanha.toLocaleDateString('pt-BR')}

Demandas já programadas para amanhã:
${JSON.stringify(demandasExistentes.filter(d => {
  if (!d.data_prazo) return false;
  const dp = new Date(d.data_prazo);
  return dp.toDateString() === amanha.toDateString();
}), null, 2)}

Responda APENAS em JSON válido, sem markdown, no seguinte formato:
{
  "prioridade": "baixa|normal|alta|urgente",
  "disponivel_amanha": true|false,
  "prazo_sugerido": "DD/MM/YYYY",
  "mensagem": "mensagem amigável ao usuário (max 120 chars)",
  "observacoes_internas": "notas para o time de almoxarifado"
}`;

    const userMessage = `Solicitação: "${texto}"
Categoria: ${categoria}
Subcategoria: ${subcategoria || 'não especificada'}
Urgente: ${urgente ? 'sim' : 'não'}`;

    const anthropicRes = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!anthropicRes.ok) {
      console.error('Anthropic API error:', await anthropicRes.text());
      return res.status(200).json(fallbackClassificacao({ texto, categoria, subcategoria, urgente }));
    }

    const anthropicData = await anthropicRes.json();
    const rawText = anthropicData.content?.[0]?.text || '{}';

    let analise;
    try {
      analise = JSON.parse(rawText);
    } catch {
      return res.status(200).json(fallbackClassificacao({ texto, categoria, subcategoria, urgente }));
    }

    return res.status(200).json({
      prioridade: analise.prioridade || 'normal',
      disponivel_amanha: analise.disponivel_amanha ?? true,
      prazo_sugerido: analise.prazo_sugerido || amanha.toLocaleDateString('pt-BR'),
      mensagem: analise.mensagem || 'Solicitação recebida com sucesso.',
      observacoes_internas: analise.observacoes_internas || '',
      processado_por_ia: true,
    });
  } catch (err) {
    console.error('Erro ao processar com IA:', err);
    return res.status(200).json(fallbackClassificacao({ texto, categoria, subcategoria, urgente }));
  }
}

function fallbackClassificacao({ texto, categoria, subcategoria, urgente }) {
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);

  const prioridade = urgente ? 'urgente' : 'normal';
  const prazo = amanha.toLocaleDateString('pt-BR');

  const mensagens = {
    materiais: {
      frete: 'Solicitação de frete registrada. Confirmaremos disponibilidade em breve.',
      separacao: 'Separação agendada. O almoxarifado será notificado.',
      busca: 'Solicitação de busca em obra registrada.',
    },
    ferramentas: 'Solicitação de ferramenta registrada.',
    outro: 'Solicitação registrada. O almoxarifado entrará em contato.',
  };

  let mensagem = mensagens.outro;
  if (categoria === 'materiais') {
    if (subcategoria?.includes('frete')) mensagem = mensagens.materiais.frete;
    else if (subcategoria?.includes('separar')) mensagem = mensagens.materiais.separacao;
    else if (subcategoria?.includes('buscar')) mensagem = mensagens.materiais.busca;
    else mensagem = mensagens.materiais.separacao;
  } else if (categoria === 'ferramentas') {
    mensagem = mensagens.ferramentas;
  }

  return {
    prioridade,
    disponivel_amanha: true,
    prazo_sugerido: prazo,
    mensagem,
    observacoes_internas: `Processado sem IA. Texto: "${texto}"`,
    processado_por_ia: false,
  };
}
