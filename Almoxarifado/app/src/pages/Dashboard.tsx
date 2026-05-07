import { useEffect, useState } from 'react';
import { Package, AlertTriangle, ClipboardList, Truck, TrendingDown, TrendingUp, Activity, Fuel, ZapOff, RefreshCw } from 'lucide-react';
import { supabase } from '../infrastructure/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface KPIs {
  totalItens: number;
  itensBaixoEstoque: number;
  itensZerados: number;
  requisicoesPendentes: number;
  veiculosEmUso: number;
  veiculosManutencao: number;
  movimentacoesHoje: number;
  custoFrotaTotal: number;
}

interface Movimentacao {
  id: string;
  tipo: string;
  quantidade: number;
  obra: string | null;
  responsavel: { nome: string } | null;
  criado_em: string;
  item: { descricao: string } | null;
}

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function Dashboard() {
  const [kpis, setKpis] = useState<KPIs>({
    totalItens: 0, itensBaixoEstoque: 0, itensZerados: 0,
    requisicoesPendentes: 0, veiculosEmUso: 0, veiculosManutencao: 0,
    movimentacoesHoje: 0, custoFrotaTotal: 0,
  });
  const [topItens, setTopItens] = useState<{ descricao: string; estoque_atual: number }[]>([]);
  const [statusFrota, setStatusFrota] = useState<{ name: string; value: number; color: string }[]>([]);
  const [ultimasMovimentacoes, setUltimasMovimentacoes] = useState<Movimentacao[]>([]);
  const [loading, setLoading] = useState(true);

  async function carregar() {
    setLoading(true);
    try {
    const hoje = new Date().toISOString().slice(0, 10);

    const [itensRes, reqRes, veiculosRes, movHojeRes, custoFrotaRes, ultimasMov] = await Promise.all([
      supabase.from('itens_almoxarifado').select('id, descricao, estoque_atual, estoque_minimo').eq('ativo', true),
      supabase.from('requisicoes_almoxarifado').select('id').eq('status', 'pendente'),
      supabase.from('veiculos').select('id, status').eq('ativo', true),
      supabase.from('movimentacoes_almoxarifado').select('id').gte('criado_em', `${hoje}T00:00:00`),
      supabase.from('manutencoes_veiculo').select('custo'),
      supabase.from('movimentacoes_almoxarifado')
        .select('id, tipo, quantidade, obra, criado_em, responsavel:usuarios!movimentacoes_almoxarifado_responsavel_id_fkey(nome), item:itens_almoxarifado!movimentacoes_almoxarifado_item_id_fkey(descricao)')
        .order('criado_em', { ascending: false })
        .limit(5),
    ]);

    const itens = itensRes.data || [];
    const requisicoes = reqRes.data || [];
    const veiculos = veiculosRes.data || [];
    const movHoje = movHojeRes.data || [];
    const custoRows = custoFrotaRes.data || [];

    const baixoEstoque = itens.filter(i => Number(i.estoque_atual) < Number(i.estoque_minimo)).length;
    const zerados = itens.filter(i => Number(i.estoque_atual) <= 0).length;
    const emUso = veiculos.filter(v => v.status === 'em_uso').length;
    const manutencao = veiculos.filter(v => v.status === 'manutencao').length;
    const disponiveis = veiculos.filter(v => v.status === 'disponivel').length;
    const custoTotal = custoRows.reduce((acc: number, r: any) => acc + (Number(r.custo) || 0), 0);

    setKpis({
      totalItens: itens.length,
      itensBaixoEstoque: baixoEstoque,
      itensZerados: zerados,
      requisicoesPendentes: requisicoes.length,
      veiculosEmUso: emUso,
      veiculosManutencao: manutencao,
      movimentacoesHoje: movHoje.length,
      custoFrotaTotal: custoTotal,
    });

    const sorted = [...itens].sort((a, b) => Number(b.estoque_atual) - Number(a.estoque_atual)).slice(0, 8);
    setTopItens(sorted.map(i => ({ descricao: i.descricao.substring(0, 22), estoque_atual: Number(i.estoque_atual) })));

    setStatusFrota([
      { name: 'Disponível', value: disponiveis, color: '#22c55e' },
      { name: 'Em Uso', value: emUso, color: 'var(--biasi-button)' },
      { name: 'Manutenção', value: manutencao, color: '#f59e0b' },
    ].filter(s => s.value > 0));

    setUltimasMovimentacoes((ultimasMov.data || []) as unknown as Movimentacao[]);
    } catch (err) {
      console.error('[Dashboard] erro ao carregar:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, []);

  const kpiCards = [
    { label: 'Total de Itens', value: kpis.totalItens, icon: Package, bg: 'bg-blue-100', color: 'text-blue-600', trend: null, sub: 'ativos no estoque' },
    { label: 'Estoque Baixo', value: kpis.itensBaixoEstoque, icon: AlertTriangle, bg: 'bg-amber-100', color: 'text-amber-600', trend: kpis.itensBaixoEstoque > 0 ? 'warn' : 'ok', sub: 'abaixo do mínimo' },
    { label: 'Itens Zerados', value: kpis.itensZerados, icon: ZapOff, bg: 'bg-red-100', color: 'text-red-600', trend: kpis.itensZerados > 0 ? 'warn' : 'ok', sub: 'sem estoque' },
    { label: 'Req. Pendentes', value: kpis.requisicoesPendentes, icon: ClipboardList, bg: 'bg-purple-100', color: 'text-purple-600', trend: null, sub: 'aguardando aprovação' },
    { label: 'Veículos em Uso', value: kpis.veiculosEmUso, icon: Truck, bg: 'bg-emerald-100', color: 'text-emerald-600', trend: null, sub: 'em campo agora' },
    { label: 'Em Manutenção', value: kpis.veiculosManutencao, icon: Fuel, bg: 'bg-orange-100', color: 'text-orange-600', trend: null, sub: 'fora de operação' },
    { label: 'Movim. Hoje', value: kpis.movimentacoesHoje, icon: Activity, bg: 'bg-cyan-100', color: 'text-cyan-600', trend: null, sub: 'entradas e saídas' },
    { label: 'Custo Frota', value: fmtBRL(kpis.custoFrotaTotal), icon: Truck, bg: 'bg-slate-100', color: 'text-slate-600', trend: null, sub: 'total de manutenções', isText: true },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Visão geral do almoxarifado</p>
        </div>
        <button
          onClick={carregar}
          disabled={loading}
          className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          title="Atualizar"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="bg-white rounded-xl border border-slate-200 h-24 animate-pulse" />)}
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {kpiCards.map(({ label, value, icon: Icon, bg, color, trend, sub, isText }) => (
              <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-start justify-between">
                  <div className={`${bg} rounded-lg p-2.5`}><Icon size={18} className={color} /></div>
                  {trend === 'warn' && <TrendingDown size={16} className="text-amber-500" />}
                  {trend === 'ok' && <TrendingUp size={16} className="text-green-500" />}
                </div>
                <p className={`font-bold text-slate-800 mt-3 ${isText ? 'text-base' : 'text-2xl'}`}>{value}</p>
                <p className="text-xs font-medium text-slate-500 mt-0.5">{label}</p>
                {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top itens por estoque */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-semibold text-slate-700 mb-4 text-sm">Top Itens por Quantidade em Estoque</h3>
              {topItens.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topItens} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="descricao" type="category" tick={{ fontSize: 10 }} width={110} />
                    <Tooltip formatter={(v) => [v, 'Qtd']} />
                    <Bar dataKey="estoque_atual" fill="var(--biasi-button)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">Sem dados</div>
              )}
            </div>

            {/* Status frota */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-semibold text-slate-700 mb-4 text-sm">Status da Frota</h3>
              {statusFrota.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={statusFrota} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                      {statusFrota.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-slate-400 text-sm">Sem veículos cadastrados</div>
              )}
            </div>
          </div>

          {/* Últimas movimentações */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h3 className="font-semibold text-slate-700 mb-4 text-sm">Últimas Movimentações</h3>
            {ultimasMovimentacoes.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {ultimasMovimentacoes.map(m => (
                  <div key={m.id} className="flex items-center justify-between py-2.5 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${m.tipo === 'entrada' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{(m.item as any)?.descricao || '-'}</p>
                        <p className="text-[11px] text-slate-400">{(m.responsavel as any)?.nome || 'Desconhecido'} {m.obra ? `- ${m.obra}` : ''}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-sm font-bold ${m.tipo === 'entrada' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {m.tipo === 'entrada' ? '+' : '-'}{m.quantidade}
                      </span>
                      <p className="text-[10px] text-slate-400">{new Date(m.criado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">Nenhuma movimentação registrada</p>
            )}
          </div>

          {kpis.itensBaixoEstoque > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
              <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">{kpis.itensBaixoEstoque} item(ns) com estoque abaixo do mínimo{kpis.itensZerados > 0 ? ` - ${kpis.itensZerados} zerado(s)` : ''}</p>
                <p className="text-xs text-amber-600 mt-0.5">Acesse a tela de Estoque para ver quais itens precisam de reposição.</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
