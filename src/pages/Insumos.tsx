import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Package,
  Search,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  History,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  Filter,
  Clock,
  Truck,
  Ruler,
  CalendarDays,
  CircleDollarSign,
  RotateCcw,
  ChevronDown,
  ChevronRight as ChevronR,
  Hash,
  BarChart3,
  Layers,
  FolderOpen,
  Award,
  Star,
  Zap,
  Droplets,
  Flame,
  Lightbulb,
  Wrench,
  Cpu,
  Cable,
  Construction,
  ShieldCheck,
  ListTree,
  Table2,
} from 'lucide-react';
import {
  insumosRepository,
  type Insumo,
  type InsumoHistorico,
  type FiltrosInsumos,
} from '../infrastructure/supabase/insumosRepository';
import {
  type CategoriaAgrupada,
  type SubcategoriaAgrupada,
  type GrupoProduto,
  type InsumoResumido,
  type ClasseFornecedor,
  agruparInsumos,
  classificarFornecedor,
  getClasseInfo,
  CLASSES_INFO,
} from '../utils/insumosClassificacao';

/* ═══════════════════ Helpers ═══════════════════ */

const FMT_BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const FMT_DATE = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const UNIDADE_LABELS: Record<string, string> = {
  BR: 'Barra', CX: 'Caixa', GL: 'Galão', KG: 'Quilograma',
  M: 'Metro', 'M³': 'Metro Cúbico', PÇ: 'Peça', RL: 'Rolo', VB: 'Verba',
};

const ICONE_MAP: Record<string, typeof Package> = {
  Cable, Construction, Droplets, Zap, Flame, Lightbulb, Wrench, Cpu,
};

function badgeAlerta(dias: number | null) {
  if (dias === null || dias === undefined) return <span className="text-slate-300">—</span>;
  if (dias >= 365) return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
      <AlertTriangle size={11} /> {Math.floor(dias / 365)}a {Math.floor((dias % 365) / 30)}m
    </span>
  );
  if (dias >= 180) return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-600 border border-red-100">
      <AlertTriangle size={11} /> {dias}d
    </span>
  );
  if (dias >= 90) return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-600 border border-amber-100">
      <Clock size={11} /> {dias}d
    </span>
  );
  if (dias >= 30) return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-50 text-slate-500 border border-slate-100">
      {dias}d
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-green-50 text-green-600 border border-green-100">
      {dias}d
    </span>
  );
}

function badgeUnidade(unidade: string) {
  const colors: Record<string, string> = {
    M: 'bg-blue-50 text-blue-700 border-blue-200',
    'M³': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    KG: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    PÇ: 'bg-slate-100 text-slate-600 border-slate-200',
    CX: 'bg-amber-50 text-amber-700 border-amber-200',
    RL: 'bg-purple-50 text-purple-700 border-purple-200',
    GL: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    BR: 'bg-orange-50 text-orange-700 border-orange-200',
    VB: 'bg-pink-50 text-pink-700 border-pink-200',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${colors[unidade] || 'bg-slate-100 text-slate-600 border-slate-200'}`}
      title={UNIDADE_LABELS[unidade] || unidade}
    >
      {unidade}
    </span>
  );
}

/* ═══════════════════ Badge Classe Fornecedor ═══════════════════ */

function BadgeClasse({ classe, size = 'md' }: { classe: ClasseFornecedor; size?: 'sm' | 'md' | 'lg' }) {
  const info = getClasseInfo(classe);
  const sizes = {
    sm: 'w-5 h-5 text-[10px]',
    md: 'w-7 h-7 text-xs',
    lg: 'w-9 h-9 text-sm',
  };
  return (
    <div className={`${sizes[size]} rounded-lg ${info.corBg} ${info.cor} ${info.corBorder} border-2 flex items-center justify-center font-black shrink-0`}
      title={`Classe ${classe}: ${info.label} — ${info.descricao}`}
    >
      {classe}
    </div>
  );
}

/* ═══════════════════ Card KPI ═══════════════════ */

function CardKPI({ icon: Icon, iconBg, iconColor, label, value, valueColor = 'text-slate-800', subtitle }: {
  icon: typeof Package;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string | number;
  valueColor?: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow p-5 flex items-center gap-4">
      <div className={`${iconBg} rounded-xl p-3 shrink-0`}>
        <Icon size={22} className={iconColor} strokeWidth={2.2} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-slate-400 uppercase font-semibold tracking-wider">{label}</p>
        <p className={`text-2xl font-bold ${valueColor} leading-tight mt-0.5`}>{value}</p>
        {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

/* ═══════════════════ Legenda Classificação ═══════════════════ */

function LegendaClassificacao() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg p-1.5">
          <Award size={16} className="text-white" />
        </div>
        <h3 className="text-sm font-bold text-slate-700">Classificação de Fornecedores</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(['A', 'B', 'C'] as ClasseFornecedor[]).map((classe) => {
          const info = CLASSES_INFO[classe];
          return (
            <div key={classe} className={`flex items-start gap-3 p-3 rounded-xl ${info.corBg} border ${info.corBorder}`}>
              <BadgeClasse classe={classe} size="lg" />
              <div>
                <p className={`text-sm font-bold ${info.cor}`}>{info.label}</p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{info.descricao}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════ Modal Histórico ═══════════════════ */

function ModalHistorico({ insumo, onFechar }: { insumo: Insumo | InsumoResumido; onFechar: () => void }) {
  const [historico, setHistorico] = useState<InsumoHistorico[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    insumosRepository.listarHistorico(insumo.id).then(setHistorico).finally(() => setLoading(false));
  }, [insumo.id]);

  const variacao = useMemo(() => {
    if (historico.length < 2) return null;
    const ultimo = historico[0]?.custo ?? 0;
    const anterior = historico[1]?.custo ?? 0;
    if (anterior === 0) return null;
    return ((ultimo - anterior) / anterior) * 100;
  }, [historico]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onFechar} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 text-white">
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1 mr-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-white/20 rounded-lg p-1.5"><History size={16} /></div>
                <span className="text-sm font-medium text-blue-100">Histórico de Preços</span>
              </div>
              <h3 className="font-bold text-lg leading-snug line-clamp-2">{insumo.descricao}</h3>
              {insumo.fornecedor && (
                <p className="text-blue-200 text-sm mt-1 flex items-center gap-1.5"><Truck size={13} /> {insumo.fornecedor}</p>
              )}
            </div>
            <button onClick={onFechar} className="bg-white/10 hover:bg-white/20 rounded-lg p-1.5 transition-colors shrink-0"><X size={18} /></button>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50/80 border-b border-slate-200 grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl px-4 py-3 border border-slate-100">
            <p className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">Custo Atual</p>
            <p className="text-lg font-bold text-slate-800 mt-0.5">{FMT_BRL.format(insumo.custo_atual)}</p>
          </div>
          <div className="bg-white rounded-xl px-4 py-3 border border-slate-100">
            <p className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">Unidade</p>
            <p className="text-lg font-bold text-slate-800 mt-0.5">{insumo.unidade}</p>
            <p className="text-[10px] text-slate-400">{UNIDADE_LABELS[insumo.unidade] || ''}</p>
          </div>
          <div className="bg-white rounded-xl px-4 py-3 border border-slate-100">
            <p className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">Variação</p>
            {variacao !== null ? (
              <p className={`text-lg font-bold mt-0.5 flex items-center gap-1 ${variacao > 0 ? 'text-red-600' : variacao < 0 ? 'text-green-600' : 'text-slate-500'}`}>
                {variacao > 0 ? <TrendingUp size={16} /> : variacao < 0 ? <TrendingDown size={16} /> : <Minus size={16} />}
                {variacao > 0 ? '+' : ''}{variacao.toFixed(1)}%
              </p>
            ) : <p className="text-lg font-bold text-slate-300 mt-0.5">—</p>}
            <p className="text-[10px] text-slate-400">{historico.length} registro{historico.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="overflow-auto max-h-[45vh]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-200 border-t-blue-600" />
              <p className="text-sm text-slate-400">Carregando histórico...</p>
            </div>
          ) : historico.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <div className="bg-slate-100 rounded-2xl p-4"><History size={28} className="text-slate-300" /></div>
              <p className="text-slate-500 font-medium">Sem registros</p>
              <p className="text-xs text-slate-400">Nenhuma cotação anterior encontrada.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50/80 sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Data</th>
                  <th className="text-right px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Custo</th>
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Fornecedor</th>
                  <th className="text-center px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Variação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historico.map((h, idx) => {
                  const anterior = historico[idx + 1]?.custo;
                  let varNode: React.ReactNode = <span className="text-slate-300">—</span>;
                  if (anterior && anterior > 0) {
                    const pct = ((h.custo - anterior) / anterior) * 100;
                    const cls = pct > 0 ? 'text-red-600 bg-red-50' : pct < 0 ? 'text-green-600 bg-green-50' : 'text-slate-500 bg-slate-50';
                    varNode = <span className={`${cls} px-2 py-0.5 rounded-md text-xs font-semibold`}>{pct > 0 ? '+' : ''}{pct.toFixed(1)}%</span>;
                  }
                  return (
                    <tr key={h.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-5 py-3 text-sm text-slate-700 font-medium">{h.data_cotacao ? FMT_DATE.format(new Date(h.data_cotacao)) : '—'}</td>
                      <td className="px-5 py-3 text-sm text-slate-800 font-bold text-right tabular-nums">{FMT_BRL.format(h.custo)}</td>
                      <td className="px-5 py-3 text-sm text-slate-500">{h.fornecedor || '—'}</td>
                      <td className="px-5 py-3 text-center">{varNode}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ Card Fornecedor (dentro do produto) ═══════════════════ */

function CardFornecedor({
  item,
  menorPreco,
  maiorPreco,
  onHistorico,
}: {
  item: InsumoResumido;
  menorPreco: number;
  maiorPreco: number;
  onHistorico: (i: InsumoResumido) => void;
}) {
  const classe = classificarFornecedor(item.fornecedor);
  const info = getClasseInfo(classe);
  const isMenor = item.custo_atual === menorPreco && menorPreco > 0;
  const isMaior = item.custo_atual === maiorPreco && maiorPreco > 0 && menorPreco !== maiorPreco;

  return (
    <div className={`flex items-center gap-4 px-5 py-3.5 rounded-xl border transition-all hover:shadow-sm ${
      isMenor ? 'bg-green-50/60 border-green-200' : isMaior ? 'bg-red-50/40 border-red-100' : 'bg-white border-slate-200/80'
    }`}>
      <BadgeClasse classe={classe} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-semibold text-slate-800 truncate">{item.fornecedor || 'Sem fornecedor'}</p>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${info.corBg} ${info.cor}`}>{info.label}</span>
          {isMenor && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-green-100 text-green-700 flex items-center gap-0.5">
              <Star size={9} /> Melhor preço
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-400 mt-0.5 truncate">{item.descricao}</p>
      </div>

      <div className="text-right shrink-0">
        <p className={`text-base font-bold tabular-nums ${isMenor ? 'text-green-700' : isMaior ? 'text-red-600' : 'text-slate-800'}`}>
          {FMT_BRL.format(item.custo_atual)}
        </p>
        <div className="flex items-center justify-end gap-1 mt-0.5">{badgeUnidade(item.unidade)}</div>
      </div>

      <div className="text-center shrink-0 w-24">
        {badgeAlerta(item.dias_sem_atualizar)}
        {item.data_ultimo_preco && (
          <p className="text-[10px] text-slate-400 mt-0.5">{FMT_DATE.format(new Date(item.data_ultimo_preco))}</p>
        )}
      </div>

      <button onClick={() => onHistorico(item)} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-100 transition-all shrink-0" title="Ver histórico de preços">
        <History size={16} />
      </button>
    </div>
  );
}

/* ═══════════════════ Accordion Produto (Nível 3) ═══════════════════ */

function AccordionProduto({ produto, onHistorico }: { produto: GrupoProduto; onHistorico: (i: InsumoResumido) => void }) {
  const [aberto, setAberto] = useState(false);
  const spreadPct = produto.menorPreco > 0 && produto.maiorPreco > produto.menorPreco
    ? (((produto.maiorPreco - produto.menorPreco) / produto.menorPreco) * 100).toFixed(0)
    : null;

  return (
    <div className="border border-slate-200/80 rounded-xl overflow-hidden transition-all hover:border-slate-300">
      <button
        onClick={() => setAberto(!aberto)}
        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all ${aberto ? 'bg-slate-50 border-b border-slate-200' : 'bg-white hover:bg-slate-50/50'}`}
      >
        <ChevronR size={14} className={`text-slate-400 transition-transform shrink-0 ${aberto ? 'rotate-90' : ''}`} />

        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold shrink-0">
          {produto.dimensao}
        </span>

        <span className="text-sm font-medium text-slate-700 truncate flex-1">{produto.chave}</span>

        <div className="flex items-center gap-2 shrink-0">
          {produto.qtdFornecedores > 1 && (
            <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              {produto.qtdFornecedores} fornecedor{produto.qtdFornecedores > 1 ? 'es' : ''}
            </span>
          )}
          {spreadPct && (
            <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">
              Δ {spreadPct}%
            </span>
          )}
          <span className="text-xs font-bold text-slate-600 tabular-nums w-24 text-right">
            {FMT_BRL.format(produto.menorPreco)}
          </span>
          {produto.menorPreco !== produto.maiorPreco && produto.maiorPreco > 0 && (
            <>
              <span className="text-slate-300">→</span>
              <span className="text-xs font-bold text-slate-400 tabular-nums w-24 text-right">
                {FMT_BRL.format(produto.maiorPreco)}
              </span>
            </>
          )}
        </div>
      </button>

      {aberto && (
        <div className="p-3 space-y-2 bg-slate-50/30">
          <div className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            <ShieldCheck size={11} />
            <span>Classe</span>
            <span className="flex-1 ml-4">Fornecedor</span>
            <span className="w-24 text-right">Preço</span>
            <span className="w-16 text-center">Un.</span>
            <span className="w-24 text-center">Status</span>
            <span className="w-8" />
          </div>
          {produto.itens.map((item) => (
            <CardFornecedor key={item.id} item={item} menorPreco={produto.menorPreco} maiorPreco={produto.maiorPreco} onHistorico={onHistorico} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════ Accordion Subcategoria (Nível 2) ═══════════════════ */

function AccordionSubcategoria({ sub, onHistorico }: { sub: SubcategoriaAgrupada; onHistorico: (i: InsumoResumido) => void }) {
  const [aberto, setAberto] = useState(false);

  return (
    <div className="border border-slate-200/60 rounded-xl overflow-hidden">
      <button
        onClick={() => setAberto(!aberto)}
        className={`w-full flex items-center gap-3 px-5 py-3.5 text-left transition-all ${aberto ? 'bg-blue-50/60 border-b border-blue-100' : 'bg-white hover:bg-slate-50/50'}`}
      >
        <ChevronDown size={16} className={`text-slate-400 transition-transform shrink-0 ${aberto ? '' : '-rotate-90'}`} />
        <FolderOpen size={16} className={`shrink-0 ${aberto ? 'text-blue-600' : 'text-slate-400'}`} />
        <span className={`text-sm font-semibold ${aberto ? 'text-blue-800' : 'text-slate-700'}`}>{sub.nome}</span>
        <span className="text-[10px] text-slate-400 ml-1">
          {sub.produtos.length} tipo{sub.produtos.length !== 1 ? 's' : ''} · {sub.qtdItens} ite{sub.qtdItens !== 1 ? 'ns' : 'm'}
        </span>
        <span className="flex-1" />
      </button>

      {aberto && (
        <div className="p-3 space-y-2 bg-slate-50/20">
          {sub.produtos.map((prod) => (
            <AccordionProduto key={prod.chave} produto={prod} onHistorico={onHistorico} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════ Accordion Categoria (Nível 1) ═══════════════════ */

function AccordionCategoria({ cat, onHistorico }: { cat: CategoriaAgrupada; onHistorico: (i: InsumoResumido) => void }) {
  const [aberto, setAberto] = useState(false);
  const IconComp = ICONE_MAP[cat.icone] || Package;

  const CORES_CAT: Record<string, { bg: string; icon: string; text: string; border: string }> = {
    Cabeamento: { bg: 'bg-orange-50', icon: 'text-orange-600', text: 'text-orange-800', border: 'border-orange-200' },
    Infraestrutura: { bg: 'bg-slate-100', icon: 'text-slate-600', text: 'text-slate-800', border: 'border-slate-300' },
    'Hidráulica': { bg: 'bg-cyan-50', icon: 'text-cyan-600', text: 'text-cyan-800', border: 'border-cyan-200' },
    'Elétrica': { bg: 'bg-yellow-50', icon: 'text-yellow-600', text: 'text-yellow-800', border: 'border-yellow-200' },
    'Incêndio': { bg: 'bg-red-50', icon: 'text-red-500', text: 'text-red-800', border: 'border-red-200' },
    'Iluminação': { bg: 'bg-amber-50', icon: 'text-amber-500', text: 'text-amber-800', border: 'border-amber-200' },
    'Fixação e Suporte': { bg: 'bg-emerald-50', icon: 'text-emerald-600', text: 'text-emerald-800', border: 'border-emerald-200' },
    'Transformadores e Motores': { bg: 'bg-purple-50', icon: 'text-purple-600', text: 'text-purple-800', border: 'border-purple-200' },
  };

  const cores = CORES_CAT[cat.nome] || { bg: 'bg-slate-50', icon: 'text-slate-600', text: 'text-slate-800', border: 'border-slate-200' };

  return (
    <div className={`rounded-2xl overflow-hidden border-2 transition-all ${aberto ? cores.border : 'border-slate-200/80'} ${aberto ? 'shadow-md' : 'shadow-sm hover:shadow-md'}`}>
      <button
        onClick={() => setAberto(!aberto)}
        className={`w-full flex items-center gap-4 px-6 py-5 text-left transition-all ${aberto ? cores.bg : 'bg-white hover:bg-slate-50/50'}`}
      >
        <div className={`${cores.bg} rounded-xl p-3 shrink-0 border ${cores.border}`}>
          <IconComp size={22} className={cores.icon} strokeWidth={2.2} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className={`text-lg font-bold ${aberto ? cores.text : 'text-slate-800'} leading-tight`}>{cat.nome}</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {cat.subcategorias.length} subcategoria{cat.subcategorias.length !== 1 ? 's' : ''} · {cat.qtdItens.toLocaleString('pt-BR')} ite{cat.qtdItens !== 1 ? 'ns' : 'm'}
          </p>
        </div>
        <ChevronDown size={20} className={`text-slate-400 transition-transform shrink-0 ${aberto ? '' : '-rotate-90'}`} />
      </button>

      {aberto && (
        <div className="p-4 space-y-3 bg-white/80">
          {cat.subcategorias.map((sub) => (
            <AccordionSubcategoria key={sub.nome} sub={sub} onHistorico={onHistorico} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════ Vista Lista (Tabela Flat) ═══════════════════ */

function VistaLista({ onHistorico }: { onHistorico: (i: Insumo) => void }) {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [total, setTotal] = useState(0);
  const [pagina, setPagina] = useState(0);
  const [loading, setLoading] = useState(true);

  const [busca, setBusca] = useState('');
  const [buscaDebounced, setBuscaDebounced] = useState('');
  const [filtroFornecedor, setFiltroFornecedor] = useState('');
  const [filtroUnidade, setFiltroUnidade] = useState('');
  const [filtroAlerta, setFiltroAlerta] = useState('');
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  const [fornecedores, setFornecedores] = useState<string[]>([]);
  const [unidades, setUnidades] = useState<string[]>([]);

  useEffect(() => { const t = setTimeout(() => setBuscaDebounced(busca), 300); return () => clearTimeout(t); }, [busca]);

  const POR_PAGINA = 50;

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const filtros: FiltrosInsumos = {};
      if (buscaDebounced) filtros.busca = buscaDebounced;
      if (filtroFornecedor) filtros.fornecedor = filtroFornecedor;
      if (filtroUnidade) filtros.unidade = filtroUnidade;
      if (filtroAlerta) filtros.alertaDias = Number(filtroAlerta);
      const result = await insumosRepository.listar(pagina, filtros);
      setInsumos(result.data);
      setTotal(result.total);
    } catch (err) { console.error('Erro ao carregar insumos:', err); }
    finally { setLoading(false); }
  }, [pagina, buscaDebounced, filtroFornecedor, filtroUnidade, filtroAlerta]);

  useEffect(() => { carregar(); }, [carregar]);
  useEffect(() => { insumosRepository.listarFornecedores().then(setFornecedores).catch(console.error); insumosRepository.listarUnidades().then(setUnidades).catch(console.error); }, []);
  useEffect(() => { setPagina(0); }, [buscaDebounced, filtroFornecedor, filtroUnidade, filtroAlerta]);

  const totalPaginas = Math.ceil(total / POR_PAGINA);
  const filtrosAtivos = [filtroFornecedor, filtroUnidade, filtroAlerta].filter(Boolean).length;
  const inicio = pagina * POR_PAGINA + 1;
  const fim = Math.min((pagina + 1) * POR_PAGINA, total);

  return (
    <div className="space-y-4">
      {/* Busca + Filtros */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={busca} onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por descrição, fornecedor ou código..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-300 transition-all placeholder:text-slate-400" />
            {busca && <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>}
          </div>
          <button onClick={() => setFiltrosAbertos(!filtrosAbertos)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all shrink-0 ${filtrosAtivos > 0 ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}>
            <Filter size={15} /> Filtros
            {filtrosAtivos > 0 && <span className="bg-blue-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">{filtrosAtivos}</span>}
            <ChevronDown size={14} className={`transition-transform ${filtrosAbertos ? 'rotate-180' : ''}`} />
          </button>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 shrink-0 pl-2 border-l border-slate-200">
            <BarChart3 size={13} /> {total.toLocaleString('pt-BR')} item{total !== 1 ? 's' : ''}
          </div>
        </div>
        {filtrosAbertos && (
          <div className="px-4 pb-4 pt-0 border-t border-slate-100">
            <div className="pt-3 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 min-w-[200px]">
                <Truck size={14} className="text-slate-400 shrink-0" />
                <select value={filtroFornecedor} onChange={(e) => setFiltroFornecedor(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700">
                  <option value="">Todos os fornecedores</option>
                  {fornecedores.map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Ruler size={14} className="text-slate-400 shrink-0" />
                <select value={filtroUnidade} onChange={(e) => setFiltroUnidade(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700">
                  <option value="">Todas unidades</option>
                  {unidades.map((u) => <option key={u} value={u}>{u} — {UNIDADE_LABELS[u] || u}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-slate-400 shrink-0" />
                <select value={filtroAlerta} onChange={(e) => setFiltroAlerta(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700">
                  <option value="">Qualquer período</option>
                  <option value="30">+30 dias sem atualizar</option>
                  <option value="90">+90 dias sem atualizar</option>
                  <option value="180">+180 dias sem atualizar</option>
                  <option value="365">+1 ano sem atualizar</option>
                </select>
              </div>
              {filtrosAtivos > 0 && (
                <button onClick={() => { setFiltroFornecedor(''); setFiltroUnidade(''); setFiltroAlerta(''); }}
                  className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium px-3 py-2 rounded-lg hover:bg-red-50 transition-colors">
                  <RotateCcw size={12} /> Limpar filtros
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="animate-spin rounded-full h-10 w-10 border-[3px] border-blue-100 border-t-blue-600" />
            <p className="text-sm text-slate-400">Carregando insumos...</p>
          </div>
        ) : insumos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="bg-slate-100 rounded-2xl p-6 mb-4"><Package size={36} className="text-slate-300" /></div>
            <p className="text-slate-600 font-semibold mb-1">Nenhum insumo encontrado</p>
            <p className="text-sm text-slate-400 max-w-xs text-center">Tente ajustar os filtros de busca.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-slate-50 to-slate-100/50 border-b border-slate-200">
                    <th className="text-center px-2 py-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-10"><ShieldCheck size={12} className="mx-auto" /></th>
                    <th className="text-left pl-3 pr-3 py-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-[35%]"><span className="flex items-center gap-1.5"><Hash size={12} /> Descrição</span></th>
                    <th className="text-left px-3 py-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider"><span className="flex items-center gap-1.5"><Truck size={12} /> Fornecedor</span></th>
                    <th className="text-center px-3 py-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-16"><span className="flex items-center justify-center gap-1"><Ruler size={11} /> Un.</span></th>
                    <th className="text-right px-3 py-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-32"><span className="flex items-center justify-end gap-1"><CircleDollarSign size={12} /> Custo</span></th>
                    <th className="text-center px-3 py-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-28"><span className="flex items-center justify-center gap-1"><CalendarDays size={11} /> Atualiz.</span></th>
                    <th className="text-center px-3 py-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-24">Status</th>
                    <th className="text-center pr-5 pl-3 py-3.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider w-14"><History size={12} className="mx-auto" /></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {insumos.map((ins) => {
                    const classe = classificarFornecedor(ins.fornecedor);
                    return (
                      <tr key={ins.id} className="group hover:bg-blue-50/40 transition-colors">
                        <td className="px-2 py-3.5 text-center"><BadgeClasse classe={classe} size="sm" /></td>
                        <td className="pl-3 pr-3 py-3.5">
                          <p className="text-sm font-medium text-slate-800 leading-snug line-clamp-1 group-hover:text-blue-700 transition-colors">{ins.descricao}</p>
                          <p className="text-[11px] text-slate-400 font-mono mt-0.5">{ins.codigo}</p>
                        </td>
                        <td className="px-3 py-3.5"><span className="text-sm text-slate-600 line-clamp-1">{ins.fornecedor || '—'}</span></td>
                        <td className="px-3 py-3.5 text-center">{badgeUnidade(ins.unidade)}</td>
                        <td className="px-3 py-3.5 text-right"><span className="text-sm font-bold text-slate-800 tabular-nums">{FMT_BRL.format(ins.custo_atual)}</span></td>
                        <td className="px-3 py-3.5 text-center"><span className="text-xs text-slate-500">{ins.data_ultimo_preco ? FMT_DATE.format(new Date(ins.data_ultimo_preco)) : '—'}</span></td>
                        <td className="px-3 py-3.5 text-center">{badgeAlerta(ins.dias_sem_atualizar)}</td>
                        <td className="pr-5 pl-3 py-3.5 text-center">
                          <button onClick={() => onHistorico(ins)} className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-100 transition-all group-hover:text-blue-500" title="Ver histórico de preços"><History size={15} /></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            <div className="flex items-center justify-between px-5 py-3.5 border-t border-slate-200 bg-slate-50/50">
              <p className="text-xs text-slate-500">
                Mostrando <span className="font-semibold text-slate-700">{inicio}</span> a <span className="font-semibold text-slate-700">{fim}</span> de <span className="font-semibold text-slate-700">{total.toLocaleString('pt-BR')}</span>
              </p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPagina(0)} disabled={pagina === 0} className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Primeira</button>
                <button onClick={() => setPagina((p) => Math.max(0, p - 1))} disabled={pagina === 0} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-slate-200 bg-white"><ChevronLeft size={16} className="text-slate-600" /></button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPaginas) }, (_, i) => {
                    let pg: number;
                    if (totalPaginas <= 5) pg = i;
                    else if (pagina < 3) pg = i;
                    else if (pagina > totalPaginas - 4) pg = totalPaginas - 5 + i;
                    else pg = pagina - 2 + i;
                    return <button key={pg} onClick={() => setPagina(pg)} className={`min-w-[32px] h-8 rounded-lg text-xs font-medium transition-all ${pg === pagina ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}>{pg + 1}</button>;
                  })}
                </div>
                <button onClick={() => setPagina((p) => Math.min(totalPaginas - 1, p + 1))} disabled={pagina >= totalPaginas - 1} className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-slate-200 bg-white"><ChevronRight size={16} className="text-slate-600" /></button>
                <button onClick={() => setPagina(totalPaginas - 1)} disabled={pagina >= totalPaginas - 1} className="px-2.5 py-1.5 text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors">Última</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════ Vista Catálogo Hierárquico ═══════════════════ */

function VistaCatalogo({ onHistorico }: { onHistorico: (i: InsumoResumido) => void }) {
  const [todosInsumos, setTodosInsumos] = useState<InsumoResumido[]>([]);
  const [loading, setLoading] = useState(true);
  const [buscaCatalogo, setBuscaCatalogo] = useState('');

  useEffect(() => {
    insumosRepository.listarTodos()
      .then(setTodosInsumos)
      .catch((err) => console.error('Erro ao carregar catálogo:', err))
      .finally(() => setLoading(false));
  }, []);

  const resultado = useMemo(() => {
    let insumos = todosInsumos;
    if (buscaCatalogo.trim()) {
      const termo = buscaCatalogo.toUpperCase();
      insumos = insumos.filter(
        (i) => i.descricao.toUpperCase().includes(termo) || (i.fornecedor && i.fornecedor.toUpperCase().includes(termo))
      );
    }
    return agruparInsumos(insumos);
  }, [todosInsumos, buscaCatalogo]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-[3px] border-blue-100 border-t-blue-600" />
        <div className="text-center">
          <p className="text-sm font-medium text-slate-600">Carregando catálogo completo...</p>
          <p className="text-xs text-slate-400 mt-1">Classificando mais de 4.000 insumos por categoria</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Busca no catálogo */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" value={buscaCatalogo} onChange={(e) => setBuscaCatalogo(e.target.value)}
            placeholder="Filtrar catálogo por descrição ou fornecedor..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-blue-300 transition-all placeholder:text-slate-400" />
          {buscaCatalogo && <button onClick={() => setBuscaCatalogo('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X size={14} /></button>}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
          <span className="flex items-center gap-1"><Layers size={12} /> {resultado.categorias.length} categorias</span>
          <span className="flex items-center gap-1"><Package size={12} /> {todosInsumos.length.toLocaleString('pt-BR')} insumos classificados</span>
          {resultado.semCategoria.length > 0 && (
            <span className="flex items-center gap-1 text-amber-500"><AlertTriangle size={12} /> {resultado.semCategoria.length} sem categoria</span>
          )}
        </div>
      </div>

      {/* Legenda de classificação */}
      <LegendaClassificacao />

      {/* Categorias accordion */}
      <div className="space-y-3">
        {resultado.categorias.map((cat) => (
          <AccordionCategoria key={cat.nome} cat={cat} onHistorico={onHistorico} />
        ))}
      </div>

      {/* Itens sem categoria */}
      {resultado.semCategoria.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
            <div className="bg-slate-200 rounded-xl p-2.5"><Package size={18} className="text-slate-500" /></div>
            <div>
              <h3 className="text-sm font-bold text-slate-600">Outros Insumos</h3>
              <p className="text-[11px] text-slate-400">{resultado.semCategoria.length} itens sem classificação automática</p>
            </div>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full">
              <thead className="bg-slate-50/80 sticky top-0">
                <tr>
                  <th className="text-center px-2 py-2.5 text-[11px] font-semibold text-slate-400 uppercase w-10"><ShieldCheck size={11} className="mx-auto" /></th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-slate-400 uppercase">Descrição</th>
                  <th className="text-left px-3 py-2.5 text-[11px] font-semibold text-slate-400 uppercase">Fornecedor</th>
                  <th className="text-right px-3 py-2.5 text-[11px] font-semibold text-slate-400 uppercase w-28">Custo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {resultado.semCategoria.slice(0, 200).map((ins) => (
                  <tr key={ins.id} className="hover:bg-blue-50/30">
                    <td className="px-2 py-2 text-center"><BadgeClasse classe={classificarFornecedor(ins.fornecedor)} size="sm" /></td>
                    <td className="px-3 py-2 text-sm text-slate-700 truncate max-w-[400px]">{ins.descricao}</td>
                    <td className="px-3 py-2 text-sm text-slate-500">{ins.fornecedor || '—'}</td>
                    <td className="px-3 py-2 text-sm text-slate-800 font-bold text-right tabular-nums">{FMT_BRL.format(ins.custo_atual)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════ Página Principal ═══════════════════ */

export function Insumos() {
  const [vista, setVista] = useState<'catalogo' | 'lista'>('catalogo');
  const [insumoHistorico, setInsumoHistorico] = useState<Insumo | InsumoResumido | null>(null);
  const [resumo, setResumo] = useState({ total: 0, alertas90: 0, alertas180: 0, fornecedores: 0 });

  useEffect(() => {
    Promise.all([
      insumosRepository.listar(0, {}),
      insumosRepository.listar(0, { alertaDias: 90 }),
      insumosRepository.listar(0, { alertaDias: 180 }),
      insumosRepository.listarFornecedores(),
    ]).then(([all, a90, a180, f]) => {
      setResumo({ total: all.total, alertas90: a90.total, alertas180: a180.total, fornecedores: f.length });
    }).catch(console.error);
  }, []);

  return (
    <div className="space-y-5 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-2.5 shadow-lg shadow-blue-500/20">
              <Package size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 leading-tight">Catálogo de Insumos</h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Base de materiais com {resumo.fornecedores} fornecedores, classificação A/B/C e histórico de preços
              </p>
            </div>
          </div>
        </div>

        {/* Toggle Vista */}
        <div className="flex items-center bg-slate-100 rounded-xl p-1 shrink-0">
          <button onClick={() => setVista('catalogo')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${vista === 'catalogo' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <ListTree size={16} /> Catálogo
          </button>
          <button onClick={() => setVista('lista')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${vista === 'lista' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            <Table2 size={16} /> Lista
          </button>
        </div>
      </div>

      {/* Cards KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <CardKPI icon={Package} iconBg="bg-blue-50" iconColor="text-blue-600" label="Total de Insumos" value={resumo.total.toLocaleString('pt-BR')} subtitle={`${resumo.fornecedores} fornecedores`} />
        <CardKPI icon={Truck} iconBg="bg-indigo-50" iconColor="text-indigo-600" label="Fornecedores" value={resumo.fornecedores} valueColor="text-indigo-700" subtitle="Empresas cadastradas" />
        <CardKPI icon={Clock} iconBg="bg-amber-50" iconColor="text-amber-500" label="+90 dias sem preço" value={resumo.alertas90.toLocaleString('pt-BR')} valueColor="text-amber-600" subtitle="Precisam atualização" />
        <CardKPI icon={AlertTriangle} iconBg="bg-red-50" iconColor="text-red-500" label="+180 dias sem preço" value={resumo.alertas180.toLocaleString('pt-BR')} valueColor="text-red-600" subtitle="Atenção urgente" />
      </div>

      {/* Conteúdo */}
      {vista === 'catalogo' ? (
        <VistaCatalogo onHistorico={setInsumoHistorico} />
      ) : (
        <VistaLista onHistorico={setInsumoHistorico} />
      )}

      {/* Modal Histórico */}
      {insumoHistorico && (
        <ModalHistorico insumo={insumoHistorico} onFechar={() => setInsumoHistorico(null)} />
      )}
    </div>
  );
}
