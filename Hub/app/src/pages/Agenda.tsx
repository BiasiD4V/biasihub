import { useEffect, useMemo, useState } from 'react';
import { Calendar, Plus, ChevronLeft, ChevronRight, X, MapPin, Users, ArrowRightLeft, Check, Trash2, Clock, Tag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../infrastructure/supabase/client';
import { agendaRepository, type AgendaEvento, type TipoEvento } from '../infrastructure/supabase/agendaRepository';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const TIPOS: { id: TipoEvento; label: string; cor: string; emoji: string }[] = [
  { id: 'visita',       label: 'Visita Técnica', cor: '#3b82f6', emoji: '🏗️' },
  { id: 'reuniao',      label: 'Reunião',        cor: '#8b5cf6', emoji: '💼' },
  { id: 'obra',         label: 'Obra',           cor: '#f59e0b', emoji: '🔨' },
  { id: 'viagem',       label: 'Viagem',         cor: '#10b981', emoji: '✈️' },
  { id: 'compromisso',  label: 'Compromisso',    cor: '#6366f1', emoji: '📌' },
  { id: 'pessoal',      label: 'Pessoal',        cor: '#ec4899', emoji: '👤' },
  { id: 'ferias',       label: 'Férias',         cor: '#0ea5e9', emoji: '🏖️' },
];

function getTipoConfig(tipo: TipoEvento) {
  return TIPOS.find(t => t.id === tipo) || TIPOS[4];
}

function fmtDataHora(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function toInputDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function Agenda() {
  const { usuario } = useAuth();
  const [eventos, setEventos] = useState<AgendaEvento[]>([]);
  const [usuarios, setUsuarios] = useState<{ id: string; nome: string; departamento: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [modo, setModo] = useState<'mes' | 'semana' | 'lista'>('mes');
  const [mesRef, setMesRef] = useState(() => {
    const d = new Date(); d.setDate(1); return d;
  });
  const [filtroResponsavel, setFiltroResponsavel] = useState<'meus' | 'todos'>('todos');
  const [filtroTipo, setFiltroTipo] = useState<TipoEvento | ''>('');

  const [modalAberto, setModalAberto] = useState(false);
  const [eventoEditando, setEventoEditando] = useState<AgendaEvento | null>(null);
  const [eventoDetalhe, setEventoDetalhe] = useState<AgendaEvento | null>(null);

  async function carregar() {
    setLoading(true);
    try {
      const [evs, us] = await Promise.all([
        agendaRepository.listar(),
        supabase.from('usuarios').select('id, nome, departamento').eq('ativo', true).order('nome').then(r => r.data || []),
      ]);
      setEventos(evs);
      setUsuarios(us);
    } catch (err) {
      console.error('[Agenda] erro:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar();
    const ch = supabase
      .channel('agenda-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agenda_eventos' }, () => carregar())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line
  }, []);

  // ── Filtros aplicados ────────────────────────────────────────────────────────
  // 'Meus' considera 3 papéis: responsável, participante (ciente/pode assumir)
  // e acompanhante (sai junto fisicamente). Ficar em qualquer um indisponibiliza
  // a pessoa no período do evento.
  const eventosFiltrados = useMemo(() => {
    return eventos.filter(e => {
      if (filtroResponsavel === 'meus') {
        const meuId = usuario?.id;
        if (!meuId) return false;
        const ehResp = e.responsavel_id === meuId;
        const ehPart = (e.participantes || []).includes(meuId);
        const ehAcomp = (e.acompanhantes || []).includes(meuId);
        if (!ehResp && !ehPart && !ehAcomp) return false;
      }
      if (filtroTipo && e.tipo !== filtroTipo) return false;
      return true;
    });
  }, [eventos, filtroResponsavel, filtroTipo, usuario]);

  // ── Grid de dias do mês ─────────────────────────────────────────────────────
  const diasGrid = useMemo(() => {
    const ano = mesRef.getFullYear();
    const mes = mesRef.getMonth();
    const primeiroDia = new Date(ano, mes, 1).getDay();
    const totalDias = new Date(ano, mes + 1, 0).getDate();
    const dias: (Date | null)[] = Array(primeiroDia).fill(null);
    for (let d = 1; d <= totalDias; d++) dias.push(new Date(ano, mes, d));
    while (dias.length % 7 !== 0) dias.push(null);
    return dias;
  }, [mesRef]);

  // Mapeia evento em TODOS os dias do range [data_inicio, data_fim].
  // Evento de 24/04 a 27/04 aparece nos 4 dias (24, 25, 26, 27).
  // Antes só aparecia no primeiro dia — bug que o user reportou.
  const eventosPorDia = useMemo(() => {
    const map: Record<string, AgendaEvento[]> = {};
    function dayKey(d: Date) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    }
    eventosFiltrados.forEach(e => {
      const ini = new Date(e.data_inicio);
      const fim = new Date(e.data_fim);
      // Trabalha em horário local pra cobrir corretamente os dias atravessados
      const cursor = new Date(ini.getFullYear(), ini.getMonth(), ini.getDate());
      const limite = new Date(fim.getFullYear(), fim.getMonth(), fim.getDate());
      // Limite máximo defensivo: 366 iterações (1 ano) pra não loopar infinito
      let guard = 0;
      while (cursor <= limite && guard < 366) {
        const k = dayKey(cursor);
        if (!map[k]) map[k] = [];
        map[k].push(e);
        cursor.setDate(cursor.getDate() + 1);
        guard++;
      }
    });
    return map;
  }, [eventosFiltrados]);

  function proximoMes() {
    const d = new Date(mesRef); d.setMonth(d.getMonth() + 1); setMesRef(d);
  }
  function mesAnterior() {
    const d = new Date(mesRef); d.setMonth(d.getMonth() - 1); setMesRef(d);
  }

  const hojeStr = new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-[1400px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
              <Calendar size={22} className="text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Agenda</h1>
              <p className="text-slate-400 text-sm mt-0.5">Compromissos, visitas e reuniões do time</p>
            </div>
          </div>

          <div className="sm:ml-auto flex flex-wrap gap-2">
            {/* Filtro responsável */}
            <div className="flex bg-slate-800 rounded-xl p-1">
              {(['todos', 'meus'] as const).map(op => (
                <button
                  key={op}
                  onClick={() => setFiltroResponsavel(op)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                    filtroResponsavel === op ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {op === 'todos' ? '👥 Todos' : '👤 Meus'}
                </button>
              ))}
            </div>

            {/* Filtro tipo */}
            <select
              value={filtroTipo}
              onChange={e => setFiltroTipo(e.target.value as TipoEvento | '')}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-white"
            >
              <option value="">Todos os tipos</option>
              {TIPOS.map(t => <option key={t.id} value={t.id}>{t.emoji} {t.label}</option>)}
            </select>

            {/* Modo */}
            <div className="flex bg-slate-800 rounded-xl p-1">
              {(['mes', 'lista'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setModo(m)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                    modo === m ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {m === 'mes' ? '📅 Mês' : '📋 Lista'}
                </button>
              ))}
            </div>

            <button
              onClick={() => { setEventoEditando(null); setModalAberto(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-sm shadow-lg shadow-blue-600/30 transition-colors"
            >
              <Plus size={16} /> Novo evento
            </button>
          </div>
        </div>

        {/* ── Modo Mês ───────────────────────────────────────────────── */}
        {modo === 'mes' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            {/* Navegação */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <button onClick={mesAnterior} className="p-2 hover:bg-slate-800 rounded-lg"><ChevronLeft size={18} /></button>
              <h2 className="text-lg font-black">{MESES[mesRef.getMonth()]} {mesRef.getFullYear()}</h2>
              <button onClick={proximoMes} className="p-2 hover:bg-slate-800 rounded-lg"><ChevronRight size={18} /></button>
            </div>

            {/* Dias da semana */}
            <div className="grid grid-cols-7 border-b border-slate-800">
              {DIAS_SEMANA.map(d => (
                <div key={d} className="px-3 py-2 text-center text-[10px] font-black uppercase tracking-widest text-slate-500">{d}</div>
              ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-7">
              {diasGrid.map((dia, i) => {
                if (!dia) return <div key={i} className="min-h-[100px] border-b border-r border-slate-800/60 bg-slate-900/40" />;
                const diaStr = dia.toISOString().slice(0, 10);
                const evs = eventosPorDia[diaStr] || [];
                const isHoje = diaStr === hojeStr;
                return (
                  <div
                    key={i}
                    className={`min-h-[100px] border-b border-r border-slate-800/60 p-2 hover:bg-slate-800/30 transition-colors ${
                      isHoje ? 'bg-blue-500/10' : ''
                    }`}
                  >
                    <div className={`text-xs font-bold mb-1 ${isHoje ? 'text-blue-400' : 'text-slate-400'}`}>
                      {dia.getDate()}
                    </div>
                    <div className="space-y-1">
                      {evs.slice(0, 3).map(e => {
                        const cfg = getTipoConfig(e.tipo);
                        const meuEvento = e.responsavel_id === usuario?.id;
                        return (
                          <button
                            key={e.id}
                            onClick={() => setEventoDetalhe(e)}
                            className="w-full text-left text-[10px] font-semibold rounded px-1.5 py-0.5 truncate transition-opacity hover:opacity-90"
                            style={{ backgroundColor: cfg.cor + (meuEvento ? '60' : '30'), color: '#fff' }}
                            title={`${cfg.emoji} ${e.titulo} — ${e.responsavel_nome || '?'}`}
                          >
                            {fmtHora(e.data_inicio)} {e.titulo}
                          </button>
                        );
                      })}
                      {evs.length > 3 && (
                        <button onClick={() => { setModo('lista'); }} className="text-[10px] text-blue-400 font-bold">
                          +{evs.length - 3}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Modo Lista ──────────────────────────────────────────────── */}
        {modo === 'lista' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-500">Carregando...</div>
            ) : eventosFiltrados.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Calendar size={40} className="mx-auto mb-3 opacity-40" />
                <p>Sem eventos no período</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-800">
                {eventosFiltrados.map(e => {
                  const cfg = getTipoConfig(e.tipo);
                  const meu = e.responsavel_id === usuario?.id;
                  return (
                    <li key={e.id}>
                      <button
                        onClick={() => setEventoDetalhe(e)}
                        className="w-full text-left px-5 py-4 flex items-start gap-4 hover:bg-slate-800/50 transition-colors"
                      >
                        <div className="w-1 h-full self-stretch rounded-full" style={{ backgroundColor: cfg.cor }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-base">{cfg.emoji}</span>
                            <span className="font-bold truncate">{e.titulo}</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: cfg.cor + '30', color: cfg.cor }}>
                              {cfg.label}
                            </span>
                            {meu && <span className="text-[10px] font-bold text-blue-400">SEU</span>}
                            {e.status === 'concluido' && <span className="text-[10px] font-bold text-emerald-400">✓ Concluído</span>}
                            {e.status === 'cancelado' && <span className="text-[10px] font-bold text-red-400">✕ Cancelado</span>}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 flex-wrap">
                            <span className="flex items-center gap-1"><Clock size={11} /> {fmtDataHora(e.data_inicio)} → {fmtHora(e.data_fim)}</span>
                            {e.local && <span className="flex items-center gap-1"><MapPin size={11} /> {e.local}</span>}
                            <span className="flex items-center gap-1"><Users size={11} /> {e.responsavel_nome}</span>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* ── Modal de criação/edição ──────────────────────────────────── */}
      {modalAberto && (
        <ModalEvento
          onClose={() => { setModalAberto(false); setEventoEditando(null); }}
          onSalvo={() => { carregar(); setModalAberto(false); setEventoEditando(null); }}
          editando={eventoEditando}
          usuarios={usuarios}
          criadorId={usuario!.id}
        />
      )}

      {/* ── Modal detalhe/transferência ────────────────────────────── */}
      {eventoDetalhe && (
        <ModalDetalheEvento
          evento={eventoDetalhe}
          onClose={() => setEventoDetalhe(null)}
          onChange={() => { carregar(); setEventoDetalhe(null); }}
          usuarios={usuarios}
          meuId={usuario?.id || ''}
          onEditar={() => { setEventoEditando(eventoDetalhe); setModalAberto(true); setEventoDetalhe(null); }}
        />
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Modal criação/edição
 * ────────────────────────────────────────────────────────────────────── */
function ModalEvento({
  onClose, onSalvo, editando, usuarios, criadorId,
}: {
  onClose: () => void;
  onSalvo: () => void;
  editando: AgendaEvento | null;
  usuarios: { id: string; nome: string }[];
  criadorId: string;
}) {
  const now = new Date();
  const in1h = new Date(now.getTime() + 60 * 60 * 1000);

  const [titulo, setTitulo] = useState(editando?.titulo || '');
  const [descricao, setDescricao] = useState(editando?.descricao || '');
  const [local, setLocal] = useState(editando?.local || '');
  const [dataInicio, setDataInicio] = useState(editando ? toInputDateTime(editando.data_inicio) : toInputDateTime(now.toISOString()));
  const [dataFim, setDataFim] = useState(editando ? toInputDateTime(editando.data_fim) : toInputDateTime(in1h.toISOString()));
  const [tipo, setTipo] = useState<TipoEvento>(editando?.tipo || 'compromisso');
  const [responsavelId, setResponsavelId] = useState(editando?.responsavel_id || criadorId);
  const [participantes, setParticipantes] = useState<string[]>(editando?.participantes || []);
  const [acompanhantes, setAcompanhantes] = useState<string[]>(editando?.acompanhantes || []);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  async function salvar() {
    if (!titulo.trim()) { setErro('Informe o título'); return; }
    if (new Date(dataFim) <= new Date(dataInicio)) { setErro('Data final deve ser depois do início'); return; }
    setSalvando(true); setErro('');
    try {
      const cfg = getTipoConfig(tipo);
      const dados = {
        titulo: titulo.trim(),
        descricao: descricao.trim() || null,
        local: local.trim() || null,
        data_inicio: new Date(dataInicio).toISOString(),
        data_fim: new Date(dataFim).toISOString(),
        tipo,
        cor: cfg.cor,
        responsavel_id: responsavelId,
        participantes,
        acompanhantes,
      };
      if (editando) {
        await agendaRepository.atualizar(editando.id, dados);
      } else {
        await agendaRepository.criar(dados, criadorId);
      }
      onSalvo();
    } catch (err: any) {
      setErro(err.message || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  function toggleParticipante(id: string) {
    setParticipantes(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  }

  function toggleAcompanhante(id: string) {
    setAcompanhantes(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg my-8 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h3 className="font-black">{editando ? 'Editar evento' : 'Novo evento'}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Título *</label>
            <input
              type="text"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ex: Visita técnica na obra Santa Helena"
              className="w-full mt-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Início *</label>
              <input type="datetime-local" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                className="w-full mt-1 px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Fim *</label>
              <input type="datetime-local" value={dataFim} onChange={e => setDataFim(e.target.value)}
                className="w-full mt-1 px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500" />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Tipo</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {TIPOS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTipo(t.id)}
                  className={`flex items-center gap-1.5 px-2 py-2 rounded-xl text-xs font-bold border-2 transition-all ${
                    tipo === t.id ? 'border-white/30' : 'border-slate-800 hover:border-slate-700'
                  }`}
                  style={{ backgroundColor: tipo === t.id ? t.cor + '30' : 'transparent', color: tipo === t.id ? t.cor : '#94a3b8' }}
                >
                  <span>{t.emoji}</span>{t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Local</label>
            <input
              type="text"
              value={local}
              onChange={e => setLocal(e.target.value)}
              placeholder="Ex: Av. Paulista 1000, São Paulo"
              className="w-full mt-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Responsável</label>
            <select
              value={responsavelId}
              onChange={e => setResponsavelId(e.target.value)}
              className="w-full mt-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500"
            >
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Quem vai sair com o responsável (acompanhantes)
            </label>
            <p className="text-[10px] text-slate-500 mt-1">
              Pessoas que saem fisicamente junto. Ficam indisponíveis no período.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2 max-h-32 overflow-y-auto p-2 bg-slate-800/50 border border-slate-700 rounded-xl">
              {usuarios.filter(u => u.id !== responsavelId).map(u => (
                <button
                  key={u.id}
                  onClick={() => toggleAcompanhante(u.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    acompanhantes.includes(u.id)
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {u.nome.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
              Participantes (cientes / podem assumir se você faltar)
            </label>
            <div className="flex flex-wrap gap-1.5 mt-2 max-h-32 overflow-y-auto p-2 bg-slate-800/50 border border-slate-700 rounded-xl">
              {usuarios.filter(u => u.id !== responsavelId && !acompanhantes.includes(u.id)).map(u => (
                <button
                  key={u.id}
                  onClick={() => toggleParticipante(u.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                    participantes.includes(u.id)
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {u.nome.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Descrição</label>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              rows={3}
              placeholder="Detalhes do compromisso..."
              className="w-full mt-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:border-blue-500 resize-y"
            />
          </div>

          {erro && <div className="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-400">{erro}</div>}

          <div className="flex gap-2 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-sm font-bold">
              Cancelar
            </button>
            <button onClick={salvar} disabled={salvando} className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 rounded-xl text-sm font-bold shadow-lg shadow-blue-600/30 disabled:opacity-50">
              {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Criar evento'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────
 * Modal de detalhe do evento (com botão "Assumir")
 * ────────────────────────────────────────────────────────────────────── */
function ModalDetalheEvento({
  evento, onClose, onChange, usuarios, meuId, onEditar,
}: {
  evento: AgendaEvento;
  onClose: () => void;
  onChange: () => void;
  usuarios: { id: string; nome: string }[];
  meuId: string;
  onEditar: () => void;
}) {
  const cfg = getTipoConfig(evento.tipo);
  const [transferindo, setTransferindo] = useState(false);
  const [motivoTransf, setMotivoTransf] = useState('');
  const [novoResp, setNovoResp] = useState('');

  const souResponsavel = evento.responsavel_id === meuId;
  const souParticipante = evento.participantes.includes(meuId);
  const souCriador = evento.criador_id === meuId;
  const podeEditar = souResponsavel || souCriador;
  const podeAssumir = souParticipante && !souResponsavel && evento.status === 'agendado';

  async function assumir() {
    if (!confirm(`Assumir este evento como seu? O responsável atual será notificado.`)) return;
    await agendaRepository.transferir(evento.id, meuId, 'Assumiu voluntariamente');
    onChange();
  }

  async function transferir() {
    if (!novoResp) return;
    await agendaRepository.transferir(evento.id, novoResp, motivoTransf);
    onChange();
  }

  async function concluir() {
    await agendaRepository.marcarConcluido(evento.id);
    onChange();
  }

  async function cancelar() {
    if (!confirm('Cancelar este evento?')) return;
    await agendaRepository.cancelar(evento.id);
    onChange();
  }

  async function excluir() {
    if (!confirm('Excluir este evento permanentemente?')) return;
    await agendaRepository.excluir(evento.id);
    onChange();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg my-8 shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header colorido pelo tipo */}
        <div className="px-6 py-5 border-b border-slate-800" style={{ backgroundColor: cfg.cor + '15' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-2xl">{cfg.emoji}</span>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: cfg.cor }}>{cfg.label}</span>
                {evento.status === 'concluido' && <span className="text-[10px] font-bold text-emerald-400">✓ CONCLUÍDO</span>}
                {evento.status === 'cancelado' && <span className="text-[10px] font-bold text-red-400">✕ CANCELADO</span>}
              </div>
              <h3 className="font-black text-lg">{evento.titulo}</h3>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg flex-shrink-0"><X size={18} /></button>
          </div>
        </div>

        <div className="p-6 space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <Clock size={14} className="text-slate-500 flex-shrink-0" />
            <span>{fmtDataHora(evento.data_inicio)} até {fmtDataHora(evento.data_fim)}</span>
          </div>

          {evento.local && (
            <div className="flex items-center gap-3">
              <MapPin size={14} className="text-slate-500 flex-shrink-0" />
              <span>{evento.local}</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Users size={14} className="text-slate-500 flex-shrink-0" />
            <span>
              Responsável: <strong>{evento.responsavel_nome}</strong>
              {evento.transferido_para && (
                <span className="text-slate-500 ml-1 text-xs">(transferido{evento.motivo_transferencia ? ` — ${evento.motivo_transferencia}` : ''})</span>
              )}
            </span>
          </div>

          {evento.participantes.length > 0 && (
            <div className="flex items-start gap-3">
              <Tag size={14} className="text-slate-500 flex-shrink-0 mt-0.5" />
              <div className="flex flex-wrap gap-1">
                <span className="text-slate-500">Podem assumir:</span>
                {evento.participantes.map(pid => {
                  const u = usuarios.find(x => x.id === pid);
                  return u ? <span key={pid} className="px-2 py-0.5 bg-slate-800 rounded-full text-xs">{u.nome.split(' ')[0]}</span> : null;
                })}
              </div>
            </div>
          )}

          {evento.descricao && (
            <div className="pt-3 border-t border-slate-800 text-slate-300 whitespace-pre-wrap">{evento.descricao}</div>
          )}

          {/* Botão Assumir — destaque */}
          {podeAssumir && (
            <button
              onClick={assumir}
              className="w-full flex items-center justify-center gap-2 py-3 mt-3 bg-emerald-600 hover:bg-emerald-700 rounded-xl font-bold text-sm shadow-lg shadow-emerald-600/30 transition-colors"
            >
              <ArrowRightLeft size={16} /> Assumir este evento
            </button>
          )}

          {/* Transferir manualmente — só quem é responsável */}
          {souResponsavel && evento.status === 'agendado' && (
            <div className="pt-3 border-t border-slate-800">
              {!transferindo ? (
                <button
                  onClick={() => setTransferindo(true)}
                  className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1.5"
                >
                  <ArrowRightLeft size={12} /> Transferir para outra pessoa
                </button>
              ) : (
                <div className="space-y-2">
                  <select value={novoResp} onChange={e => setNovoResp(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm">
                    <option value="">Transferir para...</option>
                    {usuarios.filter(u => u.id !== meuId).map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                  </select>
                  <input type="text" value={motivoTransf} onChange={e => setMotivoTransf(e.target.value)}
                    placeholder="Motivo (opcional)"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm" />
                  <div className="flex gap-2">
                    <button onClick={() => setTransferindo(false)} className="flex-1 py-2 bg-slate-800 rounded-lg text-xs font-bold">Cancelar</button>
                    <button onClick={transferir} disabled={!novoResp} className="flex-1 py-2 bg-blue-600 rounded-lg text-xs font-bold disabled:opacity-50">Transferir</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Ações de status */}
          {podeEditar && evento.status === 'agendado' && (
            <div className="flex gap-2 pt-3 border-t border-slate-800">
              <button onClick={onEditar} className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold">Editar</button>
              <button onClick={concluir} className="flex-1 py-2 bg-emerald-600/80 hover:bg-emerald-600 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                <Check size={12} /> Concluir
              </button>
              <button onClick={cancelar} className="flex-1 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-xs font-bold">Cancelar</button>
              {souCriador && (
                <button onClick={excluir} className="py-2 px-3 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-xs font-bold">
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
