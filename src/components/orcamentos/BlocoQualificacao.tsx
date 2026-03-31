import { useState } from 'react';
import { Edit2, Save, X, Target } from 'lucide-react';
import type { OrcamentoCard, AtualizarQualificacaoInput } from '../../context/NovoOrcamentoContext';
import type {
  NivelAltoMedioBaixo,
  NivelAltaMediaBaixa,
  SimNao,
} from '../../domain/value-objects/QualificacaoOportunidade';
import {
  NIVEL_AMB_LABELS,
  NIVEL_AMB_CORES,
  NIVEL_AMAB_LABELS,
  NIVEL_AMAB_CORES,
} from '../../domain/value-objects/QualificacaoOportunidade';
import { calcularScoreABC, PRIORIDADE_ABC_CONFIG } from '../../utils/prioridade';

interface Props {
  orc: OrcamentoCard;
  onAtualizar: (dados: AtualizarQualificacaoInput) => void;
}

interface FormQual {
  fitTecnico: NivelAltoMedioBaixo | '';
  clarezaDocumentos: NivelAltaMediaBaixa | '';
  urgencia: NivelAltaMediaBaixa | '';
  chanceFechamento: NivelAltaMediaBaixa | '';
  valorEstrategico: NivelAltoMedioBaixo | '';
  clienteEstrategico: SimNao | '';
  prazoResposta: string;
  observacaoComercial: string;
}

const selectCls =
  'w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-slate-700';

const labelCls = 'block text-xs text-slate-400 mb-1';

function BadgeAMB({ nivel }: { nivel?: NivelAltoMedioBaixo }) {
  if (!nivel) return <span className="text-xs text-slate-300">—</span>;
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${NIVEL_AMB_CORES[nivel]}`}>
      {NIVEL_AMB_LABELS[nivel]}
    </span>
  );
}

function BadgeAMAB({ nivel }: { nivel?: NivelAltaMediaBaixa }) {
  if (!nivel) return <span className="text-xs text-slate-300">—</span>;
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${NIVEL_AMAB_CORES[nivel]}`}>
      {NIVEL_AMAB_LABELS[nivel]}
    </span>
  );
}

function BadgeSimNao({ valor }: { valor?: SimNao }) {
  if (!valor) return <span className="text-xs text-slate-300">—</span>;
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${
        valor === 'sim' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
      }`}
    >
      {valor === 'sim' ? 'Sim' : 'Não'}
    </span>
  );
}

function formatarData(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR');
}

function BadgeABC({ orc }: { orc: OrcamentoCard }) {
  const resultado = calcularScoreABC(orc);
  if (!resultado) return null;
  const cfg = PRIORIDADE_ABC_CONFIG[resultado.classe];
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${cfg.bg} ${cfg.border}`}>
      <span className={`text-lg font-bold leading-none ${cfg.text}`}>{resultado.classe}</span>
      <div>
        <p className="text-xs text-slate-400 leading-none mb-0.5">Score</p>
        <p className={`text-sm font-semibold leading-none ${cfg.text}`}>
          {resultado.score}<span className="text-xs font-normal text-slate-400">/10</span>
        </p>
      </div>
    </div>
  );
}

export function BlocoQualificacao({ orc, onAtualizar }: Props) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState<FormQual>({
    fitTecnico: orc.fitTecnico ?? '',
    clarezaDocumentos: orc.clarezaDocumentos ?? '',
    urgencia: orc.urgencia ?? '',
    chanceFechamento: orc.chanceFechamento ?? '',
    valorEstrategico: orc.valorEstrategico ?? '',
    clienteEstrategico: orc.clienteEstrategico ?? '',
    prazoResposta: orc.prazoResposta ?? '',
    observacaoComercial: orc.observacaoComercial ?? '',
  });

  function iniciarEdicao() {
    setForm({
      fitTecnico: orc.fitTecnico ?? '',
      clarezaDocumentos: orc.clarezaDocumentos ?? '',
      urgencia: orc.urgencia ?? '',
      chanceFechamento: orc.chanceFechamento ?? '',
      valorEstrategico: orc.valorEstrategico ?? '',
      clienteEstrategico: orc.clienteEstrategico ?? '',
      prazoResposta: orc.prazoResposta ?? '',
      observacaoComercial: orc.observacaoComercial ?? '',
    });
    setEditando(true);
  }

  function cancelar() {
    setEditando(false);
  }

  function salvar() {
    const input: AtualizarQualificacaoInput = {};
    if (form.fitTecnico) input.fitTecnico = form.fitTecnico;
    if (form.clarezaDocumentos) input.clarezaDocumentos = form.clarezaDocumentos;
    if (form.urgencia) input.urgencia = form.urgencia;
    if (form.chanceFechamento) input.chanceFechamento = form.chanceFechamento;
    if (form.valorEstrategico) input.valorEstrategico = form.valorEstrategico;
    if (form.clienteEstrategico) input.clienteEstrategico = form.clienteEstrategico;
    input.prazoResposta = form.prazoResposta || undefined;
    input.observacaoComercial = form.observacaoComercial.trim() || undefined;
    onAtualizar(input);
    setEditando(false);
  }

  const semQualificacao =
    !orc.fitTecnico &&
    !orc.clarezaDocumentos &&
    !orc.urgencia &&
    !orc.chanceFechamento &&
    !orc.valorEstrategico &&
    !orc.clienteEstrategico;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target size={14} className="text-slate-400" />
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Qualificação
          </h3>
        </div>
        {!editando ? (
          <button
            onClick={iniciarEdicao}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
          >
            <Edit2 size={11} />
            Editar
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={cancelar}
              className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={11} />
              Cancelar
            </button>
            <button
              onClick={salvar}
              className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2.5 py-1 rounded-md hover:bg-blue-700 transition-colors"
            >
              <Save size={11} />
              Salvar
            </button>
          </div>
        )}
      </div>

      {/* Score ABC — sempre visível no topo */}
      {!semQualificacao && !editando && (
        <div className="mb-4">
          <BadgeABC orc={orc} />
        </div>
      )}

      {/* Modo visualização */}
      {!editando && (
        <>
          {semQualificacao ? (
            <div className="text-center py-4">
              <p className="text-xs text-slate-400">Qualificação não preenchida.</p>
              <button
                onClick={iniciarEdicao}
                className="mt-2 text-xs text-blue-600 hover:underline"
              >
                Preencher agora
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {/* Linha 1: Chance fechamento + Valor estratégico */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Chance fechamento</p>
                  <BadgeAMAB nivel={orc.chanceFechamento} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Valor estratégico</p>
                  <BadgeAMB nivel={orc.valorEstrategico} />
                </div>
              </div>

              {/* Linha 2: Urgência / Prazo + Fit técnico */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Urgência / Prazo</p>
                  <BadgeAMAB nivel={orc.urgencia} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Fit técnico</p>
                  <BadgeAMB nivel={orc.fitTecnico} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Clareza docs</p>
                  <BadgeAMAB nivel={orc.clarezaDocumentos} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Estratégico</p>
                  <BadgeSimNao valor={orc.clienteEstrategico} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Prazo resposta</p>
                  <span className="text-xs font-medium text-slate-700">
                    {formatarData(orc.prazoResposta)}
                  </span>
                </div>
              </div>

              {orc.observacaoComercial && (
                <div className="pt-2 border-t border-slate-100">
                  <p className="text-xs text-slate-400 mb-1">Observação comercial</p>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {orc.observacaoComercial}
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modo edição */}
      {editando && (
        <div className="space-y-3">
          {/* Score preview em tempo real */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <p className="text-xs text-slate-400 mb-1.5">Score ABC (prévia)</p>
            <BadgeABC orc={{
              ...orc,
              chanceFechamento: (form.chanceFechamento || undefined) as typeof orc.chanceFechamento,
              valorEstrategico: (form.valorEstrategico || undefined) as typeof orc.valorEstrategico,
              urgencia: (form.urgencia || undefined) as typeof orc.urgencia,
            }} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Chance fechamento</label>
              <select
                value={form.chanceFechamento}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    chanceFechamento: e.target.value as NivelAltaMediaBaixa | '',
                  }))
                }
                className={selectCls}
              >
                <option value="">—</option>
                <option value="alta">Alta (+5)</option>
                <option value="media">Média (+3)</option>
                <option value="baixa">Baixa (+1)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Valor estratégico</label>
              <select
                value={form.valorEstrategico}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    valorEstrategico: e.target.value as NivelAltoMedioBaixo | '',
                  }))
                }
                className={selectCls}
              >
                <option value="">—</option>
                <option value="alto">Alto (+3)</option>
                <option value="medio">Médio (+2)</option>
                <option value="baixo">Baixo (+1)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Urgência / Prazo</label>
              <select
                value={form.urgencia}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    urgencia: e.target.value as NivelAltaMediaBaixa | '',
                  }))
                }
                className={selectCls}
              >
                <option value="">—</option>
                <option value="alta">Alta — Prazo curto (+2)</option>
                <option value="media">Média — Prazo médio (+1)</option>
                <option value="baixa">Baixa — Prazo longo (+0)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Fit técnico</label>
              <select
                value={form.fitTecnico}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    fitTecnico: e.target.value as NivelAltoMedioBaixo | '',
                  }))
                }
                className={selectCls}
              >
                <option value="">—</option>
                <option value="alto">Alto</option>
                <option value="medio">Médio</option>
                <option value="baixo">Baixo</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Clareza docs</label>
              <select
                value={form.clarezaDocumentos}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    clarezaDocumentos: e.target.value as NivelAltaMediaBaixa | '',
                  }))
                }
                className={selectCls}
              >
                <option value="">—</option>
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Cliente estratégico</label>
              <select
                value={form.clienteEstrategico}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    clienteEstrategico: e.target.value as SimNao | '',
                  }))
                }
                className={selectCls}
              >
                <option value="">—</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
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
              onChange={(e) =>
                setForm((p) => ({ ...p, observacaoComercial: e.target.value }))
              }
              rows={3}
              placeholder="Notas sobre o cliente, contexto da oportunidade..."
              className="w-full border border-slate-200 rounded-md px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
