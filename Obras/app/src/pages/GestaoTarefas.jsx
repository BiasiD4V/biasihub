// Página Kanban de Gestão de Tarefas - ERP Obras Biasi
// Padrão visual: azul #233772, Montserrat, Tailwind, rounded-xl, badges
// Responsáveis vinculados a usuários do sistema (mock inicial)

import React, { useState, useEffect } from 'react';
import useObrasAcessiveis from '../hooks/useObrasAcessiveis';
import { obrasService, tarefasService, atividadesService } from '../lib/supabase';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// Mock de usuários do sistema (depois integrar com Supabase)
const usuarios = [
  { id: 1, nome: 'Mariana', avatar: 'M' },
  { id: 2, nome: 'Carlos', avatar: 'C' },
  { id: 3, nome: 'Ricardo', avatar: 'R' },
  { id: 4, nome: 'Thiago', avatar: 'T' },
];

// Mock de tarefas (depois integrar com Supabase)
const tarefasMock = [
  {
    id: 1,
    titulo: 'Aprovar medição de obra Itaququecetuba',
    status: 'LIBERADO',
    prioridade: 'Alta',
    obra: 'SE-138KV-ITQ-001',
    responsavel: 1,
    prazo: '1d',
  },
  {
    id: 2,
    titulo: 'Enviar relatório mensal para a Enel',
    status: 'EM ANDAMENTO',
    prioridade: 'Alta',
    obra: 'SE-138KV-ITQ-001',
    responsavel: 2,
    prazo: '4d',
  },
  {
    id: 3,
    titulo: 'Solicitar liberação de faixas de servidão',
    status: 'IMPEDIMENTO',
    prioridade: 'Média',
    obra: 'LT-69KV-TR1-002',
    responsavel: 3,
    prazo: '6d',
  },
  {
    id: 4,
    titulo: 'Compra de cabos de média tensão 150mm²',
    status: 'CONCLUÍDO',
    prioridade: 'Alta',
    obra: 'SE-138KV-ITQ-001',
    responsavel: 4,
    prazo: '1d atraso',
  },
];

const statusList = [
  { key: 'LIBERADO', label: 'Liberado', color: 'bg-blue-100', border: 'border-blue-200' },
  { key: 'EM ANDAMENTO', label: 'Em Andamento', color: 'bg-orange-100', border: 'border-orange-200' },
  { key: 'IMPEDIMENTO', label: 'Impedimento', color: 'bg-red-100', border: 'border-red-200' },
  { key: 'CONCLUÍDO', label: 'Concluído', color: 'bg-green-100', border: 'border-green-200' },
];


function getUsuario(id) {
  return usuarios.find(u => u.id === id);
}

export default function GestaoTarefas() {
  // Estado para obras reais
  const [obras, setObras] = useState([]);
  const [obrasFiltradas, setObrasFiltradas] = useState([]);
  const obrasAcessiveis = useObrasAcessiveis(obras);
  const [buscaObra, setBuscaObra] = useState('');
  // Estado dos filtros (filtroObra precisa vir ANTES de qualquer uso)
  const [filtroObra, setFiltroObra] = useState(''); // UUID da obra
  // Lista unificada de tarefas (avulsas + planejamento)
  const [tarefas, setTarefas] = useState([]);
  const [filtroOrigem, setFiltroOrigem] = useState('Ambas'); // 'Ambas', 'Avulsa', 'Planejamento'
  const [carregandoTarefas, setCarregandoTarefas] = useState(false);
  const [erroTarefas, setErroTarefas] = useState(null);

  // Carregar obras do Supabase
  useEffect(() => {
    async function fetchObras() {
      try {
        const data = await obrasService.listar();
        setObras(data);
      } catch (err) {
        setObras([]);
      }
    }
    fetchObras();
  }, []);

  // Carregar tarefas avulsas e do planejamento ao trocar filtroObra
  useEffect(() => {
    async function fetchTarefasUnificadas() {
      setCarregandoTarefas(true);
      setErroTarefas(null);
      try {
        // Tarefas avulsas
        const avulsas = await tarefasService.listarPorObra(filtroObra || null) || [];
        // Atividades do planejamento (como tarefas)
        let planejamento = [];
        if (filtroObra) {
          planejamento = await atividadesService.listarPorObra(filtroObra) || [];
        }
        // Normalizar para Kanban: status, prioridade, responsavel, titulo, origem
        const tarefasAvulsas = avulsas.map(t => ({
          ...t,
          origem: 'Avulsa',
          titulo: t.titulo || t.nome || '(Sem título)',
        }));
        const tarefasPlanejamento = planejamento.map(a => ({
          ...a,
          origem: 'Planejamento',
          status: a.status || 'LIBERADO',
          prioridade: a.prioridade || 'Média',
          responsavel: a.responsavel_id || '',
          titulo: a.nome || a.titulo || '(Atividade)',
        }));
        setTarefas([...tarefasAvulsas, ...tarefasPlanejamento]);
      } catch (err) {
        setErroTarefas('Erro ao carregar tarefas');
        setTarefas([]);
      } finally {
        setCarregandoTarefas(false);
      }
    }
    fetchTarefasUnificadas();
  }, [filtroObra]);

  // Filtrar obras pelo input de busca
  useEffect(() => {
    if (!buscaObra) {
      setObrasFiltradas(obrasAcessiveis);
    } else {
      setObrasFiltradas(
        obrasAcessiveis.filter(
          o =>
            (o.nome && o.nome.toLowerCase().includes(buscaObra.toLowerCase())) ||
            (o.codigo && o.codigo.toLowerCase().includes(buscaObra.toLowerCase()))
        )
      );
    }
  }, [buscaObra, obrasAcessiveis]);

  // Estado do modal e formulário
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    titulo: '',
    obra: '',
    responsavel: '',
    prioridade: 'Média',
    prazo: '',
    status: 'LIBERADO',
  });

  // Estado dos filtros (exceto filtroObra, que já está acima)
  const [filtroResponsavel, setFiltroResponsavel] = useState('');
  const [filtroPrioridade, setFiltroPrioridade] = useState('');
  const [busca, setBusca] = useState('');

  // Abrir modal
  const handleNovaTarefa = () => {
    setForm({ titulo: '', obra: '', responsavel: '', prioridade: 'Média', prazo: '', status: 'LIBERADO' });
    setShowModal(true);
  };

  // Fechar modal
  const handleCloseModal = () => setShowModal(false);

  // Atualizar campos do formulário
  const handleChange = e => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
  };

  // Salvar tarefa (mock, depois integrar com Supabase)
  const handleSalvar = e => {
    e.preventDefault();
    if (!form.titulo || !form.obra || !form.responsavel || !form.prazo) return;
    setTarefas(prev => [
      ...prev,
      {
        id: prev.length ? Math.max(...prev.map(t => t.id)) + 1 : 1,
        ...form,
        responsavel: parseInt(form.responsavel),
      },
    ]);
    setShowModal(false);
  };

  // Handler do drag & drop
  const onDragEnd = (result) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    // Se não mudou de coluna, não faz nada
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }
    // Atualiza o status da tarefa
    setTarefas(prevTarefas => {
      const tarefaId = parseInt(draggableId);
      return prevTarefas.map(tarefa =>
        tarefa.id === tarefaId
          ? { ...tarefa, status: destination.droppableId }
          : tarefa
      );
    });
  };

  // Filtragem e busca (agora filtra também por origem)
  const tarefasFiltradas = tarefas.filter(t => {
    const origemOk =
      filtroOrigem === 'Ambas' ||
      (filtroOrigem === 'Avulsa' && t.origem === 'Avulsa') ||
      (filtroOrigem === 'Planejamento' && t.origem === 'Planejamento');
    return (
      origemOk &&
      (!filtroResponsavel || t.responsavel === parseInt(filtroResponsavel)) &&
      (!filtroPrioridade || t.prioridade === filtroPrioridade) &&
      (!busca || t.titulo.toLowerCase().includes(busca.toLowerCase()))
    );
  });

  return (
    <div className="p-6 font-[Montserrat] bg-slate-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-[#233772]">Gestão de Tarefas</h1>
        <button
          className="bg-[#233772] text-white font-bold rounded-xl px-6 py-2 shadow hover:bg-[#1a2954] transition"
          onClick={handleNovaTarefa}
        >
          + Nova Tarefa
        </button>
      </div>

      {/* Filtros principais */}
      <div className="flex flex-wrap gap-3 mb-6 items-end">
                {/* Filtro por origem */}
                <div>
                  <label className="block text-xs font-bold text-[#233772] mb-1">Origem</label>
                  <select value={filtroOrigem} onChange={e => setFiltroOrigem(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2">
                    <option value="Ambas">Ambas</option>
                    <option value="Avulsa">Avulsas</option>
                    <option value="Planejamento">Planejamento</option>
                  </select>
                </div>
        <div>
          <label className="block text-xs font-bold text-[#233772] mb-1">Obra</label>
          <input
            type="text"
            placeholder="Buscar obra por nome/código..."
            value={buscaObra}
            onChange={e => setBuscaObra(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 mb-1 w-full"
          />
          <select
            value={filtroObra}
            onChange={e => setFiltroObra(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 w-full"
          >
            <option value="">Todas</option>
            {obrasFiltradas.map(obra => (
              <option key={obra.id} value={obra.id}>
                {obra.codigo ? obra.codigo + ' - ' : ''}{obra.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-[#233772] mb-1">Responsável</label>
          <select value={filtroResponsavel} onChange={e => setFiltroResponsavel(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2">
            <option value="">Todos</option>
            {usuarios.map(u => (
              <option key={u.id} value={u.id}>{u.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-[#233772] mb-1">Prioridade</label>
          <select value={filtroPrioridade} onChange={e => setFiltroPrioridade(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2">
            <option value="">Todas</option>
            <option value="Alta">Alta</option>
            <option value="Média">Média</option>
            <option value="Baixa">Baixa</option>
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-bold text-[#233772] mb-1">Buscar</label>
          <input type="text" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Título da tarefa..." className="rounded-xl border border-slate-200 px-3 py-2 w-full" />
        </div>
      </div>

      {/* Modal de Nova Tarefa */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <form onSubmit={handleSalvar} className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md border border-slate-200">
            <h2 className="text-xl font-bold text-[#233772] mb-4">Nova Tarefa</h2>
            <div className="mb-3">
              <label className="block text-sm font-bold text-[#233772] mb-1">Título</label>
              <input name="titulo" value={form.titulo} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-bold text-[#233772] mb-1">Obra</label>
              <input name="obra" value={form.obra} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
            </div>
            <div className="mb-3">
              <label className="block text-sm font-bold text-[#233772] mb-1">Responsável</label>
              <select name="responsavel" value={form.responsavel} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-2" required>
                <option value="">Selecione...</option>
                {usuarios.map(u => (
                  <option key={u.id} value={u.id}>{u.nome}</option>
                ))}
              </select>
            </div>
            <div className="mb-3">
              <label className="block text-sm font-bold text-[#233772] mb-1">Prioridade</label>
              <select name="prioridade" value={form.prioridade} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-2">
                <option value="Alta">Alta</option>
                <option value="Média">Média</option>
                <option value="Baixa">Baixa</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="block text-sm font-bold text-[#233772] mb-1">Prazo</label>
              <input name="prazo" value={form.prazo} onChange={handleChange} className="w-full rounded-xl border border-slate-200 px-3 py-2" required />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button type="button" onClick={handleCloseModal} className="px-4 py-2 rounded-xl border border-slate-200 bg-slate-100 text-[#233772] font-bold">Cancelar</button>
              <button type="submit" className="px-4 py-2 rounded-xl bg-[#233772] text-white font-bold shadow hover:bg-[#1a2954]">Salvar</button>
            </div>
          </form>
        </div>
      )}

      {erroTarefas && (
        <div className="bg-red-100 text-red-700 font-bold rounded-xl px-4 py-2 mb-4">{erroTarefas}</div>
      )}
      {carregandoTarefas ? (
        <div className="text-[#233772] font-bold text-center py-8">Carregando tarefas...</div>
      ) : (
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {statusList.map(status => (
            <Droppable droppableId={status.key} key={status.key}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`rounded-xl shadow border ${status.border} p-3 flex flex-col min-h-[300px] transition ${snapshot.isDraggingOver ? 'bg-slate-100' : ''}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-[#233772] uppercase text-sm">{status.label}</span>
                    <span className="bg-slate-200 text-xs font-bold rounded-full px-2">{
                      tarefasFiltradas.filter(t => t.status === status.key).length
                    }</span>
                  </div>
                  <div className="flex-1 space-y-3 min-h-[40px]">
                    {tarefasFiltradas
                      .filter(t => t.status === status.key)
                      .map((tarefa, idx) => {
                        const user = getUsuario(tarefa.responsavel);
                        return (
                          <Draggable draggableId={String(tarefa.id) + '-' + tarefa.origem} index={idx} key={String(tarefa.id) + '-' + tarefa.origem}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`bg-white rounded-xl p-4 shadow border border-slate-200 hover:bg-slate-50 transition ${snapshot.isDragging ? 'ring-2 ring-[#233772]' : ''}`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-xs font-bold rounded px-2 py-0.5 ${
                                    tarefa.prioridade === 'Alta' ? 'bg-red-100 text-red-700' :
                                    tarefa.prioridade === 'Média' ? 'bg-yellow-100 text-yellow-700' :
                                    'bg-green-100 text-green-700'
                                  }`}>{tarefa.prioridade}</span>
                                  <span className="text-xs text-slate-400">{tarefa.prazo}</span>
                                  {/* Badge de origem com visual aprimorado */}
                                  <span
                                    className={
                                      tarefa.origem === 'Planejamento'
                                        ? 'bg-[#e6edfa] text-[#233772] font-bold rounded-xl px-2 py-0.5 text-xs border border-[#b6c6e3] shadow-sm'
                                        : 'bg-slate-100 text-slate-600 font-bold rounded-xl px-2 py-0.5 text-xs border border-slate-200 shadow-sm'
                                    }
                                    style={{ letterSpacing: '0.5px' }}
                                  >
                                    {tarefa.origem}
                                  </span>
                                </div>
                                <div className="font-semibold text-[#233772] mb-1">{tarefa.titulo}</div>
                                <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                                  <span className="font-bold">{tarefa.obra || tarefa.obra_id}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center font-bold text-[#233772]">
                                    {user?.avatar}
                                  </span>
                                  <span className="text-sm font-medium text-[#233772]">{user?.nome}</span>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                    {provided.placeholder}
                  </div>
                </div>
              )}
            </Droppable>
          ))}
        </div>
      </DragDropContext>
      )}
    </div>
  );
}
