import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { useNovoOrcamento } from '../../context/NovoOrcamentoContext';
import type { TipoFollowUp } from '../../domain/entities/FollowUp';

interface ModalNovoFollowUpProps {
  aberto: boolean;
  onFechar: () => void;
  orcamentoId: string;
  onRegistrado?: (followUp: import('../../domain/entities/FollowUp').FollowUp) => void;
}

interface FormFollowUp {
  tipo: TipoFollowUp;
  data: string;         // 'YYYY-MM-DDTHH:mm'
  resumo: string;
  proximaAcao: string;
  dataProximaAcao: string;
}

const TIPOS: { valor: TipoFollowUp; label: string }[] = [
  { valor: 'ligacao', label: 'Ligação' },
  { valor: 'email', label: 'E-mail' },
  { valor: 'whatsapp', label: 'WhatsApp' },
  { valor: 'reuniao', label: 'Reunião' },
  { valor: 'observacao', label: 'Observação interna' },
];

function camposVazios(): FormFollowUp {
  return {
    tipo: 'ligacao',
    data: new Date().toISOString().slice(0, 16),
    resumo: '',
    proximaAcao: '',
    dataProximaAcao: '',
  };
}

export function ModalNovoFollowUp({ aberto, onFechar, orcamentoId, onRegistrado }: ModalNovoFollowUpProps) {
  const { usuario } = useAuth();
  const { adicionarFollowUp, atualizarProximaAcao } = useNovoOrcamento();
  const [form, setForm] = useState<FormFollowUp>(camposVazios);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  function resetar() {
    setForm(camposVazios());
    setErro('');
  }

  function fechar() {
    resetar();
    onFechar();
  }

  function set<K extends keyof FormFollowUp>(campo: K, valor: FormFollowUp[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setErro('');
  }

  async function confirmar() {
    if (!form.resumo.trim()) {
      setErro('O resumo da interação é obrigatório.');
      return;
    }
    if (!form.data) {
      setErro('A data da interação é obrigatória.');
      return;
    }

    setSalvando(true);
    await new Promise((r) => setTimeout(r, 300));

    const dataIso = new Date(form.data).toISOString();

    const novoFollowUp = {
      id: crypto.randomUUID(),
      orcamentoId,
      tipo: form.tipo,
      data: dataIso,
      responsavel: usuario?.nome ?? 'Paulo Confar',
      resumo: form.resumo.trim(),
      proximaAcao: form.proximaAcao.trim() || undefined,
      dataProximaAcao: form.dataProximaAcao || undefined,
    };

    if (onRegistrado) {
      onRegistrado(novoFollowUp);
    } else {
      adicionarFollowUp(novoFollowUp);
      if (form.proximaAcao.trim()) {
        atualizarProximaAcao(orcamentoId, form.proximaAcao.trim(), form.dataProximaAcao);
      }
    }

    setSalvando(false);
    fechar();
  }

  return (
    <Modal titulo="Registrar Interação" aberto={aberto} onFechar={fechar} largura="lg">
      <div className="px-6 py-5 space-y-5">
        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {erro}
          </div>
        )}

        {/* Tipo */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Tipo de interação <span className="text-red-500">*</span>
          </label>
          <select
            value={form.tipo}
            onChange={(e) => set('tipo', e.target.value as TipoFollowUp)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {TIPOS.map((t) => (
              <option key={t.valor} value={t.valor}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Data e hora */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Data e hora <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={form.data}
            onChange={(e) => set('data', e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Resumo */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Resumo <span className="text-red-500">*</span>
          </label>
          <textarea
            value={form.resumo}
            onChange={(e) => set('resumo', e.target.value)}
            rows={3}
            placeholder="Descreva o que foi tratado nesta interação..."
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Próxima ação */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Próxima ação{' '}
            <span className="text-slate-400 font-normal">(opcional)</span>
          </label>
          <input
            type="text"
            value={form.proximaAcao}
            onChange={(e) => set('proximaAcao', e.target.value)}
            placeholder="Ex: Enviar proposta revisada por e-mail"
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Data da próxima ação */}
        {form.proximaAcao.trim() && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Data da próxima ação
            </label>
            <input
              type="date"
              value={form.dataProximaAcao}
              onChange={(e) => set('dataProximaAcao', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {/* Rodapé */}
      <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
        <button
          onClick={fechar}
          disabled={salvando}
          className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={confirmar}
          disabled={salvando}
          className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm disabled:opacity-70 flex items-center gap-2"
        >
          {salvando ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Registrando...
            </>
          ) : (
            'Registrar'
          )}
        </button>
      </div>
    </Modal>
  );
}
