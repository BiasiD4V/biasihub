import { useEffect, useMemo, useState } from 'react';
import { BarChart2, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { propostasRepository, type PropostaSupabase } from '../infrastructure/supabase/propostasRepository';

const STATUS_EXCLUIDOS = ['cancelado', 'cancelada', 'perdido', 'perdida', 'CANCELADO', 'CANCELADA', 'PERDIDO', 'PERDIDA'];

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function impactoLabel(pct: number): { label: string; cls: string } {
  if (pct > 50) return { label: 'Muito Alto', cls: 'bg-red-500/20 text-red-400 border border-red-500/30' };
  if (pct > 20) return { label: 'Alto', cls: 'bg-orange-500/20 text-orange-400 border border-orange-500/30' };
  if (pct > 10) return { label: 'Médio', cls: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' };
  return { label: 'Baixo', cls: 'bg-green-500/20 text-green-400 border border-green-500/30' };
}

function barColor(pct: number) {
  if (pct > 50) return 'bg-red-500';
  if (pct > 20) return 'bg-orange-400';
  if (pct > 10) return 'bg-yellow-400';
  return 'bg-green-400';
}

interface RowData {
  proposta: PropostaSupabase;
  meses: number;
}

export function AdmCentral() {
  const [propostas, setPropostas] = useState<PropostaSupabase[]>([]);
  const [loading, setLoading] = useState(true);
  const [admMensal, setAdmMensal] = useState(250000);
  const [supervMensal, setSupervMensal] = useState(30000);
  const [rows, setRows] = useState<RowData[]>([]);

  // Raw inputs for the currency fields (as strings for editing)
  const [admInput, setAdmInput] = useState('250000');
  const [supervInput, setSupervInput] = useState('30000');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        // Load all proposals (no pagination limit by passing a large page)
        const result = await propostasRepository.listarTodas(0, {});
        // For datasets > 50, we do a second pass — but for the ADM page we want all
        // Use the total count to determine if we need more pages
        let todas = result.data;
        if (result.total > 50) {
          const pages = Math.ceil(result.total / 50);
          const rest = await Promise.all(
            Array.from({ length: pages - 1 }, (_, i) =>
              propostasRepository.listarTodas(i + 1, {})
            )
          );
          todas = [...todas, ...rest.flatMap(r => r.data)];
        }
        const ativas = todas.filter(p => {
          const s = (p.status || '').toLowerCase();
          return !STATUS_EXCLUIDOS.some(ex => ex.toLowerCase() === s);
        });
        setPropostas(ativas);
        setRows(ativas.map(p => ({ proposta: p, meses: 6 })));
      } catch (err) {
        console.error('AdmCentral load error:', err);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  function updateMeses(propostaId: string, meses: number) {
    setRows(prev => prev.map(r => r.proposta.id === propostaId ? { ...r, meses } : r));
  }

  const rowsComCalculo = useMemo(() => {
    return rows
      .map(row => {
        const valorOrcado = row.proposta.valor_orcado ?? 0;
        const custoAdm = admMensal * row.meses;
        const custoSuperv = supervMensal * row.meses;
        const totalOverhead = custoAdm + custoSuperv;
        const impactoPct = valorOrcado > 0 ? (totalOverhead / valorOrcado) * 100 : 0;
        return { ...row, valorOrcado, custoAdm, custoSuperv, totalOverhead, impactoPct };
      })
      .sort((a, b) => b.impactoPct - a.impactoPct);
  }, [rows, admMensal, supervMensal]);

  const avgImpacto = useMemo(() => {
    if (rowsComCalculo.length === 0) return 0;
    return rowsComCalculo.reduce((acc, r) => acc + r.impactoPct, 0) / rowsComCalculo.length;
  }, [rowsComCalculo]);

  const muitoAltoCount = useMemo(
    () => rowsComCalculo.filter(r => r.impactoPct > 50).length,
    [rowsComCalculo]
  );

  function handleAdmBlur() {
    const v = parseFloat(admInput.replace(/\D/g, ''));
    if (!isNaN(v) && v > 0) setAdmMensal(v);
    setAdmInput(String(admMensal));
  }

  function handleSupervBlur() {
    const v = parseFloat(supervInput.replace(/\D/g, ''));
    if (!isNaN(v) && v > 0) setSupervMensal(v);
    setSupervInput(String(supervMensal));
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-[1400px] mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-start gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <BarChart2 size={22} className="text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black tracking-tight text-white">Rateio ADM Central</h1>
                <span className="px-2.5 py-1 text-[10px] font-black uppercase tracking-widest bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full">
                  OVERHEAD
                </span>
              </div>
              <p className="text-slate-400 text-sm mt-1">Impacto dos custos fixos sobre propostas ativas</p>
            </div>
          </div>

          {/* Config inputs */}
          <div className="sm:ml-auto flex flex-wrap gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Custo ADM / mês</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                <input
                  type="text"
                  value={admInput}
                  onChange={e => setAdmInput(e.target.value)}
                  onBlur={handleAdmBlur}
                  className="bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500 w-44"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Custo Supervisão / mês</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">R$</span>
                <input
                  type="text"
                  value={supervInput}
                  onChange={e => setSupervInput(e.target.value)}
                  onBlur={handleSupervBlur}
                  className="bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500 w-44"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Propostas Ativas</p>
            <p className="text-3xl font-black text-white">{propostas.length}</p>
            <p className="text-xs text-slate-500 mt-1">excluídas: canceladas e perdidas</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={14} className="text-indigo-400" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Impacto Médio</p>
            </div>
            <p className="text-3xl font-black text-indigo-400">{avgImpacto.toFixed(1)}%</p>
            <p className="text-xs text-slate-500 mt-1">overhead / valor orçado</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 col-span-2 sm:col-span-1">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={14} className="text-red-400" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Muito Alto (&gt;50%)</p>
            </div>
            <p className="text-3xl font-black text-red-400">{muitoAltoCount}</p>
            <p className="text-xs text-slate-500 mt-1">propostas com impacto crítico</p>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-white/10 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : propostas.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <CheckCircle2 size={40} className="text-slate-600" />
            <p className="text-slate-500 font-semibold">Nenhuma proposta ativa encontrada.</p>
          </div>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/80">
                    <th className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest px-5 py-3.5 w-12">#</th>
                    <th className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest px-5 py-3.5">Cliente / Proposta</th>
                    <th className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest px-5 py-3.5">Valor Orçado</th>
                    <th className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest px-5 py-3.5 w-32">Duração (meses)</th>
                    <th className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest px-5 py-3.5">Custo ADM</th>
                    <th className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest px-5 py-3.5">Custo Supervisão</th>
                    <th className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest px-5 py-3.5 w-36">Impacto %</th>
                    <th className="text-left text-[10px] font-black text-slate-500 uppercase tracking-widest px-5 py-3.5 w-40">Visual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {rowsComCalculo.map((row, idx) => {
                    const { label, cls } = impactoLabel(row.impactoPct);
                    const barW = Math.min(100, row.impactoPct);
                    return (
                      <tr
                        key={row.proposta.id}
                        className="hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Rank */}
                        <td className="px-5 py-4">
                          <span className="text-xs font-black text-slate-500">#{idx + 1}</span>
                        </td>

                        {/* Cliente / Proposta */}
                        <td className="px-5 py-4">
                          <p className="font-semibold text-white text-sm truncate max-w-[200px]">
                            {row.proposta.cliente || '—'}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate max-w-[200px]">
                            {row.proposta.numero_composto}
                            {row.proposta.disciplina ? ` · ${row.proposta.disciplina}` : ''}
                          </p>
                        </td>

                        {/* Valor Orçado */}
                        <td className="px-5 py-4">
                          <span className="text-sm font-semibold text-emerald-400">
                            {row.valorOrcado > 0 ? formatBRL(row.valorOrcado) : <span className="text-slate-600 italic text-xs">não definido</span>}
                          </span>
                        </td>

                        {/* Duração */}
                        <td className="px-5 py-4">
                          <input
                            type="number"
                            min={1}
                            max={120}
                            value={row.meses}
                            onChange={e => updateMeses(row.proposta.id, Math.max(1, parseInt(e.target.value) || 1))}
                            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white text-center w-20 focus:outline-none focus:border-indigo-500"
                          />
                        </td>

                        {/* Custo ADM */}
                        <td className="px-5 py-4">
                          <span className="text-sm text-slate-300">{formatBRL(row.custoAdm)}</span>
                        </td>

                        {/* Custo Supervisão */}
                        <td className="px-5 py-4">
                          <span className="text-sm text-slate-300">{formatBRL(row.custoSuperv)}</span>
                        </td>

                        {/* Impacto % badge */}
                        <td className="px-5 py-4">
                          {row.valorOrcado > 0 ? (
                            <div className="flex flex-col gap-1">
                              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black ${cls}`}>
                                {row.impactoPct.toFixed(1)}% — {label}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-600 italic">—</span>
                          )}
                        </td>

                        {/* Visual bar */}
                        <td className="px-5 py-4">
                          {row.valorOrcado > 0 ? (
                            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all duration-500 ${barColor(row.impactoPct)}`}
                                style={{ width: `${barW}%` }}
                              />
                            </div>
                          ) : (
                            <div className="w-full bg-slate-800 rounded-full h-2" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
