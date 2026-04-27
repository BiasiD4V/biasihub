import type { OrcamentoCard } from '../context/NovoOrcamentoContext';

export type PrioridadeABC = 'A' | 'B' | 'C';

// ── Scoring histórico (6 critérios automáticos) ───────────────────────────────

export interface CriterioDetalhe {
  pts: 0 | 1 | 2;   // pontuação (0-2)
  label: string;
  descricao: string; // ex: "≥5 prop" ou "40%"
}

export interface ScoreHistoricoABC {
  pts: number;          // 0–10
  classe: PrioridadeABC;
  raw: number;          // 0–12
  criterios: {
    recorrencia: CriterioDetalhe;
    conversao:   CriterioDetalhe;
    volume:      CriterioDetalhe;
    recente:     CriterioDetalhe;
    escopo:      CriterioDetalhe;
    orc_valor:   CriterioDetalhe;
  };
  // dados históricos usados
  hist: {
    qtd:  number;
    fech: number;
    vol:  number;
    disc: number;
    rec:  number;
    taxa: number;
  };
}

/** Monta os dados históricos de um cliente a partir da lista de todos os orçamentos */
export function buildClienteHistorico(
  clienteId: string,
  todos: OrcamentoCard[]
): { qtd: number; fech: number; vol: number; disc: number; rec: number } {
  const historico = todos.filter((o) => o.clienteId === clienteId);

  const qtd  = historico.length;
  const fech = historico.filter(
    (o) => o.resultadoComercial === 'ganho'
  ).length;
  const vol  = historico.reduce((acc, o) => acc + (o.valorProposta ?? 0), 0);

  // Disciplinas distintas
  const discsSet = new Set<string>();
  historico.forEach((o) => o.disciplinaIds?.forEach((d) => discsSet.add(d)));
  const disc = Math.max(discsSet.size, 1);

  // Recentes = nos últimos 12 meses
  const umAnoAtras = new Date();
  umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);
  const rec = historico.filter((o) => {
    const d = o.criadoEm ? new Date(o.criadoEm) : null;
    return d && d >= umAnoAtras;
  }).length;

  return { qtd, fech, vol, disc, rec };
}

/** Calcula o score ABC automático baseado no histórico do cliente + valor do orçamento */
export function calcularScoreHistoricoABC(
  orc: OrcamentoCard,
  todos: OrcamentoCard[]
): ScoreHistoricoABC {
  const h = buildClienteHistorico(orc.clienteId, todos);
  const taxa = h.qtd > 0 ? h.fech / h.qtd : 0;
  const val  = orc.valorProposta ?? 0;

  const recorrPts: 0 | 1 | 2 = h.qtd >= 12 ? 2 : h.qtd >= 5 ? 1 : 0;
  const convPts:   0 | 1 | 2 = taxa >= 0.4  ? 2 : taxa >= 0.15 ? 1 : 0;
  const volPts:    0 | 1 | 2 = h.vol >= 10_000_000 ? 2 : h.vol >= 1_000_000 ? 1 : 0;
  const recPts:    0 | 1 | 2 = h.rec >= 4 ? 2 : h.rec >= 1 ? 1 : 0;
  const scopePts:  0 | 1 | 2 = h.disc >= 4 ? 2 : h.disc >= 2 ? 1 : 0;
  const valPts:    0 | 1 | 2 = val >= 5_000_000 ? 2 : val >= 300_000 ? 1 : 0;

  function descRecorr() {
    if (h.qtd >= 12) return `${h.qtd} props`;
    if (h.qtd >= 5)  return `${h.qtd} props`;
    return `${h.qtd} prop${h.qtd !== 1 ? 's' : ''}`;
  }
  function descConv() {
    const p = (taxa * 100).toFixed(0) + '%';
    return `${h.fech}/${h.qtd} fechados (${p})`;
  }
  function descVol() {
    if (h.vol >= 1_000_000) return `R$ ${(h.vol / 1_000_000).toFixed(1)}M`;
    if (h.vol >= 1_000)     return `R$ ${(h.vol / 1_000).toFixed(0)}K`;
    return `R$ ${h.vol.toFixed(0)}`;
  }
  function descOrcVal() {
    if (!val) return 'Sem valor';
    if (val >= 1_000_000) return `R$ ${(val / 1_000_000).toFixed(1)}M`;
    if (val >= 1_000)     return `R$ ${(val / 1_000).toFixed(0)}K`;
    return `R$ ${val.toFixed(0)}`;
  }

  const raw = recorrPts + convPts + volPts + recPts + scopePts + valPts;
  const pts = Math.round((raw / 12) * 10);
  const classe: PrioridadeABC = pts >= 7 ? 'A' : pts >= 4 ? 'B' : 'C';

  return {
    pts,
    classe,
    raw,
    criterios: {
      recorrencia: { pts: recorrPts, label: 'Recorrência', descricao: descRecorr() },
      conversao:   { pts: convPts,   label: 'Conversão',   descricao: descConv()  },
      volume:      { pts: volPts,    label: 'Vol. histórico', descricao: descVol() },
      recente:     { pts: recPts,    label: 'Ativ. recente', descricao: `${h.rec} últ. 12m` },
      escopo:      { pts: scopePts,  label: 'Escopo',      descricao: `${h.disc} disciplina${h.disc !== 1 ? 's' : ''}` },
      orc_valor:   { pts: valPts,    label: 'Valor ORC',   descricao: descOrcVal() },
    },
    hist: { ...h, taxa },
  };
}

// ── Configuração visual das classes ──────────────────────────────────────────

export const PRIORIDADE_ABC_CONFIG: Record<
  PrioridadeABC,
  {
    label: string;
    color: string;       // hex para bar/border
    bg: string;          // tailwind bg (opaque)
    bgAlpha: string;     // tailwind bg (semi-transparente)
    text: string;        // tailwind text
    border: string;      // tailwind border
    glow: string;        // tailwind shadow
  }
> = {
  A: {
    label: 'A',
    color: '#22d3a0',
    bg: 'bg-emerald-500',
    bgAlpha: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/40',
    glow: 'shadow-emerald-500/20',
  },
  B: {
    label: 'B',
    color: '#f0b429',
    bg: 'bg-amber-400',
    bgAlpha: 'bg-amber-400/10',
    text: 'text-amber-400',
    border: 'border-amber-400/40',
    glow: 'shadow-amber-400/20',
  },
  C: {
    label: 'C',
    color: '#f87171',
    bg: 'bg-red-400',
    bgAlpha: 'bg-red-400/10',
    text: 'text-red-400',
    border: 'border-red-400/40',
    glow: 'shadow-red-400/20',
  },
};

// ── Score para PropostaSupabase (lista) ──────────────────────────────────────

export interface HistoricoSlim {
  cliente: string;
  status: string | null;
  valor_orcado: number | null;
  disciplina: string | null;
  data_entrada: string | null;
}

/** Constrói mapa H a partir de todos os registros slim */
export function buildHMap(todos: HistoricoSlim[]): Record<string, { qtd: number; fech: number; vol: number; disc: number; rec: number }> {
  const umAnoAtras = new Date();
  umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);

  const map: Record<string, { qtd: number; fech: number; vol: number; discs: Set<string>; rec: number }> = {};
  for (const row of todos) {
    const cli = (row.cliente || '').toUpperCase().trim();
    if (!cli) continue;
    if (!map[cli]) map[cli] = { qtd: 0, fech: 0, vol: 0, discs: new Set(), rec: 0 };
    const h = map[cli];
    h.qtd++;
    if ((row.status || '').toLowerCase() === 'fechado') h.fech++;
    h.vol += row.valor_orcado ?? 0;
    if (row.disciplina) h.discs.add(row.disciplina.toUpperCase().trim());
    if (row.data_entrada) {
      const d = new Date(row.data_entrada);
      if (d >= umAnoAtras) h.rec++;
    }
  }
  const result: Record<string, { qtd: number; fech: number; vol: number; disc: number; rec: number }> = {};
  for (const [cli, h] of Object.entries(map)) {
    result[cli] = { qtd: h.qtd, fech: h.fech, vol: h.vol, disc: Math.max(h.discs.size, 1), rec: h.rec };
  }
  return result;
}

/** Calcula score ABC para um PropostaSupabase usando o mapa H pré-construído */
export function calcularScoreComHMap(
  p: { cliente: string | null; valor_orcado: number | null },
  H: ReturnType<typeof buildHMap>
): { pts: number; classe: PrioridadeABC } {
  const cli = (p.cliente || '').toUpperCase().trim();
  const h = H[cli] ?? { qtd: 1, fech: 0, vol: 0, disc: 1, rec: 0 };
  const taxa = h.qtd > 0 ? h.fech / h.qtd : 0;
  const val = p.valor_orcado ?? 0;

  const raw =
    (h.qtd >= 12 ? 2 : h.qtd >= 5 ? 1 : 0) +
    (taxa >= 0.4 ? 2 : taxa >= 0.15 ? 1 : 0) +
    (h.vol >= 10_000_000 ? 2 : h.vol >= 1_000_000 ? 1 : 0) +
    (h.rec >= 4 ? 2 : h.rec >= 1 ? 1 : 0) +
    (h.disc >= 4 ? 2 : h.disc >= 2 ? 1 : 0) +
    (val >= 5_000_000 ? 2 : val >= 300_000 ? 1 : 0);

  const pts = Math.round((raw / 12) * 10);
  const classe: PrioridadeABC = pts >= 7 ? 'A' : pts >= 4 ? 'B' : 'C';
  return { pts, classe };
}

// ── Compatibilidade retroativa ────────────────────────────────────────────────

export interface ScoreABC {
  score: number;
  classe: PrioridadeABC;
}

/** @deprecated Use calcularScoreHistoricoABC */
export function calcularScoreABC(orc: OrcamentoCard): ScoreABC | null {
  if (orc.resultadoComercial !== 'em_andamento') return null;
  const pontosChance: Record<string, number>     = { alta: 5, media: 3, baixa: 1 };
  const pontosEstrategico: Record<string, number> = { alto: 3, medio: 2, baixo: 1 };
  const pontosPrazo: Record<string, number>       = { alta: 2, media: 1, baixa: 0 };
  const score =
    (pontosChance[orc.chanceFechamento ?? ''] ?? 0) +
    (pontosEstrategico[orc.valorEstrategico ?? ''] ?? 0) +
    (pontosPrazo[orc.urgencia ?? ''] ?? 0);
  const classe: PrioridadeABC = score >= 8 ? 'A' : score >= 5 ? 'B' : 'C';
  return { score, classe };
}

export type Prioridade = 'alta' | 'media' | 'baixa';

export function calcularPrioridade(orc: OrcamentoCard): Prioridade | null {
  const abc = calcularScoreABC(orc);
  if (!abc) return null;
  if (abc.classe === 'A') return 'alta';
  if (abc.classe === 'B') return 'media';
  return 'baixa';
}

export const PRIORIDADE_CONFIG: Record<
  Prioridade,
  { label: string; bg: string; text: string; dot: string }
> = {
  alta:  { label: 'Alta',  bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-500' },
  media: { label: 'Média', bg: 'bg-amber-400/10',   text: 'text-amber-400',   dot: 'bg-amber-400'   },
  baixa: { label: 'Baixa', bg: 'bg-red-400/10',     text: 'text-red-400',     dot: 'bg-red-400'     },
};
