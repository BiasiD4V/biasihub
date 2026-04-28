import { useEffect, useState, useMemo } from 'react';
import { Plus, X, ChevronLeft, ChevronRight, Calendar, Truck, Wrench, CheckCircle, Search, AlertTriangle, Hammer } from 'lucide-react';
import { supabase } from '../infrastructure/supabase/client';
import { useAuth } from '../context/AuthContext';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Agendamento {
  id: string;
  tipo: 'ferramenta' | 'veiculo';
  item_id: string;
  item_descricao: string;
  solicitante_nome: string | null;
  data_inicio: string; // ISO timestamptz
  data_fim: string;    // ISO timestamptz
  descricao: string | null;
  status: 'ativo' | 'cancelado' | 'concluido';
  criado_em: string;
}

interface ManutencaoBloqueio {
  id: string;
  veiculo_id: string;
  veiculo_descricao: string;
  data: string;            // ISO — entrada na oficina
  data_saida: string | null; // ISO ou null (sem previsão)
  descricao: string | null;
  oficina: string | null;
}

interface AcidenteBloqueio {
  id: string;
  veiculo_id: string;
  veiculo_descricao: string;
  data: string;                 // ISO — quando aconteceu
  data_resolucao: string | null; // ISO ou null
  descricao: string | null;
  local: string | null;
}

// Tipo unificado pra renderizar TUDO no mesmo grid (agendamentos + manutenções + acidentes)
interface EventoCal {
  id: string;
  origem: 'agendamento' | 'manutencao' | 'acidente';
  tipoRecurso: 'veiculo' | 'ferramenta';
  recurso_id: string;
  recurso_descricao: string;
  inicio: string;       // ISO
  fim: string | null;   // ISO ou null (sem previsão de saída)
  responsavel: string | null;
  descricao: string | null;
  status: 'ativo' | 'cancelado' | 'concluido' | 'andamento';
}

interface ItemOpcao {
  id: string;
  descricao: string;
}

// ─── Helpers de data/hora ─────────────────────────────────────────────────────

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

/** Extrai YYYY-MM-DD do ISO no fuso local. */
function dayKey(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** "27/04 08:00" */
function fmtDateHora(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

/** "27/04/2026 08:00" */
function fmtCompleta(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** Converte input datetime-local ('YYYY-MM-DDTHH:mm') pra Date local. */
function parseLocalInput(s: string) {
  return new Date(s);
}

/** Date → 'YYYY-MM-DDTHH:mm' (input datetime-local). */
function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const STATUS_CONFIG = {
  ativo:      { label: 'Ativo',         cor: 'text-blue-700',   corBg: 'bg-blue-100',   dot: 'bg-blue-500' },
  concluido:  { label: 'Concluído',     cor: 'text-green-700',  corBg: 'bg-green-100',  dot: 'bg-green-500' },
  cancelado:  { label: 'Cancelado',     cor: 'text-slate-500',  corBg: 'bg-slate-100',  dot: 'bg-slate-400' },
  andamento:  { label: 'Em andamento',  cor: 'text-rose-700',   corBg: 'bg-rose-100',   dot: 'bg-rose-500' },
};

// ─── Componente ───────────────────────────────────────────────────────────────

export function Calendario() {
  const { usuario } = useAuth();
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [manutencoes, setManutencoes] = useState<ManutencaoBloqueio[]>([]);
  const [acidentes, setAcidentes] = useState<AcidenteBloqueio[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<'' | 'ferramenta' | 'veiculo' | 'manutencao' | 'acidente'>('');
  const [filtroStatus, setFiltroStatus] = useState<'' | 'ativo' | 'concluido' | 'cancelado' | 'andamento'>('ativo');

  // Calendário
  const hojeDate = new Date();
  const [mesSelecionado, setMesSelecionado] = useState(hojeDate.getMonth());
  const [anoSelecionado, setAnoSelecionado] = useState(hojeDate.getFullYear());

  // Modal
  const [modal, setModal] = useState(false);
  const [itensVeiculos, setItensVeiculos] = useState<ItemOpcao[]>([]);
  const [itensFerramentas, setItensFerramentas] = useState<ItemOpcao[]>([]);
  const horaPadrao = useMemo(() => {
    const h = new Date();
    h.setMinutes(0, 0, 0);
    h.setHours(h.getHours() + 1); // próxima hora cheia
    return toLocalInput(h);
  }, []);
  const [form, setForm] = useState({
    tipo: 'veiculo' as 'ferramenta' | 'veiculo',
    item_id: '',
    data_inicio: horaPadrao,
    data_fim: horaPadrao,
    descricao: '',
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sugestaoDispon, setSugestaoDispon] = useState<string | null>(null);
  const [sugestaoAlternativos, setSugestaoAlternativos] = useState<ItemOpcao[]>([]);
  const [buscaItem, setBuscaItem] = useState('');

  const isGestor = ['gestor', 'admin', 'dono'].includes(usuario?.papel ?? '');

  // ── Loaders ──────────────────────────────────────────────────────────────

  async function carregar() {
    setLoading(true);
    try {
      const [agsRes, manutRes, acidRes, veicRes] = await Promise.all([
        supabase
          .from('agendamentos_almoxarifado')
          .select('*')
          .order('data_inicio', { ascending: true }),
        supabase
          .from('manutencoes_veiculo')
          .select('id, veiculo_id, data, data_saida, descricao, oficina, veiculos(modelo,placa)')
          .order('data', { ascending: false })
          .limit(200),
        supabase
          .from('acidentes_veiculo')
          .select('id, veiculo_id, data, data_resolucao, descricao, local, veiculos(modelo,placa)')
          .order('data', { ascending: false })
          .limit(100),
        // veículos só pra resolver descrição se o JOIN falhar por RLS
        supabase
          .from('veiculos')
          .select('id, modelo, placa')
          .eq('ativo', true),
      ]);

      if (agsRes.error) throw agsRes.error;
      const veiMap = new Map<string, { modelo: string; placa: string }>();
      (veicRes.data || []).forEach((v: any) => veiMap.set(v.id, { modelo: v.modelo, placa: v.placa }));

      const descreveVeic = (id: string, joinedRow?: any) => {
        const fromJoin = joinedRow?.veiculos;
        if (fromJoin) return `${fromJoin.placa ? fromJoin.placa + ' - ' : ''}${fromJoin.modelo}`;
        const fromMap = veiMap.get(id);
        if (fromMap) return `${fromMap.placa ? fromMap.placa + ' - ' : ''}${fromMap.modelo}`;
        return 'Veículo';
      };

      setAgendamentos((agsRes.data || []) as Agendamento[]);
      setManutencoes(
        (manutRes.data || []).map((m: any) => ({
          id: m.id,
          veiculo_id: m.veiculo_id,
          veiculo_descricao: descreveVeic(m.veiculo_id, m),
          data: m.data,
          data_saida: m.data_saida,
          descricao: m.descricao,
          oficina: m.oficina,
        }))
      );
      setAcidentes(
        (acidRes.data || []).map((a: any) => ({
          id: a.id,
          veiculo_id: a.veiculo_id,
          veiculo_descricao: descreveVeic(a.veiculo_id, a),
          data: a.data,
          data_resolucao: a.data_resolucao,
          descricao: a.descricao,
          local: a.local,
        }))
      );
    } catch (err) {
      console.error('[Calendario] erro ao carregar:', err);
      setAgendamentos([]);
      setManutencoes([]);
      setAcidentes([]);
    } finally {
      setLoading(false);
    }
  }

  async function carregarItens() {
    try {
      const [{ data: veiculos, error: vErr }, { data: ferramentas, error: fErr }] = await Promise.all([
        supabase.from('veiculos').select('id, modelo, placa').eq('ativo', true).order('modelo'),
        supabase.from('itens_almoxarifado').select('id, descricao').eq('ativo', true).eq('tipo', 'ferramenta').order('descricao'),
      ]);

      if (vErr) throw vErr;
      if (fErr) throw fErr;

      setItensVeiculos((veiculos || []).map((v: any) => ({
        id: v.id,
        descricao: v.placa ? `${v.placa} - ${v.modelo}` : v.modelo,
      })));
      setItensFerramentas((ferramentas || []).map((f: any) => ({ id: f.id, descricao: f.descricao })));
    } catch (err) {
      console.error('[Calendario] erro ao carregar itens:', err);
      setItensVeiculos([]);
      setItensFerramentas([]);
    }
  }

  useEffect(() => { carregarItens(); }, []);
  useEffect(() => {
    if (usuario) {
      void carregar();
    } else {
      setLoading(false);
    }
  }, [usuario]);

  // ── Eventos unificados pro calendário e lista ─────────────────────────────

  const eventos = useMemo<EventoCal[]>(() => {
    const out: EventoCal[] = [];
    for (const a of agendamentos) {
      out.push({
        id: `ag:${a.id}`,
        origem: 'agendamento',
        tipoRecurso: a.tipo,
        recurso_id: a.item_id,
        recurso_descricao: a.item_descricao,
        inicio: a.data_inicio,
        fim: a.data_fim,
        responsavel: a.solicitante_nome,
        descricao: a.descricao,
        status: a.status,
      });
    }
    for (const m of manutencoes) {
      out.push({
        id: `mn:${m.id}`,
        origem: 'manutencao',
        tipoRecurso: 'veiculo',
        recurso_id: m.veiculo_id,
        recurso_descricao: m.veiculo_descricao,
        inicio: m.data,
        fim: m.data_saida,
        responsavel: m.oficina,
        descricao: m.descricao,
        status: m.data_saida ? 'concluido' : 'andamento',
      });
    }
    for (const a of acidentes) {
      // Só bloqueia se ainda não tem data_resolucao
      if (a.data_resolucao) continue;
      out.push({
        id: `ac:${a.id}`,
        origem: 'acidente',
        tipoRecurso: 'veiculo',
        recurso_id: a.veiculo_id,
        recurso_descricao: a.veiculo_descricao,
        inicio: a.data,
        fim: a.data_resolucao,
        responsavel: a.local,
        descricao: a.descricao,
        status: 'andamento',
      });
    }
    return out;
  }, [agendamentos, manutencoes, acidentes]);

  // Filtros
  const filtrados = useMemo(() => eventos.filter(ev => {
    if (filtroTipo === 'manutencao' && ev.origem !== 'manutencao') return false;
    if (filtroTipo === 'acidente' && ev.origem !== 'acidente') return false;
    if ((filtroTipo === 'veiculo' || filtroTipo === 'ferramenta') && ev.tipoRecurso !== filtroTipo) return false;
    if ((filtroTipo === 'veiculo' || filtroTipo === 'ferramenta') && ev.origem !== 'agendamento') return false;
    if (filtroStatus && ev.status !== filtroStatus) return false;
    return true;
  }), [eventos, filtroTipo, filtroStatus]);

  // Eventos do mês
  const doMes = useMemo(() => filtrados.filter(ev => {
    const ini = new Date(ev.inicio);
    const fim = ev.fim ? new Date(ev.fim) : new Date(8640000000000000); // sem fim = ∞
    const mesIni = new Date(anoSelecionado, mesSelecionado, 1);
    const mesFim = new Date(anoSelecionado, mesSelecionado + 1, 0, 23, 59, 59);
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

  function eventosNoDia(dia: number) {
    const inicioDia = new Date(anoSelecionado, mesSelecionado, dia, 0, 0, 0).toISOString();
    const fimDia = new Date(anoSelecionado, mesSelecionado, dia, 23, 59, 59).toISOString();
    return filtrados.filter(ev => {
      if (ev.status === 'cancelado') return false;
      const evIni = ev.inicio;
      const evFim = ev.fim || '9999-12-31T23:59:59Z';
      return evIni <= fimDia && evFim >= inicioDia;
    });
  }

  function navMes(dir: -1 | 1) {
    let m = mesSelecionado + dir;
    let a = anoSelecionado;
    if (m < 0) { m = 11; a--; }
    if (m > 11) { m = 0; a++; }
    setMesSelecionado(m);
    setAnoSelecionado(a);
  }

  // ── Validação de conflito + sugestão ──────────────────────────────────────

  /** Calcula a próxima janela livre depois de um conflito.
   *  Olha o último evento que termina e sugere 30min após esse fim. */
  function sugerirProximoLivre(itemId: string, tipo: 'veiculo' | 'ferramenta'): string | null {
    const conflitos = eventos.filter(ev => {
      if (ev.recurso_id !== itemId) return false;
      if (ev.tipoRecurso !== tipo) return false;
      if (ev.status === 'cancelado' || ev.status === 'concluido') return false;
      return true;
    });
    if (conflitos.length === 0) return null;
    const fimMaisTarde = conflitos.reduce<string | null>((max, ev) => {
      if (!ev.fim) return null; // tem evento sem fim — sem previsão
      if (max === null) return ev.fim;
      return ev.fim > max ? ev.fim : max;
    }, '');
    if (fimMaisTarde === null) return null; // tem evento sem fim, indeterminado
    if (fimMaisTarde === '') return null;
    const proximo = new Date(fimMaisTarde);
    proximo.setMinutes(proximo.getMinutes() + 30);
    return proximo.toISOString();
  }

  /** Lista veículos/ferramentas livres no período (excluindo o ocupado).
      Usado quando dá conflito — sugere até 3 alternativas. */
  function listarAlternativosLivres(itemIdOcupado: string, tipo: 'veiculo' | 'ferramenta', iniIso: string, fimIso: string): ItemOpcao[] {
    const todos = tipo === 'veiculo' ? itensVeiculos : itensFerramentas;
    return todos
      .filter((opt) => opt.id !== itemIdOcupado)
      .filter((opt) => {
        // Tem conflito de agendamento?
        const temAgConflito = eventos.some((ev) =>
          ev.recurso_id === opt.id &&
          ev.tipoRecurso === tipo &&
          ev.status !== 'cancelado' &&
          ev.status !== 'concluido' &&
          ev.inicio <= fimIso &&
          (ev.fim ? ev.fim >= iniIso : true)
        );
        return !temAgConflito;
      })
      .slice(0, 3);
  }

  async function salvar() {
    setErro('');
    setSugestaoDispon(null);
    setSugestaoAlternativos([]);

    if (!form.item_id) { setErro('Selecione um veículo ou ferramenta.'); return; }
    if (!form.data_inicio || !form.data_fim) { setErro('Preencha data e hora de início e fim.'); return; }

    const ini = parseLocalInput(form.data_inicio);
    const fim = parseLocalInput(form.data_fim);
    if (fim.getTime() <= ini.getTime()) { setErro('A data de fim deve ser depois do início.'); return; }

    const iniIso = ini.toISOString();
    const fimIso = fim.toISOString();

    setSalvando(true);

    try {
      // 1) Conflito com agendamentos ativos do mesmo recurso
      const { data: conflitos, error: errConflito } = await supabase
        .from('agendamentos_almoxarifado')
        .select('id, data_inicio, data_fim, solicitante_nome, descricao')
        .eq('item_id', form.item_id)
        .eq('tipo', form.tipo)
        .eq('status', 'ativo')
        .lte('data_inicio', fimIso)
        .gte('data_fim', iniIso);

      if (errConflito) throw errConflito;

      if (conflitos && conflitos.length > 0) {
        const c = conflitos[0];
        const tipoLbl = form.tipo === 'veiculo' ? 'Veículo' : 'Ferramenta';
        const proximo = sugerirProximoLivre(form.item_id, form.tipo);
        setErro(
          `${tipoLbl} já agendado neste período por ${c.solicitante_nome ?? 'outro usuário'} (${fmtCompleta(c.data_inicio)} → ${fmtCompleta(c.data_fim)}).`
        );
        if (proximo) setSugestaoDispon(`Próxima disponibilidade: ${fmtCompleta(proximo)}`);
        // Lista alternativas livres no MESMO período
        const alternativos = listarAlternativosLivres(form.item_id, form.tipo, iniIso, fimIso);
        if (alternativos.length > 0) setSugestaoAlternativos(alternativos);
        return;
      }

      // 2) Pra veículo: conflito com manutenção em andamento ou acidente sem resolução
      if (form.tipo === 'veiculo') {
        const conflitoManut = manutencoes.find(m =>
          m.veiculo_id === form.item_id &&
          m.data <= fimIso &&
          (m.data_saida ? m.data_saida >= iniIso : true) // sem data_saida = bloqueio infinito
        );
        if (conflitoManut) {
          if (conflitoManut.data_saida) {
            setErro(`Veículo em manutenção neste período (entrada ${fmtCompleta(conflitoManut.data)}, saída prevista ${fmtCompleta(conflitoManut.data_saida)}).`);
            const proximo = new Date(conflitoManut.data_saida);
            proximo.setMinutes(proximo.getMinutes() + 30);
            setSugestaoDispon(`Próxima disponibilidade: ${fmtCompleta(proximo.toISOString())}`);
          } else {
            setErro(`Veículo em manutenção desde ${fmtCompleta(conflitoManut.data)} sem previsão de liberação.`);
          }
          return;
        }
        const conflitoAcid = acidentes.find(a =>
          a.veiculo_id === form.item_id &&
          !a.data_resolucao &&
          a.data <= fimIso
        );
        if (conflitoAcid) {
          setErro(`Veículo indisponível por acidente em ${fmtCompleta(conflitoAcid.data)} sem resolução registrada.`);
          return;
        }
      }

      // 3) Insere
      const itens = form.tipo === 'veiculo' ? itensVeiculos : itensFerramentas;
      const item = itens.find(i => i.id === form.item_id);
      const { error } = await supabase.from('agendamentos_almoxarifado').insert({
        tipo: form.tipo,
        item_id: form.item_id,
        item_descricao: item?.descricao || '',
        solicitante_id: usuario!.id,
        solicitante_nome: usuario!.nome,
        data_inicio: iniIso,
        data_fim: fimIso,
        descricao: form.descricao.trim() || null,
        status: 'ativo',
      });
      if (error) throw error;

      await carregar();
      setModal(false);
      setBuscaItem('');
      setForm({ tipo: 'veiculo', item_id: '', data_inicio: horaPadrao, data_fim: horaPadrao, descricao: '' });
    } catch (err: any) {
      setErro(err?.message ?? 'Erro ao salvar agendamento.');
    } finally {
      setSalvando(false);
    }
  }

  async function concluir(eventoId: string) {
    if (!eventoId.startsWith('ag:')) return;
    const id = eventoId.slice(3);
    await supabase.from('agendamentos_almoxarifado').update({ status: 'concluido' }).eq('id', id);
    setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: 'concluido' } : a));
  }

  async function cancelar(eventoId: string) {
    if (!eventoId.startsWith('ag:')) return;
    if (!window.confirm('Cancelar este agendamento?')) return;
    const id = eventoId.slice(3);
    await supabase.from('agendamentos_almoxarifado').update({ status: 'cancelado' }).eq('id', id);
    setAgendamentos(prev => prev.map(a => a.id === id ? { ...a, status: 'cancelado' } : a));
  }

  const itensOpcao = form.tipo === 'veiculo' ? itensVeiculos : itensFerramentas;
  const itensFiltrados = useMemo(() => {
    if (!buscaItem) return [];
    return itensOpcao.filter(i =>
      i.descricao.toLowerCase().includes(buscaItem.toLowerCase())
    ).slice(0, 50);
  }, [itensOpcao, buscaItem]);
  const itemSelecionado = itensOpcao.find(i => i.id === form.item_id);

  // ── Render ────────────────────────────────────────────────────────────────

  function renderEventoBadge(ev: EventoCal) {
    if (ev.origem === 'manutencao') return { bg: 'bg-rose-100', text: 'text-rose-700', icon: <Hammer size={9} /> };
    if (ev.origem === 'acidente') return { bg: 'bg-orange-100', text: 'text-orange-700', icon: <AlertTriangle size={9} /> };
    if (ev.tipoRecurso === 'veiculo') return { bg: 'bg-blue-100', text: 'text-blue-700', icon: <Truck size={9} /> };
    return { bg: 'bg-amber-100', text: 'text-amber-700', icon: <Wrench size={9} /> };
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Calendar size={22} className="text-blue-600" />
            Calendário
          </h1>
          <p className="text-sm text-slate-500 mt-1">Agendamentos, manutenções e acidentes</p>
        </div>
        {isGestor && (
          <button onClick={() => { setModal(true); setErro(''); setSugestaoDispon(null); carregarItens(); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors">
            <Plus size={16} />Novo Agendamento
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as any)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos</option>
          <option value="veiculo">Veículos</option>
          <option value="ferramenta">Ferramentas</option>
          <option value="manutencao">Manutenções</option>
          <option value="acidente">Acidentes</option>
        </select>
        <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as any)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos status</option>
          <option value="ativo">Ativos</option>
          <option value="andamento">Em andamento</option>
          <option value="concluido">Concluídos</option>
          <option value="cancelado">Cancelados</option>
        </select>
        <span className="text-xs text-slate-400">{filtrados.length} evento(s)</span>
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
              const evDia = eventosNoDia(dia);
              const isHoje = dia === hojeDate.getDate() && mesSelecionado === hojeDate.getMonth() && anoSelecionado === hojeDate.getFullYear();
              return (
                <div key={idx} className={`min-h-[56px] rounded-lg p-1 border text-xs transition-colors ${isHoje ? 'border-blue-400 bg-blue-50' : 'border-transparent hover:border-slate-200 hover:bg-slate-50'}`}>
                  <span className={`block text-center font-medium mb-0.5 ${isHoje ? 'text-blue-600' : 'text-slate-700'}`}>{dia}</span>
                  <div className="space-y-0.5">
                    {evDia.slice(0, 2).map(ev => {
                      const b = renderEventoBadge(ev);
                      return (
                        <div key={ev.id} className={`truncate text-[9px] px-1 py-0.5 rounded font-medium flex items-center gap-1 ${b.bg} ${b.text}`} title={ev.recurso_descricao}>
                          {b.icon}
                          <span className="truncate">{ev.recurso_descricao}</span>
                        </div>
                      );
                    })}
                    {evDia.length > 2 && <div className="text-[9px] text-slate-400 text-center">+{evDia.length - 2}</div>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legenda */}
          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-100 flex-wrap">
            <div className="flex items-center gap-1 text-xs text-slate-500"><Truck size={11} className="text-blue-500" />Veículo</div>
            <div className="flex items-center gap-1 text-xs text-slate-500"><Wrench size={11} className="text-amber-500" />Ferramenta</div>
            <div className="flex items-center gap-1 text-xs text-slate-500"><Hammer size={11} className="text-rose-500" />Manutenção</div>
            <div className="flex items-center gap-1 text-xs text-slate-500"><AlertTriangle size={11} className="text-orange-500" />Acidente</div>
            <span className="text-xs text-slate-400 ml-auto">{doMes.length} neste mês</span>
          </div>
        </div>

        {/* Lista lateral */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-700 text-sm">Eventos do mês</h3>
          </div>
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Carregando...</div>
          ) : doMes.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar size={28} className="text-slate-300 mx-auto mb-2" />
              <p className="text-slate-400 text-sm">Nenhum evento neste mês</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-y-auto flex-1 max-h-[500px]">
              {doMes.map(ev => {
                const cfg = STATUS_CONFIG[ev.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.ativo;
                const b = renderEventoBadge(ev);
                return (
                  <div key={ev.id} className="px-4 py-3 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${cfg.corBg} ${cfg.cor}`}>{cfg.label}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium flex items-center gap-1 ${b.bg} ${b.text}`}>
                            {b.icon}
                            {ev.origem === 'manutencao' ? 'Manutenção' : ev.origem === 'acidente' ? 'Acidente' : ev.tipoRecurso === 'veiculo' ? 'Veículo' : 'Ferramenta'}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-700 truncate">{ev.recurso_descricao}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {fmtDateHora(ev.inicio)} → {ev.fim ? fmtDateHora(ev.fim) : 'sem previsão'}
                        </p>
                        {ev.responsavel && <p className="text-[11px] text-slate-400">{ev.responsavel}</p>}
                        {ev.descricao && <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{ev.descricao}</p>}
                      </div>
                      {isGestor && ev.origem === 'agendamento' && ev.status === 'ativo' && (
                        <div className="flex flex-col gap-1 flex-shrink-0">
                          <button onClick={() => concluir(ev.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors" title="Concluir">
                            <CheckCircle size={13} />
                          </button>
                          <button onClick={() => cancelar(ev.id)}
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
              <button onClick={() => { setModal(false); setBuscaItem(''); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Tipo */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-2">Tipo *</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['veiculo', 'ferramenta'] as const).map(t => (
                    <button key={t} onClick={() => { setForm(f => ({ ...f, tipo: t, item_id: '' })); setBuscaItem(''); }}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${form.tipo === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                      {t === 'veiculo' ? <><Truck size={15} />Veículo</> : <><Wrench size={15} />Ferramenta</>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Item */}
              <div className="relative">
                <label className="block text-xs font-medium text-slate-700 mb-1.5">
                  {form.tipo === 'veiculo' ? 'Buscar Veículo' : 'Buscar Ferramenta'} *
                </label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={itemSelecionado ? itemSelecionado.descricao : buscaItem}
                    readOnly={!!itemSelecionado}
                    onChange={e => setBuscaItem(e.target.value)}
                    placeholder={form.tipo === 'veiculo' ? "Digite modelo ou placa..." : "Digite o nome da ferramenta..."}
                    className="w-full pl-9 pr-10 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {itemSelecionado && (
                    <button
                      onClick={() => { setForm(f => ({ ...f, item_id: '' })); setBuscaItem(''); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-md text-slate-400"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                {!itemSelecionado && buscaItem.length > 0 && (
                  <div className="absolute z-[60] left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {itensFiltrados.length === 0 ? (
                      <div className="p-3 text-xs text-slate-500 text-center italic">Nenhum resultado encontrado</div>
                    ) : (
                      itensFiltrados.map(i => (
                        <button
                          key={i.id}
                          onClick={() => { setForm(f => ({ ...f, item_id: i.id })); setBuscaItem(''); }}
                          className="w-full text-left px-4 py-2.5 text-xs hover:bg-blue-50 border-b border-slate-50 last:border-0 transition-colors"
                        >
                          <p className="font-medium text-slate-700">{i.descricao}</p>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Data e hora */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Início (data e hora) *</label>
                  <input type="datetime-local" step="900" value={form.data_inicio}
                    onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Fim (data e hora) *</label>
                  <input type="datetime-local" step="900" value={form.data_fim} min={form.data_inicio}
                    onChange={e => setForm(f => ({ ...f, data_fim: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Motivo / observação</label>
                <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} rows={2}
                  placeholder="Para quê vai usar, obra de destino..."
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              {erro && (
                <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                  <p>{erro}</p>
                  {sugestaoDispon && <p className="mt-1 text-xs font-semibold text-red-600">{sugestaoDispon}</p>}
                  {sugestaoAlternativos.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-semibold text-red-700 mb-1">
                        Alternativas disponíveis no mesmo período:
                      </p>
                      <div className="flex flex-col gap-1">
                        {sugestaoAlternativos.map((alt) => (
                          <button
                            key={alt.id}
                            type="button"
                            onClick={() => {
                              setForm((f) => ({ ...f, item_id: alt.id }));
                              setBuscaItem('');
                              setErro('');
                              setSugestaoDispon(null);
                              setSugestaoAlternativos([]);
                            }}
                            className="text-left text-xs bg-white border border-red-300 hover:border-red-500 rounded-md px-2 py-1 transition"
                          >
                            ✓ {alt.descricao}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
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
