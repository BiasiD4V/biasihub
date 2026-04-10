import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Flame, Zap, Trophy, AlertTriangle,
  RefreshCw, Users, Target, Clock,
} from 'lucide-react';
import { supabase } from '../infrastructure/supabase/client';
import { orcamentosRepository } from '../infrastructure/supabase/orcamentosRepository';
import type { OrcamentoSupabase } from '../infrastructure/supabase/orcamentosRepository';
import {
  calcularTemperatura, calcularVidaUtil, calcularEnergia,
  calcularVendedorStats, TEMPERATURA_CONFIG,
  vidaUtilCor, energiaCor, scoreCor, scoreBg,
  PONTOS_ATIVIDADE, LABEL_ATIVIDADE,
  type VendedorStats, type Temperatura,
} from '../components/gamification/gamificacaoTypes';

import { biraRepository } from '../infrastructure/supabase/biraRepository';

// ── Mini-components ──────────────────────────────────────────────────────────

function GlowBar({ pct, cls, animated = false }: { pct: number; cls: string; animated?: boolean }) {
  return (
    <div className="h-3 bg-slate-200/60 rounded-full overflow-hidden relative">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${cls} transition-all duration-1000 ease-out relative`}
        style={{ width: `${Math.max(2, pct)}%` }}
      >
        {animated && (
          <div className="absolute inset-0 bg-white/30 animate-pulse rounded-full" />
        )}
      </div>
    </div>
  );
}

function Badge({ emoji, label, cls }: { emoji: string; label: string; cls: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full ${cls} uppercase tracking-widest`}>
      {emoji} {label}
    </span>
  );
}

function SectionHeader({ icon: Icon, title, sub, cor }: { icon: React.ElementType; title: string; sub?: string; cor: string }) {
  return (
    <div className={`flex items-center gap-3 mb-6`}>
      <div className={`p-2.5 rounded-2xl ${cor}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <h2 className="text-lg font-black text-slate-800 leading-none">{title}</h2>
        {sub && <p className="text-xs text-slate-400 mt-0.5 font-medium">{sub}</p>}
      </div>
    </div>
  );
}

// ── 1. Card de Temperatura ───────────────────────────────────────────────────

function CardTemperatura({ orc }: { orc: OrcamentoSupabase }) {
  const { temp, diasSemContato, pct } = calcularTemperatura(orc);
  const cfg = TEMPERATURA_CONFIG[temp];

  return (
    <div className={`rounded-3xl border-2 ${cfg.borda} ${cfg.bgCard} p-5 shadow-lg ${cfg.glowCls} transition-all hover:scale-[1.01] hover:shadow-xl`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 truncate">{orc.responsavel || 'Sem responsável'}</p>
          <p className="font-bold text-sm text-slate-800 leading-tight line-clamp-2">{orc.nome_obra || orc.objeto || '—'}</p>
          {orc.clientes?.nome && <p className="text-xs text-slate-500 mt-1 truncate font-medium">{orc.clientes.nome}</p>}
        </div>
        <span className="text-3xl ml-2 flex-shrink-0 drop-shadow">{cfg.emoji}</span>
      </div>

      <GlowBar pct={pct} cls={cfg.barCls} animated={temp === 'quente'} />

      <div className="flex items-center justify-between mt-3">
        <Badge emoji={cfg.emoji} label={cfg.label} cls={cfg.badgeCls} />
        <span className={`text-[10px] font-bold ${cfg.cor}`}>
          {diasSemContato === 0 ? 'hoje' : `${diasSemContato}d sem contato`}
        </span>
      </div>

      {temp === 'congelado' && (
        <div className="mt-3 flex items-center gap-2 bg-indigo-600/10 border border-indigo-200 rounded-2xl px-3 py-2">
          <AlertTriangle size={12} className="text-indigo-600 flex-shrink-0" />
          <span className="text-[10px] font-bold text-indigo-700">Arquivar como perdido?</span>
        </div>
      )}
    </div>
  );
}

// ── 2. Card de Energia do Vendedor ───────────────────────────────────────────

function CardEnergia({
  vendedor, energia, atividades, onRegistrarAtividade,
}: {
  vendedor: string;
  energia: number;
  atividades: { tipo: string; criado_em: string }[];
  onRegistrarAtividade: (vendedor: string) => void;
}) {
  const isKO = energia === 0;
  const ecor = energiaCor(energia);
  const initials = vendedor.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();

  return (
    <div className={`rounded-3xl border-2 p-5 transition-all ${isKO ? 'border-red-300 bg-red-50/80 shadow-red-200 shadow-lg animate-pulse' : 'border-slate-200 bg-white/80 shadow-lg hover:shadow-xl hover:scale-[1.01]'}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 font-black text-sm relative ${isKO ? 'bg-red-200 text-red-700' : 'bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg shadow-blue-500/30'}`}>
          {isKO ? '💀' : initials}
          {!isKO && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white" title="Ativo" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-slate-800 truncate">{vendedor.split(' ').slice(0, 2).join(' ')}</p>
          {isKO
            ? <p className="text-xs font-black text-red-600 animate-bounce">K.O. — Sem atividade!</p>
            : <p className="text-xs text-slate-400 font-medium">{energia}pts de energia</p>
          }
        </div>
        <div className={`text-2xl font-black ${isKO ? 'text-red-500' : energia > 60 ? 'text-emerald-600' : energia > 30 ? 'text-amber-500' : 'text-red-500'}`}>
          {energia}
        </div>
      </div>

      <GlowBar pct={energia} cls={ecor} animated={isKO} />

      <div className="mt-3 space-y-1 max-h-20 overflow-auto">
        {atividades.slice(-3).reverse().map((a, i) => (
          <div key={i} className="flex items-center gap-2 text-[10px] text-slate-500">
            <Zap size={10} className="text-amber-500 flex-shrink-0" />
            <span className="font-semibold">{LABEL_ATIVIDADE[a.tipo] || a.tipo}</span>
            <span className="text-slate-300 ml-auto">{new Date(a.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        ))}
        {atividades.length === 0 && (
          <p className="text-[10px] text-slate-400 italic text-center py-1">Nenhuma atividade hoje</p>
        )}
      </div>

      <button
        onClick={() => onRegistrarAtividade(vendedor)}
        className="mt-3 w-full text-[11px] font-bold py-2 rounded-xl bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-500 transition-all border border-slate-200 hover:border-blue-600"
      >
        + Registrar Atividade
      </button>
    </div>
  );
}

// ── 3. Card de Vida Útil ────────────────────────────────────────────────────

function CardVidaUtil({ orc }: { orc: OrcamentoSupabase }) {
  const { pctRestante, diasRestantes, critico } = calcularVidaUtil(orc);
  const vcor = vidaUtilCor(pctRestante);

  return (
    <div className={`rounded-3xl border-2 p-5 shadow-lg transition-all hover:scale-[1.01] ${critico ? 'border-red-300 bg-red-50/80 shadow-red-200' : 'border-slate-200 bg-white/80'}`}>
      <div className="flex items-start justify-between mb-1">
        <div className="flex-1 min-w-0 pr-3">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{orc.responsavel || '—'}</p>
          <p className="font-bold text-sm text-slate-800 mt-0.5 line-clamp-2 leading-tight">{orc.nome_obra || orc.objeto || '—'}</p>
        </div>
        <div className={`text-right flex-shrink-0`}>
          <p className={`text-2xl font-black leading-none ${pctRestante > 60 ? 'text-emerald-600' : pctRestante > 30 ? 'text-amber-500' : 'text-red-600'}`}>
            {Math.round(pctRestante)}%
          </p>
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">vida útil</p>
        </div>
      </div>

      <div className="my-4 h-4 bg-slate-200/50 rounded-full overflow-hidden relative">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${vcor} transition-all duration-1000 relative overflow-hidden`}
          style={{ width: `${Math.max(2, pctRestante)}%` }}
        >
          <div className="absolute inset-0 bg-white/20 animate-shimmer" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold ${pctRestante > 60 ? 'text-emerald-600' : pctRestante > 30 ? 'text-amber-600' : 'text-red-600'}`}>
          <Clock size={12} className="inline mr-1" />
          {diasRestantes > 0 ? `${Math.round(diasRestantes)}d restantes` : 'Vencido!'}
        </span>
        {critico && (
          <span className="flex items-center gap-1 text-[10px] font-black text-red-600 bg-red-100 px-2.5 py-1 rounded-full animate-pulse">
            <AlertTriangle size={10} /> ALERTA
          </span>
        )}
      </div>
    </div>
  );
}

// ── 4. Card Ranking de Saúde ────────────────────────────────────────────────

function CardRanking({ stats, posicao }: { stats: VendedorStats; posicao: number }) {
  const initials = stats.nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
  const medalha = posicao === 1 ? '🥇' : posicao === 2 ? '🥈' : posicao === 3 ? '🥉' : `#${posicao}`;
  const scor = scoreCor(stats.score);
  const sbg = scoreBg(stats.score);

  return (
    <div className={`rounded-3xl border-2 p-5 shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all ${posicao <= 3 ? 'border-amber-300 bg-amber-50/60' : 'border-slate-200 bg-white/80'}`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="text-2xl flex-shrink-0">{medalha}</div>
        <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-500/20`}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-slate-800 truncate">{stats.nome.split(' ').slice(0, 2).join(' ')}</p>
          <p className="text-[10px] text-slate-400 font-medium">{stats.total} orçamentos · {stats.fechadas} fechados</p>
        </div>
        <div className={`px-3 py-1.5 rounded-xl border ${sbg}`}>
          <p className={`text-xl font-black leading-none ${scor}`}>{stats.score}</p>
          <p className="text-[8px] font-bold text-slate-400 uppercase text-center">score</p>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-slate-500 font-medium flex items-center gap-1"><Target size={10} /> Conversão</span>
          <span className={`font-black ${stats.taxaConversao >= 40 ? 'text-emerald-600' : stats.taxaConversao >= 25 ? 'text-amber-600' : 'text-red-500'}`}>{stats.taxaConversao.toFixed(0)}%</span>
        </div>
        <GlowBar pct={stats.taxaConversao} cls={stats.taxaConversao >= 40 ? 'from-emerald-500 to-green-400' : 'from-amber-500 to-yellow-400'} />

        <div className="flex items-center justify-between text-[11px] mt-1">
          <span className="text-slate-500 font-medium flex items-center gap-1"><Flame size={10} /> Leads Quentes</span>
          <span className={`font-black ${stats.pctQuentes >= 50 ? 'text-orange-600' : 'text-slate-500'}`}>{stats.pctQuentes.toFixed(0)}%</span>
        </div>
        <GlowBar pct={stats.pctQuentes} cls="from-orange-500 to-red-500" />
      </div>

      <div className="grid grid-cols-4 gap-2 pt-3 border-t border-slate-100">
        {[
          { emoji: '🔥', val: stats.quentes, label: 'Quentes' },
          { emoji: '🟡', val: stats.mornos,  label: 'Mornos' },
          { emoji: '🧊', val: stats.frios,   label: 'Frios' },
          { emoji: '❄️', val: stats.congelados, label: 'Cong.' },
        ].map(({ emoji, val, label }) => (
          <div key={label} className="text-center">
            <p className="text-base leading-none">{emoji}</p>
            <p className="text-sm font-black text-slate-700 mt-0.5">{val}</p>
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Modal de Registrar Atividade ─────────────────────────────────────────────

function ModalAtividade({ vendedor, onClose, onSalvar }: {
  vendedor: string;
  onClose: () => void;
  onSalvar: () => void;
}) {
  const [tipo, setTipo] = useState('followup_realizado');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  async function handleSalvar() {
    setSalvando(true);
    setErro('');
    try {
      const { error } = await supabase.from('vendedor_atividades').insert({
        vendedor_nome: vendedor,
        tipo,
        pontos: PONTOS_ATIVIDADE[tipo] || 0,
      });
      if (error) throw error;
      onSalvar();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErro('Erro ao registrar no banco. Verifique permissões/RLS.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white/90 backdrop-blur-2xl rounded-[32px] shadow-2xl border border-white/40 w-full max-w-sm p-8 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 bg-amber-500 rounded-2xl shadow-lg shadow-amber-500/30 text-white"><Zap size={20} /></div>
          <div>
            <h3 className="font-black text-slate-800">Registrar Atividade</h3>
            <p className="text-xs text-slate-400">{vendedor.split(' ').slice(0, 2).join(' ')}</p>
          </div>
        </div>
        {erro && <div className="mb-4 p-2 bg-red-50 text-red-600 text-xs rounded-xl font-medium border border-red-200">{erro}</div>}
        <div className="space-y-3 mb-6">
          {Object.entries(PONTOS_ATIVIDADE).map(([key, pts]) => (
            <button
              key={key}
              onClick={() => setTipo(key)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all text-sm font-bold ${tipo === key ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
            >
              <span>{LABEL_ATIVIDADE[key]}</span>
              <span className="text-emerald-600">+{pts} pts</span>
            </button>
          ))}
        </div>
        <button
          onClick={handleSalvar}
          disabled={salvando}
          className="w-full py-4 font-black text-white bg-blue-600 hover:bg-blue-700 rounded-2xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2"
        >
          {salvando ? <RefreshCw size={18} className="animate-spin" /> : <Zap size={18} />}
          {salvando ? 'Registrando...' : 'Registrar +' + PONTOS_ATIVIDADE[tipo] + 'pts'}
        </button>
      </div>
    </div>
  );
}

// ── Página Principal: Arena Comercial ────────────────────────────────────────

export function ArenaComercial() {
  const [vendedores, setVendedores] = useState<string[]>([]);
  const [orcamentos, setOrcamentos] = useState<OrcamentoSupabase[]>([]);
  const [atividades, setAtividades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aba, setAba] = useState<'temperatura' | 'energia' | 'vidautil' | 'ranking'>('temperatura');
  const [vendedorModal, setVendedorModal] = useState<string | null>(null);

  // Helper para matching flexível de nomes
  const isMesmoVendedor = useCallback((nomeAtividade: string, nomeVendedor: string) => {
    if (!nomeAtividade || !nomeVendedor) return false;
    const n1 = nomeAtividade.toUpperCase();
    const n2 = nomeVendedor.toUpperCase();
    const base1 = n1.split(' ')[0];
    const base2 = n2.split(' ')[0];
    return n1 === n2 || n1.startsWith(n2) || n2.startsWith(n1) || (base1 === base2 && base1.length > 2);
  }, []);

  const carregar = useCallback(async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    try {
      const [members, orcs, ativs] = await Promise.all([
        biraRepository.listarMembrosComercial(),
        orcamentosRepository.listarTodos(),
        supabase.from('vendedor_atividades')
          .select('*')
          .gte('criado_em', new Date().toISOString().slice(0, 10))
          .order('criado_em', { ascending: true })
          .then(r => r.data || []),
      ]);
      setVendedores(members.map(m => m.nome.toUpperCase()));
      setOrcamentos(orcs);
      setAtividades(ativs);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { 
    carregar(); 

    // ── Supabase Realtime ───────────────────────────────────────────
    const channel = supabase
      .channel('arena-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendedor_atividades' }, () => {
        console.log('[Arena] Nova atividade detectada! Atualizando...');
        carregar(true); // Atualização silenciosa
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'propostas' }, () => {
        carregar(true);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [carregar]);

  // Automação: Arquivar orçamentos "Congelados" automaticamente
  useEffect(() => {
    async function arquivarCongelados() {
      if (loading || orcamentos.length === 0) return;
      
      const congelados = orcamentos.filter(o => {
        if (['FECHADO', 'NÃO FECHADO', 'CANCELADO', 'DECLINADO'].includes(o.status || '')) return false;
        return calcularTemperatura(o).temp === 'congelado';
      });

      if (congelados.length > 0) {
        console.log(`[Automação] Arquivando ${congelados.length} orçamentos congelados...`);
        for (const o of congelados) {
          await orcamentosRepository.atualizar(o.id, { 
            status: 'NÃO FECHADO',
            observacao_comercial: `${o.observacao_comercial || ''}\n[BOT] Arquivado automaticamente por falta de contato (congelado).`.trim()
          });
        }
        carregar(); // Recarrega após arquivar
      }
    }
    arquivarCongelados();
  }, [orcamentos, loading, carregar]);

  const ativos = useMemo(() =>
    orcamentos.filter(o =>
      !['FECHADO', 'NÃO FECHADO', 'CANCELADO', 'DECLINADO'].includes(o.status || '')
    ), [orcamentos]);

  const porTemperatura = useMemo(() => {
    return {
      quente:    ativos.filter(o => calcularTemperatura(o).temp === 'quente'),
      morno:     ativos.filter(o => calcularTemperatura(o).temp === 'morno'),
      frio:      ativos.filter(o => calcularTemperatura(o).temp === 'frio'),
      congelado: ativos.filter(o => calcularTemperatura(o).temp === 'congelado'),
    };
  }, [ativos]);


  const energiaPorVendedor = useMemo(() => {
    const map: Record<string, number> = {};
    vendedores.forEach(v => {
      const pts = atividades
        .filter(a => isMesmoVendedor(a.vendedor_nome, v))
        .reduce((acc, a) => acc + (a.pontos || 0), 0);
      map[v] = calcularEnergia(pts);
    });
    return map;
  }, [vendedores, atividades]);

  const atividadesPorVendedor = useMemo(() => {
    const map: Record<string, any[]> = {};
    vendedores.forEach(v => { 
      map[v] = atividades.filter(a => isMesmoVendedor(a.vendedor_nome, v)); 
    });
    return map;
  }, [vendedores, atividades]);

  const ranking = useMemo(() => {
    return vendedores
      .map(v => calcularVendedorStats(v, orcamentos, energiaPorVendedor[v] || 0))
      .sort((a, b) => b.score - a.score);
  }, [vendedores, orcamentos, energiaPorVendedor]);

  const criticos = useMemo(() =>
    ativos.filter(o => calcularVidaUtil(o).critico), [ativos]);

  const ABAS = [
    { id: 'temperatura', label: '🔥 Temperatura', count: ativos.length },
    { id: 'energia',     label: '⚡ Energia',     count: vendedores.length },
    { id: 'vidautil',    label: '⏳ Vida Útil',   count: criticos.length > 0 ? criticos.length : ativos.length, alert: criticos.length > 0 },
    { id: 'ranking',     label: '🏆 Ranking',     count: ranking.length },
  ] as const;

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30">
      {/* ── Header ── */}
      <div className="px-6 py-5 bg-white/50 backdrop-blur-xl border-b border-slate-200/60">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-xl shadow-orange-500/30 text-white">
              <Trophy size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Arena Comercial</h1>
              <p className="text-xs font-semibold text-slate-400">Gamificação · {ativos.length} orçamentos ativos</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {criticos.length > 0 && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-2 rounded-xl animate-pulse">
                <AlertTriangle size={14} className="text-red-500" />
                <span className="text-xs font-black text-red-600">{criticos.length} críti{criticos.length > 1 ? 'cos' : 'co'}</span>
              </div>
            )}
            <button onClick={() => carregar()} className={`p-2.5 text-slate-400 hover:text-blue-600 rounded-xl hover:bg-blue-50 transition-all ${loading ? 'animate-spin' : ''}`}>
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {/* Stats rápidas */}
        <div className="grid grid-cols-4 gap-3 mb-4">
          {[
            { emoji: '🔥', val: porTemperatura.quente.length,    label: 'Quentes',    bg: 'bg-orange-50 border-orange-200' },
            { emoji: '🟡', val: porTemperatura.morno.length,     label: 'Mornos',     bg: 'bg-yellow-50 border-yellow-200' },
            { emoji: '🧊', val: porTemperatura.frio.length,      label: 'Frios',      bg: 'bg-sky-50 border-sky-200' },
            { emoji: '❄️', val: porTemperatura.congelado.length, label: 'Congelados', bg: 'bg-indigo-50 border-indigo-200' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} border rounded-2xl p-3 text-center`}>
              <p className="text-2xl leading-none">{s.emoji}</p>
              <p className="text-xl font-black text-slate-800 mt-1">{s.val}</p>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Navegação de abas */}
        <div className="flex gap-2 bg-slate-100/60 p-1 rounded-2xl w-fit">
          {ABAS.map(a => (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
                aba === a.id
                  ? 'bg-white text-slate-800 shadow-md'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {a.label}
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-lg ${
                aba === a.id && (a as any).alert ? 'bg-red-500 text-white' :
                aba === a.id ? 'bg-blue-100 text-blue-700' : 'bg-slate-200 text-slate-500'
              }`}>{a.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Conteúdo ── */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-sm font-bold text-slate-400 animate-pulse">Carregando Arena...</p>
            </div>
          </div>
        ) : (
          <>
            {/* ─── ABA: TEMPERATURA ─── */}
            {aba === 'temperatura' && (
              <div className="space-y-8">
                {(['quente', 'morno', 'frio', 'congelado'] as Temperatura[]).map(temp => {
                  const lista = porTemperatura[temp];
                  const cfg = TEMPERATURA_CONFIG[temp];
                  if (lista.length === 0) return null;
                  return (
                    <div key={temp}>
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-2xl">{cfg.emoji}</span>
                        <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">{cfg.label}</h3>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${cfg.badgeCls}`}>{lista.length}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {lista.map(o => <CardTemperatura key={o.id} orc={o} />)}
                      </div>
                    </div>
                  );
                })}
                {ativos.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                    <Flame size={48} className="mb-4 opacity-30" />
                    <p className="font-bold">Nenhum orçamento ativo</p>
                  </div>
                )}
              </div>
            )}

            {/* ─── ABA: ENERGIA ─── */}
            {aba === 'energia' && (
              <div>
                <SectionHeader icon={Zap} title="Energia dos Vendedores" sub="-5pts/hora · sobe com atividades" cor="bg-amber-500" />
                {vendedores.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                    <Users size={48} className="mb-4 opacity-30" />
                    <p className="font-bold mb-2">Nenhum responsável encontrado</p>
                    <p className="text-sm text-center">Defina responsáveis nos orçamentos para ver a energia da equipe</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {vendedores.map(v => (
                      <CardEnergia
                        key={v}
                        vendedor={v}
                        energia={energiaPorVendedor[v] || 0}
                        atividades={atividadesPorVendedor[v] || []}
                        onRegistrarAtividade={setVendedorModal}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ─── ABA: VIDA ÚTIL ─── */}
            {aba === 'vidautil' && (
              <div>
                <SectionHeader icon={Clock} title="Vida Útil dos Orçamentos" sub="Verde → Amarelo → Vermelho · Alerta abaixo de 30%" cor="bg-emerald-500" />
                {criticos.length > 0 && (
                  <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-3xl flex items-center gap-3">
                    <AlertTriangle size={20} className="text-red-500 flex-shrink-0" />
                    <div>
                      <p className="font-black text-red-700 text-sm">{criticos.length} orçamento{criticos.length > 1 ? 's' : ''} em estado crítico!</p>
                      <p className="text-xs text-red-500">Menos de 30% do prazo restante. Ação necessária!</p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {ativos
                    .sort((a, b) => calcularVidaUtil(a).pctRestante - calcularVidaUtil(b).pctRestante)
                    .map(o => <CardVidaUtil key={o.id} orc={o} />)
                  }
                  {ativos.length === 0 && (
                    <div className="col-span-4 flex flex-col items-center justify-center py-24 text-slate-400">
                      <Clock size={48} className="mb-4 opacity-30" />
                      <p className="font-bold">Nenhum orçamento ativo</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── ABA: RANKING ─── */}
            {aba === 'ranking' && (
              <div>
                <SectionHeader icon={Trophy} title="Ranking de Saúde da Carteira" sub="Score: 40% conversão + 40% leads quentes + 20% energia" cor="bg-amber-500" />
                {ranking.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                    <Trophy size={48} className="mb-4 opacity-30" />
                    <p className="font-bold mb-2">Ranking indisponível</p>
                    <p className="text-sm">Defina responsáveis nos orçamentos para ver o ranking</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {ranking.map((stats, i) => (
                      <CardRanking key={stats.nome} stats={stats} posicao={i + 1} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modal de Registrar Atividade ── */}
      {vendedorModal && (
        <ModalAtividade
          vendedor={vendedorModal}
          onClose={() => setVendedorModal(null)}
          onSalvar={carregar}
        />
      )}
    </div>
  );
}

