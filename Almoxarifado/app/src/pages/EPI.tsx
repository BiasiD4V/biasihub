import { useEffect, useState } from 'react';
import { HardHat, Plus, X, AlertTriangle, CheckCircle, RotateCcw, Search } from 'lucide-react';
import { supabase } from '../infrastructure/supabase/client';
import { useAuth } from '../context/AuthContext';
import { criarNotificacaoGestores } from '../hooks/useNotificacoes';

type Aba = 'catalogo' | 'entregas' | 'vencimentos';

interface EPICatalogo {
  id: string;
  nome: string;
  descricao: string | null;
  ca: string | null;
  validade_meses: number | null;
  ativo: boolean;
}

interface EntregaEPI {
  id: string;
  epi_id: string;
  colaborador_nome: string;
  obra: string;
  data_entrega: string;
  data_validade: string;
  data_devolucao: string | null;
  status: 'ativo' | 'devolvido' | 'vencido' | 'perdido';
  quantidade: number;
  observacao: string | null;
  epis_catalogo: { nome: string; ca: string | null } | null;
}

const STATUS_LABEL: Record<string, string> = { ativo: 'Ativo', devolvido: 'Devolvido', vencido: 'Vencido', perdido: 'Perdido' };
const STATUS_COR: Record<string, string> = {
  ativo: 'bg-emerald-100 text-emerald-700',
  devolvido: 'bg-slate-100 text-slate-600',
  vencido: 'bg-rose-100 text-rose-700',
  perdido: 'bg-amber-100 text-amber-700',
};

function diasParaVencer(data: string) {
  return Math.ceil((new Date(data).getTime() - Date.now()) / 86400000);
}

export function EPI() {
  const { usuario } = useAuth();
  const isGestor = ['gestor', 'admin', 'dono'].includes(usuario?.papel || '');
  const [aba, setAba] = useState<Aba>('entregas');

  // Catalogo
  const [catalogo, setCatalogo] = useState<EPICatalogo[]>([]);
  const [modalCatalogo, setModalCatalogo] = useState(false);
  const [formCatalogo, setFormCatalogo] = useState({ nome: '', descricao: '', ca: '', validade_meses: '' });

  // Entregas
  const [entregas, setEntregas] = useState<EntregaEPI[]>([]);
  const [modalEntrega, setModalEntrega] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [formEntrega, setFormEntrega] = useState({
    epi_id: '', colaborador_nome: '', obra: '', data_entrega: new Date().toISOString().split('T')[0],
    quantidade: '1', observacao: '',
  });

  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { carregarCatalogo(); carregarEntregas(); }, []);

  async function carregarCatalogo() {
    try {
      const { data, error } = await supabase.from('epis_catalogo').select('*').eq('ativo', true).order('nome');
      if (error) throw error;
      setCatalogo(data || []);
    } catch (err) {
      console.error('[EPI] erro ao carregar catalogo:', err);
      setCatalogo([]);
    }
  }

  async function carregarEntregas() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('entregas_epi')
        .select('*, epis_catalogo(nome, ca)')
        .order('criado_em', { ascending: false });

      if (error) throw error;
      const lista = data || [];
      setEntregas(lista);

      // Atualiza status de vencidos automaticamente sem recursao
      const hoje = new Date().toISOString().split('T')[0];
      const vencidos = lista.filter(e => e.status === 'ativo' && e.data_validade < hoje);
      if (vencidos.length) {
        const ids = vencidos.map(v => v.id);
        const { error: updateError } = await supabase
          .from('entregas_epi')
          .update({ status: 'vencido' })
          .in('id', ids);

        if (!updateError) {
          const vencidosSet = new Set(ids);
          setEntregas(prev => prev.map(e => (vencidosSet.has(e.id) ? { ...e, status: 'vencido' } : e)));
          vencidos.forEach(v =>
            criarNotificacaoGestores('epi_vencendo', `EPI vencido: ${v.epis_catalogo?.nome || 'EPI'} - ${v.colaborador_nome}`)
          );
        } else {
          console.error('[EPI] erro ao atualizar vencidos:', updateError);
        }
      }
    } catch (err) {
      console.error('[EPI] erro ao carregar entregas:', err);
      setEntregas([]);
    } finally {
      setLoading(false);
    }
  }

  async function salvarCatalogo() {
    setSalvando(true);
    try {
      const { error } = await supabase.from('epis_catalogo').insert({
        nome: formCatalogo.nome,
        descricao: formCatalogo.descricao || null,
        ca: formCatalogo.ca || null,
        validade_meses: formCatalogo.validade_meses ? Number(formCatalogo.validade_meses) : null,
      });
      if (error) throw error;
      setModalCatalogo(false);
      setFormCatalogo({ nome: '', descricao: '', ca: '', validade_meses: '' });
      await carregarCatalogo();
    } catch (err) {
      console.error('[EPI] erro ao salvar catalogo:', err);
    } finally {
      setSalvando(false);
    }
  }

  async function salvarEntrega() {
    setSalvando(true);
    try {
      const epi = catalogo.find(e => e.id === formEntrega.epi_id);
      const dataEntrega = new Date(formEntrega.data_entrega);
      const dataValidade = new Date(dataEntrega);
      if (epi?.validade_meses) dataValidade.setMonth(dataValidade.getMonth() + epi.validade_meses);
      else dataValidade.setFullYear(dataValidade.getFullYear() + 1);

      const { error } = await supabase.from('entregas_epi').insert({
        epi_id: formEntrega.epi_id,
        colaborador_nome: formEntrega.colaborador_nome,
        obra: formEntrega.obra,
        data_entrega: formEntrega.data_entrega,
        data_validade: dataValidade.toISOString().split('T')[0],
        quantidade: Number(formEntrega.quantidade),
        observacao: formEntrega.observacao || null,
        entregue_por: usuario?.id,
      });
      if (error) throw error;
      setModalEntrega(false);
      setFormEntrega({ epi_id: '', colaborador_nome: '', obra: '', data_entrega: new Date().toISOString().split('T')[0], quantidade: '1', observacao: '' });
      await carregarEntregas();
    } catch (err) {
      console.error('[EPI] erro ao salvar entrega:', err);
    } finally {
      setSalvando(false);
    }
  }

  async function registrarDevolucao(id: string) {
    await supabase.from('entregas_epi').update({ status: 'devolvido', data_devolucao: new Date().toISOString().split('T')[0] }).eq('id', id);
    carregarEntregas();
  }

  const entregasFiltradas = entregas.filter(e => {
    const texto = busca.toLowerCase();
    const matchBusca = !texto || e.colaborador_nome.toLowerCase().includes(texto) || e.obra.toLowerCase().includes(texto) || (e.epis_catalogo?.nome || '').toLowerCase().includes(texto);
    const matchStatus = !filtroStatus || e.status === filtroStatus;
    return matchBusca && matchStatus;
  });

  const vencendo30dias = entregas.filter(e => e.status === 'ativo' && diasParaVencer(e.data_validade) <= 30);

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <HardHat className="text-amber-500" size={26} />
          Controle de EPI
        </h1>
        <p className="text-sm text-slate-500 mt-1">Gestão de Equipamentos de Protecao Individual  -  NR-6</p>
      </div>

      {/* Abas */}
      <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
        {([
          { id: 'entregas', label: 'Entregas' },
          { id: 'vencimentos', label: `Vencimentos${vencendo30dias.length ? ` (${vencendo30dias.length})` : ''}` },
          { id: 'catalogo', label: 'Catalogo de EPIs' },
        ] as { id: Aba; label: string }[]).map(a => (
          <button key={a.id} onClick={() => setAba(a.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${aba === a.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {a.label}
          </button>
        ))}
      </div>

      {/* ABA: ENTREGAS */}
      {aba === 'entregas' && (
        <>
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-48">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar colaborador, obra ou EPI..."
                className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Todos os status</option>
              <option value="ativo">Ativo</option>
              <option value="devolvido">Devolvido</option>
              <option value="vencido">Vencido</option>
              <option value="perdido">Perdido</option>
            </select>
            {isGestor && (
              <button onClick={() => setModalEntrega(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                <Plus size={16} /> Nova entrega
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {loading ? (
              <div className="py-12 text-center text-slate-400 text-sm">Carregando...</div>
            ) : entregasFiltradas.length === 0 ? (
              <div className="py-12 text-center text-slate-400"><HardHat size={32} className="mx-auto mb-2 opacity-30" /><p className="text-sm">Nenhuma entrega encontrada</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50 border-b border-slate-100">
                    {['EPI', 'CA', 'Colaborador', 'Obra', 'Entrega', 'Validade', 'Qtd', 'Status', ''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {entregasFiltradas.map(e => {
                      const dias = diasParaVencer(e.data_validade);
                      return (
                        <tr key={e.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-medium text-slate-700">{e.epis_catalogo?.nome || '-'}</td>
                          <td className="px-4 py-3 text-slate-500">{e.epis_catalogo?.ca || '-'}</td>
                          <td className="px-4 py-3 text-slate-700">{e.colaborador_nome}</td>
                          <td className="px-4 py-3 text-slate-500">{e.obra}</td>
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{new Date(e.data_entrega).toLocaleDateString('pt-BR')}</td>
                          <td className={`px-4 py-3 whitespace-nowrap font-medium ${dias <= 0 ? 'text-rose-600' : dias <= 30 ? 'text-amber-600' : 'text-slate-500'}`}>
                            {new Date(e.data_validade).toLocaleDateString('pt-BR')}
                            {e.status === 'ativo' && dias <= 30 && dias > 0 && <span className="ml-1 text-xs">({dias}d)</span>}
                          </td>
                          <td className="px-4 py-3 text-center text-slate-600">{e.quantidade}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COR[e.status]}`}>{STATUS_LABEL[e.status]}</span>
                          </td>
                          <td className="px-4 py-3">
                            {e.status === 'ativo' && isGestor && (
                              <button onClick={() => registrarDevolucao(e.id)} title="Registrar devolucao"
                                className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors">
                                <RotateCcw size={15} />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ABA: VENCIMENTOS */}
      {aba === 'vencimentos' && (
        <div className="space-y-3">
          {vencendo30dias.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 py-12 text-center text-slate-400">
              <CheckCircle size={32} className="mx-auto mb-2 text-emerald-400" />
              <p className="text-sm font-medium text-slate-600">Nenhum EPI vencendo nos proximos 30 dias</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
                <AlertTriangle size={16} /> <strong>{vencendo30dias.length} EPI(s)</strong> vencem em 30 dias
              </div>
              {vencendo30dias.sort((a, b) => a.data_validade.localeCompare(b.data_validade)).map(e => {
                const dias = diasParaVencer(e.data_validade);
                return (
                  <div key={e.id} className={`bg-white border rounded-xl p-4 flex items-center justify-between ${dias <= 7 ? 'border-rose-200' : 'border-amber-200'}`}>
                    <div>
                      <p className="font-medium text-slate-700">{e.epis_catalogo?.nome}</p>
                      <p className="text-sm text-slate-500 mt-0.5">{e.colaborador_nome}  -  {e.obra}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${dias <= 7 ? 'text-rose-600' : 'text-amber-600'}`}>{dias === 0 ? 'Vence hoje!' : `${dias} dia(s)`}</p>
                      <p className="text-xs text-slate-400">{new Date(e.data_validade).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ABA: CATALOGO */}
      {aba === 'catalogo' && (
        <>
          {isGestor && (
            <div className="mb-4">
              <button onClick={() => setModalCatalogo(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700">
                <Plus size={16} /> Novo EPI
              </button>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {catalogo.map(epi => (
              <div key={epi.id} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                    <HardHat size={20} className="text-amber-600" />
                  </div>
                  {epi.ca && <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded">CA {epi.ca}</span>}
                </div>
                <p className="font-semibold text-slate-800 mt-3">{epi.nome}</p>
                {epi.descricao && <p className="text-xs text-slate-500 mt-1">{epi.descricao}</p>}
                {epi.validade_meses && (
                  <p className="text-xs text-slate-400 mt-2">Validade: {epi.validade_meses} meses</p>
                )}
              </div>
            ))}
            {catalogo.length === 0 && (
              <div className="col-span-3 py-12 text-center text-slate-400">
                <HardHat size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum EPI cadastrado</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal Catalogo */}
      {modalCatalogo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between mb-4">
              <h2 className="text-lg font-semibold">Novo EPI</h2>
              <button onClick={() => setModalCatalogo(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Nome *</label>
                <input value={formCatalogo.nome} onChange={e => setFormCatalogo(p => ({ ...p, nome: e.target.value }))}
                  placeholder="Ex: Capacete de seguranca" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Certificado de Aprovação (CA)</label>
                <input value={formCatalogo.ca} onChange={e => setFormCatalogo(p => ({ ...p, ca: e.target.value }))}
                  placeholder="Ex: 12345" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Validade (meses)</label>
                <input type="number" value={formCatalogo.validade_meses} onChange={e => setFormCatalogo(p => ({ ...p, validade_meses: e.target.value }))}
                  placeholder="Ex: 12" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Descrição</label>
                <textarea value={formCatalogo.descricao} onChange={e => setFormCatalogo(p => ({ ...p, descricao: e.target.value }))}
                  rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setModalCatalogo(false)} className="flex-1 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={salvarCatalogo} disabled={!formCatalogo.nome || salvando}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Entrega */}
      {modalEntrega && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex justify-between mb-4">
              <h2 className="text-lg font-semibold">Registrar Entrega de EPI</h2>
              <button onClick={() => setModalEntrega(false)}><X size={20} className="text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">EPI *</label>
                <select value={formEntrega.epi_id} onChange={e => setFormEntrega(p => ({ ...p, epi_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecione...</option>
                  {catalogo.map(e => <option key={e.id} value={e.id}>{e.nome}{e.ca ? ` (CA ${e.ca})` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Colaborador *</label>
                <input value={formEntrega.colaborador_nome} onChange={e => setFormEntrega(p => ({ ...p, colaborador_nome: e.target.value }))}
                  placeholder="Nome completo" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Obra *</label>
                <input value={formEntrega.obra} onChange={e => setFormEntrega(p => ({ ...p, obra: e.target.value }))}
                  placeholder="Nome da obra" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Data entrega *</label>
                  <input type="date" value={formEntrega.data_entrega} onChange={e => setFormEntrega(p => ({ ...p, data_entrega: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">Quantidade</label>
                  <input type="number" min="1" value={formEntrega.quantidade} onChange={e => setFormEntrega(p => ({ ...p, quantidade: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Observação</label>
                <textarea value={formEntrega.observacao} onChange={e => setFormEntrega(p => ({ ...p, observacao: e.target.value }))}
                  rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => setModalEntrega(false)} className="flex-1 py-2 border border-slate-300 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
              <button onClick={salvarEntrega} disabled={!formEntrega.epi_id || !formEntrega.colaborador_nome || !formEntrega.obra || salvando}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                {salvando ? 'Salvando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

