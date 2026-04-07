import { useEffect, useState } from 'react';
import { Plus, Truck, Wrench, MapPin, Calendar, DollarSign, X, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '../infrastructure/supabase/client';
import type { Veiculo, StatusVeiculo } from '../domain/entities/Veiculo';
import type { Manutencao } from '../domain/entities/Manutencao';
import { useAuth } from '../context/AuthContext';

const STATUS_CONFIG: Record<StatusVeiculo, { label: string; cor: string; corBg: string }> = {
  disponivel: { label: 'Disponível',  cor: 'text-green-700',  corBg: 'bg-green-100' },
  em_uso:     { label: 'Em Uso',      cor: 'text-blue-700',   corBg: 'bg-blue-100' },
  manutencao: { label: 'Manutenção',  cor: 'text-amber-700',  corBg: 'bg-amber-100' },
};

const TIPOS_MANUT = ['Preventiva', 'Corretiva', 'Revisão', 'Pneus', 'Óleo', 'Elétrica', 'Funilaria', 'Outro'];

export function Frota() {
  const { usuario } = useAuth();
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [manutencoes, setManutencoes] = useState<Record<string, Manutencao[]>>({});
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const [modalVeiculo, setModalVeiculo] = useState(false);
  const [modalManutencao, setModalManutencao] = useState<string | null>(null); // veiculo_id
  const [editandoVeiculo, setEditandoVeiculo] = useState<Veiculo | null>(null);

  const [formVeiculo, setFormVeiculo] = useState({ placa: '', modelo: '', marca: '', ano: '', cor: '', obra_atual: '', status: 'disponivel' as StatusVeiculo });
  const [formManut, setFormManut] = useState({ tipo: 'Preventiva', data: new Date().toISOString().split('T')[0], km: '', custo: '', oficina: '', descricao: '' });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const isGestor = usuario?.papel === 'gestor' || usuario?.papel === 'admin' || usuario?.papel === 'dono';

  async function carregar() {
    const { data } = await supabase.from('veiculos').select('*').eq('ativo', true).order('modelo');
    setVeiculos(data || []);
    setLoading(false);
  }

  async function carregarManutencoes(veiculoId: string) {
    if (manutencoes[veiculoId]) return;
    const { data } = await supabase.from('manutencoes_veiculo').select('*').eq('veiculo_id', veiculoId).order('data', { ascending: false });
    setManutencoes(prev => ({ ...prev, [veiculoId]: data || [] }));
  }

  useEffect(() => { carregar(); }, []);

  function toggleExpand(id: string) {
    if (!expandidos[id]) carregarManutencoes(id);
    setExpandidos(prev => ({ ...prev, [id]: !prev[id] }));
  }

  async function salvarVeiculo() {
    if (!formVeiculo.placa.trim() || !formVeiculo.modelo.trim()) { setErro('Placa e modelo são obrigatórios'); return; }
    setSalvando(true); setErro('');

    const payload = {
      placa: formVeiculo.placa.trim().toUpperCase(),
      modelo: formVeiculo.modelo.trim(),
      marca: formVeiculo.marca.trim() || null,
      ano: formVeiculo.ano ? parseInt(formVeiculo.ano) : null,
      cor: formVeiculo.cor.trim() || null,
      obra_atual: formVeiculo.obra_atual.trim() || null,
      status: formVeiculo.status,
    };

    let error;
    if (editandoVeiculo) {
      const res = await supabase.from('veiculos').update(payload).eq('id', editandoVeiculo.id);
      error = res.error;
    } else {
      const res = await supabase.from('veiculos').insert(payload);
      error = res.error;
    }

    if (error) { setErro(error.message); setSalvando(false); return; }
    await carregar();
    setModalVeiculo(false);
    setSalvando(false);
  }

  async function salvarManutencao() {
    if (!formManut.tipo || !formManut.data) { setErro('Tipo e data são obrigatórios'); return; }
    setSalvando(true); setErro('');

    const { error } = await supabase.from('manutencoes_veiculo').insert({
      veiculo_id: modalManutencao,
      tipo: formManut.tipo,
      data: formManut.data,
      km: formManut.km ? parseInt(formManut.km) : null,
      custo: parseFloat(formManut.custo) || 0,
      oficina: formManut.oficina.trim() || null,
      descricao: formManut.descricao.trim() || null,
      criado_por: usuario!.id,
    });

    if (error) { setErro(error.message); setSalvando(false); return; }

    // Recarregar manutenções deste veículo
    const { data } = await supabase.from('manutencoes_veiculo').select('*').eq('veiculo_id', modalManutencao).order('data', { ascending: false });
    setManutencoes(prev => ({ ...prev, [modalManutencao!]: data || [] }));
    setModalManutencao(null);
    setSalvando(false);
    setFormManut({ tipo: 'Preventiva', data: new Date().toISOString().split('T')[0], km: '', custo: '', oficina: '', descricao: '' });
  }

  const totalCustoAno = Object.values(manutencoes).flat().filter(m => new Date(m.data).getFullYear() === new Date().getFullYear()).reduce((acc, m) => acc + Number(m.custo), 0);

  const kpis = [
    { label: 'Total', value: veiculos.length },
    { label: 'Disponíveis', value: veiculos.filter(v => v.status === 'disponivel').length },
    { label: 'Em Uso', value: veiculos.filter(v => v.status === 'em_uso').length },
    { label: 'Em Manutenção', value: veiculos.filter(v => v.status === 'manutencao').length },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Frota</h1>
          <p className="text-sm text-slate-500 mt-1">Controle de veículos e manutenções</p>
        </div>
        {isGestor && (
          <button onClick={() => { setEditandoVeiculo(null); setFormVeiculo({ placa: '', modelo: '', marca: '', ano: '', cor: '', obra_atual: '', status: 'disponivel' }); setErro(''); setModalVeiculo(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors">
            <Plus size={16} />Novo Veículo
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map(({ label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-slate-800">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {totalCustoAno > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-3 flex items-center gap-3">
          <DollarSign size={18} className="text-amber-600" />
          <span className="text-sm text-slate-600">Custo total de manutenções em {new Date().getFullYear()}:</span>
          <span className="font-bold text-slate-800">{totalCustoAno.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
        </div>
      )}

      {/* Veículos */}
      {loading ? (
        <div className="text-center text-slate-400 text-sm py-12">Carregando...</div>
      ) : veiculos.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Truck size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Nenhum veículo cadastrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {veiculos.map(v => {
            const cfg = STATUS_CONFIG[v.status];
            const expanded = expandidos[v.id];
            const manutV = manutencoes[v.id] || [];
            const custoV = manutV.reduce((acc, m) => acc + Number(m.custo), 0);
            return (
              <div key={v.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="bg-slate-100 rounded-xl p-2.5 flex-shrink-0">
                    <Truck size={20} className="text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800">{v.modelo}</p>
                      <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{v.placa}</span>
                      {v.marca && <span className="text-xs text-slate-400">{v.marca}</span>}
                      {v.ano && <span className="text-xs text-slate-400">{v.ano}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${cfg.corBg} ${cfg.cor}`}>{cfg.label}</span>
                      {v.obra_atual && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-500"><MapPin size={10} />{v.obra_atual}</span>
                      )}
                      {manutV.length > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-slate-400"><Wrench size={10} />{manutV.length} manutenções · {custoV.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isGestor && (
                      <button onClick={() => { setModalManutencao(v.id); setErro(''); setFormManut({ tipo: 'Preventiva', data: new Date().toISOString().split('T')[0], km: '', custo: '', oficina: '', descricao: '' }); }}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors">
                        <Wrench size={12} />Manutenção
                      </button>
                    )}
                    <button onClick={() => toggleExpand(v.id)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                      {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  </div>
                </div>

                {expanded && (
                  <div className="border-t border-slate-100">
                    {manutV.length === 0 ? (
                      <p className="px-5 py-4 text-sm text-slate-400">Nenhuma manutenção registrada</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Data</th>
                            <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Tipo</th>
                            <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Oficina</th>
                            <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">KM</th>
                            <th className="text-right px-5 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Custo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {manutV.map(m => (
                            <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-5 py-2.5 text-xs text-slate-500 flex items-center gap-1"><Calendar size={11} />{new Date(m.data).toLocaleDateString('pt-BR')}</td>
                              <td className="px-5 py-2.5 text-xs font-medium text-slate-700">{m.tipo}</td>
                              <td className="px-5 py-2.5 text-xs text-slate-500 hidden md:table-cell">{m.oficina || '—'}</td>
                              <td className="px-5 py-2.5 text-xs text-slate-500 hidden lg:table-cell">{m.km ? m.km.toLocaleString('pt-BR') + ' km' : '—'}</td>
                              <td className="px-5 py-2.5 text-xs font-semibold text-slate-700 text-right">{Number(m.custo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Veículo */}
      {modalVeiculo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModalVeiculo(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">{editandoVeiculo ? 'Editar Veículo' : 'Novo Veículo'}</h3>
              <button onClick={() => setModalVeiculo(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Placa *</label>
                  <input value={formVeiculo.placa} onChange={e => setFormVeiculo(f => ({ ...f, placa: e.target.value }))} placeholder="ABC-1234"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Status</label>
                  <select value={formVeiculo.status} onChange={e => setFormVeiculo(f => ({ ...f, status: e.target.value as StatusVeiculo }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="disponivel">Disponível</option>
                    <option value="em_uso">Em Uso</option>
                    <option value="manutencao">Manutenção</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Modelo *</label>
                  <input value={formVeiculo.modelo} onChange={e => setFormVeiculo(f => ({ ...f, modelo: e.target.value }))} placeholder="Hilux, Sprinter..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Marca</label>
                  <input value={formVeiculo.marca} onChange={e => setFormVeiculo(f => ({ ...f, marca: e.target.value }))} placeholder="Toyota, Mercedes..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Ano</label>
                  <input type="number" min="1990" max="2030" value={formVeiculo.ano} onChange={e => setFormVeiculo(f => ({ ...f, ano: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Cor</label>
                  <input value={formVeiculo.cor} onChange={e => setFormVeiculo(f => ({ ...f, cor: e.target.value }))} placeholder="Branco, Prata..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Obra Atual</label>
                <input value={formVeiculo.obra_atual} onChange={e => setFormVeiculo(f => ({ ...f, obra_atual: e.target.value }))} placeholder="Nome da obra onde está"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setModalVeiculo(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl">Cancelar</button>
              <button onClick={salvarVeiculo} disabled={salvando} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl">
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Manutenção */}
      {modalManutencao && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModalManutencao(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Registrar Manutenção</h3>
              <button onClick={() => setModalManutencao(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Tipo *</label>
                  <select value={formManut.tipo} onChange={e => setFormManut(f => ({ ...f, tipo: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {TIPOS_MANUT.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Data *</label>
                  <input type="date" value={formManut.data} onChange={e => setFormManut(f => ({ ...f, data: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">KM</label>
                  <input type="number" min="0" value={formManut.km} onChange={e => setFormManut(f => ({ ...f, km: e.target.value }))} placeholder="Ex: 45000"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Custo (R$)</label>
                  <input type="number" min="0" step="0.01" value={formManut.custo} onChange={e => setFormManut(f => ({ ...f, custo: e.target.value }))} placeholder="0,00"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Oficina</label>
                <input value={formManut.oficina} onChange={e => setFormManut(f => ({ ...f, oficina: e.target.value }))} placeholder="Nome da oficina"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Descrição do serviço</label>
                <textarea value={formManut.descricao} onChange={e => setFormManut(f => ({ ...f, descricao: e.target.value }))} rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setModalManutencao(null)} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl">Cancelar</button>
              <button onClick={salvarManutencao} disabled={salvando} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl">
                {salvando ? 'Salvando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
