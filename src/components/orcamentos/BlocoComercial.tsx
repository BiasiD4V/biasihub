import { useState } from 'react';
import { DollarSign, Calendar, Activity, CheckCircle, XCircle } from 'lucide-react';
import type { OrcamentoCard } from '../../context/NovoOrcamentoContext';
import type { EtapaFunil } from '../../domain/value-objects/EtapaFunil';
import { ETAPA_LABELS, ETAPA_CORES, ORDEM_FUNIL } from '../../domain/value-objects/EtapaFunil';
import { RESULTADO_LABELS, RESULTADO_CORES } from '../../domain/value-objects/ResultadoComercial';
import { ModalFechamentoComercial, type DadosFechamento } from './ModalFechamentoComercial';
import { ModalConfirmarMudancaEtapa } from './ModalConfirmarMudancaEtapa';

interface BlocoComercialProps {
  orc: OrcamentoCard;
  onMudarEtapa: (etapaNova: EtapaFunil, observacao?: string) => void;
  onAtualizarValor: (valor: number) => void;
  onFechamento: (dados: DadosFechamento) => void;
}

function formatarData(dateStr?: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR');
}

function formatarValor(valor?: number): string {
  if (!valor) return '—';
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function BlocoComercial({ orc, onMudarEtapa, onAtualizarValor, onFechamento }: BlocoComercialProps) {
  const [modalFechamento, setModalFechamento] = useState(false);
  const [tipoFechamento, setTipoFechamento] = useState<'ganho' | 'perdido'>('ganho');
  const [modalConfirmacao, setModalConfirmacao] = useState(false);
  const [etapaSelecionada, setEtapaSelecionada] = useState<EtapaFunil | null>(null);

  const corEtapa = ETAPA_CORES[orc.etapaFunil];
  const corResultado = RESULTADO_CORES[orc.resultadoComercial];
  const fechado = orc.resultadoComercial !== 'em_andamento';

  function handleMudarEtapa(e: React.ChangeEvent<HTMLSelectElement>) {
    const etapaNova = e.target.value as EtapaFunil;
    if (etapaNova !== orc.etapaFunil) {
      setEtapaSelecionada(etapaNova);
      setModalConfirmacao(true);
    }
  }

  function handleConfirmarMudanca(observacao: string) {
    if (etapaSelecionada) {
      onMudarEtapa(etapaSelecionada, observacao);
      setModalConfirmacao(false);
      setEtapaSelecionada(null);
    }
  }

  function handleValorChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseFloat(e.target.value.replace(/\D/g, '')) / 100;
    if (!isNaN(val)) onAtualizarValor(val);
  }

  function abrirFechamento(tipo: 'ganho' | 'perdido') {
    setTipoFechamento(tipo);
    setModalFechamento(true);
  }

  function confirmarFechamento(dados: DadosFechamento) {
    onFechamento(dados);
    setModalFechamento(false);
  }

  return (
    <>
      <div
        className={`bg-white rounded-xl border shadow-sm p-5 ${
          orc.resultadoComercial === 'ganho'
            ? 'border-green-200 bg-green-50/30'
            : orc.resultadoComercial === 'perdido'
            ? 'border-red-200 bg-red-50/30'
            : 'border-slate-200'
        }`}
      >
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
          Comercial
        </h3>

        <div className="space-y-4">
          {/* Resultado comercial — destaque quando fechado */}
          {fechado ? (
            <div
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${corResultado.bg}`}
            >
              {orc.resultadoComercial === 'ganho' ? (
                <CheckCircle size={18} className="text-green-600 flex-shrink-0" />
              ) : (
                <XCircle size={18} className="text-red-500 flex-shrink-0" />
              )}
              <div>
                <p className="text-xs text-slate-500">Resultado</p>
                <p className={`text-sm font-bold ${corResultado.text}`}>
                  {RESULTADO_LABELS[orc.resultadoComercial]}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Activity size={14} className="text-blue-500 flex-shrink-0" />
              <div>
                <p className="text-xs text-slate-400">Resultado</p>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded-full ${corResultado.bg} ${corResultado.text}`}
                >
                  {RESULTADO_LABELS[orc.resultadoComercial]}
                </span>
              </div>
            </div>
          )}

          {/* Etapa do funil — somente leitura quando fechado */}
          <div>
            <p className="text-xs text-slate-400 mb-1.5">Etapa do funil</p>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex text-xs font-medium px-2.5 py-1 rounded-full ${corEtapa.bg} ${corEtapa.text}`}
              >
                {ETAPA_LABELS[orc.etapaFunil]}
              </span>
            </div>
            {!fechado && (
              <select
                value={orc.etapaFunil}
                onChange={handleMudarEtapa}
                className="mt-2 w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700"
              >
                {ORDEM_FUNIL.filter((e) => e !== 'pos_venda').map((etapa) => (
                  <option key={etapa} value={etapa}>
                    {ETAPA_LABELS[etapa]}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Valor da proposta */}
          <div className="flex items-center gap-3">
            <DollarSign size={14} className="text-slate-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-slate-400 mb-1">Valor da proposta</p>
              {fechado ? (
                <p className="text-sm font-semibold text-slate-800">
                  {formatarValor(orc.valorProposta)}
                </p>
              ) : (
                <>
                  <input
                    type="text"
                    defaultValue={orc.valorProposta ? String(Math.round(orc.valorProposta * 100)) : ''}
                    onBlur={handleValorChange}
                    placeholder="R$ 0,00"
                    className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {orc.valorProposta && (
                    <p className="text-xs text-slate-600 font-medium mt-1">
                      {formatarValor(orc.valorProposta)}
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Datas */}
          {(orc.dataEnvioProposta || orc.dataFechamento) && (
            <div className="pt-1 border-t border-slate-100 space-y-2">
              {orc.dataEnvioProposta && (
                <div className="flex items-center gap-3">
                  <Calendar size={14} className="text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Proposta enviada</p>
                    <p className="text-xs font-medium text-slate-700">
                      {formatarData(orc.dataEnvioProposta)}
                    </p>
                  </div>
                </div>
              )}
              {orc.dataFechamento && (
                <div className="flex items-center gap-3">
                  <Calendar size={14} className="text-slate-400 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400">Data de fechamento</p>
                    <p className="text-xs font-semibold text-slate-700">
                      {formatarData(orc.dataFechamento)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Motivo de perda */}
          {orc.resultadoComercial === 'perdido' && orc.motivoPerda && (
            <div className="pt-1 border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-1">Motivo da perda</p>
              <span className="bg-red-50 text-red-700 text-xs font-medium px-2.5 py-1 rounded-full">
                {orc.motivoPerda}
              </span>
            </div>
          )}

          {/* Botões de fechamento — somente quando em andamento */}
          {!fechado && (
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <button
                onClick={() => abrirFechamento('ganho')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-sm"
              >
                <CheckCircle size={15} />
                Marcar como Ganho
              </button>
              <button
                onClick={() => abrirFechamento('perdido')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-lg transition-colors"
              >
                <XCircle size={15} />
                Marcar como Perdido
              </button>
            </div>
          )}
        </div>
      </div>

      <ModalFechamentoComercial
        aberto={modalFechamento}
        titulo={orc.titulo}
        resultado={tipoFechamento}
        onFechar={() => setModalFechamento(false)}
        onConfirmar={confirmarFechamento}
      />

      {etapaSelecionada && (
        <ModalConfirmarMudancaEtapa
          aberto={modalConfirmacao}
          onFechar={() => {
            setModalConfirmacao(false);
            setEtapaSelecionada(null);
          }}
          onConfirmar={handleConfirmarMudanca}
          etapaAtual={orc.etapaFunil}
          etapaNova={etapaSelecionada}
        />
      )}
    </>
  );
}
