import { useState, useEffect } from 'react';
import { Search, Loader2, ArrowRight } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { fornecedoresRepository, type FornecedorSupabase } from '../../infrastructure/supabase/fornecedoresRepository';
import { buscarDadosCNPJ } from '../../infrastructure/supabase/clientesRepository';

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
  const [passo, setPasso] = useState<'busca' | 'form'>('busca');
  const [documentoBusca, setDocumentoBusca] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState<'CNPJ' | 'CPF'>('CNPJ');
  const [buscandoDados, setBuscandoDados] = useState(false);
  const [erroBusca, setErroBusca] = useState('');
  
  const [form, setForm] = useState<FormFornecedor>(formVazio);
  const [buscandoCEP, setBuscandoCEP] = useState(false);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Validação básica de CPF
  const validarCPF = (cpf: string) => {
    const limpo = cpf.replace(/\D/g, '');
    if (limpo.length !== 11) return false;
    if (/^(\d)\1+$/.test(limpo)) return false;
    let soma = 0;
    for (let i = 1; i <= 9; i++) soma += parseInt(limpo.substring(i - 1, i)) * (11 - i);
    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(limpo.substring(9, 10))) return false;
    soma = 0;
    for (let i = 1; i <= 10; i++) soma += parseInt(limpo.substring(i - 1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(limpo.substring(10, 11))) return false;
    return true;
  };

  async function handleConsultarDocumento() {
    const limpo = documentoBusca.replace(/\D/g, '');
    
    setBuscandoDados(true);
    setErroBusca('');

    try {
      // 1. SEMPRE verifica primeiro no banco de dados local
      const existente = await fornecedoresRepository.buscarPorDocumento(documentoBusca);
      if (existente) {
        setForm({
          codigo_erp: existente.codigo_erp ?? '',
          nome: existente.nome,
          cnpj: existente.cnpj ?? documentoBusca,
          ie: existente.ie ?? '',
          endereco: existente.endereco ?? '',
          municipio: existente.municipio ?? '',
          uf: existente.uf ?? '',
          cep: existente.cep ?? '',
          telefone: existente.telefone ?? '',
          tipo: existente.tipo ?? '',
          avaliacao: existente.avaliacao ?? '',
          ativo: existente.ativo,
        });
        setBuscandoDados(false);
        setPasso('form');
        return;
      }

      // 2. Se não existe no banco, tenta buscar fora (se for PJ)
      if (tipoDocumento === 'CNPJ') {
        if (limpo.length !== 14) {
          setErroBusca('Digite um CNPJ válido com 14 dígitos.');
          setBuscandoDados(false);
          return;
        }
        const dados = await buscarDadosCNPJ(documentoBusca);
        if (!dados) {
          setErroBusca('CNPJ não encontrado. Verifique o número ou preencha manualmente.');
          setBuscandoDados(false);
          return;
        }
        setForm((prev) => ({
          ...prev,
          nome: dados.razaoSocial,
          cnpj: documentoBusca,
          municipio: dados.cidade,
          uf: dados.uf,
          endereco: dados.endereco,
          cep: dados.cep,
          telefone: dados.telefone,
        }));
        setPasso('form');
      } else {
        // CPF - Apenas validação local
        if (!validarCPF(limpo)) {
          setErroBusca('Digite um CPF válido.');
          setBuscandoDados(false);
          return;
        }
        setTimeout(() => {
          setForm((prev) => ({ ...prev, cnpj: documentoBusca }));
          setBuscandoDados(false);
          setPasso('form');
        }, 600);
      }
    } catch (err) {
      console.error(err);
      setErroBusca('Erro ao consultar documento. Tente novamente.');
    } finally {
      if (tipoDocumento === 'CNPJ') setBuscandoDados(false);
    }
  }

  async function handleBuscarCEP(cepOverride?: string) {
    const limpo = (cepOverride ?? form.cep).replace(/\D/g, '');
    if (limpo.length !== 8) return;

    setBuscandoCEP(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
      const dados = await res.json();
      if (dados.erro) return;

      setForm((prev) => ({
        ...prev,
        endereco: [dados.logradouro, dados.complemento].filter(Boolean).join(', '),
        municipio: dados.localidade,
        uf: dados.uf,
      }));
    } catch (err) {
      console.error('Erro ao buscar CEP:', err);
    } finally {
      setBuscandoCEP(false);
    }
  }

  useEffect(() => {
    if (aberto) {
      if (fornecedorEditando) {
        setForm({
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
        });
        setPasso('form');
      } else {
        setForm(formVazio());
        setDocumentoBusca('');
        setPasso('busca');
      }
      setErro('');
      setErroBusca('');
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
        {passo === 'busca' && !fornecedorEditando && (
          <div className="space-y-6 py-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <Search size={24} className="text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Novo Fornecedor</h3>
              <p className="text-sm text-slate-500 max-w-xs mx-auto">
                Digite o CNPJ ou CPF para agilizar o cadastro com busca automática.
              </p>
            </div>

            <div className="max-w-sm mx-auto space-y-4">
              <div className="flex p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setTipoDocumento('CNPJ')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    tipoDocumento === 'CNPJ' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  CNPJ
                </button>
                <button
                  onClick={() => setTipoDocumento('CPF')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    tipoDocumento === 'CPF' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  CPF
                </button>
              </div>

              <div className="relative">
                <input
                  type="text"
                  autoFocus
                  placeholder={tipoDocumento === 'CNPJ' ? '00.000.000/0000-00' : '000.000.000-00'}
                  value={documentoBusca}
                  onChange={(e) => setDocumentoBusca(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleConsultarDocumento()}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                />
                <button
                  onClick={handleConsultarDocumento}
                  disabled={buscandoDados || !documentoBusca}
                  className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {buscandoDados ? <Loader2 size={20} className="animate-spin" /> : <ArrowRight size={20} />}
                </button>
              </div>

              {erroBusca && (
                <p className="text-center text-xs font-medium text-red-500 animate-in fade-in">{erroBusca}</p>
              )}

              <button
                onClick={() => setPasso('form')}
                className="w-full text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
              >
                Pular busca e preencher manualmente
              </button>
            </div>
          </div>
        )}

        {passo === 'form' && (
          <div className="animate-in fade-in duration-500">
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
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {tipoDocumento === 'CPF' || form.cnpj.length <= 14 ? 'Nome do Fornecedor *' : 'Razão Social *'}
                </label>
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
                <label className="block text-xs font-medium text-slate-600 mb-1">{tipoDocumento}</label>
                <input
                  type="text"
                  value={form.cnpj}
                  onChange={(e) => setCampo('cnpj', e.target.value)}
                  disabled={disabled}
                  placeholder={tipoDocumento === 'CNPJ' ? "00.000.000/0000-00" : "000.000.000-00"}
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
              <div className="relative">
                <label className="block text-xs font-medium text-slate-600 mb-1">CEP</label>
                <input
                  type="text"
                  value={form.cep}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCampo('cep', val);
                    const limpo = val.replace(/\D/g, '');
                    if (limpo.length === 8) {
                      setTimeout(() => handleBuscarCEP(limpo), 50);
                    }
                  }}
                  onBlur={() => handleBuscarCEP()}
                  disabled={disabled}
                  placeholder="00000-000"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white pr-8"
                />
                {buscandoCEP && (
                  <div className="absolute right-2 bottom-2.5">
                    <Loader2 size={14} className="animate-spin text-blue-500" />
                  </div>
                )}
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

            <div className="mt-6 flex justify-between gap-2 border-t border-slate-100 pt-5">
              {!fornecedorEditando && (
                <button
                  onClick={() => setPasso('busca')}
                  disabled={salvando}
                  className="text-xs font-semibold text-slate-400 hover:text-blue-600 transition-colors"
                >
                  ← Voltar para busca
                </button>
              )}
              <div className="flex gap-2 ml-auto">
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
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors disabled:opacity-60 font-bold px-8 shadow-sm"
                  >
                    {salvando ? 'Salvando...' : 'Salvar'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
