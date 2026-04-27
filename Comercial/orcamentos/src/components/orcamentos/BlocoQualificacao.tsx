import { useState, useEffect } from 'react';
import { Edit2, Save, X, TrendingUp } from 'lucide-react';
import type { OrcamentoCard, AtualizarQualificacaoInput } from '../../context/NovoOrcamentoContext';
import {
  buildHMap,
  calcularScoreComHMap,
  PRIORIDADE_ABC_CONFIG,
  type PrioridadeABC,
  type HistoricoSlim,
} from '../../utils/prioridade';
import { propostasRepository } from '../../infrastructure/supabase/propostasRepository';
import type {
  NivelAltoMedioBaixo,
  NivelAltaMediaBaixa,
} from '../../domain/value-objects/QualificacaoOportunidade';

interface Props {
  orc: OrcamentoCard;
  onAtualizar: (dados: AtualizarQualificacaoInput) => void;
}

interface FormQual {
  prazoResposta: string;
  observacaoComercial: string;
  urgencia: NivelAltaMediaBaixa | '';
  fitTecnico: NivelAltoMedioBaixo | '';
}

// ── Score bar ────────────────────────────────────────────────────────────────

function ScoreBar({ pts, classe }: { pts: number; classe: PrioridadeABC }) {
  const cfg = PRIORIDADE_ABC_CONFIG[classe];
  return (
    <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${cfg.bg}`}
        style={{ width: `${(pts / 10) * 100}%` }}
      />
    </div>
  );
}

// ── Critério chip ─────────────────────────────────────────────────────────────

function CriterioChip({ label, descricao, pts }: { label: string; descricao: string; pts: 0 | 1 | 2 }) {
  const color =
    pts === 2
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
      : pts === 1
      ? 'border-amber-400/30 bg-amber-400/10 text-amber-400'
      : 'border-white/10 bg-white/5 text-slate-500';
  return (
    <div className={`rounded-lg border px-3 py-2 ${color}`}>
      <div className="flex items-center justify-between gap-2 mb-0.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{label}</span>
        <span className="text-[10px] font-bold leading-none">+{pts}</span>
      </div>
      <p className="text-xs leading-none">{descricao}</p>
    </div>
  );
}

// ── Badge classe ──────────────────────────────────────────────────────────────

function BadgeClasse({ classe, pts }: { classe: PrioridadeABC; pts: number }) {
  const cfg = PRIORIDADE_ABC_CONFIG[classe];
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${cfg.bgAlpha} ${cfg.border}`}>
      <span className={`text-2xl font-black leading-none ${cfg.text}`}>{classe}</span>
      <div className="leading-none">
        <p className="text-[10px] text-slate-500 mb-0.5">Score</p>
        <p className={`text-sm font-bold ${cfg.text}`}>
          {pts}<span className="text-xs font-normal text-slate-500">/10</span>
        </p>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

const selectCls =
  'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500';
const labelCls = 'block text-[11px] text-slate-500 mb-1 font-medium uppercase tracking-wide';

export function BlocoQualificacao({ orc, onAtualizar }: Props) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<FormQual>({
    prazoResposta: orc.prazoResposta ?? '',
    observacaoComercial: orc.observacaoComercial ?? '',
    urgencia: orc.urgencia ?? '',
    fitTecnico: orc.fitTecnico ?? '',
  });
  const [hMap, setHMap] = useState<ReturnType<typeof buildHMap>>({});

  // Carrega histórico completo do Supabase para score correto
  useEffect(() => {
    propostasRepository.buscarTodosParaHistorico()
      .then((rows) => setHMap(buildHMap(rows as HistoricoSlim[])))
      .catch(console.error);
  }, []);

  // Score e dados históricos
  const { pts, classe } = calcularScoreComHMap(
    { cliente: orc.clienteNome, valor_orcado: orc.valorProposta ?? null },
    hMap
  );
  const cfg = PRIORIDADE_ABC_CONFIG[classe];
  const cli = (orc.clienteNome || '').toUpperCase().trim();
  const h = hMap[cli] ?? { qtd: 0, fech: 0, vol: 0, disc: 1, rec: 0 };
  const taxa = h.qtd > 0 ? h.fech / h.qtd : 0;
  const val = orc.valorProposta ?? 0;

  const criteriosList: { label: string; pts: 0 | 1 | 2; descricao: string }[] = [
    {
      label: 'Recorrência',
      pts: (h.qtd >= 12 ? 2 : h.qtd >= 5 ? 1 : 0) as 0 | 1 | 2,
      descricao: `${h.qtd} prop${h.qtd !== 1 ? 's' : ''}`,
    },
    {
      label: 'Conversão',
      pts: (taxa >= 0.4 ? 2 : taxa >= 0.15 ? 1 : 0) as 0 | 1 | 2,
      descricao: `${h.fech}/${h.qtd} fechados (${(taxa * 100).toFixed(0)}%)`,
    },
    {
      label: 'Vol. histórico',
      pts: (h.vol >= 10_000_000 ? 2 : h.vol >= 1_000_000 ? 1 : 0) as 0 | 1 | 2,
      descricao:
        h.vol >= 1_000_000
          ? `R$ ${(h.vol / 1_000_000).toFixed(1)}M`
          : h.vol >= 1_000
          ? `R$ ${(h.vol / 1_000).toFixed(0)}K`
          : `R$ ${h.vol.toFixed(0)}`,
    },
    {
      label: 'Ativ. recente',
      pts: (h.rec >= 4 ? 2 : h.rec >= 1 ? 1 : 0) as 0 | 1 | 2,
      descricao: `${h.rec} últ. 12m`,
    },
    {
      label: 'Escopo',
      pts: (h.disc >= 4 ? 2 : h.disc >= 2 ? 1 : 0) as 0 | 1 | 2,
      descricao: `${h.disc} disciplina${h.disc !== 1 ? 's' : ''}`,
    },
    {
      label: 'Valor ORC',
      pts: (val >= 5_000_000 ? 2 : val >= 300_000 ? 1 : 0) as 0 | 1 | 2,
      descricao:
        val >= 1_000_000
          ? `R$ ${(val / 1_000_000).toFixed(1)}M`
          : val >= 1_000
          ? `R$ ${(val / 1_000).toFixed(0)}K`
          : val > 0
          ? `R$ ${val.toFixed(0)}`
          : 'Sem valor',
    },
  ];

  const raw = criteriosList.reduce((s, c) => s + c.pts, 0);

  function iniciarEdicao() {
    setForm({
      prazoResposta: orc.prazoResposta ?? '',
      observacaoComercial: orc.observacaoComercial ?? '',
      urgencia: orc.urgencia ?? '',
      fitTecnico: orc.fitTecnico ?? '',
    });
    setEditando(true);
  }

  function cancelar() { setEditando(false); }

  function salvar() {
    const input: AtualizarQualificacaoInput = {};
    if (form.urgencia)   input.urgencia   = form.urgencia;
    if (form.fitTecnico) input.fitTecnico = form.fitTecnico;
    input.prazoResposta       = form.prazoResposta || undefined;
    input.observacaoComercial = form.observacaoComercial.trim() || undefined;
    onAtualizar(input);
    setEditando(false);
  }

  return (
    <div
      className={`rounded-2xl border bg-white/3 backdrop-blur-sm overflow-hidden border-l-[3px] transition-shadow shadow-lg ${cfg.border} ${cfg.glow}`}
      style={{ borderLeftColor: cfg.color }}
    >
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-slate-400" />
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Qualificação</h3>
        </div>
        {!editando ? (
          <button onClick={iniciarEdicao} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 transition-colors">
            <Edit2 size={11} /> Editar
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={cancelar} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors">
              <X size={11} /> Cancelar
            </button>
            <button onClick={salvar} className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2.5 py-1 rounded-md hover:bg-blue-500 transition-colors">
              <Save size={11} /> Salvar
            </button>
          </div>
        )}
      </div>

      {/* Score + barra */}
      <div className="px-5 pb-4">
        <div className="flex items-end justify-between mb-3">
          <BadgeClasse classe={classe} pts={pts} />
          <div className="text-right">
            <p className="text-[10px] text-slate-600 mb-0.5">Raw {raw}/12</p>
            <p className="text-[10px] text-slate-600">{h.fech}/{h.qtd} fechados</p>
          </div>
        </div>
        <ScoreBar pts={pts} classe={classe} />
      </div>

      {/* Grade de critérios */}
      <div className="px-5 pb-4">
        <div className="grid grid-cols-2 gap-2">
          {criteriosList.map((c) => (
            <CriterioChip key={c.label} label={c.label} descricao={c.descricao} pts={c.pts} />
          ))}
        </div>
      </div>

      {/* Campos qualitativos */}
      <div className="border-t border-white/5 px-5 py-4">
        {!editando ? (
          <div className="space-y-2.5">
            {(orc.urgencia || orc.fitTecnico) && (
              <div className="grid grid-cols-2 gap-3">
                {orc.urgencia && (
                  <div>
                    <p className="text-[10px] text-slate-600 mb-1 uppercase tracking-wide">Urgência</p>
                    <span className="text-xs text-slate-300 font-medium capitalize">{orc.urgencia}</span>
                  </div>
                )}
                {orc.fitTecnico && (
                  <div>
                    <p className="text-[10px] text-slate-600 mb-1 uppercase tracking-wide">Fit técnico</p>
                    <span className="text-xs text-slate-300 font-medium capitalize">{orc.fitTecnico}</span>
                  </div>
                )}
              </div>
            )}
            {orc.prazoResposta && (
              <div>
                <p className="text-[10px] text-slate-600 mb-1 uppercase tracking-wide">Prazo resposta</p>
                <span className="text-xs text-slate-300">
                  {new Date(orc.prazoResposta + 'T00:00:00').toLocaleDateString('pt-BR')}
                </span>
              </div>
            )}
            {orc.observacaoComercial && (
              <div>
                <p className="text-[10px] text-slate-600 mb-1 uppercase tracking-wide">Observação</p>
                <p className="text-xs text-slate-400 leading-relaxed">{orc.observacaoComercial}</p>
              </div>
            )}
            {!orc.urgencia && !orc.fitTecnico && !orc.prazoResposta && !orc.observacaoComercial && (
              <button onClick={iniciarEdicao} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                + Adicionar observações
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Urgência</label>
                <select
                  value={form.urgencia}
                  onChange={(e) => setForm((p) => ({ ...p, urgencia: e.target.value as NivelAltaMediaBaixa | '' }))}
                  className={selectCls}
                >
                  <option value="">—</option>
                  <option value="alta">Alta</option>
                  <option value="media">Média</option>
                  <option value="baixa">Baixa</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>Fit técnico</label>
                <select
                  value={form.fitTecnico}
                  onChange={(e) => setForm((p) => ({ ...p, fitTecnico: e.target.value as NivelAltoMedioBaixo | '' }))}
                  className={selectCls}
                >
                  <option value="">—</option>
                  <option value="alto">Alto</option>
                  <option value="medio">Médio</option>
                  <option value="baixo">Baixo</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Prazo resposta</label>
              <input
                type="date"
                value={form.prazoResposta}
                onChange={(e) => setForm((p) => ({ ...p, prazoResposta: e.target.value }))}
                className={selectCls}
              />
            </div>
            <div>
              <label className={labelCls}>Observação comercial</label>
              <textarea
                value={form.observacaoComercial}
                onChange={(e) => setForm((p) => ({ ...p, observacaoComercial: e.target.value }))}
                rows={3}
                placeholder="Contexto, riscos, oportunidades..."
                className={`${selectCls} resize-none`}
              />
            </div>
            <p className="text-[10px] text-slate-600 leading-relaxed">
              💡 Score ABC calculado automaticamente do histórico do cliente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
