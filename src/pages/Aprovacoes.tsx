import { useState, useEffect } from 'react';
import { 
  CheckSquare, Lock, ShieldCheck, XCircle, CheckCircle, 
  Clock, ArrowRight, RefreshCw,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { propostasRepository } from '../infrastructure/supabase/propostasRepository';
import type { MudancaEtapaRow, PropostaSupabase } from '../infrastructure/supabase/propostasRepository';
import { formatarData } from '../utils/datas';
import { ETAPA_CORES } from '../domain/value-objects/EtapaFunil';

type PendenciaAprovacao = MudancaEtapaRow & { proposta: PropostaSupabase };

export function Aprovacoes() {
  const { usuario } = useAuth();
  const [pendencias, setPendencias] = useState<PendenciaAprovacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [processandoId, setProcessandoId] = useState<string | null>(null);

  // Controle de Acesso
  const temAcesso = usuario?.papel === 'admin' || usuario?.papel === 'gestor' || usuario?.papel === 'dono';

  const carregar = async () => {
    setLoading(true);
    try {
      const data = await propostasRepository.listarTodasMudancasPendentes();
      setPendencias(data);
    } catch (err) {
      console.error('Erro ao carregar aprovações:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (temAcesso) carregar();
  }, [temAcesso]);

  const handleDecisao = async (id: string, propostaId: string, decisao: 'aprovado' | 'rejeitado', novaEtapa: string) => {
    setProcessandoId(id);
    try {
      // 1. Atualiza o status da mudança
      await propostasRepository.atualizarMudancaEtapa(id, { status: decisao });

      // 2. Se aprovado, atualiza a etapa do orçamento
      if (decisao === 'aprovado') {
        await propostasRepository.atualizar(propostaId, { etapa_funil: novaEtapa as any });
      }

      // 3. Remove da lista local com animação
      setPendencias((prev: PendenciaAprovacao[]) => prev.filter((p: PendenciaAprovacao) => p.id !== id));
    } catch (err) {
      console.error('Erro ao processar aprovação:', err);
    } finally {
      setProcessandoId(null);
    }
  };

  // ── Render: Acesso Negado ──────────────────────────────────────────────────
  if (!temAcesso) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-50">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-10 animate-pulse" />
          <div className="relative bg-white p-8 rounded-[40px] shadow-2xl border border-slate-100 flex flex-col items-center max-w-sm text-center">
            <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center text-slate-400 mb-6 transition-transform hover:scale-110 duration-500">
               <Lock size={40} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">Acesso Restrito</h2>
            <p className="text-sm font-medium text-slate-500 leading-relaxed">
              Somente gestores e administradores podem acessar a Central de Aprovações.
            </p>
            <div className="mt-8 flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100 fill-slate-400">
               <ShieldCheck size={16} className="text-blue-500" />
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Segurança BiásiHub</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <div className="px-10 py-8 bg-white/60 backdrop-blur-xl border-b border-slate-200/60 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="p-3.5 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-xl shadow-blue-500/30 text-white">
              <CheckSquare size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">Central de Aprovações</h1>
              <p className="text-sm font-semibold text-slate-400 mt-1">
                {pendencias.length} {pendencias.length === 1 ? 'revisão' : 'revisões'} aguardando sua decisão
              </p>
            </div>
          </div>
          <button 
            onClick={carregar} 
            className="group p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-10">
        {loading && pendencias.length === 0 ? (
           <div className="flex items-center justify-center h-64">
              <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
           </div>
        ) : pendencias.length === 0 ? (
          <div className="max-w-md mx-auto py-24 text-center">
             <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={40} />
             </div>
             <h3 className="text-xl font-black text-slate-900 mb-2">Tudo em dia!</h3>
             <p className="text-sm text-slate-400 font-medium">Não há revisões pendentes de aprovação neste momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 max-w-7xl mx-auto">
            {pendencias.map(item => (
              <div key={item.id} className="bg-white rounded-[32px] shadow-sm border border-slate-200/60 overflow-hidden hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-300 group">
                <div className="p-8">
                  {/* Info Orçamento */}
                  <div className="flex items-start justify-between mb-6">
                    <div className="space-y-1">
                       <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-md">
                         {item.proposta.numero_composto}
                       </span>
                       <h4 className="text-lg font-black text-slate-900 leading-tight pt-1">
                         {item.proposta.obra || item.proposta.objeto || '—'}
                       </h4>
                       <p className="text-sm text-slate-400 font-medium">{item.proposta.cliente || '—'}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-none">Aberto em</p>
                       <p className="text-xs font-black text-slate-500 mt-1">{formatarData(item.created_at)}</p>
                    </div>
                  </div>

                  {/* Transição de Etapa */}
                  <div className="flex items-center gap-4 bg-slate-50 rounded-2xl p-5 mb-6 border border-slate-100 group-hover:bg-slate-50/50 transition-colors">
                    <div className="flex-1 text-center">
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Anterior</p>
                       <span className="text-xs font-black text-slate-700 whitespace-nowrap px-3 py-1.5 bg-white rounded-xl shadow-sm border border-slate-100">
                          {item.etapa_anterior || 'Início'}
                       </span>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                       <ArrowRight size={18} className="text-blue-500 animate-pulse" />
                    </div>
                    <div className="flex-1 text-center font-black">
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Proposta</p>
                       <span className={`text-xs font-black text-white px-3 py-1.5 rounded-xl shadow-lg border-2 border-white ${ETAPA_CORES[item.etapa_nova as keyof typeof ETAPA_CORES] || 'bg-slate-400'}`}>
                          {item.etapa_nova}
                       </span>
                    </div>
                  </div>

                  {/* Detalhes e Responsável */}
                  <div className="space-y-4 mb-8">
                    <div className="flex items-start gap-4 p-4 bg-amber-50/50 border border-amber-100/50 rounded-2xl italic">
                       <Clock size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
                       <p className="text-sm text-amber-900 font-medium leading-relaxed">
                         "{item.observacao || 'Nenhuma observação informada.'}"
                       </p>
                    </div>
                    <div className="flex items-center justify-between px-2">
                       <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold text-xs uppercase">
                            {item.responsavel.substring(0,2)}
                          </div>
                          <span className="text-xs font-bold text-slate-500">{item.responsavel}</span>
                       </div>
                       <a 
                        href={`/orcamentos/${item.proposta_id}`} 
                        className="text-[10px] font-black text-blue-600 hover:text-blue-700 flex items-center gap-1 uppercase tracking-widest"
                       >
                         Ver Detalhes <ExternalLink size={12} />
                       </a>
                    </div>
                  </div>

                  {/* Botões de Ação */}
                  <div className="flex gap-3 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => handleDecisao(item.id, item.proposta_id, 'rejeitado', item.etapa_nova)}
                      disabled={!!processandoId}
                      className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-black text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all active:scale-95 disabled:opacity-50"
                    >
                      <XCircle size={18} /> Negar
                    </button>
                    <button
                      onClick={() => handleDecisao(item.id, item.proposta_id, 'aprovado', item.etapa_nova)}
                      disabled={!!processandoId}
                      className="flex-[1.5] flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-black text-white bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                    >
                      {processandoId === item.id ? <RefreshCw size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                      Aprovar Revisão
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
