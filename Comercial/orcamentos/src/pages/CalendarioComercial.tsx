import { type ElementType, type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Briefcase,
  Calendar,
  CalendarCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Plane,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  calendarioComercialEventosRepository,
  type CalendarioComercialEvento,
  type ComercialEventoTipo,
} from '../infrastructure/supabase/calendarioComercialEventosRepository';
import {
  comercialReunioesRepository,
  type ReuniaoSemanal,
} from '../infrastructure/supabase/comercialReunioesRepository';

const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

type EventoTipoMeta = {
  label: string;
  cor: string;
  bg: string;
  icon: ElementType;
};

const eventoTipos: Record<ComercialEventoTipo, EventoTipoMeta> = {
  visita_tecnica: {
    label: 'Visita tecnica',
    cor: '#28d2c0',
    bg: 'rgba(40, 210, 192, 0.16)',
    icon: Briefcase,
  },
  ferias: {
    label: 'Ferias',
    cor: '#f4b44f',
    bg: 'rgba(244, 180, 79, 0.16)',
    icon: Plane,
  },
  pessoal: {
    label: 'Pessoal',
    cor: '#9b7cff',
    bg: 'rgba(155, 124, 255, 0.16)',
    icon: UserRound,
  },
  externo: {
    label: 'Evento externo',
    cor: '#4b8cff',
    bg: 'rgba(75, 140, 255, 0.16)',
    icon: CalendarCheck,
  },
  treinamento: {
    label: 'Treinamento',
    cor: '#7ad66d',
    bg: 'rgba(122, 214, 109, 0.16)',
    icon: ClipboardList,
  },
  plantao: {
    label: 'Plantao / cobertura',
    cor: '#ff8b5f',
    bg: 'rgba(255, 139, 95, 0.16)',
    icon: AlertTriangle,
  },
  outro: {
    label: 'Outro',
    cor: '#cbd5e1',
    bg: 'rgba(203, 213, 225, 0.13)',
    icon: Calendar,
  },
};

const initialEventoForm = {
  titulo: '',
  tipo: 'visita_tecnica' as ComercialEventoTipo,
  descricao: '',
  pessoa: '',
  substituto: '',
  inicio: dateKey(new Date()),
  fim: '',
};

function toDate(value: string) {
  return new Date(`${value}T12:00:00`);
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function buildMonthDays(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

function eventoNoDia(evento: CalendarioComercialEvento, dia: string) {
  const fim = evento.fim || evento.inicio;
  return dia >= evento.inicio && dia <= fim;
}

function eventoEmMes(evento: CalendarioComercialEvento, mes: Date) {
  const inicioMes = new Date(mes.getFullYear(), mes.getMonth(), 1);
  const fimMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0);
  const inicio = toDate(evento.inicio);
  const fim = toDate(evento.fim || evento.inicio);

  return inicio <= fimMes && fim >= inicioMes;
}

function proximoOuAtual(date: string) {
  return date >= dateKey(new Date());
}

export function CalendarioComercial() {
  const navigate = useNavigate();
  const { usuario } = useAuth();
  const [mes, setMes] = useState(() => new Date());
  const [reunioes, setReunioes] = useState<ReuniaoSemanal[]>([]);
  const [eventos, setEventos] = useState<CalendarioComercialEvento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [modalEventoAberto, setModalEventoAberto] = useState(false);
  const [salvandoEvento, setSalvandoEvento] = useState(false);
  const [erroEvento, setErroEvento] = useState<string | null>(null);
  const [eventoForm, setEventoForm] = useState(initialEventoForm);

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [reunioesData, eventosData] = await Promise.all([
        comercialReunioesRepository.listar(),
        calendarioComercialEventosRepository.listar(),
      ]);
      setReunioes(reunioesData);
      setEventos(eventosData);
    } catch (error) {
      console.error('Erro ao carregar calendario comercial:', error);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const dias = useMemo(() => buildMonthDays(mes), [mes]);
  const hoje = dateKey(new Date());

  const reunioesPorDia = useMemo(() => {
    const map = new Map<string, ReuniaoSemanal[]>();
    for (const reuniao of reunioes) {
      const current = map.get(reuniao.data) ?? [];
      current.push(reuniao);
      map.set(reuniao.data, current);
    }
    return map;
  }, [reunioes]);

  const eventosPorDia = useMemo(() => {
    const map = new Map<string, CalendarioComercialEvento[]>();
    for (const dia of dias) {
      const key = dateKey(dia);
      const eventosDia = eventos.filter((evento) => eventoNoDia(evento, key));
      if (eventosDia.length > 0) map.set(key, eventosDia);
    }
    return map;
  }, [dias, eventos]);

  const reunioesMes = reunioes.filter((reuniao) => {
    const data = toDate(reuniao.data);
    return data.getMonth() === mes.getMonth() && data.getFullYear() === mes.getFullYear();
  });
  const eventosMes = eventos.filter((evento) => eventoEmMes(evento, mes));
  const acoesMes = reunioesMes.reduce(
    (total, reuniao) => total + reuniao.dados.reduce((acc, card) => acc + card.solutions.length, 0),
    0
  );
  const participantesReuniao = reunioesMes.flatMap((reuniao) => reuniao.dados.map((card) => card.name));
  const participantesEvento = eventosMes.flatMap((evento) => [evento.pessoa, evento.substituto].filter(Boolean) as string[]);
  const participantesMes = new Set([...participantesReuniao, ...participantesEvento]).size;
  const coberturasMes = new Set(eventosMes.map((evento) => evento.substituto).filter(Boolean)).size;

  const proximasPautas = useMemo(
    () => reunioes.filter((reuniao) => proximoOuAtual(reuniao.data)).sort((a, b) => a.data.localeCompare(b.data)).slice(0, 6),
    [reunioes]
  );

  const proximosEventos = useMemo(
    () => eventos.filter((evento) => proximoOuAtual(evento.fim || evento.inicio)).sort((a, b) => a.inicio.localeCompare(b.inicio)).slice(0, 6),
    [eventos]
  );

  function mudarMes(delta: number) {
    setMes((atual) => new Date(atual.getFullYear(), atual.getMonth() + delta, 1));
  }

  function abrirNovoEvento(data?: string) {
    setEventoForm({
      ...initialEventoForm,
      inicio: data ?? dateKey(new Date()),
      fim: '',
    });
    setErroEvento(null);
    setModalEventoAberto(true);
  }

  async function salvarEvento(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErroEvento(null);

    const titulo = eventoForm.titulo.trim();
    const pessoa = eventoForm.pessoa.trim();
    const substituto = eventoForm.substituto.trim();

    if (!titulo || !pessoa || !eventoForm.inicio) {
      setErroEvento('Preencha titulo, pessoa acompanhada e data de inicio.');
      return;
    }

    if (eventoForm.fim && eventoForm.fim < eventoForm.inicio) {
      setErroEvento('A data final nao pode ser anterior ao inicio.');
      return;
    }

    setSalvandoEvento(true);
    try {
      await calendarioComercialEventosRepository.criar({
        titulo,
        tipo: eventoForm.tipo,
        descricao: eventoForm.descricao,
        pessoa,
        substituto,
        inicio: eventoForm.inicio,
        fim: eventoForm.fim || null,
        dia_inteiro: true,
        criado_por: usuario?.id ?? null,
        criado_por_nome: usuario?.nome ?? usuario?.email ?? null,
      });
      setModalEventoAberto(false);
      await carregar();
    } catch (error) {
      console.error('Erro ao salvar evento comercial:', error);
      setErroEvento('Nao foi possivel salvar o evento. Confira se a tabela ja existe no Supabase.');
    } finally {
      setSalvandoEvento(false);
    }
  }

  async function excluirEvento(id: string) {
    if (!window.confirm('Excluir este evento do calendario?')) return;
    try {
      await calendarioComercialEventosRepository.deletar(id);
      await carregar();
    } catch (error) {
      console.error('Erro ao excluir evento comercial:', error);
    }
  }

  return (
    <div className="min-h-full px-4 py-5 lg:px-8 lg:py-7 text-white">
      <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#FFC82D]">
            <Calendar size={14} />
            Calendario Comercial
          </div>
          <h1 className="text-3xl font-black tracking-tight">Agenda do time comercial</h1>
          <p className="mt-2 max-w-2xl text-sm font-medium text-slate-300">
            Reunioes, visitas, ferias, eventos pessoais e coberturas em um calendario unico.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void carregar()}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-black uppercase tracking-[0.12em] text-slate-100 transition-colors hover:bg-white/10"
          >
            <RefreshCw size={15} className={carregando ? 'animate-spin' : ''} />
            Atualizar
          </button>
          <button
            type="button"
            onClick={() => abrirNovoEvento()}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#28d2c0] px-4 text-xs font-black uppercase tracking-[0.12em] text-slate-950 transition-transform hover:-translate-y-0.5"
          >
            <Plus size={15} />
            Novo evento
          </button>
          <button
            type="button"
            onClick={() => navigate('/reunioes')}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#FFC82D] px-4 text-xs font-black uppercase tracking-[0.12em] text-slate-950 transition-transform hover:-translate-y-0.5"
          >
            <ClipboardList size={15} />
            Nova reuniao
          </button>
        </div>
      </header>

      <section className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Reunioes no mes</span>
          <strong className="mt-2 block text-3xl font-black">{reunioesMes.length}</strong>
          <span className="mt-1 block text-xs font-semibold text-slate-400">{acoesMes} acoes registradas</span>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Eventos no mes</span>
          <strong className="mt-2 block text-3xl font-black">{eventosMes.length}</strong>
          <span className="mt-1 block text-xs font-semibold text-slate-400">visitas, ferias e avisos</span>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Coberturas definidas</span>
          <strong className="mt-2 block text-3xl font-black">{coberturasMes}</strong>
          <span className="mt-1 block text-xs font-semibold text-slate-400">quem assume se der ruim</span>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.055] p-4">
          <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">Pessoas envolvidas</span>
          <strong className="mt-2 block text-3xl font-black">{participantesMes}</strong>
          <span className="mt-1 block text-xs font-semibold text-slate-400">reunioes e eventos</span>
        </div>
      </section>

      <section className="overflow-x-auto rounded-3xl border border-white/10 bg-white/[0.045] shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-3 border-b border-white/10 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-black capitalize">{monthLabel(mes)}</h2>
            <p className="text-xs font-semibold text-slate-400">Clique em uma reuniao para abrir a pauta ou adicione evento direto no dia.</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => mudarMes(-1)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
              aria-label="Mes anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => setMes(new Date())}
              className="h-10 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-black uppercase tracking-[0.14em] text-slate-100 hover:bg-white/10"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => mudarMes(1)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-100 hover:bg-white/10"
              aria-label="Proximo mes"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-white/10 bg-white/[0.035]">
          {diasSemana.map((dia) => (
            <div key={dia} className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              {dia}
            </div>
          ))}
        </div>

        <div className="grid min-w-[980px] grid-cols-7">
          {dias.map((dia) => {
            const key = dateKey(dia);
            const reunioesDia = reunioesPorDia.get(key) ?? [];
            const eventosDia = eventosPorDia.get(key) ?? [];
            const totalDia = reunioesDia.length + eventosDia.length;
            const foraDoMes = dia.getMonth() !== mes.getMonth();
            const isHoje = key === hoje;

            return (
              <div
                key={key}
                className={`min-h-[164px] border-b border-r border-white/10 p-2 ${foraDoMes ? 'bg-black/15 text-slate-600' : 'bg-white/[0.018]'}`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-lg text-xs font-black ${
                      isHoje ? 'bg-[#FFC82D] text-slate-950' : 'text-slate-300'
                    }`}
                  >
                    {dia.getDate()}
                  </span>
                  {totalDia > 0 && (
                    <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] font-black text-slate-200">
                      {totalDia}
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  {eventosDia.slice(0, 2).map((evento) => {
                    const meta = eventoTipos[evento.tipo];
                    const Icon = meta.icon;

                    return (
                      <div
                        key={evento.id}
                        className="rounded-xl border px-2 py-2 text-left"
                        style={{ borderColor: meta.cor, background: meta.bg }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="line-clamp-1 text-[11px] font-black text-white">{evento.titulo}</span>
                          <button
                            type="button"
                            onClick={() => void excluirEvento(evento.id)}
                            className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-md text-slate-300 hover:bg-white/10 hover:text-white"
                            aria-label="Excluir evento"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                        <span className="mt-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.08em]" style={{ color: meta.cor }}>
                          <Icon size={11} />
                          {meta.label}
                        </span>
                        <span className="mt-1 block line-clamp-1 text-[10px] font-semibold text-slate-300">
                          {evento.pessoa}
                          {evento.substituto ? ` -> ${evento.substituto}` : ' -> sem cobertura'}
                        </span>
                      </div>
                    );
                  })}

                  {reunioesDia.slice(0, 2).map((reuniao) => (
                    <button
                      type="button"
                      key={reuniao.id}
                      onClick={() => navigate('/reunioes')}
                      className="block w-full rounded-xl border border-white/10 bg-white/[0.07] px-2 py-2 text-left transition-colors hover:bg-white/[0.12]"
                    >
                      <span className="line-clamp-1 text-[11px] font-black text-white">{reuniao.titulo}</span>
                      <span className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                        <Users size={11} />
                        {reuniao.dados.length} pessoas
                      </span>
                    </button>
                  ))}

                  {totalDia > eventosDia.slice(0, 2).length + reunioesDia.slice(0, 2).length && (
                    <span className="block rounded-lg px-2 py-1 text-[10px] font-black text-[#FFC82D]">
                      +{totalDia - eventosDia.slice(0, 2).length - reunioesDia.slice(0, 2).length} item(ns)
                    </span>
                  )}

                  {!foraDoMes && (
                    <button
                      type="button"
                      onClick={() => abrirNovoEvento(key)}
                      className="mt-1 w-full rounded-lg border border-dashed border-white/10 px-2 py-1.5 text-left text-[10px] font-black uppercase tracking-[0.08em] text-slate-400 hover:border-[#28d2c0]/70 hover:text-[#28d2c0]"
                    >
                      + evento
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-4">
          <div className="mb-3 flex items-center gap-2">
            <ClipboardList size={18} className="text-[#FFC82D]" />
            <h3 className="text-sm font-black uppercase tracking-[0.14em]">Proximas pautas</h3>
          </div>
          <div className="grid gap-2">
            {proximasPautas.map((reuniao) => (
              <button
                type="button"
                key={reuniao.id}
                onClick={() => navigate('/reunioes')}
                className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-left hover:bg-white/[0.09]"
              >
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  {toDate(reuniao.data).toLocaleDateString('pt-BR')}
                </span>
                <strong className="mt-2 block text-sm font-black text-white">{reuniao.titulo}</strong>
                <p className="mt-1 line-clamp-2 text-xs text-slate-400">{reuniao.resumo || 'Sem resumo cadastrado.'}</p>
              </button>
            ))}
            {!carregando && proximasPautas.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/15 p-6 text-sm font-semibold text-slate-400">
                Nenhuma reuniao futura cadastrada.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/[0.045] p-4">
          <div className="mb-3 flex items-center gap-2">
            <CalendarCheck size={18} className="text-[#28d2c0]" />
            <h3 className="text-sm font-black uppercase tracking-[0.14em]">Proximos eventos</h3>
          </div>
          <div className="grid gap-2">
            {proximosEventos.map((evento) => {
              const meta = eventoTipos[evento.tipo];
              const Icon = meta.icon;

              return (
                <div key={evento.id} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: meta.cor }}>
                        <Icon size={13} />
                        {meta.label}
                      </span>
                      <strong className="mt-2 block text-sm font-black text-white">{evento.titulo}</strong>
                      <p className="mt-1 text-xs font-semibold text-slate-300">
                        {evento.pessoa}
                        {evento.substituto ? ` / cobertura: ${evento.substituto}` : ' / sem cobertura definida'}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-black text-slate-300">
                      <Clock size={11} />
                      {toDate(evento.inicio).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  {evento.descricao && <p className="mt-3 line-clamp-2 text-xs text-slate-400">{evento.descricao}</p>}
                </div>
              );
            })}
            {!carregando && proximosEventos.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/15 p-6 text-sm font-semibold text-slate-400">
                Nenhum evento futuro cadastrado.
              </div>
            )}
          </div>
        </div>
      </section>

      {modalEventoAberto && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
          <form
            onSubmit={(event) => void salvarEvento(event)}
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-white/10 bg-[#101722] p-5 text-white shadow-2xl shadow-black/40"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#28d2c0]/40 bg-[#28d2c0]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#28d2c0]">
                  <CalendarCheck size={13} />
                  Evento comercial
                </span>
                <h2 className="mt-3 text-2xl font-black">Adicionar evento</h2>
                <p className="mt-1 text-sm font-medium text-slate-400">
                  Registre visita tecnica, ferias, assunto pessoal ou cobertura do time.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalEventoAberto(false)}
                className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                aria-label="Fechar modal"
              >
                <X size={18} />
              </button>
            </div>

            {erroEvento && (
              <div className="mb-4 rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">
                {erroEvento}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="md:col-span-2">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Titulo *</span>
                <input
                  value={eventoForm.titulo}
                  onChange={(event) => setEventoForm((atual) => ({ ...atual, titulo: event.target.value }))}
                  placeholder="Ex.: Visita tecnica na obra X"
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold outline-none ring-[#28d2c0]/40 placeholder:text-slate-500 focus:ring-2"
                />
              </label>

              <label>
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Tipo *</span>
                <select
                  value={eventoForm.tipo}
                  onChange={(event) => setEventoForm((atual) => ({ ...atual, tipo: event.target.value as ComercialEventoTipo }))}
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold outline-none ring-[#28d2c0]/40 focus:ring-2"
                >
                  {Object.entries(eventoTipos).map(([key, meta]) => (
                    <option key={key} value={key}>
                      {meta.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Pessoa acompanhada *</span>
                <input
                  value={eventoForm.pessoa}
                  onChange={(event) => setEventoForm((atual) => ({ ...atual, pessoa: event.target.value }))}
                  placeholder="Ex.: Guilherme, Valdir, Leonardo..."
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold outline-none ring-[#28d2c0]/40 placeholder:text-slate-500 focus:ring-2"
                />
              </label>

              <label>
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Inicio *</span>
                <input
                  type="date"
                  value={eventoForm.inicio}
                  onChange={(event) => setEventoForm((atual) => ({ ...atual, inicio: event.target.value }))}
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold outline-none ring-[#28d2c0]/40 focus:ring-2"
                />
              </label>

              <label>
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Fim</span>
                <input
                  type="date"
                  value={eventoForm.fim}
                  onChange={(event) => setEventoForm((atual) => ({ ...atual, fim: event.target.value }))}
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold outline-none ring-[#28d2c0]/40 focus:ring-2"
                />
              </label>

              <label className="md:col-span-2">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Quem assume se der ruim</span>
                <input
                  value={eventoForm.substituto}
                  onChange={(event) => setEventoForm((atual) => ({ ...atual, substituto: event.target.value }))}
                  placeholder="Nome da pessoa de cobertura"
                  className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-sm font-semibold outline-none ring-[#28d2c0]/40 placeholder:text-slate-500 focus:ring-2"
                />
              </label>

              <label className="md:col-span-2">
                <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Observacoes</span>
                <textarea
                  value={eventoForm.descricao}
                  onChange={(event) => setEventoForm((atual) => ({ ...atual, descricao: event.target.value }))}
                  placeholder="Detalhes, local, motivo, risco, observacoes para o time..."
                  className="min-h-[110px] w-full resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold outline-none ring-[#28d2c0]/40 placeholder:text-slate-500 focus:ring-2"
                />
              </label>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setModalEventoAberto(false)}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-5 text-xs font-black uppercase tracking-[0.12em] text-slate-100 hover:bg-white/10"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={salvandoEvento}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#28d2c0] px-5 text-xs font-black uppercase tracking-[0.12em] text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Save size={15} />
                {salvandoEvento ? 'Salvando...' : 'Salvar evento'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
