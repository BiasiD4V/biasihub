import { useEffect, useMemo, useState, type DragEvent, type ElementType, type FormEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  Filter,
  GripVertical,
  History,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Truck,
  User,
  X,
} from 'lucide-react';
import type {
  TarefaAlmoxarifado,
  TarefaAlmoxarifadoHistorico,
  TarefaAlmoxarifadoObra,
  TarefaAlmoxarifadoPrioridade,
  TarefaAlmoxarifadoRastreio,
  TarefaAlmoxarifadoStatus,
  TarefaAlmoxarifadoTipo,
  TarefaAlmoxarifadoUsuario,
} from '../domain/entities/TarefaAlmoxarifado';
import {
  tarefasAlmoxarifadoRepository,
  type TarefaAlmoxarifadoInput,
} from '../infrastructure/supabase/tarefasAlmoxarifadoRepository';
import { useAuth } from '../context/AuthContext';

const PAGE_CARD =
  'rounded-[24px] border border-[var(--biasi-border-accent)] bg-[var(--biasi-card)] shadow-[0_22px_45px_rgba(0,0,0,0.28)]';
const FIELD =
  'w-full min-h-[48px] rounded-[14px] border border-[var(--biasi-border-accent)] bg-[var(--biasi-input)] px-4 py-3 text-sm text-[#f4f7ff] outline-none transition placeholder:text-[#b8c5eb] focus:border-[var(--biasi-button-hover)] disabled:cursor-not-allowed disabled:opacity-60';
const LABEL = 'text-[10px] font-black uppercase tracking-[0.18em] text-[var(--biasi-accent)]';

const STATUS_OPTIONS: Array<{ value: TarefaAlmoxarifadoStatus; label: string; short: string }> = [
  { value: 'a_fazer', label: 'A Fazer', short: 'Fila' },
  { value: 'em_andamento', label: 'Em Andamento', short: 'Execucao' },
  { value: 'aguardando', label: 'Aguardando', short: 'Bloqueio' },
  { value: 'concluido', label: 'Concluido', short: 'Feito' },
  { value: 'cancelado', label: 'Cancelado', short: 'Cancelado' },
];

const PRIORIDADE_OPTIONS: Array<{ value: TarefaAlmoxarifadoPrioridade; label: string }> = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
];

const TIPO_OPTIONS: Array<{ value: TarefaAlmoxarifadoTipo; label: string }> = [
  { value: 'separacao_material', label: 'Separacao de material' },
  { value: 'entrega_obra', label: 'Entrega em obra' },
  { value: 'conferencia_estoque', label: 'Conferencia de estoque' },
  { value: 'recebimento_material', label: 'Recebimento de material' },
  { value: 'organizacao_almoxarifado', label: 'Organizacao do almoxarifado' },
  { value: 'controle_ferramentas', label: 'Controle de ferramentas' },
  { value: 'manutencao_veiculo', label: 'Manutencao de veiculo' },
  { value: 'compra_solicitacao_material', label: 'Compra/Solicitacao de material' },
  { value: 'inventario', label: 'Inventario' },
  { value: 'outro', label: 'Outro' },
];

const EMPTY_FORM: TarefaAlmoxarifadoInput = {
  title: '',
  description: '',
  type: 'separacao_material',
  priority: 'media',
  status: 'a_fazer',
  responsibleName: '',
  responsibleUserId: '',
  obraId: '',
  obraNome: '',
  relatedRequisitionId: '',
  dueDate: '',
  observations: '',
};

const prioridadeStyle: Record<TarefaAlmoxarifadoPrioridade, string> = {
  baixa: 'border-white/10 bg-[var(--biasi-card)]',
  media: 'border-[var(--biasi-border-accent)] bg-[var(--biasi-card-2)]',
  alta: 'border-amber-300/45 bg-amber-950/25',
  urgente: 'border-rose-300/55 bg-rose-950/30 shadow-[0_0_24px_rgba(244,63,94,0.14)]',
};

const prioridadeDot: Record<TarefaAlmoxarifadoPrioridade, string> = {
  baixa: 'bg-slate-400',
  media: 'bg-cyan-400',
  alta: 'bg-amber-400',
  urgente: 'bg-rose-500',
};

const colunaAccent: Record<TarefaAlmoxarifadoStatus, string> = {
  a_fazer: 'border-sky-300/25 before:bg-sky-400',
  em_andamento: 'border-cyan-300/25 before:bg-cyan-300',
  aguardando: 'border-amber-300/35 before:bg-amber-300',
  concluido: 'border-emerald-300/25 before:bg-emerald-300',
  cancelado: 'border-rose-300/30 before:bg-rose-400',
};

const historicoLabel: Record<string, string> = {
  created: 'Criou a tarefa',
  updated: 'Atualizou dados da tarefa',
  status_changed: 'Alterou o status',
  responsible_changed: 'Alterou o responsavel',
  priority_changed: 'Alterou a prioridade',
  due_date_changed: 'Alterou o prazo',
  obra_changed: 'Alterou a obra',
  requisition_link_changed: 'Vinculou rastreio',
};

function hojeISO() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}
function formatarData(valor?: string | null) {
  if (!valor) return 'Sem prazo';
  const [ano, mes, dia] = valor.slice(0, 10).split('-');
  if (!ano || !mes || !dia) return valor;
  return `${dia}/${mes}/${ano}`;
}

function formatarDataHora(valor?: string | null) {
  if (!valor) return '-';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(valor));
}

function labelStatus(status: TarefaAlmoxarifadoStatus) {
  return STATUS_OPTIONS.find((item) => item.value === status)?.label ?? status;
}

function labelPrioridade(priority: TarefaAlmoxarifadoPrioridade) {
  return PRIORIDADE_OPTIONS.find((item) => item.value === priority)?.label ?? priority;
}

function labelTipo(type: TarefaAlmoxarifadoTipo) {
  return TIPO_OPTIONS.find((item) => item.value === type)?.label ?? type;
}

function tarefaAberta(tarefa: TarefaAlmoxarifado) {
  return tarefa.status !== 'concluido' && tarefa.status !== 'cancelado';
}

function normalizarTexto(valor?: string | null) {
  return (valor ?? '').trim().toLowerCase();
}

function erroMensagem(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

export function KanbanAlmoxarifado() {
  const { usuario } = useAuth();
  const papel = (usuario?.papel ?? '').toLowerCase();
  const isGestor = ['admin', 'dono', 'gestor'].includes(papel);
  const usuarioId = usuario?.id ?? '';
  const usuarioNome = normalizarTexto(usuario?.nome);

  const [tarefas, setTarefas] = useState<TarefaAlmoxarifado[]>([]);
  const [usuarios, setUsuarios] = useState<TarefaAlmoxarifadoUsuario[]>([]);
  const [obras, setObras] = useState<TarefaAlmoxarifadoObra[]>([]);
  const [rastreios, setRastreios] = useState<TarefaAlmoxarifadoRastreio[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const [busca, setBusca] = useState('');
  const [filtroResponsavel, setFiltroResponsavel] = useState('');
  const [filtroPrioridade, setFiltroPrioridade] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroObra, setFiltroObra] = useState('');
  const [somenteVencidas, setSomenteVencidas] = useState(false);

  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<TarefaAlmoxarifado | null>(null);
  const [form, setForm] = useState<TarefaAlmoxarifadoInput>(EMPTY_FORM);
  const [salvando, setSalvando] = useState(false);
  const [historico, setHistorico] = useState<TarefaAlmoxarifadoHistorico[]>([]);
  const [carregandoHistorico, setCarregandoHistorico] = useState(false);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [movendoTaskId, setMovendoTaskId] = useState<string | null>(null);

  const hoje = useMemo(() => hojeISO(), []);

  async function carregarBase() {
    setLoading(true);
    setErro('');
    try {
      const [tarefasData, usuariosData, obrasData, rastreiosData] = await Promise.all([
        tarefasAlmoxarifadoRepository.listarTarefas(),
        tarefasAlmoxarifadoRepository.listarUsuarios(),
        tarefasAlmoxarifadoRepository.listarObras(),
        tarefasAlmoxarifadoRepository.listarRastreios(),
      ]);

      setTarefas(tarefasData);
      setUsuarios(usuariosData);
      setObras(obrasData);
      setRastreios(rastreiosData);
    } catch (err) {
      setErro(erroMensagem(err, 'Erro ao carregar o Kanban.'));
      setTarefas([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregarBase();
  }, []);

  const tarefasVisiveisBase = useMemo(() => {
    if (isGestor) return tarefas;
    return tarefas.filter(
      (tarefa) =>
        tarefa.responsibleUserId === usuarioId ||
        normalizarTexto(tarefa.responsibleName) === usuarioNome,
    );
  }, [isGestor, tarefas, usuarioId, usuarioNome]);

  const responsaveisDisponiveis = useMemo(() => {
    const nomes = new Set<string>();
    usuarios.forEach((item) => {
      if (item.nome?.trim()) nomes.add(item.nome.trim());
    });
    tarefas.forEach((item) => {
      if (item.responsibleName?.trim()) nomes.add(item.responsibleName.trim());
    });
    return Array.from(nomes).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [tarefas, usuarios]);

  const obrasDisponiveis = useMemo(() => {
    const nomes = new Set<string>();
    obras.forEach((item) => {
      if (item.nome?.trim()) nomes.add(item.nome.trim());
    });
    rastreios.forEach((item) => {
      if (item.obra?.trim()) nomes.add(item.obra.trim());
    });
    tarefas.forEach((item) => {
      if (item.obraNome?.trim()) nomes.add(item.obraNome.trim());
    });
    return Array.from(nomes).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [obras, rastreios, tarefas]);

  const rastreiosFiltrados = useMemo(() => {
    const obra = normalizarTexto(form.obraNome);
    const lista = obra
      ? rastreios.filter((item) => normalizarTexto(item.obra) === obra)
      : rastreios;
    return lista.slice(0, 80);
  }, [form.obraNome, rastreios]);

  const tarefasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return tarefasVisiveisBase.filter((tarefa) => {
      const texto = [
        tarefa.title,
        tarefa.description,
        tarefa.responsibleName,
        tarefa.obraNome ?? '',
        labelTipo(tarefa.type),
      ].join(' ').toLowerCase();

      if (q && !texto.includes(q)) return false;
      if (filtroResponsavel && tarefa.responsibleName !== filtroResponsavel) return false;
      if (filtroPrioridade && tarefa.priority !== filtroPrioridade) return false;
      if (filtroStatus && tarefa.status !== filtroStatus) return false;
      if (filtroTipo && tarefa.type !== filtroTipo) return false;
      if (filtroObra && tarefa.obraNome !== filtroObra) return false;
      if (somenteVencidas && (!tarefa.dueDate || tarefa.dueDate >= hoje || !tarefaAberta(tarefa))) return false;
      return true;
    });
  }, [
    busca,
    filtroObra,
    filtroPrioridade,
    filtroResponsavel,
    filtroStatus,
    filtroTipo,
    hoje,
    somenteVencidas,
    tarefasVisiveisBase,
  ]);

  const indicadores = useMemo(() => {
    const abertas = tarefasVisiveisBase.filter(tarefaAberta);
    const atrasadas = abertas.filter((tarefa) => tarefa.dueDate && tarefa.dueDate < hoje);
    const urgentes = abertas.filter((tarefa) => tarefa.priority === 'urgente');
    const mesAtual = hoje.slice(0, 7);
    const concluidasMes = tarefasVisiveisBase.filter(
      (tarefa) => tarefa.status === 'concluido' && (tarefa.completedAt ?? tarefa.updatedAt).slice(0, 7) === mesAtual,
    );

    return {
      abertas: abertas.length,
      atrasadas: atrasadas.length,
      urgentes: urgentes.length,
      concluidasMes: concluidasMes.length,
    };
  }, [hoje, tarefasVisiveisBase]);

  const readonlyModal = editando ? !podeEditar(editando) : !isGestor;

  function podeEditar(tarefa: TarefaAlmoxarifado) {
    return (
      isGestor ||
      tarefa.responsibleUserId === usuarioId ||
      normalizarTexto(tarefa.responsibleName) === usuarioNome
    );
  }

  function abrirNovaTarefa() {
    if (!isGestor) return;
    setEditando(null);
    setHistorico([]);
    setForm({ ...EMPTY_FORM });
    setErro('');
    setModalAberto(true);
  }

  async function abrirEdicao(tarefa: TarefaAlmoxarifado) {
    setEditando(tarefa);
    setForm({
      title: tarefa.title,
      description: tarefa.description,
      type: tarefa.type,
      priority: tarefa.priority,
      status: tarefa.status,
      responsibleName: tarefa.responsibleName,
      responsibleUserId: tarefa.responsibleUserId ?? '',
      obraId: tarefa.obraId ?? '',
      obraNome: tarefa.obraNome ?? '',
      relatedRequisitionId: tarefa.relatedRequisitionId ?? '',
      dueDate: tarefa.dueDate ?? '',
      observations: tarefa.observations,
    });
    setErro('');
    setModalAberto(true);
    setCarregandoHistorico(true);
    try {
      setHistorico(await tarefasAlmoxarifadoRepository.listarHistorico(tarefa.id));
    } catch {
      setHistorico([]);
    } finally {
      setCarregandoHistorico(false);
    }
  }

  function fecharModal() {
    setModalAberto(false);
    setEditando(null);
    setHistorico([]);
    setForm({ ...EMPTY_FORM });
  }

  function atualizarForm<K extends keyof TarefaAlmoxarifadoInput>(key: K, value: TarefaAlmoxarifadoInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function atualizarResponsavel(nome: string) {
    const usuarioEncontrado = usuarios.find((item) => normalizarTexto(item.nome) === normalizarTexto(nome));
    setForm((prev) => ({
      ...prev,
      responsibleName: nome,
      responsibleUserId: usuarioEncontrado?.id ?? '',
    }));
  }

  function atualizarObra(nome: string) {
    const obraEncontrada = obras.find(
      (item) => item.origem !== 'rastreio' && normalizarTexto(item.nome) === normalizarTexto(nome),
    );
    setForm((prev) => {
      const rastreioAtual = rastreios.find((item) => item.id === prev.relatedRequisitionId);
      const mantemRastreio = rastreioAtual && normalizarTexto(rastreioAtual.obra) === normalizarTexto(nome);
      return {
        ...prev,
        obraNome: nome,
        obraId: obraEncontrada?.id ?? '',
        relatedRequisitionId: mantemRastreio ? prev.relatedRequisitionId : '',
      };
    });
  }

  function atualizarRastreio(id: string) {
    const rastreio = rastreios.find((item) => item.id === id);
    setForm((prev) => {
      if (!rastreio) return { ...prev, relatedRequisitionId: '' };
      const obraEncontrada = obras.find(
        (item) => item.origem !== 'rastreio' && normalizarTexto(item.nome) === normalizarTexto(rastreio.obra),
      );
      return {
        ...prev,
        relatedRequisitionId: rastreio.id,
        obraNome: prev.obraNome?.trim() ? prev.obraNome : rastreio.obra,
        obraId: obraEncontrada?.id ?? prev.obraId ?? '',
      };
    });
  }

  function validarForm() {
    if (!form.title.trim()) return 'Informe o titulo da tarefa.';
    if (!form.responsibleName.trim()) return 'Defina um responsavel.';
    if (!form.priority) return 'Defina a prioridade.';
    if (!form.status) return 'Defina o status.';
    return '';
  }

  async function salvarTarefa(event: FormEvent) {
    event.preventDefault();
    const erroValidacao = validarForm();
    if (erroValidacao) {
      setErro(erroValidacao);
      return;
    }
    if (!editando && !isGestor) {
      setErro('Apenas gestores podem criar tarefas.');
      return;
    }
    if (editando && !podeEditar(editando)) {
      setErro('Voce nao tem permissao para editar esta tarefa.');
      return;
    }

    setSalvando(true);
    setErro('');
    try {
      const payload = {
        ...form,
        responsibleName: isGestor ? form.responsibleName : editando?.responsibleName ?? form.responsibleName,
        responsibleUserId: isGestor ? form.responsibleUserId : editando?.responsibleUserId ?? form.responsibleUserId,
      };
      const tarefaSalva = editando
        ? await tarefasAlmoxarifadoRepository.atualizarTarefa(editando, payload, usuarioId, usuarios)
        : await tarefasAlmoxarifadoRepository.criarTarefa(payload, usuarioId);

      setTarefas((prev) => {
        if (editando) return prev.map((item) => (item.id === tarefaSalva.id ? tarefaSalva : item));
        return [tarefaSalva, ...prev];
      });
      fecharModal();
    } catch (err) {
      setErro(erroMensagem(err, 'Erro ao salvar tarefa.'));
    } finally {
      setSalvando(false);
    }
  }

  async function excluirTarefa() {
    if (!editando || !isGestor) return;
    const confirmar = window.confirm('Excluir esta tarefa? Esta acao nao pode ser desfeita.');
    if (!confirmar) return;

    setSalvando(true);
    setErro('');
    try {
      await tarefasAlmoxarifadoRepository.excluirTarefa(editando.id);
      setTarefas((prev) => prev.filter((item) => item.id !== editando.id));
      fecharModal();
    } catch (err) {
      setErro(erroMensagem(err, 'Erro ao excluir tarefa.'));
    } finally {
      setSalvando(false);
    }
  }

  function handleDragStart(event: DragEvent<HTMLDivElement>, tarefa: TarefaAlmoxarifado) {
    if (!podeEditar(tarefa)) {
      event.preventDefault();
      return;
    }
    setDraggingTaskId(tarefa.id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', tarefa.id);
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }

  async function handleDrop(event: DragEvent<HTMLDivElement>, status: TarefaAlmoxarifadoStatus) {
    event.preventDefault();
    const taskId = event.dataTransfer.getData('text/plain') || draggingTaskId;
    setDraggingTaskId(null);
    if (!taskId) return;

    const tarefa = tarefas.find((item) => item.id === taskId);
    if (!tarefa || tarefa.status === status || !podeEditar(tarefa)) return;

    setMovendoTaskId(taskId);
    setErro('');
    try {
      const atualizada = await tarefasAlmoxarifadoRepository.moverTarefa(tarefa, status, usuarioId);
      setTarefas((prev) => prev.map((item) => (item.id === atualizada.id ? atualizada : item)));
    } catch (err) {
      setErro(erroMensagem(err, 'Erro ao mover tarefa.'));
    } finally {
      setMovendoTaskId(null);
    }
  }

  const filtrosAtivos =
    busca || filtroResponsavel || filtroPrioridade || filtroStatus || filtroTipo || filtroObra || somenteVencidas;

  function limparFiltros() {
    setBusca('');
    setFiltroResponsavel('');
    setFiltroPrioridade('');
    setFiltroStatus('');
    setFiltroTipo('');
    setFiltroObra('');
    setSomenteVencidas(false);
  }

  return (
    <div className="min-h-full p-4 lg:p-6 text-white">
      <div className="mx-auto max-w-[1680px] space-y-5">
        <header className={`${PAGE_CARD} p-5 lg:p-6`}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[var(--biasi-border-accent)] bg-white/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-white">
                <ClipboardList size={14} />
                Kanban Almoxarifado
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-white">Tarefas do Almoxarifado</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-300">
                Organize separacoes, entregas, compras, ferramentas e pendencias da equipe em um quadro visual unico.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void carregarBase()}
                disabled={loading}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-white/20 bg-white/5 px-4 text-sm font-bold text-white transition hover:bg-white/10 disabled:opacity-60"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                Atualizar
              </button>
              {isGestor && (
                <button
                  type="button"
                  onClick={abrirNovaTarefa}
                  className="inline-flex h-11 items-center gap-2 rounded-2xl border border-[var(--biasi-border-accent)] bg-[var(--biasi-button)] px-4 text-sm font-black text-white transition hover:bg-[var(--biasi-button-hover)]"
                >
                  <Plus size={16} />
                  Nova Tarefa
                </button>
              )}
            </div>
          </div>
        </header>

        {erro && (
          <div className="rounded-2xl border border-rose-300/25 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100">
            {erro}
          </div>
        )}

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <IndicadorCard icon={ClipboardList} label="Tarefas abertas" value={indicadores.abertas} tone="cyan" />
          <IndicadorCard icon={Clock} label="Tarefas atrasadas" value={indicadores.atrasadas} tone="amber" />
          <IndicadorCard icon={AlertTriangle} label="Urgentes" value={indicadores.urgentes} tone="rose" />
          <IndicadorCard icon={CheckCircle2} label="Concluidas no mes" value={indicadores.concluidasMes} tone="emerald" />
        </section>

        <section className={`${PAGE_CARD} p-4`}>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(220px,1.5fr)_repeat(5,minmax(150px,1fr))_auto]">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
              <input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar por tarefa, descricao, responsavel ou obra..."
                className={`${FIELD} pl-11`}
              />
            </div>
            <SelectFiltro value={filtroResponsavel} onChange={setFiltroResponsavel} label="Todos os responsaveis">
              {responsaveisDisponiveis.map((nome) => (
                <option key={nome} value={nome}>{nome}</option>
              ))}
            </SelectFiltro>
            <SelectFiltro value={filtroPrioridade} onChange={setFiltroPrioridade} label="Todas as prioridades">
              {PRIORIDADE_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </SelectFiltro>
            <SelectFiltro value={filtroStatus} onChange={setFiltroStatus} label="Todos os status">
              {STATUS_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </SelectFiltro>
            <SelectFiltro value={filtroTipo} onChange={setFiltroTipo} label="Todos os tipos">
              {TIPO_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </SelectFiltro>
            <SelectFiltro value={filtroObra} onChange={setFiltroObra} label="Todas as obras">
              {obrasDisponiveis.map((nome) => (
                <option key={nome} value={nome}>{nome}</option>
              ))}
            </SelectFiltro>
            <div className="flex items-center gap-2 rounded-2xl border border-[var(--biasi-border-accent)] bg-[var(--biasi-input)] px-4 py-3">
              <input
                id="filtro-vencidas"
                type="checkbox"
                checked={somenteVencidas}
                onChange={(event) => setSomenteVencidas(event.target.checked)}
                className="h-4 w-4 rounded border-white/30 bg-transparent accent-[var(--biasi-button)]"
              />
              <label htmlFor="filtro-vencidas" className="whitespace-nowrap text-xs font-bold text-slate-200">
                Prazo vencido
              </label>
            </div>
          </div>

          {filtrosAtivos && (
            <button
              type="button"
              onClick={limparFiltros}
              className="mt-3 inline-flex items-center gap-2 rounded-xl border border-white/20 px-3 py-2 text-xs font-black uppercase tracking-[0.16em] text-slate-200 transition hover:bg-white/10"
            >
              <Filter size={14} />
              Limpar filtros
            </button>
          )}
        </section>

        <section className="overflow-x-auto pb-3">
          <div className="grid min-w-[1420px] grid-cols-5 gap-4">
            {STATUS_OPTIONS.map((coluna) => {
              const tarefasColuna = tarefasFiltradas.filter((tarefa) => tarefa.status === coluna.value);
              return (
                <div
                  key={coluna.value}
                  onDragOver={handleDragOver}
                  onDrop={(event) => void handleDrop(event, coluna.value)}
                  className={`relative min-h-[560px] overflow-hidden rounded-[24px] border bg-[var(--biasi-card)] p-3 shadow-[0_12px_28px_rgba(0,0,0,0.18)] before:absolute before:inset-x-4 before:top-0 before:h-1 before:rounded-b-full ${colunaAccent[coluna.value]}`}
                >
                  <div className="mb-3 flex items-center justify-between gap-2 px-1">
                    <div>
                      <h2 className="text-sm font-black uppercase tracking-[0.14em] text-white">{coluna.label}</h2>
                      <p className="text-[11px] font-semibold text-slate-300">{coluna.short}</p>
                    </div>
                    <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-black text-white">
                      {tarefasColuna.length}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {loading ? (
                      <ColumnSkeleton />
                    ) : tarefasColuna.length ? (
                      tarefasColuna.map((tarefa) => (
                        <TarefaCard
                          key={tarefa.id}
                          tarefa={tarefa}
                          hoje={hoje}
                          moving={movendoTaskId === tarefa.id}
                          draggable={podeEditar(tarefa)}
                          onDragStart={handleDragStart}
                          onOpen={() => void abrirEdicao(tarefa)}
                        />
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/20 bg-slate-950/20 p-4 text-center text-xs font-semibold text-slate-400">
                        Nenhuma tarefa aqui.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {modalAberto && createPortal((
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[28px] border border-[var(--biasi-border-accent)] bg-[var(--biasi-shell)] shadow-[0_30px_90px_rgba(0,0,0,0.5)]">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--biasi-border-accent)] bg-[var(--biasi-card)] p-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--biasi-accent)]">
                  {editando ? 'Detalhe da tarefa' : 'Nova tarefa'}
                </p>
                <h2 className="mt-1 text-2xl font-black text-white">
                  {editando ? editando.title : 'Criar tarefa do Almoxarifado'}
                </h2>
                {readonlyModal && (
                  <p className="mt-2 text-xs font-semibold text-amber-100">
                    Visualizacao liberada. Edicao somente para gestor ou responsavel.
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={fecharModal}
                className="rounded-2xl border border-white/10 p-2 text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[calc(92vh-92px)] overflow-y-auto p-5">
              <form onSubmit={(event) => void salvarTarefa(event)} className="grid gap-5 xl:grid-cols-[1fr_320px]">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="space-y-2 md:col-span-2">
                      <span className={LABEL}>Titulo *</span>
                      <input
                        value={form.title}
                        onChange={(event) => atualizarForm('title', event.target.value)}
                        disabled={readonlyModal}
                        className={FIELD}
                        placeholder="Ex.: Separar materiais da Obra X"
                      />
                    </label>

                    <label className="space-y-2 md:col-span-2">
                      <span className={LABEL}>Descricao</span>
                      <textarea
                        value={form.description}
                        onChange={(event) => atualizarForm('description', event.target.value)}
                        disabled={readonlyModal}
                        className={`${FIELD} min-h-[110px] resize-y`}
                        placeholder="Detalhe o que precisa ser feito."
                      />
                    </label>

                    <label className="space-y-2">
                      <span className={LABEL}>Tipo de tarefa</span>
                      <select
                        value={form.type}
                        onChange={(event) => atualizarForm('type', event.target.value as TarefaAlmoxarifadoTipo)}
                        disabled={readonlyModal}
                        className={FIELD}
                      >
                        {TIPO_OPTIONS.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className={LABEL}>Responsavel *</span>
                      <input
                        value={form.responsibleName}
                        onChange={(event) => atualizarResponsavel(event.target.value)}
                        disabled={readonlyModal || (!!editando && !isGestor)}
                        list="kanban-almox-responsaveis"
                        className={FIELD}
                        placeholder="Digite o nome do responsavel"
                      />
                      <datalist id="kanban-almox-responsaveis">
                        {responsaveisDisponiveis.map((nome) => (
                          <option key={nome} value={nome} />
                        ))}
                      </datalist>
                    </label>

                    <label className="space-y-2">
                      <span className={LABEL}>Obra / origem</span>
                      <input
                        value={form.obraNome ?? ''}
                        onChange={(event) => atualizarObra(event.target.value)}
                        disabled={readonlyModal}
                        list="kanban-almox-obras"
                        className={FIELD}
                        placeholder="Digite ou selecione a obra"
                      />
                      <datalist id="kanban-almox-obras">
                        {obrasDisponiveis.map((nome) => (
                          <option key={nome} value={nome} />
                        ))}
                      </datalist>
                    </label>

                    <label className="space-y-2">
                      <span className={LABEL}>Rastreio relacionado</span>
                      <select
                        value={form.relatedRequisitionId ?? ''}
                        onChange={(event) => atualizarRastreio(event.target.value)}
                        disabled={readonlyModal}
                        className={FIELD}
                      >
                        <option value="">Sem vinculo</option>
                        {rastreiosFiltrados.map((item) => (
                          <option key={item.id} value={item.id}>{item.label}</option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className={LABEL}>Prioridade *</span>
                      <select
                        value={form.priority}
                        onChange={(event) => atualizarForm('priority', event.target.value as TarefaAlmoxarifadoPrioridade)}
                        disabled={readonlyModal}
                        className={FIELD}
                      >
                        {PRIORIDADE_OPTIONS.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2">
                      <span className={LABEL}>Prazo previsto</span>
                      <input
                        type="date"
                        value={form.dueDate ?? ''}
                        onChange={(event) => atualizarForm('dueDate', event.target.value)}
                        disabled={readonlyModal}
                        className={FIELD}
                      />
                    </label>

                    <label className="space-y-2">
                      <span className={LABEL}>Status *</span>
                      <select
                        value={form.status}
                        onChange={(event) => atualizarForm('status', event.target.value as TarefaAlmoxarifadoStatus)}
                        disabled={readonlyModal}
                        className={FIELD}
                      >
                        {STATUS_OPTIONS.map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                    </label>

                    <label className="space-y-2 md:col-span-2">
                      <span className={LABEL}>Observacoes</span>
                      <textarea
                        value={form.observations}
                        onChange={(event) => atualizarForm('observations', event.target.value)}
                        disabled={readonlyModal}
                        className={`${FIELD} min-h-[96px] resize-y`}
                        placeholder="Dependencias, fornecedor, telefone, detalhes internos..."
                      />
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4">
                    <div className="text-xs font-semibold text-slate-400">
                      {editando ? (
                        <>
                          Criado por {editando.createdByName ?? 'sistema'} em {formatarDataHora(editando.createdAt)}.
                          {' '}Atualizado em {formatarDataHora(editando.updatedAt)}.
                        </>
                      ) : (
                        'Campos com * sao obrigatorios.'
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {editando && isGestor && (
                        <button
                          type="button"
                          onClick={() => void excluirTarefa()}
                          disabled={salvando}
                          className="inline-flex h-11 items-center gap-2 rounded-2xl border border-rose-300/30 bg-rose-500/10 px-4 text-sm font-black text-rose-100 transition hover:bg-rose-500/20 disabled:opacity-60"
                        >
                          <Trash2 size={16} />
                          Excluir
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={fecharModal}
                        className="h-11 rounded-2xl border border-white/20 px-4 text-sm font-bold text-white transition hover:bg-white/10"
                      >
                        Fechar
                      </button>
                      {!readonlyModal && (
                        <button
                          type="submit"
                          disabled={salvando}
                          className="h-11 rounded-2xl border border-[var(--biasi-border-accent)] bg-[var(--biasi-button)] px-5 text-sm font-black text-white transition hover:bg-[var(--biasi-button-hover)] disabled:opacity-60"
                        >
                          {salvando ? 'Salvando...' : 'Salvar tarefa'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <aside className="space-y-4">
                  <div className={`${PAGE_CARD} p-4`}>
                    <h3 className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--biasi-accent)]">Resumo</h3>
                    <div className="mt-4 space-y-3 text-sm">
                      <ResumoLinha icon={User} label="Responsavel" value={form.responsibleName.trim() || 'A definir'} />
                      <ResumoLinha icon={ClipboardList} label="Status" value={labelStatus(form.status)} />
                      <ResumoLinha icon={AlertTriangle} label="Prioridade" value={labelPrioridade(form.priority)} />
                      <ResumoLinha icon={Building2} label="Obra" value={form.obraNome?.trim() || 'Sem obra'} />
                      <ResumoLinha
                        icon={Truck}
                        label="Rastreio"
                        value={rastreios.find((item) => item.id === form.relatedRequisitionId)?.label ?? 'Sem vinculo'}
                      />
                      <ResumoLinha icon={Calendar} label="Prazo" value={formatarData(form.dueDate)} />
                    </div>
                  </div>

                  {editando && (
                    <div className={`${PAGE_CARD} p-4`}>
                      <div className="flex items-center gap-2">
                        <History size={16} className="text-[var(--biasi-accent)]" />
                        <h3 className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--biasi-accent)]">Historico</h3>
                      </div>
                      <div className="mt-4 space-y-3">
                        {carregandoHistorico ? (
                          <p className="text-xs font-semibold text-slate-400">Carregando historico...</p>
                        ) : historico.length ? (
                          historico.map((item) => (
                            <div key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/25 p-3">
                              <p className="text-xs font-black text-white">{historicoLabel[item.action] ?? item.action}</p>
                              {(item.oldValue || item.newValue) && (
                                <p className="mt-1 text-[11px] text-slate-300">
                                  {item.oldValue ?? '-'} {'->'} {item.newValue ?? '-'}
                                </p>
                              )}
                              <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                                {item.userName ?? 'Sistema'} - {formatarDataHora(item.createdAt)}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs font-semibold text-slate-400">Sem movimentacoes registradas.</p>
                        )}
                      </div>
                    </div>
                  )}
                </aside>
              </form>
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}

function SelectFiltro({
  value,
  onChange,
  label,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className={FIELD}>
      <option value="">{label}</option>
      {children}
    </select>
  );
}

function IndicadorCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: ElementType;
  label: string;
  value: number;
  tone: 'cyan' | 'amber' | 'rose' | 'emerald';
}) {
  const toneClass = {
    cyan: 'text-cyan-100 bg-cyan-400/10 border-cyan-300/25',
    amber: 'text-amber-100 bg-amber-400/10 border-amber-300/25',
    rose: 'text-rose-100 bg-rose-400/10 border-rose-300/25',
    emerald: 'text-emerald-100 bg-emerald-400/10 border-emerald-300/25',
  }[tone];

  return (
    <div className={`${PAGE_CARD} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-300">{label}</p>
          <p className="mt-3 text-3xl font-black text-white">{value}</p>
        </div>
        <div className={`rounded-2xl border p-3 ${toneClass}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function TarefaCard({
  tarefa,
  hoje,
  moving,
  draggable,
  onDragStart,
  onOpen,
}: {
  tarefa: TarefaAlmoxarifado;
  hoje: string;
  moving: boolean;
  draggable: boolean;
  onDragStart: (event: DragEvent<HTMLDivElement>, tarefa: TarefaAlmoxarifado) => void;
  onOpen: () => void;
}) {
  const vencida = tarefa.dueDate ? tarefa.dueDate < hoje && tarefaAberta(tarefa) : false;

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={(event) => onDragStart(event, tarefa)}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') onOpen();
      }}
      className={`group cursor-pointer rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:bg-white/[0.09] ${prioridadeStyle[tarefa.priority]} ${
        moving ? 'opacity-60' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${prioridadeDot[tarefa.priority]}`} />
            <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-200">
              {labelPrioridade(tarefa.priority)}
            </span>
            {vencida && (
              <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-white">
                Vencida
              </span>
            )}
          </div>
          <h3 className="line-clamp-2 text-sm font-black leading-snug text-white">{tarefa.title}</h3>
        </div>
        <GripVertical size={16} className={`mt-1 flex-shrink-0 ${draggable ? 'text-slate-400 group-hover:text-white' : 'text-slate-600'}`} />
      </div>

      {tarefa.description && (
        <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-slate-300">{tarefa.description}</p>
      )}

      <div className="mt-4 space-y-2 text-[11px] font-semibold text-slate-300">
        <div className="flex items-center gap-2">
          <User size={13} className="text-slate-400" />
          <span className="truncate">{tarefa.responsibleName}</span>
        </div>
        {tarefa.obraNome && (
          <div className="flex items-center gap-2">
            <Building2 size={13} className="text-slate-400" />
            <span className="truncate">{tarefa.obraNome}</span>
          </div>
        )}
        {tarefa.relatedRequisitionLabel && (
          <div className="flex items-center gap-2">
            <Truck size={13} className="text-slate-400" />
            <span className="truncate">{tarefa.relatedRequisitionLabel}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Calendar size={13} className={vencida ? 'text-rose-300' : 'text-slate-400'} />
          <span className={vencida ? 'text-rose-100' : ''}>{formatarData(tarefa.dueDate)}</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3">
        <span className="rounded-full border border-white/10 bg-slate-950/25 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-200">
          {labelTipo(tarefa.type)}
        </span>
        <span className="text-[10px] font-semibold text-slate-500">{formatarDataHora(tarefa.updatedAt)}</span>
      </div>
    </div>
  );
}

function ColumnSkeleton() {
  return (
    <>
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-36 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
      ))}
    </>
  );
}

function ResumoLinha({
  icon: Icon,
  label,
  value,
}: {
  icon: ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/25 p-3">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon size={14} />
        <span className="text-[10px] font-black uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p className="mt-2 text-sm font-bold text-white">{value}</p>
    </div>
  );
}
