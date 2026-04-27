import type { OrcamentoSupabase } from '../../infrastructure/supabase/orcamentosRepository';

// ── Temperatura ──────────────────────────────────────────────────────────────

export type Temperatura = 'quente' | 'morno' | 'frio' | 'congelado';

export interface TemperaturaConfig {
  label: string;
  emoji: string;
  dias: number;        // limiar máximo de dias sem contato
  cor: string;        // cor primária (Tailwind)
  bgCard: string;
  borda: string;
  badgeCls: string;
  barCls: string;
  glowCls: string;
}

export const TEMPERATURA_CONFIG: Record<Temperatura, TemperaturaConfig> = {
  quente:    { label: 'Quente',    emoji: '🔥', dias: 3,  cor: 'text-orange-600',  bgCard: 'bg-orange-50/80',  borda: 'border-orange-300', badgeCls: 'bg-orange-500 text-white', barCls: 'from-orange-500 to-red-500',    glowCls: 'shadow-orange-200' },
  morno:     { label: 'Morno',     emoji: '🟡', dias: 7,  cor: 'text-yellow-600',  bgCard: 'bg-yellow-50/80',  borda: 'border-yellow-300', badgeCls: 'bg-yellow-400 text-slate-800', barCls: 'from-yellow-400 to-orange-400', glowCls: 'shadow-yellow-200' },
  frio:      { label: 'Frio',      emoji: '🧊', dias: 14, cor: 'text-sky-600',     bgCard: 'bg-sky-50/80',     borda: 'border-sky-300',    badgeCls: 'bg-sky-400 text-white',    barCls: 'from-sky-400 to-blue-500',    glowCls: 'shadow-sky-200' },
  congelado: { label: 'Congelado', emoji: '❄️', dias: 999,cor: 'text-indigo-600',  bgCard: 'bg-indigo-50/80',  borda: 'border-indigo-300', badgeCls: 'bg-indigo-500 text-white', barCls: 'from-indigo-500 to-purple-600', glowCls: 'shadow-indigo-200' },
};

export function calcularTemperatura(orc: any): { temp: Temperatura; diasSemContato: number; pct: number } {
  const hoje = new Date();
  
  // Suporta tanto snake_case (Supabase) quanto camelCase (Contexto/Mock)
  const dataProx = orc.data_proxima_acao || orc.dataProximaAcao;
  const dataAtua = orc.atualizado_em || orc.ultima_interacao || orc.ultimaInteracao;
  const dataCria = orc.criado_em || orc.criadoEm;

  const dates = [
    dataProx ? new Date(dataProx).getTime() : 0,
    dataAtua ? new Date(dataAtua).getTime() : 0,
    dataCria ? new Date(dataCria).getTime() : 0,
  ];
  const maxTime = Math.max(...dates);
  const dataRef = new Date(maxTime || Date.now());

  const diasSemContato = Math.floor((hoje.getTime() - dataRef.getTime()) / (1000 * 60 * 60 * 24));

  let temp: Temperatura;
  if (diasSemContato < 3)  temp = 'quente';
  else if (diasSemContato < 7)  temp = 'morno';
  else if (diasSemContato < 14) temp = 'frio';
  else temp = 'congelado';

  // pct de "calor" restante (100% = recém atualizado, 0% = 14+ dias)
  const pct = Math.max(0, Math.min(100, 100 - (diasSemContato / 14) * 100));

  return { temp, diasSemContato, pct };
}

// ── Vida Útil ────────────────────────────────────────────────────────────────

export function calcularVidaUtil(orc: any): { pctRestante: number; diasRestantes: number; total: number; critico: boolean } {
  const dataIn = orc.data_entrada || orc.dataBase || orc.criado_em || orc.criadoEm;
  const dataLim = orc.data_limite || orc.dataLimite;

  const dataInicio = new Date(dataIn || new Date());
  const PRAZO_DIAS = 30;
  const dataFim = dataLim
    ? new Date(dataLim)
    : new Date(dataInicio.getTime() + PRAZO_DIAS * 86400000);

  const total = Math.max(1, (dataFim.getTime() - dataInicio.getTime()) / 86400000);
  const consumido = (new Date().getTime() - dataInicio.getTime()) / 86400000;
  let diasRestantes = Math.ceil((dataFim.getTime() - new Date().getTime()) / 86400000);
  
  // Impede que fique negativo no visual se já passou do prazo
  const diasRestantesVisual = Math.max(0, diasRestantes); 
  const pctRestante = Math.max(0, Math.min(100, ((total - consumido) / total) * 100));
  const critico = pctRestante < 30 || diasRestantes < 0;

  return { pctRestante, diasRestantes: diasRestantesVisual, total, critico };
}

// ── Energia do Vendedor ──────────────────────────────────────────────────────

export const PONTOS_ATIVIDADE: Record<string, number> = {
  orcamento_criado:   10,
  etapa_entrada:      5,
  etapa_docs:         5,
  etapa_analise:      10,
  etapa_levantamento: 10,
  etapa_cotacao:      15,
  etapa_montagem:     15,
  etapa_revisao:      15,
  orcamento_enviado:  20,
  followup_realizado: 15,
  etapa_negociacao:   20,
  contrato_fechado:   50,
};

export const LABEL_ATIVIDADE: Record<string, string> = {
  orcamento_criado:   'Orçamento Criado',
  etapa_entrada:      'Funil: Entrada da Oportunidade',
  etapa_docs:         'Funil: Aguardando Documentos',
  etapa_analise:      'Funil: Análise Inicial',
  etapa_levantamento: 'Funil: Levantamento',
  etapa_cotacao:      'Funil: Cotação',
  etapa_montagem:     'Funil: Montagem do Orçamento',
  etapa_revisao:      'Funil: Revisão Interna',
  orcamento_enviado:  'Proposta Enviada 🚀',
  followup_realizado: 'Follow-up Realizado',
  etapa_negociacao:   'Negociação Iniciada 🤝',
  contrato_fechado:   'Contrato Fechado! 🎉',
};

export function calcularEnergia(pontosGanhos: number): number {
  const agora = new Date();
  const inicioComercial = new Date(agora);
  inicioComercial.setHours(8, 0, 0, 0);

  const horasPassadas = Math.max(0, Math.min(10,
    (agora.getTime() - inicioComercial.getTime()) / 3600000
  ));

  const energiaBase = 100 - (horasPassadas * 5);
  return Math.max(0, Math.min(100, Math.round(energiaBase + pontosGanhos)));
}

// ── Score de Saúde da Carteira ────────────────────────────────────────────────

export interface VendedorStats {
  nome: string;
  total: number;
  fechadas: number;
  quentes: number;
  mornos: number;
  frios: number;
  congelados: number;
  taxaConversao: number;
  pctQuentes: number;
  energia: number;
  score: number;          // 0–100
  posicaoAnterior?: number;
  streakDias: number;
}

export function calcularScore(stats: Omit<VendedorStats, 'score'>): number {
  // Score = taxa conversão (40%) + % leads quentes (40%) + energia (20%)
  return Math.round(
    (stats.taxaConversao * 0.4) +
    (stats.pctQuentes * 0.4) +
    (stats.energia * 0.2)
  );
}

export function calcularVendedorStats(
  vendedor: string,
  orcamentos: OrcamentoSupabase[],
  energia: number
): VendedorStats {
  const vendedorBase = vendedor.toUpperCase().split(' ')[0];
  const meus = orcamentos.filter(o => {
    const rNome = (o.responsavel || '').toUpperCase();
    return rNome === vendedor.toUpperCase() || rNome.startsWith(vendedorBase) || vendedorBase.startsWith(rNome.split(' ')[0]);
  });
  const fechadas = meus.filter(o => o.status === 'FECHADO').length;

  const tempers = meus
    .filter(o => !['FECHADO', 'NÃO FECHADO', 'CANCELADO', 'DECLINADO'].includes(o.status || ''))
    .map(o => calcularTemperatura(o).temp);

  const quentes   = tempers.filter(t => t === 'quente').length;
  const mornos    = tempers.filter(t => t === 'morno').length;
  const frios     = tempers.filter(t => t === 'frio').length;
  const congelados = tempers.filter(t => t === 'congelado').length;

  const taxaConversao = meus.length > 0 ? (fechadas / meus.length) * 100 : 0;
  const ativos = quentes + mornos + frios + congelados;
  const pctQuentes = ativos > 0 ? (quentes / ativos) * 100 : 0;

  const partial = { nome: vendedor, total: meus.length, fechadas, quentes, mornos, frios, congelados, taxaConversao, pctQuentes, energia, score: 0, streakDias: 0 };
  return { ...partial, score: calcularScore(partial) };
}

// ── Cores utilitárias ─────────────────────────────────────────────────────────

export function vidaUtilCor(pct: number): string {
  if (pct > 60) return 'from-emerald-500 to-green-400';
  if (pct > 30) return 'from-yellow-500 to-amber-400';
  return 'from-red-500 to-rose-400';
}

export function energiaCor(energia: number): string {
  if (energia > 60) return 'from-emerald-500 to-cyan-400';
  if (energia > 30) return 'from-yellow-500 to-amber-400';
  if (energia > 0)  return 'from-red-500 to-orange-400';
  return 'from-gray-400 to-gray-500';
}

export function scoreCor(score: number): string {
  if (score >= 70) return 'text-emerald-600';
  if (score >= 40) return 'text-amber-600';
  return 'text-red-500';
}

export function scoreBg(score: number): string {
  if (score >= 70) return 'bg-emerald-50 border-emerald-200';
  if (score >= 40) return 'bg-amber-50 border-amber-200';
  return 'bg-red-50 border-red-200';
}
