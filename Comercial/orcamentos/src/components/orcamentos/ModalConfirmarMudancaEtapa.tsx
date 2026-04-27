import { useState } from 'react';
import { AlertCircle, Link, Loader2, ShieldAlert } from 'lucide-react';
import { Modal } from '../ui/Modal';
import type { EtapaFunil } from '../../domain/value-objects/EtapaFunil';
import { ETAPA_LABELS, ORDEM_FUNIL } from '../../domain/value-objects/EtapaFunil';
import type { PapelUsuario } from '../../domain/value-objects/PapelUsuario';

const PAPEIS_APROVADORES: PapelUsuario[] = ['dono', 'admin', 'gestor'];

interface ModalConfirmarMudancaEtapaProps {
  aberto: boolean;
  onFechar: () => void;
  onConfirmar: (observacao: string, arquivoUrl?: string, etapaAnteriorOverride?: EtapaFunil) => void;
  etapaAtual: EtapaFunil;
  etapaNova: EtapaFunil;
  jaExisteTransicao?: boolean;
  papelUsuario?: PapelUsuario;
}

export function ModalConfirmarMudancaEtapa({
  aberto,
  onFechar,
  onConfirmar,
  etapaAtual,
  etapaNova,
  jaExisteTransicao,
  papelUsuario,
}: ModalConfirmarMudancaEtapaProps) {
  const [observacao, setObservacao] = useState('');
  const [caminhoRede, setCaminhoRede] = useState('');
  const [etapaAnteriorSelecionada, setEtapaAnteriorSelecionada] = useState<EtapaFunil>(etapaAtual);
  const [enviando, setEnviando] = useState(false);

  const bloqueadoPorDuplicata = !!(jaExisteTransicao && etapaNova === 'proposta_enviada' && papelUsuario && !PAPEIS_APROVADORES.includes(papelUsuario));

  async function handleConfirmar() {
    if (!caminhoRede.trim()) return;

    setEnviando(true);
    try {
      const obs = observacao.trim() || undefined;
      const arquivoUrl = caminhoRede.trim();
      const override = etapaAnteriorSelecionada !== etapaAtual ? etapaAnteriorSelecionada : undefined;

      onConfirmar(obs || '', arquivoUrl, override);
      setObservacao('');
      setCaminhoRede('');
      setEtapaAnteriorSelecionada(etapaAtual);
    } finally {
      setEnviando(false);
    }
  }

  function fechar() {
    setObservacao('');
    setCaminhoRede('');
    setEtapaAnteriorSelecionada(etapaAtual);
    onFechar();
  }

  return (
    <Modal
      titulo="Mudar etapa do funil"
      aberto={aberto}
      onFechar={fechar}
      largura="md"
    >
      <div className="px-6 py-5">
        {/* Info de confirmação */}
        <div className="mb-5 space-y-3">
          {/* Etapa anterior (editável) */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">
              Etapa anterior
            </label>
            <select
              value={etapaAnteriorSelecionada}
              onChange={(e) => setEtapaAnteriorSelecionada(e.target.value as EtapaFunil)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700"
            >
              {ORDEM_FUNIL.filter((e) => e !== 'pos_venda' && e !== etapaNova).map((etapa) => (
                <option key={etapa} value={etapa}>
                  {ETAPA_LABELS[etapa]}
                </option>
              ))}
            </select>
          </div>

          {/* Etapa nova (somente leitura) */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 flex items-start gap-3">
            <AlertCircle size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-blue-700">
                <strong>{ETAPA_LABELS[etapaAnteriorSelecionada]}</strong> → <strong className="text-blue-900">{ETAPA_LABELS[etapaNova]}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Aviso de transição duplicada */}
        {jaExisteTransicao && (
          <div className={`mb-5 rounded-lg px-4 py-3 flex items-start gap-3 ${bloqueadoPorDuplicata ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
            <ShieldAlert size={18} className={`${bloqueadoPorDuplicata ? 'text-red-600' : 'text-amber-600'} flex-shrink-0 mt-0.5`} />
            <div>
              <p className={`text-sm font-semibold ${bloqueadoPorDuplicata ? 'text-red-900' : 'text-amber-900'}`}>
                {bloqueadoPorDuplicata ? 'Aprovação necessária' : 'Transição já registrada'}
              </p>
              <p className={`text-xs mt-1 ${bloqueadoPorDuplicata ? 'text-red-700' : 'text-amber-700'}`}>
                Já existe uma mudança de <strong>{ETAPA_LABELS[etapaAtual]}</strong> → <strong>{ETAPA_LABELS[etapaNova]}</strong> no histórico.
                {bloqueadoPorDuplicata
                  ? ' Somente Gestor, Admin ou Dono podem reenviar uma Proposta Enviada duplicada.'
                  : ' Tem certeza que deseja registrar novamente?'}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {/* Link ou caminho - OBRIGATÓRIO */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <Link size={14} className="text-blue-600" />
              Link ou caminho da pasta
              <span className="text-red-600 font-bold">*</span>
            </label>
            
            <input
              type="text"
              value={caminhoRede}
              onChange={(e) => setCaminhoRede(e.target.value)}
              placeholder="Ex: \\FILESERVER\COMERCIAL\ORC-2024-001"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono mb-2"
            />
            
            {!caminhoRede.trim() && (
              <p className="text-xs text-red-600 font-medium">
                ⚠️ Link ou caminho é obrigatório
              </p>
            )}
          </div>

          {/* Observação adicional */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-2">
              Observação (opcional)
            </label>
            <textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Aguardando retorno do cliente..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
            />
          </div>
        </div>

        {/* Botões */}
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={fechar}
            disabled={enviando}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={!caminhoRede.trim() || enviando || bloqueadoPorDuplicata}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {enviando ? <Loader2 size={14} className="animate-spin" /> : <Link size={14} />}
            {enviando ? 'Enviando...' : 'Confirmar mudança'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
