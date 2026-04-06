import { useState, useEffect } from 'react';
import { Search, Loader2, ArrowRight } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useClientes } from '../../context/ClientesContext';
import type { Cliente } from '../../domain/entities/Cliente';
import { SEGMENTOS_CLIENTE } from '../../domain/value-objects/SegmentoCliente';
import { buscarDadosCNPJ } from '../../infrastructure/supabase/clientesRepository';

const UFS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO',
  'MA','MT','MS','MG','PA','PB','PR','PE','PI',
  'RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

interface ModalClienteProps {
  aberto: boolean;
  onFechar: () => void;
  clienteEditando?: Cliente;
  modoVisualizacao?: boolean;
}

interface FormCliente {
  tipo: 'PF' | 'PJ';
  razaoSocial: string;
  nomeFantasia: string;
  cnpjCpf: string;
  segmento: string;
  ativo: boolean;
  contatoPrincipal: string;
  telefone: string;
  email: string;
  cidade: string;
  uf: string;
  endereco: string;
  bairro: string;
  cep: string;
  observacoes: string;
}

function formVazio(): FormCliente {
  return {
    tipo: 'PJ',
    razaoSocial: '',
    nomeFantasia: '',
    cnpjCpf: '',
    segmento: '',
    ativo: true,
    contatoPrincipal: '',
    telefone: '',
    email: '',
    cidade: '',
    uf: '',
    endereco: '',
    bairro: '',
    cep: '',
    observacoes: '',
  };
}

function clienteParaForm(c: Cliente): FormCliente {
  return {
    tipo: c.tipo,
    razaoSocial: c.razaoSocial,
    nomeFantasia: c.nomeFantasia ?? '',
    cnpjCpf: c.cnpjCpf,
    segmento: c.segmento,
    ativo: c.ativo,
    contatoPrincipal: c.contatoPrincipal ?? '',
    telefone: c.telefone ?? '',
    email: c.email ?? '',
    cidade: c.cidade ?? '',
    uf: c.uf ?? '',
    endereco: '',
    bairro: '',
    cep: '',
    observacoes: c.observacoes ?? '',
  };
}

const inputCls =
  'w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-50 disabled:text-slate-400';
const labelCls = 'block text-xs font-medium text-slate-600 mb-1';

export function ModalCliente({
  aberto,
  onFechar,
  clienteEditando,
  modoVisualizacao = false,
}: ModalClienteProps) {
  const { criarCliente, editarCliente } = useClientes();
  const [passo, setPasso] = useState<'cnpj' | 'form'>('cnpj');
  const [cnpjBusca, setCnpjBusca] = useState('');
  const [buscandoCNPJ, setBuscandoCNPJ] = useState(false);
  const [erroBusca, setErroBusca] = useState('');
  const [form, setForm] = useState<FormCliente>(formVazio);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (aberto) {
      setErro('');
      setErroBusca('');
      setCnpjBusca('');
      if (clienteEditando) {
        setForm(clienteParaForm(clienteEditando));
        setPasso('form');
      } else {
        setForm(formVazio());
        setPasso('cnpj');
      }
    }
  }, [aberto, clienteEditando]);

  function set<K extends keyof FormCliente>(campo: K, valor: FormCliente[K]) {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setErro('');
  }

  function fechar() {
    setErro('');
    onFechar();
  }

  async function handleBuscarCNPJ() {
    const limpo = cnpjBusca.replace(/\D/g, '');
    if (limpo.length !== 14) {
      setErroBusca('Digite um CNPJ válido com 14 dígitos.');
      return;
    }
    setBuscandoCNPJ(true);
    setErroBusca('');
    const dados = await buscarDadosCNPJ(cnpjBusca);
    setBuscandoCNPJ(false);
    if (!dados) {
      setErroBusca('CNPJ não encontrado. Verifique o número ou preencha manualmente.');
      return;
    }
    setForm((prev) => ({
      ...prev,
      cnpjCpf: cnpjBusca,
      razaoSocial: dados.razaoSocial,
      nomeFantasia: dados.nomeFantasia,
      cidade: dados.cidade,
      uf: dados.uf,
      endereco: dados.endereco,
      bairro: dados.bairro,
      cep: dados.cep,
      telefone: dados.telefone,
    }));
    setPasso('form');
  }

  function preencherManualmente() {
    setForm((prev) => ({ ...prev, cnpjCpf: cnpjBusca }));
    setPasso('form');
  }

  async function confirmar() {
    if (!form.razaoSocial.trim()) {
      setErro('Razão social é obrigatória.');
      return;
    }
    if (!form.cnpjCpf.trim()) {
      setErro('CNPJ / CPF é obrigatório.');
      return;
    }
    if (!form.segmento) {
      setErro('Selecione um segmento.');
      return;
    }

    setSalvando(true);
    await new Promise((r) => setTimeout(r, 250));

    const input = {
      tipo: form.tipo,
      razaoSocial: form.razaoSocial.trim(),
      nomeFantasia: form.nomeFantasia.trim() || undefined,
      cnpjCpf: form.cnpjCpf.trim(),
      segmento: form.segmento,
      ativo: form.ativo,
      contatoPrincipal: form.contatoPrincipal.trim() || undefined,
      telefone: form.telefone.trim() || undefined,
      email: form.email.trim() || undefined,
      cidade: form.cidade.trim() || undefined,
      uf: form.uf || undefined,
      observacoes: form.observacoes.trim() || undefined,
    };

    if (clienteEditando) {
      editarCliente(clienteEditando.id, input);
    } else {
      criarCliente(input);
    }

    setSalvando(false);
    fechar();
  }

  const titulo = modoVisualizacao
    ? 'Visualizar Cliente'
    : clienteEditando
    ? 'Editar Cliente'
    : 'Novo Cliente';

  const disabled = modoVisualizacao || salvando;

  // ── Passo 1: tela de busca por CNPJ (só para novo cliente)
  if (passo === 'cnpj' && !clienteEditando && !modoVisualizacao) {
    return (
      <Modal titulo={titulo} aberto={aberto} onFechar={fechar} largura="sm">
        <div className="px-6 py-8 flex flex-col items-center gap-6">
          <div className="text-center">
            <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Search size={24} className="text-blue-600" />
            </div>
            <p className="text-sm text-slate-600">
              Informe o CNPJ para buscar os dados da empresa automaticamente.
            </p>
          </div>

          <div className="w-full space-y-3">
            <div>
              <label className={labelCls}>CNPJ da empresa</label>
              <input
                type="text"
                value={cnpjBusca}
                onChange={(e) => { setCnpjBusca(e.target.value); setErroBusca(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleBuscarCNPJ()}
                placeholder="00.000.000/0001-00"
                autoFocus
                className={`${inputCls} font-mono text-center tracking-widest`}
              />
              {erroBusca && (
                <p className="text-xs text-red-600 mt-1">{erroBusca}</p>
              )}
            </div>

            <button
              onClick={handleBuscarCNPJ}
              disabled={buscandoCNPJ}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {buscandoCNPJ ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Buscando...
                </>
              ) : (
                <>
                  <Search size={16} />
                  Buscar dados do CNPJ
                </>
              )}
            </button>

            <button
              onClick={preencherManualmente}
              className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 flex items-center justify-center gap-1.5 transition-colors"
            >
              Preencher manualmente
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  // ── Passo 2 (ou edição/visualização): form completo
  return (
    <Modal titulo={titulo} aberto={aberto} onFechar={fechar} largura="xl">
      <div className="px-6 py-5">
        {erro && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {erro}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* ── Painel esquerdo: Identificação ── */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide pb-1 border-b border-slate-100">
              Identificação
            </h3>

            {/* Tipo */}
            <div>
              <span className={labelCls}>Tipo</span>
              <div className="flex gap-4 mt-1">
                {(['PJ', 'PF'] as const).map((t) => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="tipo"
                      value={t}
                      checked={form.tipo === t}
                      onChange={() => set('tipo', t)}
                      disabled={disabled}
                      className="accent-blue-600"
                    />
                    <span className="text-sm text-slate-700">
                      {t === 'PJ' ? 'Pessoa Jurídica' : 'Pessoa Física'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Razão Social */}
            <div>
              <label className={labelCls}>
                {form.tipo === 'PF' ? 'Nome completo' : 'Razão social'}{' '}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.razaoSocial}
                onChange={(e) => set('razaoSocial', e.target.value)}
                disabled={disabled}
                placeholder={form.tipo === 'PF' ? 'Nome completo' : 'Razão social da empresa'}
                className={inputCls}
              />
            </div>

            {/* Nome Fantasia */}
            <div>
              <label className={labelCls}>
                {form.tipo === 'PF' ? 'Apelido / nome comercial' : 'Nome fantasia'}
              </label>
              <input
                type="text"
                value={form.nomeFantasia}
                onChange={(e) => set('nomeFantasia', e.target.value)}
                disabled={disabled}
                placeholder={form.tipo === 'PF' ? 'Apelido ou nome do negócio' : 'Nome fantasia'}
                className={inputCls}
              />
            </div>

            {/* CNPJ/CPF */}
            <div>
              <label className={labelCls}>
                {form.tipo === 'PF' ? 'CPF' : 'CNPJ'}{' '}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.cnpjCpf}
                onChange={(e) => set('cnpjCpf', e.target.value)}
                disabled={disabled}
                placeholder={form.tipo === 'PF' ? '000.000.000-00' : '00.000.000/0001-00'}
                className={`${inputCls} font-mono`}
              />
            </div>

            {/* Segmento */}
            <div>
              <label className={labelCls}>
                Segmento <span className="text-red-500">*</span>
              </label>
              <select
                value={form.segmento}
                onChange={(e) => set('segmento', e.target.value)}
                disabled={disabled}
                className={inputCls}
              >
                <option value="">Selecionar...</option>
                {SEGMENTOS_CLIENTE.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <span className={labelCls}>Status</span>
              <label className="flex items-center gap-3 mt-1 cursor-pointer">
                <div
                  onClick={() => !disabled && set('ativo', !form.ativo)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${
                    form.ativo ? 'bg-green-500' : 'bg-slate-200'
                  } ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      form.ativo ? 'translate-x-5' : ''
                    }`}
                  />
                </div>
                <span className="text-sm text-slate-700">
                  {form.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </label>
            </div>
          </div>

          {/* ── Painel direito: Contato e Localização ── */}
          <div className="space-y-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide pb-1 border-b border-slate-100">
              Contato e Localização
            </h3>

            {/* Contato Principal */}
            <div>
              <label className={labelCls}>Contato principal</label>
              <input
                type="text"
                value={form.contatoPrincipal}
                onChange={(e) => set('contatoPrincipal', e.target.value)}
                disabled={disabled}
                placeholder="Nome da pessoa de contato"
                className={inputCls}
              />
            </div>

            {/* Telefone */}
            <div>
              <label className={labelCls}>Telefone</label>
              <input
                type="text"
                value={form.telefone}
                onChange={(e) => set('telefone', e.target.value)}
                disabled={disabled}
                placeholder="(11) 00000-0000"
                className={inputCls}
              />
            </div>

            {/* E-mail */}
            <div>
              <label className={labelCls}>E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                disabled={disabled}
                placeholder="contato@empresa.com.br"
                className={inputCls}
              />
            </div>

            {/* Cidade + UF */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className={labelCls}>Cidade</label>
                <input
                  type="text"
                  value={form.cidade}
                  onChange={(e) => set('cidade', e.target.value)}
                  disabled={disabled}
                  placeholder="São Paulo"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>UF</label>
                <select
                  value={form.uf}
                  onChange={(e) => set('uf', e.target.value)}
                  disabled={disabled}
                  className={inputCls}
                >
                  <option value="">—</option>
                  {UFS.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Endereço */}
            <div>
              <label className={labelCls}>Endereço</label>
              <input
                type="text"
                value={form.endereco}
                onChange={(e) => set('endereco', e.target.value)}
                disabled={disabled}
                placeholder="Rua, número"
                className={inputCls}
              />
            </div>

            {/* Bairro + CEP */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Bairro</label>
                <input
                  type="text"
                  value={form.bairro}
                  onChange={(e) => set('bairro', e.target.value)}
                  disabled={disabled}
                  placeholder="Bairro"
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>CEP</label>
                <input
                  type="text"
                  value={form.cep}
                  onChange={(e) => set('cep', e.target.value)}
                  disabled={disabled}
                  placeholder="00000-000"
                  className={`${inputCls} font-mono`}
                />
              </div>
            </div>

            {/* Observações */}
            <div>
              <label className={labelCls}>Observações</label>
              <textarea
                value={form.observacoes}
                onChange={(e) => set('observacoes', e.target.value)}
                disabled={disabled}
                rows={2}
                placeholder="Informações adicionais..."
                className={`${inputCls} resize-none`}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Rodapé */}
      {!modoVisualizacao && (
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100">
          {!clienteEditando && (
            <button
              onClick={() => setPasso('cnpj')}
              className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              ← Buscar outro CNPJ
            </button>
          )}
          <div className="flex items-center gap-3 ml-auto">
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
                  Salvando...
                </>
              ) : clienteEditando ? (
                'Salvar alterações'
              ) : (
                'Cadastrar cliente'
              )}
            </button>
          </div>
        </div>
      )}

      {modoVisualizacao && (
        <div className="flex items-center justify-end px-6 py-4 border-t border-slate-100">
          <button
            onClick={fechar}
            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Fechar
          </button>
        </div>
      )}
    </Modal>
  );
}
