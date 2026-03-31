import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import type { FornecedorSupabase } from '../../infrastructure/supabase/fornecedoresRepository';

interface ModalFornecedorProps {
  aberto: boolean;
  onFechar: () => void;
  onSalvar: (fornecedor: Omit<FornecedorSupabase, 'id' | 'criado_em' | 'atualizado_em'>) => Promise<void>;
  fornecedorEditando?: FornecedorSupabase | null;
  modoVisualizacao?: boolean;
}

interface FormFornecedor {
  codigo_erp: string;
  nome: string;
  cnpj: string;
  ie: string;
  endereco: string;
  municipio: string;
  uf: string;
  cep: string;
  telefone: string;
  tipo: string;
  avaliacao: string;
  ativo: boolean;
}

const ufs = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO',
  'MA','MT','MS','MG','PA','PB','PR','PE','PI',
  'RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

function formVazio(): FormFornecedor {
  return {
    codigo_erp: '',
    nome: '',
    cnpj: '',
    ie: '',
    endereco: '',
    municipio: '',
    uf: '',
    cep: '',
    telefone: '',
    tipo: '',
    avaliacao: '',
    ativo: true,
  };
}

export function ModalFornecedor({
  aberto,
  onFechar,
  onSalvar,
  fornecedorEditando,
  modoVisualizacao = false,
}: ModalFornecedorProps) {
  const [form, setForm] = useState<FormFornecedor>(formVazio);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (aberto) {
      setForm(
        fornecedorEditando
          ? {
              codigo_erp: fornecedorEditando.codigo_erp ?? '',
              nome: fornecedorEditando.nome,
              cnpj: fornecedorEditando.cnpj ?? '',
              ie: fornecedorEditando.ie ?? '',
              endereco: fornecedorEditando.endereco ?? '',
              municipio: fornecedorEditando.municipio ?? '',
              uf: fornecedorEditando.uf ?? '',
              cep: fornecedorEditando.cep ?? '',
              telefone: fornecedorEditando.telefone ?? '',
              tipo: fornecedorEditando.tipo ?? '',
              avaliacao: fornecedorEditando.avaliacao ?? '',
              ativo: fornecedorEditando.ativo,
            }
          : formVazio()
      );
      setErro('');
    }
  }, [aberto, fornecedorEditando]);

  function setCampo<K extends keyof FormFornecedor>(campo: K, valor: FormFornecedor[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setErro('');
  }

  const titulo = modoVisualizacao
    ? 'Visualizar Fornecedor'
    : fornecedorEditando
    ? 'Editar Fornecedor'
    : 'Novo Fornecedor';

  function fechar() {
    if (!salvando) {
      setErro('');
      onFechar();
    }
  }

  async function confirmar() {
    if (modoVisualizacao) {
      onFechar();
      return;
    }
    if (!form.nome.trim()) {
      setErro('Nome é obrigatório.');
      return;
    }

    setSalvando(true);
    try {
      await onSalvar({
        codigo_erp: form.codigo_erp.trim() || null,
        nome: form.nome.trim(),
        cnpj: form.cnpj.trim() || null,
        ie: form.ie.trim() || null,
        endereco: form.endereco.trim() || null,
        municipio: form.municipio.trim() || null,
        uf: form.uf || null,
        cep: form.cep.trim() || null,
        telefone: form.telefone.trim() || null,
        tipo: form.tipo.trim() || null,
        avaliacao: form.avaliacao.trim() || null,
        ativo: form.ativo,
        contato: form.nome.trim(),
      } as Omit<FornecedorSupabase, 'id' | 'criado_em' | 'atualizado_em'>);
      onFechar();
    } catch (err) {
      setErro('Erro ao salvar fornecedor.');
      console.error(err);
    } finally {
      setSalvando(false);
    }
  }

  const disabled = modoVisualizacao || salvando;

  return (
    <Modal titulo={titulo} aberto={aberto} onFechar={fechar} largura="xl">
      <div className="px-6 py-5">
        {erro && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {erro}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Código ERP</label>
            <input
              type="text"
              value={form.codigo_erp}
              onChange={(e) => setCampo('codigo_erp', e.target.value)}
              disabled={disabled}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nome *</label>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => setCampo('nome', e.target.value)}
              disabled={disabled}
              placeholder="Nome do fornecedor"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">CNPJ</label>
            <input
              type="text"
              value={form.cnpj}
              onChange={(e) => setCampo('cnpj', e.target.value)}
              disabled={disabled}
              placeholder="00.000.000/0000-00"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">IE</label>
            <input
              type="text"
              value={form.ie}
              onChange={(e) => setCampo('ie', e.target.value)}
              disabled={disabled}
              placeholder="Inscrição Estadual"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Endereço</label>
            <input
              type="text"
              value={form.endereco}
              onChange={(e) => setCampo('endereco', e.target.value)}
              disabled={disabled}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Município</label>
            <input
              type="text"
              value={form.municipio}
              onChange={(e) => setCampo('municipio', e.target.value)}
              disabled={disabled}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">UF</label>
            <select
              value={form.uf}
              onChange={(e) => setCampo('uf', e.target.value)}
              disabled={disabled}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Escolha...</option>
              {ufs.map((uf) => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">CEP</label>
            <input
              type="text"
              value={form.cep}
              onChange={(e) => setCampo('cep', e.target.value)}
              disabled={disabled}
              placeholder="00000-000"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Telefone</label>
            <input
              type="text"
              value={form.telefone}
              onChange={(e) => setCampo('telefone', e.target.value)}
              disabled={disabled}
              placeholder="(00) 00000-0000"
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
            <input
              type="text"
              value={form.tipo}
              onChange={(e) => setCampo('tipo', e.target.value)}
              disabled={disabled}
              placeholder="Ex: Forn., Distribuidor..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Avaliação</label>
            <input
              type="text"
              value={form.avaliacao}
              onChange={(e) => setCampo('avaliacao', e.target.value)}
              disabled={disabled}
              placeholder="Ex: Não avaliado, Ótimo, Bom..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={(e) => setCampo('ativo', e.target.checked)}
              disabled={disabled}
              className="accent-blue-600"
              id="ativo"
            />
            <label htmlFor="ativo" className="text-sm text-slate-600">Fornecedor ativo</label>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={fechar}
            disabled={salvando}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-60"
          >
            Fechar
          </button>
          {!modoVisualizacao && (
            <button
              onClick={confirmar}
              disabled={disabled}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors disabled:opacity-60"
            >
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
