import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { useAuth } from '../../context/AuthContext';
import { useNovoOrcamento } from '../../context/NovoOrcamentoContext';
import type { Pendencia } from '../../domain/entities/Pendencia';

interface ModalNovaPendenciaProps {
  aberto: boolean;
  onFechar: () => void;
  orcamentoId: string;
  onRegistrada?: (pendencia: Pendencia) => void;
}

interface FormPendencia {
  descricao: string;
  responsavel: string;
  prazo: string; // YYYY-MM-DD
}

function camposVazios(): FormPendencia {
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 7);
  return {
    descricao: '',
    responsavel: '',
    prazo: amanha.toISOString().slice(0, 10),
  };
}

export function ModalNovaPendencia({ aberto, onFechar, orcamentoId, onRegistrada }: ModalNovaPendenciaProps) {
  const { usuario } = useAuth();
  const { adicionarPendencia } = useNovoOrcamento();
  const [form, setForm] = useState<FormPendencia>(camposVazios());
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

  function set<K extends keyof FormPendencia>(campo: K, valor: FormPendencia[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setErro('');
  }

  async function confirmar() {
    if (!form.descricao.trim()) {
      setErro('A descrição da pendência é obrigatória.');
      return;
    }
    if (!form.prazo) {
      setErro('O prazo é obrigatório.');
      return;
    }

    setSalvando(true);
    await new Promise((r) => setTimeout(r, 300));

    const novaPendencia: Omit<Pendencia, 'id' | 'criadaEm'> = {
      orcamentoId,
      descricao: form.descricao.trim(),
      status: 'aberta',
      responsavel: form.responsavel.trim() || (usuario?.nome ?? 'Usuário'),
      prazo: form.prazo,
    };

    if (onRegistrada) {
      const completa: Pendencia = {
        ...novaPendencia,
        id: crypto.randomUUID(),
        criadaEm: new Date().toISOString(),
      };
      onRegistrada(completa);
    } else {
      adicionarPendencia(novaPendencia);
    }

    setSalvando(false);
    fechar();
  }

  return (
    <Modal titulo="Registrar Pendência" aberto={aberto} onFechar={fechar} largura="lg">
      <div className="px-6 py-5 space-y-5">
        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {erro}
          </div>
        )}

        {/* Descrição */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Descrição do pendência <span className="text-red-500">*</span>
          </label>
          <textarea
            value={form.descricao}
            onChange={(e) => set('descricao', e.target.value)}
            rows={3}
            placeholder="Descreva o que precisa ser resolvido..."
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {/* Responsável */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Responsável <span className="text-slate-400 font-normal">(opcional)</span>
          </label>
          <input
            type="text"
            value={form.responsavel}
            onChange={(e) => set('responsavel', e.target.value)}
            placeholder={usuario?.nome ?? 'Seu nome'}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Prazo */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Prazo <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={form.prazo}
            onChange={(e) => set('prazo', e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
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
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Registrando...
            </>
          ) : (
            'Registrar pendência'
          )}
        </button>
      </div>
    </Modal>
  );
}
