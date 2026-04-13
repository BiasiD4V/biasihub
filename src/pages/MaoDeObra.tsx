import { useState, useMemo, useEffect, useCallback } from 'react';
import { Hammer, Plus, Trash2, Edit2, Save, X, Search, ChevronDown, ChevronRight, Filter, Loader2, AlertCircle } from 'lucide-react';
import { maoDeObraRepository } from '../infrastructure/supabase/maoDeObraRepository';
import type { ComposicaoMOSupabase } from '../infrastructure/supabase/maoDeObraRepository';
import { maoDeObraTiposRepository } from '../infrastructure/supabase/maoDeObraTiposRepository';
import type { MaoDeObraTipo } from '../infrastructure/supabase/maoDeObraTiposRepository';
import { useCadastrosMestres } from '../context/CadastrosMestresContext';

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

function normalizarUnidadeQtd(unid: string | null | undefined): string {
  return (unid || 'un').trim() || 'un';
}

/* ── Converter Supabase → estado local ── */
function fromSupabase(c: ComposicaoMOSupabase): Composicao {
  return {
    id: c.id,
    obra: c.obra,
    atividade: c.atividade,
    jornada: c.jornada,
    unid: normalizarUnidadeQtd(c.unid),
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
      <tr className="border-b border-[#3f63a9] hover:bg-[#16346f]/70 transition-colors">
        <td className="px-3 py-2 text-[#f6f9ff] text-xs font-medium">{p.profissao}</td>
        <td className="px-3 py-2 text-center text-[#c9d8ff] text-xs">
          H
        </td>
        <td className="px-3 py-2 text-right font-mono text-xs text-[#f6f9ff]">
          {p.coef != null ? p.coef.toFixed(4) : '—'}
        </td>
        <td className="px-3 py-2 text-center text-xs text-[#c9d8ff]">—</td>
      </tr>
    );
  }
  return (
    <tr className="border-b border-[#5074be] bg-[#143269]/78">
      <td className="px-2 py-1.5">
        {/* Dropdown com tipos do Config → Mão de Obra */}
        <select
          value={p.profissao}
          onChange={(e) => onChange({ ...p, profissao: e.target.value })}
          className="w-full border border-[#5e7ec5] rounded px-2 py-1 text-xs text-[#f6f9ff] focus:outline-none focus:ring-1 focus:ring-[#76a4ff] bg-[#0f2a60]"
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
        <span className="inline-flex items-center justify-center w-10 py-1 rounded border border-[#5474bb] bg-[#102b61] text-xs text-[#dce8ff]">
          H
        </span>
      </td>
      <td className="px-2 py-1.5">
        <input
          type="number"
          step="0.0001"
          value={p.coef ?? ''}
          onChange={(e) => onChange({ ...p, unid: 'H', coef: e.target.value ? parseFloat(e.target.value) : null })}
          className="w-24 border border-[#5e7ec5] rounded px-2 py-1 text-xs text-right text-[#f6f9ff] focus:outline-none focus:ring-1 focus:ring-[#76a4ff] bg-[#0f2a60]"
        />
      </td>
      <td className="px-2 py-1.5 text-center">
        <div className="flex items-center gap-1">
          <button onClick={onRemove} className="p-1 text-[#ffb1bd] hover:text-[#ffd0d8] hover:bg-[#5f2234]/60 rounded">
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
  unidades,
}: {
  comp: Composicao;
  onAtualizar: (c: Composicao) => Promise<void>;
  onRemover: (id: string) => Promise<void>;
  tiposMO: MaoDeObraTipo[];
  unidades: Array<{ id: string; simbolo: string; descricao: string }>;
}) {
  const [aberto, setAberto] = useState(false);
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState<Composicao>(comp);
  const [salvando, setSalvando] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const totalCoef = comp.profissionais.reduce((s, p) => s + (p.coef ?? 0), 0);

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
    <div className={`bg-[#102a5f]/95 rounded-lg border ${editando ? 'border-[#6c94e8] ring-2 ring-[#5e89df]/30' : 'border-[#3f62a8]'} shadow-sm overflow-hidden`}>
      {/* ── Header da atividade ── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-[#15356f] to-[#102a5f]">
        <button
          onClick={() => !editando && setAberto(!aberto)}
          className="flex-1 flex items-center gap-3 text-left"
        >
          {aberto
            ? <ChevronDown size={16} className="text-[#9fc1ff] flex-shrink-0" />
            : <ChevronRight size={16} className="text-[#9fc1ff] flex-shrink-0" />
          }
          <div className="min-w-0 flex-1">
            {editando ? (
              <input
                type="text"
                value={rascunho.atividade}
                onChange={(e) => setRascunho({ ...rascunho, atividade: e.target.value })}
                className="w-full border border-[#5f80c7] rounded px-2 py-1 text-sm font-semibold text-[#f6f9ff] bg-[#0f2a60] focus:outline-none focus:ring-1 focus:ring-[#76a4ff]"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <h4 className="font-semibold text-sm text-[#f6f9ff] truncate">
                {comp.atividade}
              </h4>
            )}
          </div>
        </button>

        {/* Meta-dados inline */}
        <div className="flex items-center gap-4 text-xs text-[#c9d8ff] flex-shrink-0">
          {editando ? (
            <>
              <label className="flex items-center gap-1">
                <span className="text-[#b9ceff]">Jornada:</span>
                <input type="number" value={rascunho.jornada} onChange={(e) => setRascunho({ ...rascunho, jornada: parseInt(e.target.value) || 8 })}
                  className="w-12 border border-[#5f80c7] rounded px-1 py-0.5 text-xs text-center text-[#f6f9ff] bg-[#0f2a60] focus:outline-none focus:ring-1 focus:ring-[#76a4ff]"
                  onClick={(e) => e.stopPropagation()} />
                <span>h</span>
              </label>
              <label className="flex items-center gap-1">
                <span className="text-[#b9ceff]">Unid QTD:</span>
                <select
                  value={rascunho.unid}
                  onChange={(e) => setRascunho({ ...rascunho, unid: e.target.value })}
                  className="w-20 border border-[#5f80c7] rounded px-1 py-0.5 text-xs text-center text-[#f6f9ff] focus:outline-none focus:ring-1 focus:ring-[#76a4ff] bg-[#0f2a60]"
                  onClick={(e) => e.stopPropagation()}
                >
                  {unidades.map((u) => (
                    <option key={u.id} value={u.simbolo}>{u.simbolo.toUpperCase()}</option>
                  ))}
                  {!unidades.some((u) => u.simbolo === rascunho.unid) && (
                    <option value={rascunho.unid}>{rascunho.unid}</option>
                  )}
                </select>
              </label>
            </>
          ) : (
            <>
              <span>{comp.jornada}h</span>
              <span>Unid QTD: {comp.unid.toUpperCase()}</span>
            </>
          )}
        </div>

        {/* Botões ação */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {editando ? (
            <>
              <button onClick={cancelar} disabled={salvando} className="p-1.5 text-[#c3d5ff] hover:bg-[#26467d] rounded-lg disabled:opacity-50" title="Cancelar">
                <X size={14} />
              </button>
              <button onClick={salvar} disabled={salvando} className="p-1.5 text-[#9cf3c6] hover:bg-[#1e6948]/60 rounded-lg disabled:opacity-50 flex items-center gap-1" title="Salvar">
                {salvando ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              </button>
            </>
          ) : (
            <>
              <button onClick={iniciarEdicao} className="p-1.5 text-[#9bc0ff] hover:bg-[#1d3f78] rounded-lg" title="Editar">
                <Edit2 size={14} />
              </button>
              <button
                onClick={remover}
                disabled={removendo}
                className="p-1.5 text-[#ffb1bd] hover:bg-[#5f2234]/60 rounded-lg disabled:opacity-50"
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
        <div className="px-4 py-2 bg-[#60273a]/70 border-t border-[#b54a67] text-xs text-[#ffc9d6] flex items-center gap-2">
          <AlertCircle size={12} /> {erro}
        </div>
      )}

      {/* ── Tabela de profissionais ── */}
      {aberto && (
        <div className="border-t border-[#3f62a8]">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-[#143269] border-b border-[#4467ae]">
                <th className="px-3 py-2 text-left font-semibold text-[#d8e5ff] uppercase tracking-wider">#  PROFISSIONAL</th>
                <th className="px-3 py-2 text-right font-semibold text-[#d8e5ff] uppercase tracking-wider w-24">HORA</th>
                <th className="px-3 py-2 text-right font-semibold text-[#d8e5ff] uppercase tracking-wider w-28">COEF. (Hh/UN)</th>
                <th className="px-3 py-2 text-center font-semibold text-[#d8e5ff] uppercase tracking-wider w-20">AÇÕES</th>
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
                  <td colSpan={4} className="px-3 py-4 text-center text-[#c2d4ff] italic text-xs">
                    Sem dados de MO / QTD pendente
                  </td>
                </tr>
              )}

              {/* Linha Adicionar (modo edição) */}
              {editando && (
                <tr className="border-t border-dashed border-[#5f80c7]">
                  <td colSpan={4} className="px-3 py-2">
                    <button
                      onClick={addProf}
                      className="flex items-center gap-1.5 text-[#8fb3ff] hover:text-[#c8dcff] text-xs font-medium"
                    >
                      <Plus size={12} /> Adicionar profissional
                    </button>
                  </td>
                </tr>
              )}

              {/* Linha TOTAL */}
              <tr className="bg-[#1a3a78]/82 font-semibold border-t border-[#4c71ba]">
                <td className="px-3 py-2.5 text-right text-[#d8e5ff] text-xs uppercase" colSpan={2}>TOTAL COEF.</td>
                <td className="px-3 py-2.5 text-right font-mono text-xs text-[#f8fbff]">
                  {totalCoef ? totalCoef.toFixed(4) : '—'}
                </td>
                <td className="px-3 py-2.5" />
              </tr>
            </tbody>
          </table>

        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   PÁGINA PRINCIPAL — Composições de Mão de Obra
   ═══════════════════════════════════════════ */
export function MaoDeObra() {
  const { unidades } = useCadastrosMestres();
  const [composicoes, setComposicoes] = useState<Composicao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [tiposMO, setTiposMO] = useState<MaoDeObraTipo[]>([]);
  const [busca, setBusca] = useState('');
  const [filtroObra, setFiltroObra] = useState<string>('');
  const [adicionando, setAdicionando] = useState(false);
  const [salvandoNovo, setSalvandoNovo] = useState(false);
  const [novo, setNovo] = useState({ obra: '', atividade: '' });

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
  const totalProfs = filtradas.reduce((s, c) => s + c.profissionais.length, 0);

  /* ── Adicionar nova composição ── */
  async function addComposicao() {
    if (!novo.atividade.trim()) return;
    setSalvandoNovo(true);
    try {
      const unidadePadrao = unidades[0]?.simbolo || 'un';
      const criada = await maoDeObraRepository.criar({
        obra: novo.obra || 'Sem obra',
        atividade: novo.atividade,
        jornada: 8,
        unid: normalizarUnidadeQtd(unidadePadrao),
        qtd: null,
        tempo_dias: null,
        total_hh: null,
      });
      setComposicoes((prev) => [...prev, fromSupabase(criada)]);
      setNovo({ obra: '', atividade: '' });
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
      unid: normalizarUnidadeQtd(atualizado.unid),
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
        <div className="flex flex-col items-center gap-3 text-[#d0deff]">
          <Loader2 size={32} className="animate-spin text-[#8fb3ff]" />
          <p className="text-sm">Carregando composições...</p>
        </div>
      </div>
    );
  }

  if (erroCarregar) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3 text-center max-w-sm">
          <AlertCircle size={32} className="text-[#ffb1bd]" />
          <p className="text-sm font-semibold text-[#f8fbff]">Erro ao carregar dados</p>
          <p className="text-xs text-[#c9d8ff]">{erroCarregar}</p>
          <button onClick={carregar} className="px-4 py-2 bg-[#2f66d5] text-white text-sm rounded-lg hover:bg-[#3a74eb]">
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mao-de-obra-page flex flex-col h-full">
      {/* ── Header ── */}
      <div className="px-8 py-5 border-b border-[#3e63ab] bg-[#132f68]/95">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#f8fbff] flex items-center gap-3">
              <Hammer size={24} className="text-[#8fb3ff]" />
              Composições de Mão de Obra
            </h1>
            <p className="text-sm text-[#c9d8ff] mt-1">
              Composição Unitária | Coef. = Hh ÷ Qtd | Jornada padrão: 8h
            </p>
          </div>
          <button
            onClick={() => setAdicionando(true)}
            className="flex items-center gap-2 bg-[#2f66d5] hover:bg-[#3a74eb] text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            <Plus size={16} />
            Nova Composição
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="bg-[#102a5f] rounded-xl p-3 border border-[#466db8]">
            <p className="text-xs text-[#c9d8ff]">Atividades</p>
            <p className="text-xl font-bold text-[#f8fbff]">{totalAtv}</p>
          </div>
          <div className="bg-[#102a5f] rounded-xl p-3 border border-[#466db8]">
            <p className="text-xs text-[#c9d8ff]">Profissionais</p>
            <p className="text-xl font-bold text-[#f8fbff]">{totalProfs}</p>
          </div>
        </div>

        {/* Busca + Filtro */}
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b7ccff]" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar atividade, obra ou profissional..."
              className="w-full pl-10 pr-4 py-2 border border-[#5d80c8] bg-[#0f2a60] text-[#f8fbff] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#7ea7ff]"
            />
          </div>
          <div className="relative">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#b7ccff]" />
            <select
              value={filtroObra}
              onChange={(e) => setFiltroObra(e.target.value)}
              className="pl-10 pr-8 py-2 border border-[#5d80c8] rounded-lg text-sm bg-[#0f2a60] text-[#f8fbff] focus:outline-none focus:ring-2 focus:ring-[#7ea7ff] appearance-none"
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
      <div className="flex-1 overflow-y-auto p-6 bg-[#0a1d49]">
        {/* Nova composição */}
        {adicionando && (
          <div className="bg-[#17386f] border border-[#5e82cd] rounded-xl p-5 mb-6">
            <h3 className="font-semibold text-[#f8fbff] mb-3 text-sm">Nova Composição de Mão de Obra</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs font-medium text-[#d0deff] mb-1">Obra</label>
                <input type="text" value={novo.obra} onChange={(e) => setNovo({ ...novo, obra: e.target.value })}
                  list="obras-list" placeholder="Ex: Dellabruna - Galpão"
                  className="w-full border border-[#5d80c8] bg-[#0f2a60] text-[#f8fbff] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7ea7ff]" />
                <datalist id="obras-list">
                  {obrasUnicas.map((ob) => <option key={ob} value={ob} />)}
                </datalist>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#d0deff] mb-1">Atividade</label>
                <input type="text" value={novo.atividade} onChange={(e) => setNovo({ ...novo, atividade: e.target.value })}
                  placeholder="Ex: [1.1] ELETROCALHA"
                  className="w-full border border-[#5d80c8] bg-[#0f2a60] text-[#f8fbff] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7ea7ff]" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setAdicionando(false)} disabled={salvandoNovo} className="px-4 py-2 rounded-lg border border-[#5d80c8] text-sm text-[#d3e1ff] hover:bg-[#21427f] disabled:opacity-50">
                Cancelar
              </button>
              <button onClick={addComposicao} disabled={salvandoNovo} className="px-4 py-2 rounded-lg bg-[#2f66d5] hover:bg-[#3a74eb] text-white text-sm font-medium disabled:opacity-50 flex items-center gap-2">
                {salvandoNovo && <Loader2 size={14} className="animate-spin" />}
                Adicionar
              </button>
            </div>
          </div>
        )}

        {/* Lista agrupada por obra */}
        {filtradas.length === 0 && !adicionando ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#16346f] flex items-center justify-center mb-4">
              <Hammer size={32} className="text-[#8fb3ff]" />
            </div>
            <h3 className="text-lg font-semibold text-[#f8fbff]">Nenhuma composição encontrada</h3>
            <p className="text-sm text-[#c9d8ff] mt-1 max-w-sm">
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
                  <h2 className="text-sm font-bold text-[#f8fbff] uppercase tracking-wide">
                    {obra}
                  </h2>
                  <span className="text-xs text-[#c9d8ff] ml-auto">
                    {comps.length} atividade{comps.length !== 1 ? 's' : ''}
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
                      unidades={unidades.map((u) => ({ id: u.id, simbolo: u.simbolo, descricao: u.descricao }))}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-8 py-3 border-t border-[#3e63ab] bg-[#132f68]/95 text-xs text-[#c9d8ff]">
        Fonte: APP Diário de Obra — Biasi Engenharia | Composição unitária por atividade
      </div>
    </div>
  );
}


