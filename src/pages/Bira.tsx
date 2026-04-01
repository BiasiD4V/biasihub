import { useEffect, useState, useRef } from 'react';
import {
  Plus, X, Calendar,
  Bug, Zap, BookOpen, CheckCircle2, AlertTriangle,
  ArrowUp, ArrowDown, Minus, Pencil, Trash2,
  LayoutGrid, List, Search,
} from 'lucide-react';
import { supabase } from '../infrastructure/supabase/client';
import { useAuth } from '../context/AuthContext';

// ── Types ──────────────────────────────────────────────
interface Tarefa {
  id: string;
  codigo: string;
  titulo: string;
  descricao: string | null;
  status: string;
  prioridade: string;
  tipo: string;
  responsavel_id: string | null;
  responsavel_nome: string | null;
  criador_id: string;
  criador_nome: string;
  data_limite: string | null;
  ordem: number;
  criado_em: string;
  atualizado_em: string;
}

interface MembroSimples {
  id: string;
  nome: string;
}

// ── Constants ──────────────────────────────────────────
const COLUNAS = [
  { id: 'backlog', titulo: 'Backlog', cor: 'bg-slate-100 border-slate-300', badge: 'bg-slate-200 text-slate-700' },
  { id: 'a_fazer', titulo: 'A Fazer', cor: 'bg-blue-50 border-blue-300', badge: 'bg-blue-100 text-blue-700' },
  { id: 'em_andamento', titulo: 'Em Andamento', cor: 'bg-yellow-50 border-yellow-300', badge: 'bg-yellow-100 text-yellow-700' },
  { id: 'revisao', titulo: 'Revisão', cor: 'bg-purple-50 border-purple-300', badge: 'bg-purple-100 text-purple-700' },
  { id: 'concluido', titulo: 'Concluído', cor: 'bg-green-50 border-green-300', badge: 'bg-green-100 text-green-700' },
];

const PRIORIDADE_CONFIG: Record<string, { icon: React.ElementType; cor: string; label: string }> = {
  critica: { icon: AlertTriangle, cor: 'text-red-600', label: 'Crítica' },
  alta: { icon: ArrowUp, cor: 'text-orange-500', label: 'Alta' },
  media: { icon: Minus, cor: 'text-yellow-500', label: 'Média' },
  baixa: { icon: ArrowDown, cor: 'text-blue-400', label: 'Baixa' },
};

const TIPO_CONFIG: Record<string, { icon: React.ElementType; cor: string; label: string }> = {
  tarefa: { icon: CheckCircle2, cor: 'text-blue-500', label: 'Tarefa' },
  bug: { icon: Bug, cor: 'text-red-500', label: 'Bug' },
  melhoria: { icon: Zap, cor: 'text-green-500', label: 'Melhoria' },
  historia: { icon: BookOpen, cor: 'text-purple-500', label: 'História' },
};

// ── Component ──────────────────────────────────────────
export function Bira() {
  const { usuario } = useAuth();
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [membros, setMembros] = useState<MembroSimples[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroResponsavel, setFiltroResponsavel] = useState('');
  const [filtroPrioridade, setFiltroPrioridade] = useState('');
  const [vista, setVista] = useState<'kanban' | 'lista'>('kanban');

  // Modal nova tarefa
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoTarefa, setEditandoTarefa] = useState<Tarefa | null>(null);
  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    status: 'backlog',
    prioridade: 'media',
    tipo: 'tarefa',
    responsavel_id: '',
    data_limite: '',
  });
  const [salvando, setSalvando] = useState(false);

  // Drag
  const dragRef = useRef<{ tarefaId: string; origem: string } | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  // ── Load data ────────────────────────────────────────
  useEffect(() => {
    loadTarefas();
    loadMembros();

    const channel = supabase
      .channel('bira-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bira_tarefas' }, () => {
        loadTarefas();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function loadTarefas() {
    const { data } = await supabase
      .from('bira_tarefas')
      .select('*')
      .order('ordem', { ascending: true })
      .order('criado_em', { ascending: false });
    if (data) setTarefas(data as Tarefa[]);
    setLoading(false);
  }

  async function loadMembros() {
    const { data } = await supabase
      .from('usuarios')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome');
    if (data) setMembros(data as MembroSimples[]);
  }

  // ── CRUD ─────────────────────────────────────────────
  function abrirNovaTarefa(status = 'backlog') {
    setEditandoTarefa(null);
    setForm({ titulo: '', descricao: '', status, prioridade: 'media', tipo: 'tarefa', responsavel_id: '', data_limite: '' });
    setModalAberto(true);
  }

  function abrirEdicao(t: Tarefa) {
    setEditandoTarefa(t);
    setForm({
      titulo: t.titulo,
      descricao: t.descricao || '',
      status: t.status,
      prioridade: t.prioridade,
      tipo: t.tipo,
      responsavel_id: t.responsavel_id || '',
      data_limite: t.data_limite || '',
    });
    setModalAberto(true);
  }

  async function salvarTarefa() {
    if (!form.titulo.trim() || !usuario) return;
    setSalvando(true);

    const responsavelNome = form.responsavel_id
      ? membros.find((m) => m.id === form.responsavel_id)?.nome || null
      : null;

    if (editandoTarefa) {
      await supabase.from('bira_tarefas').update({
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim() || null,
        status: form.status,
        prioridade: form.prioridade,
        tipo: form.tipo,
        responsavel_id: form.responsavel_id || null,
        responsavel_nome: responsavelNome,
        data_limite: form.data_limite || null,
        atualizado_em: new Date().toISOString(),
      }).eq('id', editandoTarefa.id);
    } else {
      const codigo = `BIRA-${String(tarefas.length + 1).padStart(3, '0')}`;
      await supabase.from('bira_tarefas').insert({
        codigo,
        titulo: form.titulo.trim(),
        descricao: form.descricao.trim() || null,
        status: form.status,
        prioridade: form.prioridade,
        tipo: form.tipo,
        responsavel_id: form.responsavel_id || null,
        responsavel_nome: responsavelNome,
        criador_id: usuario.id,
        criador_nome: usuario.nome,
        data_limite: form.data_limite || null,
        ordem: tarefas.filter((t) => t.status === form.status).length,
      });
    }

    setSalvando(false);
    setModalAberto(false);
    loadTarefas();
  }

  async function excluirTarefa(id: string) {
    await supabase.from('bira_tarefas').delete().eq('id', id);
    loadTarefas();
  }

  // ── Drag and Drop ────────────────────────────────────
  function onDragStart(tarefaId: string, origem: string) {
    dragRef.current = { tarefaId, origem };
  }

  function onDragOver(e: React.DragEvent, colunaId: string) {
    e.preventDefault();
    setDragOver(colunaId);
  }

  function onDragLeave() {
    setDragOver(null);
  }

  async function onDrop(colunaId: string) {
    setDragOver(null);
    if (!dragRef.current) return;
    const { tarefaId, origem } = dragRef.current;
    dragRef.current = null;
    if (origem === colunaId) return;

    await supabase.from('bira_tarefas').update({
      status: colunaId,
      atualizado_em: new Date().toISOString(),
    }).eq('id', tarefaId);
    loadTarefas();
  }

  // ── Filters ──────────────────────────────────────────
  const tarefasFiltradas = tarefas.filter((t) => {
    if (busca && !t.titulo.toLowerCase().includes(busca.toLowerCase()) && !t.codigo.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtroResponsavel && t.responsavel_id !== filtroResponsavel) return false;
    if (filtroPrioridade && t.prioridade !== filtroPrioridade) return false;
    return true;
  });

  // ── Render ───────────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Bira</h1>
            <p className="text-sm text-slate-500">Gestão de tarefas da equipe</p>
          </div>
          <button
            onClick={() => abrirNovaTarefa()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            Nova Tarefa
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg px-3 py-1.5 flex-1 min-w-[200px] max-w-sm">
            <Search size={15} className="text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar tarefa..."
              className="bg-transparent text-sm flex-1 outline-none"
            />
          </div>

          <select
            value={filtroResponsavel}
            onChange={(e) => setFiltroResponsavel(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5"
          >
            <option value="">Todos</option>
            {membros.map((m) => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>

          <select
            value={filtroPrioridade}
            onChange={(e) => setFiltroPrioridade(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-1.5"
          >
            <option value="">Prioridade</option>
            {Object.entries(PRIORIDADE_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
            <button
              onClick={() => setVista('kanban')}
              className={`p-1.5 rounded-md transition-colors ${vista === 'kanban' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setVista('lista')}
              className={`p-1.5 rounded-md transition-colors ${vista === 'lista' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <List size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Board */}
      {vista === 'kanban' ? (
        <div className="flex-1 overflow-x-auto p-4">
          <div className="flex gap-4 min-w-max h-full">
            {COLUNAS.map((col) => {
              const items = tarefasFiltradas.filter((t) => t.status === col.id);
              return (
                <div
                  key={col.id}
                  className={`w-72 flex flex-col rounded-xl border-2 ${dragOver === col.id ? 'border-blue-400 bg-blue-50/50' : col.cor} transition-colors`}
                  onDragOver={(e) => onDragOver(e, col.id)}
                  onDragLeave={onDragLeave}
                  onDrop={() => onDrop(col.id)}
                >
                  {/* Column header */}
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200/50">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-700">{col.titulo}</h3>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${col.badge}`}>
                        {items.length}
                      </span>
                    </div>
                    <button
                      onClick={() => abrirNovaTarefa(col.id)}
                      className="p-1 rounded hover:bg-slate-200/60 text-slate-400 hover:text-slate-600"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Cards */}
                  <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {items.map((t) => {
                      const prioConfig = PRIORIDADE_CONFIG[t.prioridade];
                      const tipoConfig = TIPO_CONFIG[t.tipo];
                      const PrioIcon = prioConfig?.icon || Minus;
                      const TipoIcon = tipoConfig?.icon || CheckCircle2;
                      const vencida = t.data_limite && new Date(t.data_limite) < new Date() && t.status !== 'concluido';

                      return (
                        <div
                          key={t.id}
                          draggable
                          onDragStart={() => onDragStart(t.id, t.status)}
                          className="bg-white rounded-lg border border-slate-200 p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group"
                        >
                          <div className="flex items-start justify-between gap-1 mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <TipoIcon size={13} className={tipoConfig?.cor} />
                              <span className="text-[10px] font-mono text-slate-400">{t.codigo}</span>
                            </div>
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => abrirEdicao(t)} className="p-0.5 rounded hover:bg-slate-100">
                                <Pencil size={12} className="text-slate-400" />
                              </button>
                              <button onClick={() => excluirTarefa(t.id)} className="p-0.5 rounded hover:bg-red-50">
                                <Trash2 size={12} className="text-red-400" />
                              </button>
                            </div>
                          </div>

                          <p className="text-sm font-medium text-slate-800 mb-2 line-clamp-2">{t.titulo}</p>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <PrioIcon size={13} className={prioConfig?.cor} />
                              {t.data_limite && (
                                <span className={`flex items-center gap-1 text-[10px] ${vencida ? 'text-red-600 font-semibold' : 'text-slate-400'}`}>
                                  <Calendar size={10} />
                                  {new Date(t.data_limite).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                                </span>
                              )}
                            </div>
                            {t.responsavel_nome && (
                              <div className="bg-blue-100 rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0" title={t.responsavel_nome}>
                                <span className="text-[10px] font-bold text-blue-700">
                                  {t.responsavel_nome.charAt(0)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Lista view */
        <div className="flex-1 overflow-auto p-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Código</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Título</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Prioridade</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Responsável</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Prazo</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tarefasFiltradas.map((t) => {
                  const prioConfig = PRIORIDADE_CONFIG[t.prioridade];
                  const tipoConfig = TIPO_CONFIG[t.tipo];
                  const TipoIcon = tipoConfig?.icon || CheckCircle2;
                  const coluna = COLUNAS.find((c) => c.id === t.status);
                  return (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <TipoIcon size={14} className={tipoConfig?.cor} />
                          <span className="font-mono text-xs text-slate-500">{t.codigo}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-800 max-w-xs truncate">{t.titulo}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${coluna?.badge}`}>
                          {coluna?.titulo}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-xs font-medium ${prioConfig?.cor}`}>{prioConfig?.label}</span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-500">{t.responsavel_nome || '—'}</td>
                      <td className="px-4 py-2.5 text-slate-500 text-xs">
                        {t.data_limite ? new Date(t.data_limite).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1">
                          <button onClick={() => abrirEdicao(t)} className="p-1 rounded hover:bg-blue-50">
                            <Pencil size={14} className="text-slate-400" />
                          </button>
                          <button onClick={() => excluirTarefa(t.id)} className="p-1 rounded hover:bg-red-50">
                            <Trash2 size={14} className="text-red-400" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Nova/Editar Tarefa */}
      {modalAberto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModalAberto(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">
                {editandoTarefa ? `Editar ${editandoTarefa.codigo}` : 'Nova Tarefa'}
              </h3>
              <button onClick={() => setModalAberto(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Título *</label>
                <input
                  type="text"
                  value={form.titulo}
                  onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none"
                  placeholder="Ex: Implementar filtro de clientes"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Descrição</label>
                <textarea
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 outline-none resize-none"
                  placeholder="Detalhes da tarefa..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  >
                    {COLUNAS.map((c) => (
                      <option key={c.id} value={c.id}>{c.titulo}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Prioridade</label>
                  <select
                    value={form.prioridade}
                    onChange={(e) => setForm({ ...form, prioridade: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  >
                    {Object.entries(PRIORIDADE_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Tipo</label>
                  <select
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  >
                    {Object.entries(TIPO_CONFIG).map(([k, v]) => (
                      <option key={k} value={k}>{v.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 mb-1 block">Responsável</label>
                  <select
                    value={form.responsavel_id}
                    onChange={(e) => setForm({ ...form, responsavel_id: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Nenhum</option>
                    {membros.map((m) => (
                      <option key={m.id} value={m.id}>{m.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 mb-1 block">Prazo</label>
                <input
                  type="date"
                  value={form.data_limite}
                  onChange={(e) => setForm({ ...form, data_limite: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-100">
              <button
                onClick={() => setModalAberto(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={salvarTarefa}
                disabled={!form.titulo.trim() || salvando}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {salvando ? 'Salvando...' : editandoTarefa ? 'Salvar' : 'Criar Tarefa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
