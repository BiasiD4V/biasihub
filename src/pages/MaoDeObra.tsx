import { useState, useMemo, useEffect, useCallback } from 'react';
import { Hammer, Plus, Trash2, Edit2, Save, X, Search, ChevronDown, ChevronRight, Filter, Loader2, AlertCircle } from 'lucide-react';
import { maoDeObraRepository } from '../infrastructure/supabase/maoDeObraRepository';
import type { ComposicaoMOSupabase } from '../infrastructure/supabase/maoDeObraRepository';
import { maoDeObraTiposRepository } from '../infrastructure/supabase/maoDeObraTiposRepository';
import type { MaoDeObraTipo } from '../infrastructure/supabase/maoDeObraTiposRepository';
import { mockUnidades } from '../infrastructure/mock/dados/unidades.mock';

/* ── Tipos locais ── */
interface Profissional {
  id: string;
  profissao: string;
  unid: string;
  coef: number | null;
  hhTotal: number | null;
}

interface Composicao {
  id: string;
  obra: string;
  atividade: string;
  jornada: number;
  unid: string;
  qtd: number | null;
  tempoDias: number | null;
  totalHh: number | null;
  profissionais: Profissional[];
}

/* ── Converter Supabase → estado local ── */
function fromSupabase(c: ComposicaoMOSupabase): Composicao {
  return {
    id: c.id,
    obra: c.obra,
    atividade: c.atividade,
    jornada: c.jornada,
    unid: c.unid,
    qtd: c.qtd,
    tempoDias: c.tempo_dias,
    totalHh: c.total_hh,
    profissionais: (c.mao_de_obra_profissionais || []).map((p) => ({
      id: p.id,
      profissao: p.profissao,
      unid: p.unid,
      coef: p.coef,
      hhTotal: p.hh_total,
    })),
  };
}

/* ═══════════════════════════════════════════
   LINHA EDITÁVEL DE PROFISSIONAL
   ═══════════════════════════════════════════ */
function LinhaProf({
  p,
  editando,
  onChange,
  onRemove,
  tiposMO,
}: {
  p: Profissional;
  editando: boolean;
  onChange: (p: Profissional) => void;
  onRemove: () => void;
  tiposMO: MaoDeObraTipo[];
}) {
  if (!editando) {
    return (
      <tr className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
        <td className="px-3 py-2 text-slate-700 text-xs">{p.profissao}</td>
        <td className="px-3 py-2 text-center text-slate-500 text-xs">{p.unid}</td>
        <td className="px-3 py-2 text-right font-mono text-xs text-slate-700">
          {p.coef != null ? p.coef.toFixed(4) : '—'}
        </td>
        <td className="px-3 py-2 text-right font-mono text-xs font-semibold text-blue-600">
          {p.hhTotal != null ? p.hhTotal.toFixed(2) : '—'}
        </td>
      </tr>
    );
  }
  return (
    <tr className="border-b border-blue-100 bg-blue-50/30">
      <td className="px-2 py-1.5">
        {/* Dropdown com tipos do Config → Mão de Obra */}
        <select
          value={p.profissao}
          onChange={(e) => onChange({ ...p, profissao: e.target.value })}
          className="w-full border border-slate-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
        >
          <option value="">Selecionar...</option>
          {tiposMO.filter((t) => t.ativo).map((t) => (
            <option key={t.id} value={t.nome}>{t.nome}</option>
          ))}
          {/* Manter valor atual mesmo se não estiver na lista */}
          {p.profissao && !tiposMO.some((t) => t.nome === p.profissao) && (
            <option value={p.profissao}>{p.profissao}</option>
          )}
        </select>
      </td>
      <td className="px-2 py-1.5">
        {/* Dropdown com unidades do Config → Unidades */}
        <select
          value={p.unid}
          onChange={(e) => onChange({ ...p, unid: e.target.value })}
          className="w-16 border border-slate-200 rounded px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white"
        >
          {mockUnidades.map((u) => (
            <option key={u.id} value={u.simbolo}>{u.simbolo}</option>
          ))}
        </select>
      </td>
      <td className="px-2 py-1.5">
        <input
          type="number"
          step="0.0001"
          value={p.coef ?? ''}
          onChange={(e) => onChange({ ...p, coef: e.target.value ? parseFloat(e.target.value) : null })}
          className="w-24 border border-slate-200 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </td>
      <td className="px-2 py-1.5">
        <div className="flex items-center gap-1">
          <input
            type="number"
            step="0.01"
            value={p.hhTotal ?? ''}
            onChange={(e) => onChange({ ...p, hhTotal: e.target.value ? parseFloat(e.target.value) : null })}
            className="w-24 border border-slate-200 rounded px-2 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button onClick={onRemove} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
            <Trash2 size={12} />
          </button>
        </div>
      </td>
    </tr>
  );
}

/* ═══════════════════════════════════════════
   CARD DE COMPOSIÇÃO (1 atividade)
   ═══════════════════════════════════════════ */
function CardComposicao({
  comp,
  onAtualizar,
  onRemover,
  tiposMO,
}: {
  comp: Composicao;
  onAtualizar: (c: Composicao) => Promise<void>;
  onRemover: (id: string) => Promise<void>;
  tiposMO: MaoDeObraTipo[];
}) {
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState<Composicao>(comp);
  const [salvando, setSalvando] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const totalCoef = comp.profissionais.reduce((s, p) => s + (p.coef ?? 0), 0);
  const totalHh = comp.profissionais.reduce((s, p) => s + (p.hhTotal ?? 0), 0);

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      await onAtualizar(rascunho);
      setEditando(false);
    } catch (e: any) {
      setErro(e.message || 'Erro ao salvar');
    } finally {
      setSalvando(false);
    }
  }

  function cancelar() {
    setRascunho(comp);
    setEditando(false);
    setErro(null);
  }

  function iniciarEdicao(e: React.MouseEvent) {
    e.stopPropagation();
    setRascunho(comp);
    setEditando(true);
    setAberto(true);
  }

  async function remover(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`Remover "${comp.atividade}"?`)) return;
    setRemovendo(true);
    try {
      await onRemover(comp.id);
    } catch (e: any) {
      setErro(e.message || 'Erro ao remover');
      setRemovendo(false);
    }
  }

  function atualizarProf(idx: number, p: Profissional) {
    const profs = [...rascunho.profissionais];
    profs[idx] = p;
    setRascunho({ ...rascunho, profissionais: profs });
  }

  function removerProf(idx: number) {
    setRascunho({
      ...rascunho,
      profissionais: rascunho.profissionais.filter((_, i) => i !== idx),
    });
  }

  function addProf() {
    setRascunho({
      ...rascunho,
      profissionais: [
        ...rascunho.profissionais,
        { id: `new-${Date.now()}`, profissao: '', unid: 'H', coef: null, hhTotal: null },
      ],
    });
  }

  const dados = editando ? rascunho : comp;

  return (
    <div className={`bg-white rounded-lg border ${editando ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200'} shadow-sm overflow-hidden`}>
      {/* ── Header da atividade ── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-slate-50 to-white">
        <button
          onClick={() => !editando && setAberto(!aberto)}
          className="flex-1 flex items-center gap-3 text-left"
        >
          {aberto
            ? <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />
            : <ChevronRight size={16} className="text-slate-400 flex-shrink-0" />
          }
          <div className="min-w-0 flex-1">
            {editando ? (
              <input
                type="text"
                value={rascunho.atividade}
                onChange={(e) => setRascunho({ ...rascunho, atividade: e.target.value })}
                className="w-full border border-slate-200 rounded px-2 py-1 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <h4 className="font-semibold text-sm text-slate-800 truncate">
                {comp.atividade}
              </h4>
            )}
          </div>
        </button>

        {/* Meta-dados inline */}
        <div className="flex items-center gap-4 text-xs text-slate-500 flex-shrink-0">
          {editando ? (
            <>
              <label className="flex items-center gap-1">
                <span className="text-slate-400">Jornada:</span>
                <input type="number" value={rascunho.jornada} onChange={(e) => setRascunho({ ...rascunho, jornada: parseInt(e.target.value) || 8 })}
                  className="w-12 border border-slate-200 rounded px-1 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onClick={(e) => e.stopPropagation()} />
                <span>h</span>
              </label>
              <label className="flex items-center gap-1">
                <span className="text-slate-400">Unid:</span>
                <input type="text" value={rascunho.unid} onChange={(e) => setRascunho({ ...rascunho, unid: e.target.value })}
                  className="w-10 border border-slate-200 rounded px-1 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onClick={(e) => e.stopPropagation()} />
              </label>
              <label className="flex items-center gap-1">
                <span className="text-slate-400">QTD:</span>
                <input type="number" value={rascunho.qtd ?? ''} onChange={(e) => setRascunho({ ...rascunho, qtd: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-16 border border-slate-200 rounded px-1 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onClick={(e) => e.stopPropagation()} />
              </label>
              <label className="flex items-center gap-1">
                <span className="text-slate-400">Tempo:</span>
                <input type="number" value={rascunho.tempoDias ?? ''} onChange={(e) => setRascunho({ ...rascunho, tempoDias: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-14 border border-slate-200 rounded px-1 py-0.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onClick={(e) => e.stopPropagation()} />
                <span>d</span>
              </label>
            </>
          ) : (
            <>
              <span>{comp.jornada}h</span>
              <span>{comp.unid}</span>
              <span>QTD: {comp.qtd ?? '—'}</span>
              <span>{comp.tempoDias ?? '—'}d</span>
            </>
          )}
          <span className="font-semibold text-blue-600 text-sm tabular-nums">
            {totalHh.toFixed(1)} Hh
          </span>
        </div>

        {/* Botões ação */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {editando ? (
            <>
              <button onClick={cancelar} disabled={salvando} className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg disabled:opacity-50" title="Cancelar">
                <X size={14} />
              </button>
              <button onClick={salvar} disabled={salvando} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50 flex items-center gap-1" title="Salvar">
                {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              </button>
            </>
          ) : (
            <>
              <button onClick={iniciarEdicao} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar">
                <Edit2 size={14} />
              </button>
              <button
                onClick={remover}
                disabled={removendo}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg disabled:opacity-50"
                title="Remover"
              >
                {removendo ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Erro inline */}
      {erro && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-100 text-xs text-red-600 flex items-center gap-2">
          <AlertCircle size={12} /> {erro}
        </div>
      )}

      {/* ── Tabela de profissionais ── */}
      {aberto && (
        <div className="border-t border-slate-100">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-3 py-2 text-left font-semibold text-slate-600 uppercase tracking-wider">#  PROFISSIONAL</th>
                <th className="px-3 py-2 text-center font-semibold text-slate-600 uppercase tracking-wider w-16">UNID</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600 uppercase tracking-wider w-28">COEF. (Hh/UN)</th>
                <th className="px-3 py-2 text-right font-semibold text-slate-600 uppercase tracking-wider w-28">Hh TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {dados.profissionais.map((p, idx) => (
                <LinhaProf
                  key={p.id}
                  p={p}
                  editando={editando}
                  onChange={(pAtualizado) => atualizarProf(idx, pAtualizado)}
                  onRemove={() => removerProf(idx)}
                  tiposMO={tiposMO}
                />
              ))}

              {dados.profissionais.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-slate-400 italic text-xs">
                    Sem dados de MO / QTD pendente
                  </td>
                </tr>
              )}

              {/* Linha Adicionar (modo edição) */}
              {editando && (
                <tr className="border-t border-dashed border-blue-200">
                  <td colSpan={4} className="px-3 py-2">
                    <button
                      onClick={addProf}
                      className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 text-xs font-medium"
                    >
                      <Plus size={12} /> Adicionar profissional
                    </button>
                  </td>
                </tr>
              )}

              {/* Linha TOTAL */}
              <tr className="bg-slate-100 font-semibold border-t border-slate-200">
                <td className="px-3 py-2.5 text-right text-slate-700 text-xs uppercase" colSpan={2}>TOTAL</td>
                <td className="px-3 py-2.5 text-right font-mono text-xs text-slate-800">
                  {totalCoef ? totalCoef.toFixed(4) : '—'}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-xs font-bold text-blue-600">
                  {totalHh.toFixed(2)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Verificação */}
          {comp.qtd != null && totalCoef > 0 && (
            <div className="px-4 py-2 bg-green-50 border-t border-green-100 text-xs text-green-700">
              ✓ Coef. × Qtd = {totalCoef.toFixed(2)} × {comp.qtd} = {(totalCoef * comp.qtd).toFixed(2)} Hh
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   PÁGINA PRINCIPAL — Composições de Mão de Obra
   ═══════════════════════════════════════════ */
export function MaoDeObra() {
  const [composicoes, setComposicoes] = useState<Composicao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [tiposMO, setTiposMO] = useState<MaoDeObraTipo[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroObra, setFiltroObra] = useState<string>('');
  const [adicionando, setAdicionando] = useState(false);
  const [salvandoNovo, setSalvandoNovo] = useState(false);
  const [novo, setNovo] = useState({ obra: '', atividade: '', jornada: 8, unid: 'm', qtd: '', tempoDias: '' });

  /* ── Carregar do Supabase ── */
  const carregar = useCallback(async () => {
    setCarregando(true);
    setErroCarregar(null);
    try {
      const [dados, tipos] = await Promise.all([
        maoDeObraRepository.listarTodos(),
        maoDeObraTiposRepository.listarAtivos(),
      ]);
      setComposicoes(dados.map(fromSupabase));
      setTiposMO(tipos);
    } catch (e: any) {
      setErroCarregar(e.message || 'Erro ao carregar dados');
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  /* Obras únicas para filtro */
  const obrasUnicas = useMemo(() => {
    const set = new Set(composicoes.map((c) => c.obra));
    return Array.from(set).sort();
  }, [composicoes]);

  /* Filtrar */
  const filtradas = useMemo(() => {
    let lista = composicoes;
    if (filtroObra) lista = lista.filter((c) => c.obra === filtroObra);
    if (busca.trim()) {
      const termo = busca.toLowerCase();
      lista = lista.filter(
        (c) =>
          c.atividade.toLowerCase().includes(termo) ||
          c.obra.toLowerCase().includes(termo) ||
          c.profissionais.some((p) => p.profissao.toLowerCase().includes(termo))
      );
    }
    return lista;
  }, [composicoes, filtroObra, busca]);

  /* Agrupar por obra */
  const agrupadas = useMemo(() => {
    const map = new Map<string, Composicao[]>();
    filtradas.forEach((c) => {
      if (!map.has(c.obra)) map.set(c.obra, []);
      map.get(c.obra)!.push(c);
    });
    return map;
  }, [filtradas]);

  /* KPIs */
  const totalAtv = filtradas.length;
  const totalHhGeral = filtradas.reduce(
    (s, c) => s + c.profissionais.reduce((sp, p) => sp + (p.hhTotal ?? 0), 0), 0
  );
  const totalProfs = filtradas.reduce((s, c) => s + c.profissionais.length, 0);

  /* ── Adicionar nova composição ── */
  async function addComposicao() {
    if (!novo.atividade.trim()) return;
    setSalvandoNovo(true);
    try {
      const criada = await maoDeObraRepository.criar({
        obra: novo.obra || 'Sem obra',
        atividade: novo.atividade,
        jornada: novo.jornada,
        unid: novo.unid,
        qtd: novo.qtd ? parseFloat(novo.qtd) : null,
        tempo_dias: novo.tempoDias ? parseFloat(novo.tempoDias) : null,
        total_hh: null,
      });
      setComposicoes((prev) => [...prev, fromSupabase(criada)]);
      setNovo({ obra: '', atividade: '', jornada: 8, unid: 'm', qtd: '', tempoDias: '' });
      setAdicionando(false);
    } catch (e: any) {
      alert('Erro ao criar composição: ' + (e.message || e));
    } finally {
      setSalvandoNovo(false);
    }
  }

  /* ── Atualizar composição (cabeçalho + profissionais) ── */
  async function atualizarComposicao(atualizado: Composicao) {
    await maoDeObraRepository.atualizar(atualizado.id, {
      obra: atualizado.obra,
      atividade: atualizado.atividade,
      jornada: atualizado.jornada,
      unid: atualizado.unid,
      qtd: atualizado.qtd,
      tempo_dias: atualizado.tempoDias,
      total_hh: atualizado.totalHh,
    });

    const profsAtualizadas = await maoDeObraRepository.salvarProfissionais(
      atualizado.id,
      atualizado.profissionais.map((p) => ({
        profissao: p.profissao,
        unid: p.unid,
        coef: p.coef,
        hh_total: p.hhTotal,
      }))
    );

    const composicaoAtualizada: Composicao = {
      ...atualizado,
      profissionais: profsAtualizadas.map((p) => ({
        id: p.id,
        profissao: p.profissao,
        unid: p.unid,
        coef: p.coef,
        hhTotal: p.hh_total,
      })),
    };

    setComposicoes((prev) => prev.map((c) => (c.id === atualizado.id ? composicaoAtualizada : c)));
  }

  /* ── Remover composição ── */
  async function removerComposicao(id: string) {
    await maoDeObraRepository.deletar(id);
    setComposicoes((prev) => prev.filter((c) => c.id !== id));
  }

  /* ── Estados de carregamento / erro ── */
  if (carregando) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 size={32} className="animate-spin text-blue-500" />
          <p className="text-sm">Carregando composições...</p>
        </div>
      </div>
    );
  }

  if (erroCarregar) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3 text-center max-w-sm">
          <AlertCircle size={32} className="text-red-400" />
          <p className="text-sm font-semibold text-slate-700">Erro ao carregar dados</p>
          <p className="text-xs text-slate-500">{erroCarregar}</p>
          <button onClick={carregar} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ── */}
      <div className="px-8 py-5 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <Hammer size={24} className="text-blue-600" />
              Composições de Mão de Obra
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Composição Unitária | Coef. = Hh ÷ Qtd | Jornada padrão: 8h
            </p>
          </div>
          <button
            onClick={() => setAdicionando(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            <Plus size={16} />
            Nova Composição
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <p className="text-xs text-slate-500">Atividades</p>
            <p className="text-xl font-bold text-slate-800">{totalAtv}</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <p className="text-xs text-slate-500">Profissionais</p>
            <p className="text-xl font-bold text-slate-800">{totalProfs}</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
            <p className="text-xs text-blue-600">Hh Total</p>
            <p className="text-xl font-bold text-blue-600">{totalHhGeral.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</p>
          </div>
        </div>

        {/* Busca + Filtro */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar atividade, obra ou profissional..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={filtroObra}
              onChange={(e) => setFiltroObra(e.target.value)}
              className="pl-10 pr-8 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="">Todas as obras</option>
              {obrasUnicas.map((ob) => (
                <option key={ob} value={ob}>{ob}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── Conteúdo ── */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
        {/* Nova composição */}
        {adicionando && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6">
            <h3 className="font-semibold text-slate-800 mb-3 text-sm">Nova Composição de Mão de Obra</h3>
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Obra</label>
                <input type="text" value={novo.obra} onChange={(e) => setNovo({ ...novo, obra: e.target.value })}
                  list="obras-list" placeholder="Ex: Dellabruna - Galpão"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                <datalist id="obras-list">
                  {obrasUnicas.map((ob) => <option key={ob} value={ob} />)}
                </datalist>
              </div>
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Atividade</label>
                <input type="text" value={novo.atividade} onChange={(e) => setNovo({ ...novo, atividade: e.target.value })}
                  placeholder="Ex: [1.1] ELETROCALHA"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">QTD</label>
                <input type="number" value={novo.qtd} onChange={(e) => setNovo({ ...novo, qtd: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tempo (d)</label>
                <input type="number" value={novo.tempoDias} onChange={(e) => setNovo({ ...novo, tempoDias: e.target.value })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setAdicionando(false)} disabled={salvandoNovo} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={addComposicao} disabled={salvandoNovo} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                {salvandoNovo && <Loader2 size={14} className="animate-spin" />}
                Adicionar
              </button>
            </div>
          </div>
        )}

        {/* Lista agrupada por obra */}
        {filtradas.length === 0 && !adicionando ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
              <Hammer size={32} className="text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700">Nenhuma composição encontrada</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-sm">
              {busca || filtroObra
                ? 'Tente ajustar os filtros de busca.'
                : 'Clique em "Nova Composição" para começar a cadastrar.'}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(agrupadas.entries()).map(([obra, comps]) => (
              <div key={obra}>
                {/* Header da obra */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-1.5 h-5 bg-blue-600 rounded-full" />
                  <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
                    {obra}
                  </h2>
                  <span className="text-xs text-slate-400 ml-auto">
                    {comps.length} atividade{comps.length !== 1 ? 's' : ''} · {comps.reduce((s, c) => s + c.profissionais.reduce((sp, p) => sp + (p.hhTotal ?? 0), 0), 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} Hh
                  </span>
                </div>

                {/* Cards de composição */}
                <div className="space-y-2">
                  {comps.map((comp) => (
                    <CardComposicao
                      key={comp.id}
                      comp={comp}
                      onAtualizar={atualizarComposicao}
                      onRemover={removerComposicao}
                      tiposMO={tiposMO}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-8 py-3 border-t border-slate-200 bg-white text-xs text-slate-400">
        Fonte: APP Diário de Obra — Biasi Engenharia | Composição unitária por atividade
      </div>
    </div>
  );
}
