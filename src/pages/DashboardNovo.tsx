import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  DollarSign,
  BarChart2,
  CheckCircle,
  FileText,
  Users,
  ArrowRight,
} from 'lucide-react';
import { propostasRepository, type PropostaSupabase } from '../infrastructure/supabase/propostasRepository';

interface KpiCardProps {
  label: string;
  valor: string | number;
  sublabel?: string;
  cor?: string;
  iconBg?: string;
  icon: React.ElementType;
  onClick?: () => void;
}

function KpiCard({
  label,
  valor,
  sublabel,
  cor = 'text-slate-800',
  iconBg = 'bg-slate-50',
  icon: Icon,
  onClick,
}: KpiCardProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 shadow-sm p-5 ${
        onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
        <div className={`${iconBg} rounded-lg p-1.5`}>
          <Icon size={14} className="text-slate-400" />
        </div>
      </div>
      <p className={`text-3xl font-bold ${cor}`}>{valor}</p>
      {sublabel && <p className="text-xs text-slate-400 mt-1">{sublabel}</p>}
    </div>
  );
}

interface DadosPropostas {
  total: number;
  fechadas: number;
  valorTotal: number;
  porAno: { ano: number; total: number; fechadas: number; valor: number }[];
  porStatus: { status: string; quantidade: number }[];
  porResponsavel: { responsavel: string; total: number; fechadas: number; valor: number }[];
  porDisciplina: { disciplina: string; total: number; fechadas: number; valor: number }[];
  recentes: PropostaSupabase[];
}

const STATUS_CORES_BG: Record<string, string> = {
  FECHADO: 'bg-green-500',
  ENVIADO: 'bg-blue-500',
  RECEBIDO: 'bg-cyan-500',
  'EM REVISÃO': 'bg-yellow-500',
  CANCELADO: 'bg-red-400',
  'NÃO FECHADO': 'bg-red-500',
  DECLINADO: 'bg-red-300',
  'CLIENTE NÃO DEU RETORNO': 'bg-gray-400',
  'NEGOCIAÇÃO FUTURA': 'bg-purple-500',
  'ORÇAMENTO': 'bg-orange-500',
};

export function DashboardNovo() {
  const navigate = useNavigate();

  const [dados, setDados] = useState<DadosPropostas | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    propostasRepository
      .buscarDadosDashboard()
      .then(setDados)
      .catch(console.error)
      .finally(() => setCarregando(false));
  }, []);

  function formatarValor(v: number) {
    if (v === 0) return '—';
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  }

  const taxaConversao = dados && dados.total > 0
    ? ((dados.fechadas / dados.total) * 100).toFixed(1)
    : '0';

  const naoFechadas = dados ? dados.porStatus.find(s => s.status === 'NÃO FECHADO')?.quantidade ?? 0 : 0;
  const enviadas = dados ? dados.porStatus.find(s => s.status === 'ENVIADO')?.quantidade ?? 0 : 0;

  return (
    <div className="flex flex-col h-full">
      {/* Cabeçalho */}
      <div className="px-4 lg:px-8 py-6 border-b border-slate-200 bg-white">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Visão geral dos orçamentos e indicadores comerciais
        </p>
      </div>

      {/* Conteúdo */}
      <div className="flex-1 p-4 lg:p-8 overflow-y-auto space-y-6">

        {carregando ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            <span className="ml-3 text-sm text-slate-400">Carregando dados...</span>
          </div>
        ) : !dados ? (
          <div className="text-center py-20 text-slate-400 text-sm">Erro ao carregar dados do Supabase</div>
        ) : (
          <>
            {/* ── KPIs Pipeline ─────────────────────────────────────────── */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                Pipeline
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  label="Total de Propostas"
                  valor={dados.total.toLocaleString('pt-BR')}
                  sublabel="todas as propostas registradas"
                  icon={BarChart2}
                  onClick={() => navigate('/orcamentos')}
                />
                <KpiCard
                  label="Propostas Fechadas"
                  valor={dados.fechadas.toLocaleString('pt-BR')}
                  sublabel={`${taxaConversao}% de conversão`}
                  cor="text-green-600"
                  iconBg="bg-green-50"
                  icon={CheckCircle}
                />
                <KpiCard
                  label="Enviadas"
                  valor={enviadas.toLocaleString('pt-BR')}
                  sublabel="aguardando retorno"
                  cor="text-blue-600"
                  iconBg="bg-blue-50"
                  icon={FileText}
                  onClick={() => navigate('/orcamentos')}
                />
                <KpiCard
                  label="Não Fechadas"
                  valor={naoFechadas.toLocaleString('pt-BR')}
                  sublabel={naoFechadas > 0 ? 'analisar motivos de perda' : 'nenhuma perda'}
                  cor={naoFechadas > 0 ? 'text-red-600' : 'text-slate-800'}
                  icon={TrendingUp}
                />
              </div>
            </div>

            {/* ── KPIs Financeiros ──────────────────────────────────────── */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                Indicadores Financeiros
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  label="Valor Total Orçado"
                  valor={formatarValor(dados.valorTotal)}
                  sublabel="soma de todas as propostas"
                  cor="text-blue-600"
                  iconBg="bg-blue-50"
                  icon={DollarSign}
                />
                <KpiCard
                  label="Ticket Médio"
                  valor={dados.total > 0 ? formatarValor(Math.round(dados.valorTotal / dados.total)) : '—'}
                  sublabel="valor médio por proposta"
                  icon={FileText}
                />
                <KpiCard
                  label="Taxa de Conversão"
                  valor={`${taxaConversao}%`}
                  sublabel={`${dados.fechadas} fechadas de ${dados.total} propostas`}
                  cor={
                    Number(taxaConversao) >= 40 ? 'text-green-600' :
                    Number(taxaConversao) >= 25 ? 'text-amber-600' :
                    'text-red-600'
                  }
                  iconBg={Number(taxaConversao) >= 40 ? 'bg-green-50' : Number(taxaConversao) >= 25 ? 'bg-amber-50' : 'bg-red-50'}
                  icon={TrendingUp}
                />
                <KpiCard
                  label="Valor Fechado"
                  valor={formatarValor(
                    dados.porStatus.find(s => s.status === 'FECHADO')
                      ? dados.porResponsavel.reduce((acc, r) => acc + r.valor, 0)
                      : 0
                  )}
                  sublabel="valor das propostas ganhas"
                  cor="text-green-600"
                  iconBg="bg-green-50"
                  icon={DollarSign}
                />
              </div>
            </div>

            {/* ── Grid: ano + status + responsáveis ────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Propostas por Ano */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
                  Propostas por Ano
                </h3>
                <div className="space-y-3">
                  {dados.porAno.map((a) => {
                    const maxTotal = Math.max(...dados.porAno.map((x) => x.total));
                    const pctTotal = maxTotal > 0 ? (a.total / maxTotal) * 100 : 0;
                    const pctFechadas = a.total > 0 ? (a.fechadas / a.total) * 100 : 0;
                    return (
                      <div key={a.ano}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-slate-700">{a.ano}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-slate-500">{a.total} prop.</span>
                            <span className="text-xs font-medium text-green-600">{a.fechadas} fechadas</span>
                            <span className="text-xs text-slate-400">{formatarValor(a.valor)}</span>
                          </div>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden relative">
                          <div
                            className="h-full bg-blue-200 rounded-full transition-all absolute top-0 left-0"
                            style={{ width: `${pctTotal}%` }}
                          />
                          <div
                            className="h-full bg-green-500 rounded-full transition-all absolute top-0 left-0"
                            style={{ width: `${pctTotal * (pctFechadas / 100)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-200" /> Total</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> Fechadas</span>
                  </div>
                </div>
              </div>

              {/* Distribuição por Status */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
                  Por Status
                </h3>
                <div className="space-y-2">
                  {dados.porStatus.slice(0, 8).map((s) => {
                    const pct = dados.total > 0 ? (s.quantidade / dados.total) * 100 : 0;
                    return (
                      <div key={s.status}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-slate-600 truncate max-w-[140px]">{s.status}</span>
                          <span className="text-xs font-semibold text-slate-700 ml-2">
                            {s.quantidade} <span className="text-slate-400 font-normal">({pct.toFixed(0)}%)</span>
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${STATUS_CORES_BG[s.status] || 'bg-slate-400'}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Top Responsáveis */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Users size={13} className="text-slate-400" />
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Top Responsáveis
                  </h3>
                </div>
                <div className="space-y-0.5">
                  <div className="grid grid-cols-12 gap-1 pb-2 border-b border-slate-100">
                    <span className="text-xs font-semibold text-slate-400 col-span-5">Nome</span>
                    <span className="text-xs font-semibold text-slate-400 text-center col-span-2">Qtd</span>
                    <span className="text-xs font-semibold text-slate-400 text-center col-span-2">Fech.</span>
                    <span className="text-xs font-semibold text-slate-400 text-right col-span-3">Valor</span>
                  </div>
                  {dados.porResponsavel.slice(0, 8).map((r) => (
                    <div
                      key={r.responsavel}
                      className="grid grid-cols-12 gap-1 py-1.5 hover:bg-slate-50 rounded px-1 transition-colors"
                    >
                      <div className="col-span-5 flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                          {r.responsavel.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs text-slate-700 truncate">{r.responsavel.split(' ').slice(0, 2).join(' ')}</span>
                      </div>
                      <span className="text-xs font-semibold text-slate-600 text-center col-span-2 self-center">{r.total}</span>
                      <span className="text-xs font-semibold text-green-600 text-center col-span-2 self-center">{r.fechadas}</span>
                      <span className="text-xs text-slate-500 text-right col-span-3 self-center">{formatarValor(r.valor)}</span>
                    </div>
                  ))}
                </div>

                {/* Taxa de conversão geral */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <p className="text-xs text-slate-400 mb-2">Taxa de conversão geral</p>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-green-500 rounded-full transition-all"
                        style={{ width: `${taxaConversao}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-green-600 flex-shrink-0">
                      {taxaConversao}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {dados.fechadas} fechadas de {dados.total} propostas
                  </p>
                </div>
              </div>
            </div>

            {/* ── Grid: disciplinas + últimas propostas ─────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Por Disciplina */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
                  Por Disciplina
                </h3>
                <div className="space-y-2">
                  {dados.porDisciplina.slice(0, 6).map((d) => {
                    const pct = dados.total > 0 ? (d.total / dados.total) * 100 : 0;
                    return (
                      <div key={d.disciplina}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-slate-600 truncate max-w-[200px]">{d.disciplina}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-slate-700">{d.total}</span>
                            <span className="text-xs text-green-600">{d.fechadas} fech.</span>
                            <span className="text-xs text-slate-400">{formatarValor(d.valor)}</span>
                          </div>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Últimas Propostas */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    Últimas Propostas
                  </h3>
                  <button
                    onClick={() => navigate('/orcamentos')}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    Ver todas <ArrowRight size={10} />
                  </button>
                </div>
                <div className="space-y-1">
                  {dados.recentes.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => navigate('/orcamentos')}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-400">{p.numero_composto}</span>
                          <span className="text-xs font-medium text-slate-700 truncate">{p.cliente || '—'}</span>
                        </div>
                        <p className="text-xs text-slate-400 truncate mt-0.5">{p.objeto || p.obra || '—'}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                        <span className="text-xs font-medium text-slate-600">
                          {p.valor_orcado ? p.valor_orcado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : '—'}
                        </span>
                        {p.status && (
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                            p.status === 'FECHADO' ? 'bg-green-100 text-green-700' :
                            p.status === 'ENVIADO' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {p.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
