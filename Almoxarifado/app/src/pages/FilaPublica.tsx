import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../infrastructure/supabase/client';

interface RequisicaoItem {
  descricao?: string;
  quantidade?: number;
  unidade?: string;
  fase_rastreio?: number | string | null;
}

interface Requisicao {
  id: string;
  criado_em: string;
  obra: string;
  status: string | null;
  itens: RequisicaoItem[] | null;
  observacao: string | null;
}

type StatusPublico = 'aguardando' | 'separando' | 'separado' | 'finalizado' | 'recebido' | 'cancelado';

const STATUS_LABEL: Record<StatusPublico, { label: string; color: string }> = {
  aguardando: { label: 'Aguardando', color: 'text-amber-400' },
  separando: { label: 'Separando', color: 'text-blue-400' },
  separado: { label: 'Separado', color: 'text-indigo-400' },
  finalizado: { label: 'Finalizado', color: 'text-purple-400' },
  recebido: { label: 'Recebido', color: 'text-green-400' },
  cancelado: { label: 'Cancelado', color: 'text-red-400' },
};

function parseMaxFase(itens: RequisicaoItem[] | null): number | null {
  if (!Array.isArray(itens) || itens.length === 0) return null;

  const fases = itens
    .map((item) => Number(item?.fase_rastreio))
    .filter((fase) => Number.isFinite(fase) && fase >= 0 && fase <= 3);

  if (fases.length === 0) return null;
  return Math.max(...fases);
}

function inferirStatusPublico(requisicao: Requisicao): StatusPublico {
  const statusRaw = String(requisicao.status ?? '').trim().toLowerCase();

  if (statusRaw === 'cancelada' || statusRaw === 'cancelado') return 'cancelado';

  const faseMax = parseMaxFase(requisicao.itens);
  if (faseMax === 3) return 'recebido';
  if (faseMax === 2) return 'finalizado';
  if (faseMax === 1) return 'separado';
  if (faseMax === 0) return 'separando';

  if (statusRaw === 'entregue') return 'recebido';
  if (statusRaw === 'enviado') return 'finalizado';
  if (statusRaw === 'separado') return 'separado';
  if (statusRaw === 'em_andamento' || statusRaw === 'aprovada') return 'separando';

  return 'aguardando';
}

export function FilaPublica() {
  const [params] = useSearchParams();
  const tel = params.get('tel')?.replace(/\D/g, '') || '';
  const nome = params.get('nome') || '';

  const [pedidos, setPedidos] = useState<Requisicao[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!tel) {
      setErro('Telefone nao informado.');
      setLoading(false);
      return;
    }

    supabase
      .from('requisicoes_almoxarifado')
      .select('id, criado_em, obra, status, itens, observacao')
      .eq('telefone', tel)
      .order('criado_em', { ascending: false })
      .limit(20)
      .then(({ data, error }) => {
        if (error) setErro('Erro ao carregar pedidos.');
        else setPedidos((data as Requisicao[]) || []);
        setLoading(false);
      });
  }, [tel]);

  function formatData(iso: string) {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="min-h-screen bg-[#0f172a] text-white">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="mb-4">
          <Link
            to="/obra"
            className="inline-flex items-center gap-2 rounded-xl border border-[rgba(113,154,255,0.35)] bg-[rgba(8,24,64,0.45)] px-3 py-2 text-xs font-bold text-white/95 hover:bg-[rgba(8,24,64,0.65)] transition"
          >
            {'<-'} Voltar ao inicio
          </Link>
        </div>

        <div className="text-center mb-8">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">Almoxarifado - Biasi Engenharia</p>
          <h1 className="text-2xl font-black text-white">Meus Pedidos</h1>
          {nome && <p className="text-slate-400 text-sm mt-1">Ola, {nome}!</p>}
        </div>

        {loading && <div className="text-center text-slate-400 py-12">Carregando...</div>}

        {erro && (
          <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-center">{erro}</div>
        )}

        {!loading && !erro && pedidos.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400">Nenhum pedido encontrado para este numero.</p>
          </div>
        )}

        <div className="space-y-4">
          {pedidos.map((p) => {
            const statusPublico = inferirStatusPublico(p);
            const st = STATUS_LABEL[statusPublico];

            return (
              <div key={p.id} className="bg-[#1e293b] rounded-2xl p-4 border border-slate-700/50">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-bold text-white text-sm">{p.obra}</p>
                    <p className="text-slate-500 text-xs mt-0.5">{formatData(p.criado_em)}</p>
                  </div>
                  <span className={`text-xs font-bold ${st.color}`}>{st.label}</span>
                </div>

                <div className="space-y-1">
                  {(Array.isArray(p.itens) ? p.itens : []).map((it, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                      <span className="text-slate-500">-</span>
                      <span>
                        {it.quantidade ?? '-'} {it.unidade ?? ''} - {it.descricao ?? 'Item'}
                      </span>
                    </div>
                  ))}
                </div>

                {p.observacao && (
                  <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-700/50">{p.observacao}</p>
                )}
              </div>
            );
          })}
        </div>

        {!loading && pedidos.length > 0 && (
          <a
            href={`/req?tel=${tel}&nome=${encodeURIComponent(nome)}`}
            className="block mt-6 text-center bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition"
          >
            + Nova Requisicao
          </a>
        )}

        <p className="text-center text-slate-600 text-xs mt-6">BiasiHub - Almoxarifado - Biasi Engenharia e Instalacoes</p>
      </div>
    </div>
  );
}
