import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../infrastructure/supabase/client';
import { useAuth } from '../context/AuthContext';

export interface Notificacao {
  id: string;
  tipo: 'estoque_baixo' | 'requisicao_pendente' | 'epi_vencendo' | 'manutencao_vencida';
  mensagem: string;
  lida: boolean;
  item_id: string | null;
  veiculo_id: string | null;
  criado_em: string;
}

export function useNotificacoes() {
  const { usuario } = useAuth();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [naoLidas, setNaoLidas] = useState(0);

  const buscar = useCallback(async () => {
    if (!usuario?.id) return;
    const { data } = await supabase
      .from('notificacoes_almoxarifado')
      .select('*')
      .eq('usuario_id', usuario.id)
      .order('criado_em', { ascending: false })
      .limit(30);
    const lista = data || [];
    setNotificacoes(lista);
    setNaoLidas(lista.filter(n => !n.lida).length);
  }, [usuario?.id]);

  useEffect(() => {
    buscar();
    const interval = setInterval(buscar, 2 * 60 * 1000); // a cada 2 min
    return () => clearInterval(interval);
  }, [buscar]);

  async function marcarLida(id: string) {
    await supabase.from('notificacoes_almoxarifado').update({ lida: true }).eq('id', id);
    setNotificacoes(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
    setNaoLidas(prev => Math.max(0, prev - 1));
  }

  async function marcarTodasLidas() {
    if (!usuario?.id) return;
    await supabase.from('notificacoes_almoxarifado')
      .update({ lida: true })
      .eq('usuario_id', usuario.id)
      .eq('lida', false);
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
    setNaoLidas(0);
  }

  return { notificacoes, naoLidas, marcarLida, marcarTodasLidas, buscar };
}

/** Cria notificação para todos os gestores/admins/donos */
export async function criarNotificacaoGestores(
  tipo: Notificacao['tipo'],
  mensagem: string,
  extra?: { item_id?: string; veiculo_id?: string }
) {
  const { data: gestores } = await supabase
    .from('usuarios')
    .select('id')
    .in('papel', ['gestor', 'admin', 'dono'])
    .eq('ativo', true);

  if (!gestores?.length) return;

  const rows = gestores.map(g => ({
    tipo,
    mensagem,
    usuario_id: g.id,
    item_id: extra?.item_id || null,
    veiculo_id: extra?.veiculo_id || null,
  }));

  await supabase.from('notificacoes_almoxarifado').insert(rows);
}

