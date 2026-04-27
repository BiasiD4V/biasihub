import { supabase } from './client';

export interface Canal {
  id: string;
  nome: string;
  tipo: 'geral' | 'setor' | 'grupo' | 'dm';
  descricao?: string;
  icone?: string;
  criado_por?: string;
  // computados no front
  ultimaMensagem?: string;
  ultimaAtividade?: string;
  naoLidas?: number;
  membros?: MembroCanal[];
}

export interface MembroCanal {
  usuario_id: string;
  nome: string;
  papel: 'membro' | 'admin';
  ultimo_lido_em?: string;
}

export interface Mensagem {
  id: string;
  canal_id: string;
  remetente_id: string;
  remetente_nome: string;
  conteudo: string;
  tipo: string;
  criado_em: string;
  resposta_id?: string;
  resposta_remetente_nome?: string;
  resposta_conteudo?: string;
  arquivo_url?: string;
  arquivo_nome?: string;
  arquivo_tipo?: string;
  lido_por: string[];
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Canais
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function listarCanaisDoUsuario(usuarioId: string): Promise<Canal[]> {
  // Busca canais onde o usuÃ¡rio Ã© membro
  const { data: membros, error } = await supabase
    .from('chat_membros')
    .select('canal_id, ultimo_lido_em, chat_canais(id, nome, tipo, descricao, icone, criado_por)')
    .eq('usuario_id', usuarioId);

  if (error) throw error;

  const canais: Canal[] = (membros ?? []).map((m: any) => ({
    id: m.chat_canais.id,
    nome: m.chat_canais.nome,
    tipo: m.chat_canais.tipo,
    descricao: m.chat_canais.descricao,
    icone: m.chat_canais.icone,
    criado_por: m.chat_canais.criado_por,
  }));

  return canais;
}

async function criarGrupo(
  nome: string,
  descricao: string,
  icone: string,
  criado_por: string,
  membroIds: string[]
): Promise<Canal> {
  const { data: canal, error } = await supabase
    .from('chat_canais')
    .insert({ nome, tipo: 'grupo', descricao, icone: icone || 'ðŸ‘¥', criado_por })
    .select()
    .single();

  if (error) throw error;

  // Adicionar criador + membros
  const todos = Array.from(new Set([criado_por, ...membroIds]));
  const inserts = todos.map((uid) => ({
    canal_id: canal.id,
    usuario_id: uid,
    papel: uid === criado_por ? 'admin' : 'membro',
  }));

  const { error: membroErr } = await supabase.from('chat_membros').insert(inserts);
  if (membroErr) {
    // Fallback para esquemas legados em que "papel" pode não existir/aceitar valores diferentes.
    const insertsSemPapel = todos.map((uid) => ({
      canal_id: canal.id,
      usuario_id: uid,
    }));
    const { error: membroFallbackErr } = await supabase.from('chat_membros').insert(insertsSemPapel);
    if (membroFallbackErr) {
      await supabase.from('chat_canais').delete().eq('id', canal.id);
      throw membroFallbackErr;
    }
  }

  return canal as Canal;
}

async function criarDM(usuarioAId: string, usuarioBId: string): Promise<Canal> {
  // Verifica se jÃ¡ existe DM entre os dois
  const { data: existente } = await supabase
    .from('chat_canais')
    .select('id, nome, tipo')
    .eq('tipo', 'dm')
    .in('id', await _canalsDmComuns(usuarioAId, usuarioBId));

  if (existente && existente.length > 0) {
    return existente[0] as Canal;
  }

  const { data: canal, error } = await supabase
    .from('chat_canais')
    .insert({ nome: '', tipo: 'dm', criado_por: usuarioAId })
    .select()
    .single();

  if (error) throw error;

  await supabase.from('chat_membros').insert([
    { canal_id: canal.id, usuario_id: usuarioAId, papel: 'admin' },
    { canal_id: canal.id, usuario_id: usuarioBId, papel: 'membro' },
  ]);

  return canal as Canal;
}

async function _canalsDmComuns(uid1: string, uid2: string): Promise<string[]> {
  const { data: m1 } = await supabase
    .from('chat_membros')
    .select('canal_id')
    .eq('usuario_id', uid1);

  const { data: m2 } = await supabase
    .from('chat_membros')
    .select('canal_id')
    .eq('usuario_id', uid2);

  const ids1 = new Set((m1 ?? []).map((m: any) => m.canal_id));
  const ids2 = new Set((m2 ?? []).map((m: any) => m.canal_id));
  return [...ids1].filter((id) => ids2.has(id));
}

async function listarMembros(canalId: string): Promise<MembroCanal[]> {
  const { data, error } = await supabase
    .from('chat_membros')
    .select('usuario_id, papel, ultimo_lido_em, usuarios(nome)')
    .eq('canal_id', canalId);

  if (error) throw error;

  return (data ?? []).map((m: any) => ({
    usuario_id: m.usuario_id,
    nome: m.usuarios?.nome ?? 'UsuÃ¡rio',
    papel: m.papel,
    ultimo_lido_em: m.ultimo_lido_em,
  }));
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Mensagens
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async function listarMensagens(canalId: string, limite = 60): Promise<Mensagem[]> {
  const { data, error } = await supabase
    .from('chat_mensagens')
    .select('*')
    .eq('canal_id', canalId)
    .order('criado_em', { ascending: false })
    .limit(limite);

  if (error) throw error;

  return ((data ?? []) as Mensagem[]).reverse();
}

async function enviarMensagem(
  canalId: string,
  remetenteId: string,
  remetenteNome: string,
  conteudo: string,
  opts?: {
    respostaId?: string;
    respostaRemetenteNome?: string;
    respostaConteudo?: string;
    arquivoUrl?: string;
    arquivoNome?: string;
    arquivoTipo?: string;
  }
): Promise<Mensagem> {
  const { data, error } = await supabase
    .from('chat_mensagens')
    .insert({
      canal_id: canalId,
      canal: 'chat_v2', // marca como nova versÃ£o
      remetente_id: remetenteId,
      remetente_nome: remetenteNome,
      conteudo,
      tipo: 'texto',
      lido_por: [remetenteId],
      resposta_id: opts?.respostaId,
      resposta_remetente_nome: opts?.respostaRemetenteNome,
      resposta_conteudo: opts?.respostaConteudo,
      arquivo_url: opts?.arquivoUrl,
      arquivo_nome: opts?.arquivoNome,
      arquivo_tipo: opts?.arquivoTipo,
    })
    .select()
    .single();

  if (error) throw error;
  return data as Mensagem;
}

async function marcarComoLido(canalId: string, usuarioId: string) {
  // Atualiza ultimo_lido_em do membro
  await supabase
    .from('chat_membros')
    .update({ ultimo_lido_em: new Date().toISOString() })
    .eq('canal_id', canalId)
    .eq('usuario_id', usuarioId);
}

async function contarNaoLidas(canalId: string, usuarioId: string): Promise<number> {
  const { data: membro } = await supabase
    .from('chat_membros')
    .select('ultimo_lido_em')
    .eq('canal_id', canalId)
    .eq('usuario_id', usuarioId)
    .maybeSingle();

  if (!membro?.ultimo_lido_em) return 0;

  const { count } = await supabase
    .from('chat_mensagens')
    .select('id', { count: 'exact', head: true })
    .eq('canal_id', canalId)
    .neq('remetente_id', usuarioId)
    .gt('criado_em', membro.ultimo_lido_em);

  return count ?? 0;
}

async function contarNaoLidasTotal(usuarioId: string): Promise<number> {
  const { data: membros, error: membrosError } = await supabase
    .from('chat_membros')
    .select('canal_id, ultimo_lido_em')
    .eq('usuario_id', usuarioId);

  if (membrosError) {
    console.error('Erro ao carregar membros de chat:', membrosError);
    return 0;
  }

  const totaisPorCanal = await Promise.all(
    (membros ?? []).map(async (membro: any) => {
      if (!membro.ultimo_lido_em) {
        return 0;
      }

      let query = supabase
        .from('chat_mensagens')
        .select('id', { count: 'exact', head: true })
        .eq('canal_id', membro.canal_id)
        .neq('remetente_id', usuarioId);

      query = query.gt('criado_em', membro.ultimo_lido_em);

      const { count, error } = await query;
      if (error) return 0;
      return count ?? 0;
    })
  );

  const totalCanais = totaisPorCanal.reduce((acc, n) => acc + n, 0);
  return totalCanais;
}

async function contarNovasDesde(usuarioId: string, desdeIso: string): Promise<number> {
  const { data: membros, error: membrosError } = await supabase
    .from('chat_membros')
    .select('canal_id')
    .eq('usuario_id', usuarioId);

  if (membrosError) {
    console.error('Erro ao carregar membros de chat (novas):', membrosError);
    return 0;
  }

  const totaisPorCanal = await Promise.all(
    (membros ?? []).map(async (membro: any) => {
      const { count, error } = await supabase
        .from('chat_mensagens')
        .select('id', { count: 'exact', head: true })
        .eq('canal_id', membro.canal_id)
        .neq('remetente_id', usuarioId)
        .gt('criado_em', desdeIso);

      if (error) return 0;
      return count ?? 0;
    })
  );

  const totalCanais = totaisPorCanal.reduce((acc, n) => acc + n, 0);
  return totalCanais;
}

async function zerarNaoLidas(usuarioId: string): Promise<void> {
  const agora = new Date().toISOString();

  await supabase
    .from('chat_membros')
    .update({ ultimo_lido_em: agora })
    .eq('usuario_id', usuarioId);

  // Compatibilidade com DMs legadas sem canal_id.
  await supabase
    .from('chat_mensagens')
    .update({ lido: true })
    .eq('canal', 'dm')
    .is('canal_id', null)
    .eq('destinatario_id', usuarioId)
    .eq('lido', false);
}

async function buscarUltimaMensagem(
  canalId: string
): Promise<{ conteudo: string; criado_em: string } | null> {
  const { data } = await supabase
    .from('chat_mensagens')
    .select('conteudo, criado_em, remetente_nome')
    .eq('canal_id', canalId)
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return null;
  return { conteudo: `${data.remetente_nome}: ${data.conteudo}`, criado_em: data.criado_em };
}

function inscreverMensagens(
  canalId: string,
  onMensagem: (msg: Mensagem) => void
) {
  const channel = supabase
    .channel(`chat:${canalId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_mensagens',
        filter: `canal_id=eq.${canalId}`,
      },
      (payload) => onMensagem(payload.new as Mensagem)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export const chatRepository = {
  listarCanaisDoUsuario,
  criarGrupo,
  criarDM,
  listarMembros,
  listarMensagens,
  enviarMensagem,
  marcarComoLido,
  contarNaoLidas,
  contarNaoLidasTotal,
  contarNovasDesde,
  zerarNaoLidas,
  buscarUltimaMensagem,
  inscreverMensagens,
};

