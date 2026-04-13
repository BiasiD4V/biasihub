import { useEffect, useState } from 'react';
import { Package, AlertTriangle, ClipboardList, Truck, TrendingDown, TrendingUp } from 'lucide-react';
import { supabase } from '../infrastructure/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

interface KPIs {
  totalItens: number;
  itensBaixoEstoque: number;
  requisicoesPendentes: number;
  veiculosEmUso: number;
  veiculosManutencao: number;
}

export function Dashboard() {
  const [kpis, setKpis] = useState<KPIs>({ totalItens: 0, itensBaixoEstoque: 0, requisicoesPendentes: 0, veiculosEmUso: 0, veiculosManutencao: 0 });
  const [topItens, setTopItens] = useState<{ descricao: string; estoque_atual: number }[]>([]);
  const [statusFrota, setStatusFrota] = useState<{ name: string; value: number; color: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregar() {
      const [itensRes, reqRes, veiculosRes] = await Promise.all([
        supabase.from('itens_almoxarifado').select('id, descricao, estoque_atual, estoque_minimo').eq('ativo', true),
        supabase.from('requisicoes_almoxarifado').select('id').eq('status', 'pendente'),
        supabase.from('veiculos').select('id, status').eq('ativo', true),
      ]);

      const itens = itensRes.data || [];
      const requisicoes = reqRes.data || [];
      const veiculos = veiculosRes.data || [];

      const baixoEstoque = itens.filter(i => i.estoque_atual < i.estoque_minimo).length;
      const emUso = veiculos.filter(v => v.status === 'em_uso').length;
      const manutencao = veiculos.filter(v => v.status === 'manutencao').length;
      const disponiveis = veiculos.filter(v => v.status === 'disponivel').length;

      setKpis({
        totalItens: itens.length,
        itensBaixoEstoque: baixoEstoque,
        requisicoesPendentes: requisicoes.length,
        veiculosEmUso: emUso,
        veiculosManutencao: manutencao,
      });

      const sorted = [...itens].sort((a, b) => b.estoque_atual - a.estoque_atual).slice(0, 8);
      setTopItens(sorted.map(i => ({ descricao: i.descricao.substring(0, 20), estoque_atual: Number(i.estoque_atual) })));

      setStatusFrota([
        { name: 'Disponível', value: disponiveis, color: '#22c55e' },
        { name: 'Em Uso', value: emUso, color: '#3b82f6' },
        { name: 'Manutenção', value: manutencao, color: '#f59e0b' },
      ].filter(s => s.value > 0));

      setLoading(false);
    }
    carregar();
  }, []);

  const kpiCards = [
    { label: 'Total de Itens', value: kpis.totalItens, icon: Package, bg: 'bg-blue-100', color: 'text-blue-600', trend: null },
    { label: 'Estoque Baixo', value: kpis.itensBaixoEstoque, icon: AlertTriangle, bg: 'bg-amber-100', color: 'text-amber-600', trend: kpis.itensBaixoEstoque > 0 ? 'warn' : 'ok' },
    { label: 'Requisições Pendentes', value: kpis.requisicoesPendentes, icon: ClipboardList, bg: 'bg-purple-100', color: 'text-purple-600', trend: null },
    { label: 'Veículos em Uso', value: kpis.veiculosEmUso, icon: Truck, bg: 'bg-emerald-100', color: 'text-emerald-600', trend: null },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Visão geral do almoxarifado</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="bg-white rounded-xl border border-slate-200 h-24 animate-pulse" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map(({ label, value, icon: Icon, bg, color, trend }) => (
              <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-start justify-between">
                  <div className={`${bg} rounded-lg p-2.5`}><Icon size={20} className={color} /></div>
                  {trend === 'warn' && <TrendingDown size={16} className="text-amber-500" />}
                  {trend === 'ok' && <TrendingUp size={16} className="text-green-500" />}
                </div>
                <p className="text-2xl font-bold text-slate-800 mt-3">{value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top itens por estoque */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
              <h3 className="font-semibold text-slate-700 mb-4 text-sm">Top Itens por Quantidade</h3>
              {topItens.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topItens} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="descricao" type="category" tick={{ fontSize: 10 }} width={100} />
                    <Tooltip formatter={(v) => [v, 'Qtd']} />
                    <Bar dataKey="estoque_atual" fill="#3b82f6" radius={[0, 4, 4, 0]} />
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

          {kpis.itensBaixoEstoque > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
              <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800">{kpis.itensBaixoEstoque} item(ns) com estoque abaixo do mínimo</p>
                <p className="text-xs text-amber-600 mt-0.5">Acesse a tela de Estoque para ver quais itens precisam de reposição.</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
