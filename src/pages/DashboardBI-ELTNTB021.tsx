import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
  Treemap,
} from 'recharts';
import {
  Filter, X, TrendingUp, TrendingDown, DollarSign, Target,
  FileText, Users, ChevronDown, ChevronUp,
  BarChart3, Calendar, Building2, Briefcase, RefreshCw,
} from 'lucide-react';
import { supabase } from '../infrastructure/supabase/client';

/* ─────────────────────── Types ─────────────────────── */
interface PropostaRow {
  id: string;
  numero_composto: string;
  data_entrada: string | null;
  cliente: string | null;
  obra: string | null;
  objeto: string | null;
  disciplina: string | null;
  responsavel: string | null;
  valor_orcado: number | null;
  valor_material: number | null;
  valor_mo: number | null;
  status: string | null;
  tipo: string | null;
  data_limite: string | null;
  ano: number | null;
  etapa_funil: string | null;
  resultado_comercial: string | null;
  chance_fechamento: string | null;
  urgencia: string | null;
  created_at: string;
}

interface Filtros {
  anos: number[];
  status: string[];
  responsaveis: string[];
  disciplinas: string[];
  clientes: string[];
  tipos: string[];
}

/* ─────────────────────── Constantes visuais ─────────────────────── */
const STATUS_CORES: Record<string, string> = {
  FECHADO: '#22c55e',
  ENVIADO: '#3b82f6',
  RECEBIDO: '#06b6d4',
  'EM REVISÃO': '#eab308',
  CANCELADO: '#f87171',
  'NÃO FECHADO': '#ef4444',
  DECLINADO: '#fca5a5',
  'CLIENTE NÃO DEU RETORNO': '#9ca3af',
  'NEGOCIAÇÃO FUTURA': '#a855f7',
  'ORÇAMENTO': '#f97316',
  'SEM STATUS': '#cbd5e1',
};

const CORES_GRAFICO = [
  '#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6',
  '#06b6d4', '#ec4899', '#f97316', '#14b8a6', '#6366f1',
  '#84cc16', '#e11d48', '#0ea5e9', '#d946ef', '#facc15',
];

const FMT_BRL = (v: number) =>
  v === 0 ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const FMT_BRL_SHORT = (v: number) => {
  if (v === 0) return '—';
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `R$ ${(v / 1_000).toFixed(0)}k`;
  return FMT_BRL(v);
};

/* ─────────────────────── Custom Tooltip ─────────────────────── */
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 shadow-lg rounded-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' && entry.value > 100
            ? FMT_BRL(entry.value)
            : entry.value}
        </p>
      ))}
    </div>
  );
}

/* ─────────────────────── Chip/Filter ─────────────────────── */
function FilterChip({
  label,
  options,
  selected,
  onToggle,
  icon: Icon,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  icon: React.ElementType;
}) {
  const [open, setOpen] = useState(false);
  const count = selected.length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
          count > 0
            ? 'bg-blue-50 border-blue-200 text-blue-700'
            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
        }`}
      >
        <Icon size={12} />
        {label}
        {count > 0 && (
          <span className="bg-blue-600 text-white rounded-full px-1.5 py-0.5 text-[10px] leading-none">
            {count}
          </span>
        )}
        {open ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 bg-white border border-slate-200 shadow-xl rounded-lg z-50 min-w-[200px] max-h-[300px] overflow-y-auto">
            {count > 0 && (
              <button
                onClick={() => { selected.forEach(onToggle); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 border-b border-slate-100"
              >
                Limpar seleção
              </button>
            )}
            {options.map((opt) => (
              <label
                key={opt}
                className="flex items-center gap-2 px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => onToggle(opt)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="truncate">{opt}</span>
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ─────────────────────── KPI Card ─────────────────────── */
function KPI({
  label,
  valor,
  sublabel,
  icon: Icon,
  cor = 'text-slate-800',
  bgIcon = 'bg-slate-100',
  trend,
}: {
  label: string;
  valor: string;
  sublabel?: string;
  icon: React.ElementType;
  cor?: string;
  bgIcon?: string;
  trend?: { valor: string; up: boolean } | null;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <div className={`${bgIcon} rounded-lg p-1.5`}>
          <Icon size={14} className="text-slate-500" />
        </div>
      </div>
      <p className={`text-2xl font-bold ${cor} leading-tight`}>{valor}</p>
      <div className="flex items-center gap-2 mt-1">
        {trend && (
          <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${trend.up ? 'text-green-600' : 'text-red-500'}`}>
            {trend.up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {trend.valor}
          </span>
        )}
        {sublabel && <p className="text-[11px] text-slate-400">{sublabel}</p>}
      </div>
    </div>
  );
}

/* ─────────────────────── Painel Wrapper ─────────────────────── */
function Painel({
  titulo,
  children,
  className = '',
}: {
  titulo: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
      <div className="px-5 py-3 border-b border-slate-100">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{titulo}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL: DashboardBI
   ══════════════════════════════════════════════════════════════ */
export function DashboardBI() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<PropostaRow[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [filtros, setFiltros] = useState<Filtros>({
    anos: [],
    status: [],
    responsaveis: [],
    disciplinas: [],
    clientes: [],
    tipos: [],
  });
  const [abaTabela, setAbaTabela] = useState<'todas' | 'fechadas' | 'perdidas'>('todas');

  // ── Buscar dados ──
  const carregarDados = useCallback(async () => {
    setCarregando(true);
    const { data, error } = await supabase
      .from('propostas')
      .select('*')
      .order('data_entrada', { ascending: false });
    if (!error && data) setRows(data);
    setCarregando(false);
  }, []);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  // ── Opções dos filtros ──
  const opcoes = useMemo(() => {
    const anos = [...new Set(rows.map(r => r.ano).filter(Boolean))].sort((a, b) => b! - a!) as number[];
    const status = [...new Set(rows.map(r => r.status || 'SEM STATUS'))].sort();
    const responsaveis = [...new Set(rows.map(r => r.responsavel).filter(Boolean))].sort() as string[];
    const disciplinas = [...new Set(rows.map(r => r.disciplina).filter(Boolean))].sort() as string[];
    const clientes = [...new Set(rows.map(r => r.cliente).filter(Boolean))].sort() as string[];
    const tipos = [...new Set(rows.map(r => r.tipo).filter(Boolean))].sort() as string[];
    return { anos, status, responsaveis, disciplinas, clientes, tipos };
  }, [rows]);

  // ── Dados filtrados ──
  const dadosFiltrados = useMemo(() => {
    return rows.filter(r => {
      if (filtros.anos.length && (!r.ano || !filtros.anos.includes(r.ano))) return false;
      if (filtros.status.length && !filtros.status.includes(r.status || 'SEM STATUS')) return false;
      if (filtros.responsaveis.length && (!r.responsavel || !filtros.responsaveis.includes(r.responsavel))) return false;
      if (filtros.disciplinas.length && (!r.disciplina || !filtros.disciplinas.includes(r.disciplina))) return false;
      if (filtros.clientes.length && (!r.cliente || !filtros.clientes.includes(r.cliente))) return false;
      if (filtros.tipos.length && (!r.tipo || !filtros.tipos.includes(r.tipo))) return false;
      return true;
    });
  }, [rows, filtros]);

  const temFiltro = Object.values(filtros).some(arr => arr.length > 0);

  function toggleFiltro<K extends keyof Filtros>(key: K, valor: Filtros[K][number]) {
    setFiltros(prev => {
      const arr = prev[key] as any[];
      return {
        ...prev,
        [key]: arr.includes(valor) ? arr.filter(v => v !== valor) : [...arr, valor],
      };
    });
  }

  // ── Cálculos agregados ──
  const kpis = useMemo(() => {
    const total = dadosFiltrados.length;
    const fechadas = dadosFiltrados.filter(r => r.status === 'FECHADO').length;
    const naoFechadas = dadosFiltrados.filter(r => r.status === 'NÃO FECHADO').length;
    const enviadas = dadosFiltrados.filter(r => r.status === 'ENVIADO').length;
    const valorTotal = dadosFiltrados.reduce((acc, r) => acc + (r.valor_orcado || 0), 0);
    const valorFechado = dadosFiltrados.filter(r => r.status === 'FECHADO').reduce((acc, r) => acc + (r.valor_orcado || 0), 0);
    const valorMaterial = dadosFiltrados.reduce((acc, r) => acc + (r.valor_material || 0), 0);
    const valorMO = dadosFiltrados.reduce((acc, r) => acc + (r.valor_mo || 0), 0);
    const taxaConversao = total > 0 ? (fechadas / total) * 100 : 0;
    const ticketMedio = total > 0 ? valorTotal / total : 0;
    const ticketMedioFechado = fechadas > 0 ? valorFechado / fechadas : 0;
    return {
      total, fechadas, naoFechadas, enviadas, valorTotal, valorFechado,
      valorMaterial, valorMO, taxaConversao, ticketMedio, ticketMedioFechado,
    };
  }, [dadosFiltrados]);

  // ── Gráfico: por ano (barras empilhadas) ──
  const chartPorAno = useMemo(() => {
    const map: Record<number, { ano: number; fechadas: number; naoFechadas: number; outras: number; valorFechado: number; valorTotal: number }> = {};
    for (const r of dadosFiltrados) {
      if (!r.ano) continue;
      if (!map[r.ano]) map[r.ano] = { ano: r.ano, fechadas: 0, naoFechadas: 0, outras: 0, valorFechado: 0, valorTotal: 0 };
      map[r.ano].valorTotal += r.valor_orcado || 0;
      if (r.status === 'FECHADO') { map[r.ano].fechadas++; map[r.ano].valorFechado += r.valor_orcado || 0; }
      else if (r.status === 'NÃO FECHADO' || r.status === 'CANCELADO' || r.status === 'DECLINADO') map[r.ano].naoFechadas++;
      else map[r.ano].outras++;
    }
    return Object.values(map).sort((a, b) => a.ano - b.ano);
  }, [dadosFiltrados]);

  // ── Gráfico: evolução mensal (últimos 12 meses) ──
  const chartMensal = useMemo(() => {
    const map: Record<string, { mes: string; quantidade: number; valor: number; fechadas: number }> = {};
    for (const r of dadosFiltrados) {
      if (!r.data_entrada) continue;
      const d = new Date(r.data_entrada);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!map[key]) map[key] = { mes: key, quantidade: 0, valor: 0, fechadas: 0 };
      map[key].quantidade++;
      map[key].valor += r.valor_orcado || 0;
      if (r.status === 'FECHADO') map[key].fechadas++;
    }
    return Object.values(map)
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-24)
      .map(m => ({
        ...m,
        mesLabel: new Date(m.mes + '-01').toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      }));
  }, [dadosFiltrados]);

  // ── Gráfico: pizza por status ──
  const chartStatus = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of dadosFiltrados) {
      const s = r.status || 'SEM STATUS';
      map[s] = (map[s] || 0) + 1;
    }
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [dadosFiltrados]);

  // ── Gráfico: por responsável (horizontal bars) ──
  const chartResponsavel = useMemo(() => {
    const map: Record<string, { nome: string; total: number; fechadas: number; valor: number }> = {};
    for (const r of dadosFiltrados) {
      const resp = r.responsavel || 'Sem responsável';
      if (!map[resp]) map[resp] = { nome: resp, total: 0, fechadas: 0, valor: 0 };
      map[resp].total++;
      if (r.status === 'FECHADO') map[resp].fechadas++;
      map[resp].valor += r.valor_orcado || 0;
    }
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [dadosFiltrados]);

  // ── Gráfico: por disciplina ──
  const chartDisciplina = useMemo(() => {
    const map: Record<string, { name: string; total: number; valor: number }> = {};
    for (const r of dadosFiltrados) {
      const d = r.disciplina || 'Sem disciplina';
      if (!map[d]) map[d] = { name: d, total: 0, valor: 0 };
      map[d].total++;
      map[d].valor += r.valor_orcado || 0;
    }
    return Object.values(map).sort((a, b) => b.valor - a.valor).slice(0, 10);
  }, [dadosFiltrados]);

  // ── Gráfico: por cliente (top 10 valor) ──
  const chartClientes = useMemo(() => {
    const map: Record<string, { name: string; total: number; fechadas: number; valor: number }> = {};
    for (const r of dadosFiltrados) {
      const c = r.cliente || 'Sem cliente';
      if (!map[c]) map[c] = { name: c, total: 0, fechadas: 0, valor: 0 };
      map[c].total++;
      if (r.status === 'FECHADO') map[c].fechadas++;
      map[c].valor += r.valor_orcado || 0;
    }
    return Object.values(map).sort((a, b) => b.valor - a.valor).slice(0, 10);
  }, [dadosFiltrados]);

  // ── Treemap: por tipo de obra ──
  const chartTipoObra = useMemo(() => {
    const map: Record<string, { name: string; size: number; count: number }> = {};
    for (const r of dadosFiltrados) {
      const t = r.tipo || 'Sem tipo';
      if (!map[t]) map[t] = { name: t, size: 0, count: 0 };
      map[t].size += r.valor_orcado || 0;
      map[t].count++;
    }
    return Object.values(map).sort((a, b) => b.size - a.size);
  }, [dadosFiltrados]);

  // ── Funil comercial ──
  const chartFunil = useMemo(() => {
    const etapas = [
      { key: 'RECEBIDO', label: 'Recebido', cor: '#06b6d4' },
      { key: 'ORÇAMENTO', label: 'Orçamento', cor: '#f97316' },
      { key: 'EM REVISÃO', label: 'Em Revisão', cor: '#eab308' },
      { key: 'ENVIADO', label: 'Enviado', cor: '#3b82f6' },
      { key: 'NEGOCIAÇÃO FUTURA', label: 'Negociação', cor: '#a855f7' },
      { key: 'FECHADO', label: 'Fechado', cor: '#22c55e' },
    ];
    return etapas.map(e => ({
      ...e,
      quantidade: dadosFiltrados.filter(r => r.status === e.key).length,
      valor: dadosFiltrados.filter(r => r.status === e.key).reduce((acc, r) => acc + (r.valor_orcado || 0), 0),
    })).filter(e => e.quantidade > 0);
  }, [dadosFiltrados]);

  // ── Tabela detalhada ──
  const tabelaRows = useMemo(() => {
    let filtered = [...dadosFiltrados];
    if (abaTabela === 'fechadas') filtered = filtered.filter(r => r.status === 'FECHADO');
    if (abaTabela === 'perdidas') filtered = filtered.filter(r => ['NÃO FECHADO', 'CANCELADO', 'DECLINADO'].includes(r.status || ''));
    return filtered.slice(0, 50);
  }, [dadosFiltrados, abaTabela]);

  // ── Ranking conversão por responsável ──
  const rankingConversao = useMemo(() => {
    return chartResponsavel
      .filter(r => r.total >= 3)
      .map(r => ({
        ...r,
        taxa: r.total > 0 ? ((r.fechadas / r.total) * 100) : 0,
      }))
      .sort((a, b) => b.taxa - a.taxa);
  }, [chartResponsavel]);

  /* ════════════════════ RENDER ════════════════════ */
  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* ── Header ── */}
      <div className="px-4 lg:px-8 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 size={20} className="text-blue-600" />
              <h1 className="text-xl font-bold text-slate-800">Business Intelligence</h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Análise interativa de propostas • {dadosFiltrados.length} de {rows.length} propostas
              {temFiltro && <span className="text-blue-600 font-medium"> (filtrado)</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={carregarDados}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <RefreshCw size={12} className={carregando ? 'animate-spin' : ''} />
              Atualizar
            </button>
            {temFiltro && (
              <button
                onClick={() => setFiltros({ anos: [], status: [], responsaveis: [], disciplinas: [], clientes: [], tipos: [] })}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
              >
                <X size={12} />
                Limpar filtros
              </button>
            )}
          </div>
        </div>

        {/* ── Filtros ── */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <Filter size={12} className="text-slate-400" />
          <FilterChip
            label="Ano"
            icon={Calendar}
            options={opcoes.anos.map(String)}
            selected={filtros.anos.map(String)}
            onToggle={(v) => toggleFiltro('anos', Number(v))}
          />
          <FilterChip
            label="Status"
            icon={Target}
            options={opcoes.status}
            selected={filtros.status}
            onToggle={(v) => toggleFiltro('status', v)}
          />
          <FilterChip
            label="Responsável"
            icon={Users}
            options={opcoes.responsaveis}
            selected={filtros.responsaveis}
            onToggle={(v) => toggleFiltro('responsaveis', v)}
          />
          <FilterChip
            label="Disciplina"
            icon={Briefcase}
            options={opcoes.disciplinas}
            selected={filtros.disciplinas}
            onToggle={(v) => toggleFiltro('disciplinas', v)}
          />
          <FilterChip
            label="Cliente"
            icon={Building2}
            options={opcoes.clientes}
            selected={filtros.clientes}
            onToggle={(v) => toggleFiltro('clientes', v)}
          />
          <FilterChip
            label="Tipo"
            icon={FileText}
            options={opcoes.tipos}
            selected={filtros.tipos}
            onToggle={(v) => toggleFiltro('tipos', v)}
          />
        </div>
      </div>

      {/* ── Conteúdo ── */}
      <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-5">

        {carregando ? (
          <div className="flex items-center justify-center py-32">
            <div className="animate-spin w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full" />
            <span className="ml-3 text-sm text-slate-400">Carregando dados do Supabase...</span>
          </div>
        ) : (
          <>
            {/* ═══ KPIs ═══ */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <KPI label="Total Propostas" valor={kpis.total.toLocaleString('pt-BR')} icon={FileText} sublabel="registros" />
              <KPI
                label="Fechadas"
                valor={kpis.fechadas.toLocaleString('pt-BR')}
                icon={Target}
                cor="text-green-600"
                bgIcon="bg-green-50"
                sublabel={`${kpis.taxaConversao.toFixed(1)}% conversão`}
              />
              <KPI
                label="Valor Total Orçado"
                valor={FMT_BRL_SHORT(kpis.valorTotal)}
                icon={DollarSign}
                cor="text-blue-600"
                bgIcon="bg-blue-50"
              />
              <KPI
                label="Valor Fechado"
                valor={FMT_BRL_SHORT(kpis.valorFechado)}
                icon={DollarSign}
                cor="text-green-600"
                bgIcon="bg-green-50"
              />
              <KPI
                label="Ticket Médio"
                valor={FMT_BRL_SHORT(kpis.ticketMedio)}
                icon={TrendingUp}
                sublabel="por proposta"
              />
              <KPI
                label="Taxa Conversão"
                valor={`${kpis.taxaConversao.toFixed(1)}%`}
                icon={Target}
                cor={kpis.taxaConversao >= 40 ? 'text-green-600' : kpis.taxaConversao >= 25 ? 'text-amber-600' : 'text-red-600'}
                bgIcon={kpis.taxaConversao >= 40 ? 'bg-green-50' : kpis.taxaConversao >= 25 ? 'bg-amber-50' : 'bg-red-50'}
              />
            </div>

            {/* ═══ Gráficos Row 1: Evolução por ano + Status ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Barras empilhadas por ano */}
              <Painel titulo="Propostas por Ano" className="lg:col-span-2">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={chartPorAno} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="ano" tick={{ fontSize: 11, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="fechadas" stackId="a" fill="#22c55e" name="Fechadas" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="outras" stackId="a" fill="#3b82f6" name="Em andamento" />
                    <Bar dataKey="naoFechadas" stackId="a" fill="#ef4444" name="Perdidas" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Painel>

              {/* Pizza por status */}
              <Painel titulo="Distribuição por Status">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={chartStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${(name ?? '').toString().slice(0, 12)} ${((percent ?? 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                      style={{ fontSize: 9 }}
                    >
                      {chartStatus.map((entry, i) => (
                        <Cell key={i} fill={STATUS_CORES[entry.name] || CORES_GRAFICO[i % CORES_GRAFICO.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: any, name: any) => [`${value} propostas`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </Painel>
            </div>

            {/* ═══ Gráficos Row 2: Evolução mensal + Funil ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Evolução mensal */}
              <Painel titulo="Evolução Mensal">
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart data={chartMensal}>
                    <defs>
                      <linearGradient id="gradientQtd" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradientFech" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="mesLabel" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Area type="monotone" dataKey="quantidade" stroke="#3b82f6" fill="url(#gradientQtd)" name="Total" strokeWidth={2} />
                    <Area type="monotone" dataKey="fechadas" stroke="#22c55e" fill="url(#gradientFech)" name="Fechadas" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </Painel>

              {/* Funil comercial */}
              <Painel titulo="Funil Comercial">
                <div className="space-y-2">
                  {chartFunil.map((etapa) => {
                    const maxQtd = Math.max(...chartFunil.map(e => e.quantidade));
                    const pct = maxQtd > 0 ? (etapa.quantidade / maxQtd) * 100 : 0;
                    return (
                      <div key={etapa.key}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-slate-600">{etapa.label}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-slate-700">{etapa.quantidade}</span>
                            <span className="text-[10px] text-slate-400">{FMT_BRL_SHORT(etapa.valor)}</span>
                          </div>
                        </div>
                        <div className="h-6 bg-slate-100 rounded-md overflow-hidden relative">
                          <div
                            className="h-full rounded-md transition-all duration-500 flex items-center px-2"
                            style={{ width: `${Math.max(pct, 5)}%`, backgroundColor: etapa.cor }}
                          >
                            {pct > 15 && (
                              <span className="text-[10px] font-bold text-white">{etapa.quantidade}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {chartFunil.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-8">Sem dados para o funil</p>
                  )}
                </div>
              </Painel>
            </div>

            {/* ═══ Gráficos Row 3: Responsáveis + Disciplinas ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Por responsável */}
              <Painel titulo="Top 10 Responsáveis (Qtd. Propostas)">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartResponsavel} layout="vertical" barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis
                      type="category"
                      dataKey="nome"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      width={100}
                      tickFormatter={(v: string) => v.split(' ').slice(0, 2).join(' ')}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="fechadas" fill="#22c55e" name="Fechadas" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="total" fill="#3b82f6" name="Total" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Painel>

              {/* Por disciplina */}
              <Painel titulo="Valor por Disciplina">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartDisciplina} layout="vertical" barSize={16}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v: number) => FMT_BRL_SHORT(v)} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      width={110}
                      tickFormatter={(v: string) => v.length > 16 ? v.slice(0, 16) + '…' : v}
                    />
                    <Tooltip formatter={(value: any) => FMT_BRL(Number(value))} />
                    <Bar dataKey="valor" fill="#6366f1" name="Valor Orçado" radius={[0, 6, 6, 0]}>
                      {chartDisciplina.map((_, i) => (
                        <Cell key={i} fill={CORES_GRAFICO[i % CORES_GRAFICO.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Painel>
            </div>

            {/* ═══ Row 4: Top Clientes + Tipo de Obra Treemap ═══ */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Top clientes */}
              <Painel titulo="Top 10 Clientes por Valor">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartClientes} barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 9, fill: '#64748b' }}
                      tickFormatter={(v: string) => v.length > 10 ? v.slice(0, 10) + '…' : v}
                      angle={-30}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v: number) => FMT_BRL_SHORT(v)} />
                    <Tooltip formatter={(value: any) => FMT_BRL(Number(value))} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="valor" fill="#0ea5e9" name="Valor Total" radius={[4, 4, 0, 0]}>
                      {chartClientes.map((_, i) => (
                        <Cell key={i} fill={CORES_GRAFICO[i % CORES_GRAFICO.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Painel>

              {/* Treemap por tipo de obra */}
              <Painel titulo="Tipo de Obra (Valor)">
                {chartTipoObra.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <Treemap
                      data={chartTipoObra}
                      dataKey="size"
                      aspectRatio={4 / 3}
                      stroke="#fff"
                      content={({ x, y, width, height, name, size }: any) => {
                        if (width < 40 || height < 30) return (<g />);
                        return (
                          <g>
                            <rect x={x} y={y} width={width} height={height} rx={4}
                              fill={CORES_GRAFICO[chartTipoObra.findIndex(t => t.name === name) % CORES_GRAFICO.length]}
                              fillOpacity={0.85}
                            />
                            <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle" fill="#fff" fontSize={10} fontWeight="bold">
                              {String(name).length > 14 ? String(name).slice(0, 14) + '…' : name}
                            </text>
                            <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize={9}>
                              {FMT_BRL_SHORT(size)}
                            </text>
                          </g>
                        );
                      }}
                    />
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-slate-400 text-center py-20">Sem dados por tipo de obra</p>
                )}
              </Painel>
            </div>

            {/* ═══ Row 5: Ranking conversão ═══ */}
            <Painel titulo="Ranking de Conversão por Responsável (mín. 3 propostas)">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {rankingConversao.map((r, i) => (
                  <div key={r.nome} className="border border-slate-100 rounded-lg p-3 hover:border-slate-200 transition-colors">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                        i === 0 ? 'bg-amber-400' : i === 1 ? 'bg-slate-400' : i === 2 ? 'bg-amber-700' : 'bg-slate-300'
                      }`}>
                        {i + 1}
                      </div>
                      <span className="text-xs font-medium text-slate-700 truncate">{r.nome.split(' ').slice(0, 2).join(' ')}</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className={`text-lg font-bold ${r.taxa >= 40 ? 'text-green-600' : r.taxa >= 25 ? 'text-amber-600' : 'text-red-500'}`}>
                          {r.taxa.toFixed(0)}%
                        </p>
                        <p className="text-[10px] text-slate-400">{r.fechadas}/{r.total} fechadas</p>
                      </div>
                      <p className="text-[10px] text-slate-400">{FMT_BRL_SHORT(r.valor)}</p>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${r.taxa >= 40 ? 'bg-green-500' : r.taxa >= 25 ? 'bg-amber-500' : 'bg-red-400'}`}
                        style={{ width: `${r.taxa}%` }}
                      />
                    </div>
                  </div>
                ))}
                {rankingConversao.length === 0 && (
                  <p className="text-xs text-slate-400 col-span-4 text-center py-8">Nenhum responsável com 3+ propostas</p>
                )}
              </div>
            </Painel>

            {/* ═══ Tabela Detalhada ═══ */}
            <Painel titulo="Propostas Detalhadas" className="overflow-visible">
              <div className="flex items-center gap-2 mb-4 -mt-1">
                {(['todas', 'fechadas', 'perdidas'] as const).map(aba => (
                  <button
                    key={aba}
                    onClick={() => setAbaTabela(aba)}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                      abaTabela === aba
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {aba === 'todas' ? `Todas (${dadosFiltrados.length})` :
                     aba === 'fechadas' ? `Fechadas (${kpis.fechadas})` :
                     `Perdidas (${kpis.naoFechadas})`}
                  </button>
                ))}
              </div>
              <div className="overflow-x-auto -mx-5 px-5">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-2 font-semibold text-slate-500 whitespace-nowrap">Nº</th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-500 whitespace-nowrap">Cliente</th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-500 whitespace-nowrap">Objeto / Obra</th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-500 whitespace-nowrap">Disciplina</th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-500 whitespace-nowrap">Responsável</th>
                      <th className="text-left py-2 px-2 font-semibold text-slate-500 whitespace-nowrap">Status</th>
                      <th className="text-right py-2 px-2 font-semibold text-slate-500 whitespace-nowrap">Valor</th>
                      <th className="text-center py-2 px-2 font-semibold text-slate-500 whitespace-nowrap">Ano</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tabelaRows.map(r => (
                      <tr
                        key={r.id}
                        className="border-b border-slate-50 hover:bg-blue-50/50 cursor-pointer transition-colors"
                        onClick={() => navigate(`/orcamentos/${r.id}`)}
                      >
                        <td className="py-2 px-2 font-mono text-slate-400 whitespace-nowrap">{r.numero_composto}</td>
                        <td className="py-2 px-2 text-slate-700 max-w-[150px] truncate">{r.cliente || '—'}</td>
                        <td className="py-2 px-2 text-slate-500 max-w-[180px] truncate">{r.objeto || r.obra || '—'}</td>
                        <td className="py-2 px-2 text-slate-500 whitespace-nowrap">{r.disciplina || '—'}</td>
                        <td className="py-2 px-2 text-slate-600 whitespace-nowrap">{r.responsavel?.split(' ').slice(0, 2).join(' ') || '—'}</td>
                        <td className="py-2 px-2 whitespace-nowrap">
                          <span
                            className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold text-white"
                            style={{ backgroundColor: STATUS_CORES[r.status || 'SEM STATUS'] || '#94a3b8' }}
                          >
                            {r.status || 'SEM STATUS'}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-right text-slate-600 font-medium whitespace-nowrap">
                          {r.valor_orcado ? FMT_BRL(r.valor_orcado) : '—'}
                        </td>
                        <td className="py-2 px-2 text-center text-slate-400">{r.ano || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {tabelaRows.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-8">Nenhuma proposta encontrada</p>
                )}
                {dadosFiltrados.length > 50 && (
                  <p className="text-xs text-slate-400 text-center mt-3">
                    Mostrando 50 de {dadosFiltrados.length} • Use filtros para refinar
                  </p>
                )}
              </div>
            </Painel>
          </>
        )}
      </div>
    </div>
  );
}
