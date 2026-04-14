import { useEffect, useState, useMemo } from 'react';
import { Plus, X, ChevronLeft, ChevronRight, Calendar, Truck, Wrench, CheckCircle } from 'lucide-react';
import { supabase } from '../infrastructure/supabase/client';
import { useAuth } from '../context/AuthContext';

interface Agendamento {
  id: string;
  tipo: 'ferramenta' | 'veiculo';
  item_id: string;
  item_descricao: string;
  solicitante_nome: string | null;
  data_inicio: string;
  data_fim: string;
  descricao: string | null;
  status: 'ativo' | 'cancelado' | 'concluido';
  criado_em: string;
}

interface ItemOpcao {
  id: string;
  descricao: string;
}

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const STATUS_CONFIG = {
  ativo:     { label: 'Ativo',     cor: 'text-blue-700',   corBg: 'bg-blue-100',   dot: 'bg-blue-500' },
  concluido: { label: 'Concluído', cor: 'text-green-700',  corBg: 'bg-green-100',  dot: 'bg-green-500' },
  cancelado: { label: 'Cancelado', cor: 'text-slate-500',  corBg: 'bg-slate-100',  dot: 'bg-slate-400' },
};

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function Calendario() {
  const { usuario } = useAuth();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<'' | 'ferramenta' | 'veiculo'>('');
  const [filtroStatus, setFiltroStatus] = useState<'' | 'ativo' | 'concluido' | 'cancelado'>('ativo');

  // Calendário
  const hoje = new Date();
  const [mesSelecionado, setMesSelecionado] = useState(hoje.getMonth());
  const [anoSelecionado, setAnoSelecionado] = useState(hoje.getFullYear());

  // Modal
  const [modal, setModal] = useState(false);
  const [itensVeiculos, setItensVeiculos] = useState<ItemOpcao[]>([]);
  const [itensFerramentas, setItensFerramentas] = useState<ItemOpcao[]>([]);
  const [form, setForm] = useState({
    tipo: 'veiculo' as 'ferramenta' | 'veiculo',
    item_id: '',
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: new Date().toISOString().split('T')[0],
    descricao: '',
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const isGestor = ['gestor', 'admin', 'dono'].includes(usuario?.papel ?? '');

  async function carregar() {
    setLoading(true);
    const { data } = await supabase
      .from('agendamentos_almoxarifado')
      .select('*')
      .order('data_inicio', { ascending: true });
    setAgendamentos((data || []) as Agendamento[]);
    setLoading(false);
  }

  async function carregarItens() {
    const [{ data: veiculos }, { data: ferramentas }] = await Promise.all([
      supabase.from('veiculos').select('id, modelo').eq('ativo', true).order('modelo'),
      supabase.from('itens_almoxarifado').select('id, descricao').eq('ativo', true).order('descricao'),
    ]);
    setItensVeiculos((veiculos || []).map((v: any) => ({ id: v.id, descricao: v.modelo })));
    setItensFerramentas((ferramentas || []).map((f: any) => ({ id: f.id, descricao: f.descricao })));
  }

  useEffect(() => { carregarItens(); }, []);
  useEffect(() => { if (usuario) carregar(); }, [usuario]);

  async function salvar() {
    if (!form.item_id || !form.data_inicio || !form.data_fim) { setErro('Preencha todos os campos obrigatórios'); return; }
    if (form.data_fim < form.data_inicio) { setErro('Data de fim deve ser após a data de início'); return; }
    setSalvando(true); setErro('');
    const itens = form.tipo === 'veiculo' ? itensVeiculos : itensFerramentas;
    const item = itens.find(i => i.id === form.item_id);
    const { error } = await supabase.from('agendamentos_almoxarifado').insert({
      tipo: form.tipo,
      item_id: form.item_id,
      item_descricao: item?.descricao || '',
      solicitante_id: usuario!.id,
      solicitante_nome: usuario!.nome,
      data_inicio: form.data_inicio,
      data_fim: form.data_fim,
      descricao: form.descricao.trim() || null,
      status: 'ativo',
    });
    if (error) { setErro(error.message); setSalvando(false); return; }
    await carregar();
    setModal(false);
    setSalvando(false);
    setForm({ tipo: 'veiculo', item_id: '', data_inicio: new Date().toISOString().split('T')[0], data_fim: new Date().toISOString().split('T')[0], descricao: '' });
  }

  async function concluir(id: string) {
    await supabase.from('agendamentos_almoxarifado').update({ status: 'concluido' }).eq('id', id);
    setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: 'concluido' } : a));
  }

  async function cancelar(id: string) {
    if (!window.confirm('Cancelar este agendamento?')) return;
    await supabase.from('agendamentos_almoxarifado').update({ status: 'cancelado' }).eq('id', id);
    setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelado' } : a));
  }

  // Filtros
  const filtrados = useMemo(() => agendamentos.filter(a => {
    if (filtroTipo && a.tipo !== filtroTipo) return false;
    if (filtroStatus && a.status !== filtroStatus) return false;
    return true;
  }), [agendamentos, filtroTipo, filtroStatus]);

  // Agendamentos do mês selecionado
  const doMes = useMemo(() => filtrados.filter(a => {
    const ini = new Date(a.data_inicio + 'T12:00:00');
    const fim = new Date(a.data_fim + 'T12:00:00');
    const mesIni = new Date(anoSelecionado, mesSelecionado, 1);
    const mesFim = new Date(anoSelecionado, mesSelecionado + 1, 0);
    return ini <= mesFim && fim >= mesIni;
  }), [filtrados, mesSelecionado, anoSelecionado]);

  // Grid do calendário
  const diasDoMes = useMemo(() => {
    const primeiroDia = new Date(anoSelecionado, mesSelecionado, 1).getDay();
    const totalDias = new Date(anoSelecionado, mesSelecionado + 1, 0).getDate();
    const dias: (number | null)[] = Array(primeiroDia).fill(null);
    for (let d = 1; d <= totalDias; d++) dias.push(d);
    while (dias.length % 7 !== 0) dias.push(null);
    return dias;
  }, [mesSelecionado, anoSelecionado]);

  function agendamentosNoDia(dia: number) {
    const dateStr = `${anoSelecionado}-${String(mesSelecionado + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    return filtrados.filter(a => a.data_inicio <= dateStr && a.data_fim >= dateStr && a.status === 'ativo');
  }

  function navMes(dir: -1 | 1) {
    let m = mesSelecionado + dir;
    let a = anoSelecionado;
    if (m < 0) { m = 11; a--; }
    if (m > 11) { m = 0; a++; }
    setMesSelecionado(m);
    setAnoSelecionado(a);
  }

  const itensOpcao = form.tipo === 'veiculo' ? itensVeiculos : itensFerramentas;

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar size={22} className="text-blue-600" />
            Calendário
          </h1>
          <p className="text-sm text-slate-500 mt-1">Agendamentos de veículos e ferramentas</p>
        </div>
        {isGestor && (
          <button onClick={() => { setModal(true); setErro(''); carregarItens(); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors">
            <Plus size={16} />Novo Agendamento
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as any)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos os tipos</option>
          <option value="veiculo">Veículos</option>
          <option value="ferramenta">Ferramentas</option>
        </select>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as any)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos os status</option>
          <option value="ativo">Ativos</option>
          <option value="concluido">Concluídos</option>
          <option value="cancelado">Cancelados</option>
        </select>
        <span className="text-xs text-slate-400">{filtrados.length} agendamento(s)</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Grid do calendário */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => navMes(-1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <h3 className="font-semibold text-slate-800 text-sm">
              {MESES[mesSelecionado]} {anoSelecionado}
            </h3>
            <button onClick={() => navMes(1)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {DIAS_SEMANA.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold text-slate-400 uppercase py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {diasDoMes.map((dia, idx) => {
              if (!dia) return <div key={idx} />;
              const agsDia = agendamentosNoDia(dia);
              const isHoje = dia === hoje.getDate() && mesSelecionado === hoje.getMonth() && anoSelecionado === hoje.getFullYear();
              return (
                <div key={idx} className={`min-h-[56px] rounded-lg p-1 border text-xs transition-colors ${isHoje ? 'border-blue-400 bg-blue-50' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'}`}>
                  <span className={`block text-center font-medium mb-0.5 ${isHoje ? 'text-blue-600' : 'text-slate-700'}`}>{dia}</span>
                  <div className="space-y-0.5">
                    {agsDia.slice(0, 2).map(a => (
                      <div key={a.id} className={`truncate text-[9px] px-1 py-0.5 rounded font-medium ${a.tipo === 'veiculo' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                        {a.item_descricao}
                      </div>
                    ))}
                    {agsDia.length > 2 && <div className="text-[9px] text-slate-400 text-center">+{agsDia.length - 2}</div>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legenda */}
          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Truck size={11} className="text-blue-500" />Veículo
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Wrench size={11} className="text-amber-500" />Ferramenta
            </div>
            <span className="text-xs text-slate-400 ml-auto">{doMes.length} neste mês</span>
          </div>
        </div>

        {/* Lista de agendamentos */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-700 text-sm">Agendamentos</h3>
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Carregando...</div>
          ) : filtrados.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar size={28} className="text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Nenhum agendamento</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-y-auto flex-1 max-h-[500px]">
              {filtrados.map(a => {
                const cfg = STATUS_CONFIG[a.status];
                return (
                  <div key={a.id} className="px-4 py-3 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.corBg} ${cfg.cor}`}>{cfg.label}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${a.tipo === 'veiculo' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                            {a.tipo === 'veiculo' ? '🚛' : '🔧'}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-700 truncate">{a.item_descricao}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {fmtDate(a.data_inicio)} → {fmtDate(a.data_fim)}
                        </p>
                        {a.solicitante_nome && <p className="text-[11px] text-slate-400">{a.solicitante_nome}</p>}
                        {a.descricao && <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{a.descricao}</p>}
                      </div>
                      {isGestor && a.status === 'ativo' && (
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <button onClick={() => concluir(a.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors" title="Concluir">
                            <CheckCircle size={13} />
                          </button>
                          <button onClick={() => cancelar(a.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Cancelar">
                            <X size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modal novo agendamento */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Novo Agendamento</h3>
              <button onClick={() => setModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Tipo */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">Tipo *</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['veiculo', 'ferramenta'] as const).map(t => (
                    <button key={t} onClick={() => setForm(f => ({ ...f, tipo: t, item_id: '' }))}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${form.tipo === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                      {t === 'veiculo' ? <><Truck size={15} />Veículo</> : <><Wrench size={15} />Ferramenta</>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Item */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  {form.tipo === 'veiculo' ? 'Veículo' : 'Ferramenta'} *
                </label>
                <select value={form.item_id} onChange={e => setForm(f => ({ ...f, item_id: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Selecione...</option>
                  {itensOpcao.map(i => <option key={i.id} value={i.id}>{i.descricao}</option>)}
                </select>
              </div>

              {/* Datas */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Data início *</label>
                  <input type="date" value={form.data_inicio} onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Data fim *</label>
                  <input type="date" value={form.data_fim} onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Descrição</label>
                <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={2}
                  placeholder="Motivo do agendamento, obra de destino..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setModal(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl">Cancelar</button>
              <button onClick={salvar} disabled={salvando} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl">
                {salvando ? 'Salvando...' : 'Agendar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
