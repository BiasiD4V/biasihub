import { useState, useEffect } from 'react';
import { CheckCircle, XCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';

export interface DadosFechamentoGanho {
  resultado: 'ganho';
  dataFechamento: string;
  valorFechado: number;
  observacao?: string;
}

export interface DadosFechamentoPerdido {
  resultado: 'perdido';
  dataFechamento: string;
  motivoPerda: string;
  observacao?: string;
}

export type DadosFechamento = DadosFechamentoGanho | DadosFechamentoPerdido;

const MOTIVOS_PERDA = [
  'Preço',
  'Prazo',
  'Escopo',
  'Concorrente',
  'Cliente desistiu',
  'Outro',
] as const;

interface Props {
  aberto: boolean;
  titulo: string;
  resultado: 'ganho' | 'perdido';
  onFechar: () => void;
  onConfirmar: (dados: DadosFechamento) => void;
}

const inputCls =
  'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

export function ModalFechamentoComercial({
  aberto,
  titulo,
  resultado,
  onFechar,
  onConfirmar,
}: Props) {
  const [dataFechamento, setDataFechamento] = useState('');
  const [valorFechado, setValorFechado] = useState('');
  const [motivoPerda, setMotivoPerda] = useState('');
  const [observacao, setObservacao] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Reseta form ao abrir
  useEffect(() => {
    if (aberto) {
      setDataFechamento(new Date().toISOString().slice(0, 10));
      setValorFechado('');
      setMotivoPerda('');
      setObservacao('');
      setErro('');
    }
  }, [aberto]);

  function fechar() {
    setErro('');
    onFechar();
  }

  async function confirmar() {
    setErro('');

    if (!dataFechamento) {
      setErro('Informe a data de fechamento.');
      return;
    }

    if (resultado === 'ganho') {
      const valor = parseFloat(valorFechado.replace(',', '.'));
      if (!valorFechado || isNaN(valor) || valor <= 0) {
        setErro('Informe o valor fechado (maior que zero).');
        return;
      }
      setSalvando(true);
      await new Promise((r) => setTimeout(r, 300));
      onConfirmar({
        resultado: 'ganho',
        dataFechamento,
        valorFechado: valor,
        observacao: observacao.trim() || undefined,
      });
    } else {
      if (!motivoPerda) {
        setErro('Selecione o motivo da perda.');
        return;
      }
      setSalvando(true);
      await new Promise((r) => setTimeout(r, 300));
      onConfirmar({
        resultado: 'perdido',
        dataFechamento,
        motivoPerda,
        observacao: observacao.trim() || undefined,
      });
    }

    setSalvando(false);
  }

  const isGanho = resultado === 'ganho';
  const corHeader = isGanho ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200';
  const corBotao = isGanho
    ? 'bg-green-600 hover:bg-green-700'
    : 'bg-red-600 hover:bg-red-700';
  const tituloModal = isGanho ? 'Marcar como Ganho' : 'Marcar como Perdido';

  return (
    <Modal aberto={aberto} onFechar={fechar} titulo={tituloModal} largura="md">
      {/* Banner colorido */}
      <div className={`px-6 py-4 border-b ${corHeader} flex items-center gap-3`}>
        {isGanho ? (
          <CheckCircle size={20} className="text-green-600 flex-shrink-0" />
        ) : (
          <XCircle size={20} className="text-red-500 flex-shrink-0" />
        )}
        <div>
          <p className="text-sm font-semibold text-slate-800 truncate max-w-xs">{titulo}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {isGanho
              ? 'Preencha os dados do fechamento ganho.'
              : 'Preencha os dados do fechamento perdido.'}
          </p>
        </div>
      </div>

      <div className="px-6 py-5 space-y-4">
        {/* Erro */}
        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {erro}
          </div>
        )}

        {/* Data de fechamento */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Data de fechamento <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={dataFechamento}
            onChange={(e) => { setDataFechamento(e.target.value); setErro(''); }}
            className={inputCls}
          />
        </div>

        {/* Ganho: valor fechado */}
        {isGanho && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Valor fechado (R$) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={valorFechado}
              onChange={(e) => { setValorFechado(e.target.value); setErro(''); }}
              placeholder="Ex: 142500.00"
              className={inputCls}
            />
          </div>
        )}

        {/* Perdido: motivo */}
        {!isGanho && (
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Motivo da perda <span className="text-red-500">*</span>
            </label>
            <select
              value={motivoPerda}
              onChange={(e) => { setMotivoPerda(e.target.value); setErro(''); }}
              className={inputCls}
            >
              <option value="">Selecionar...</option>
              {MOTIVOS_PERDA.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        )}

        {/* Observação (opcional) */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1.5">
            Observação <span className="text-slate-400 font-normal">(opcional)</span>
          </label>
          <textarea
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            rows={3}
            placeholder={
              isGanho
                ? 'Ex: Contrato assinado. Início previsto para abril...'
                : 'Ex: Cliente optou por concorrente com menor prazo de entrega...'
            }
            className={`${inputCls} resize-none`}
          />
        </div>
      </div>

      {/* Rodapé */}
      <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
        <button
          onClick={fechar}
          disabled={salvando}
          className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={confirmar}
          disabled={salvando}
          className={`px-5 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-sm disabled:opacity-70 flex items-center gap-2 ${corBotao}`}
        >
          {salvando ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Salvando...
            </>
          ) : isGanho ? (
            'Confirmar ganho'
          ) : (
            'Confirmar perda'
          )}
        </button>
      </div>
    </Modal>
  );
}
