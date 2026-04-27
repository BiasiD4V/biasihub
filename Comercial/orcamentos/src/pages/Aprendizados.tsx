import { useEffect, useState } from 'react';
import { BookOpen, Search, X } from 'lucide-react';
import { supabase } from '../infrastructure/supabase/client';
import { useAuth } from '../context/AuthContext';

// ── Types ────────────────────────────────────────────────────────────────────
interface Aprendizado {
  id: string;
  autor: string;
  categoria: string;
  problema: string;
  causa: string;
  solucao: string;
  como_evitar: string;
  bira_tarefa_id: string | null;
  criado_em: string;
  criado_por_id: string;
}

const CATEGORIAS = [
  'Elétrica',
  'Hidráulica',
  'Planejamento',
  'Compatibilização',
  'Execução',
  'Qualidade',
  'Segurança',
  'Processos',
  'TI/Sistema',
  'Outros',
];

// ── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-3 bg-emerald-500 text-white px-5 py-3.5 rounded-2xl shadow-2xl shadow-emerald-500/30 animate-in slide-in-from-bottom-4 duration-300 font-bold text-sm">
      <span>📘</span>
      {message}
      <button onClick={onClose} className="ml-2 opacity-70 hover:opacity-100 transition-opacity">
        <X size={14} />
      </button>
    </div>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────
function AprendizadoCard({ item }: { item: Aprendizado }) {
  const dataFmt = new Date(item.criado_em).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  return (
    <div className="bg-slate-900 border border-white/8 rounded-2xl p-5 space-y-4 hover:border-white/15 transition-colors">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-blue-500/15 text-blue-400 border border-blue-500/30 text-xs font-bold px-2.5 py-1 rounded-full">
            {item.categoria}
          </span>
          <span className="bg-white/8 text-slate-300 text-xs font-bold px-2.5 py-1 rounded-full">
            {item.autor}
          </span>
          {item.bira_tarefa_id && (
            <span className="bg-red-500/15 text-red-400 border border-red-500/25 text-xs font-bold px-2.5 py-1 rounded-full">
              🐛 Originado do Bira
            </span>
          )}
          <span className="ml-auto text-slate-500 text-[11px] font-medium">{dataFmt}</span>
        </div>
        <h3 className="text-white font-bold text-sm leading-snug">{item.problema}</h3>
      </div>

      {/* Sections */}
      <div className="space-y-3 pt-1 border-t border-white/5">
        {item.causa && (
          <div>
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Causa</p>
            <p className="text-slate-300 text-xs leading-relaxed">{item.causa}</p>
          </div>
        )}
        <div>
          <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Solução</p>
          <p className="text-slate-300 text-xs leading-relaxed">{item.solucao}</p>
        </div>
        {item.como_evitar && (
          <div>
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Como Evitar</p>
            <p className="text-slate-300 text-xs leading-relaxed">{item.como_evitar}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export function Aprendizados() {
  const { usuario } = useAuth();

  // Form state
  const [autor] = useState(() => usuario?.nome ?? '');
  const [categoria, setCategoria] = useState('');
  const [problema, setProblema] = useState('');
  const [causa, setCausa] = useState('');
  const [solucao, setSolucao] = useState('');
  const [comoEvitar, setComoEvitar] = useState('');
  const [salvando, setSalvando] = useState(false);

  // List state
  const [lista, setLista] = useState<Aprendizado[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  // ── Load ──────────────────────────────────────────────────────────────────
  async function carregar() {
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from('aprendizados')
        .select('*')
        .order('criado_em', { ascending: false });
      if (error) throw error;
      setLista(data ?? []);
    } catch (err) {
      console.error(err);
    }
    setCarregando(false);
  }

  useEffect(() => {
    void carregar();
  }, []);

  // ── Submit ────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!problema.trim() || !solucao.trim() || !categoria || !usuario) return;
    setSalvando(true);
    try {
      const { error } = await supabase.from('aprendizados').insert({
        autor: autor || usuario.nome,
        categoria,
        problema: problema.trim(),
        causa: causa.trim() || null,
        solucao: solucao.trim(),
        como_evitar: comoEvitar.trim() || null,
        bira_tarefa_id: null,
        criado_por_id: usuario.id,
      });
      if (error) throw error;
      setProblema('');
      setCausa('');
      setSolucao('');
      setComoEvitar('');
      setCategoria('');
      setToast('Aprendizado salvo com sucesso!');
      await carregar();
    } catch (err) {
      console.error(err);
      setToast('Erro ao salvar. Tente novamente.');
    }
    setSalvando(false);
  }

  // ── Filtered list ─────────────────────────────────────────────────────────
  const listaFiltrada = lista.filter(item => {
    const q = busca.toLowerCase();
    const matchBusca =
      !busca ||
      item.problema.toLowerCase().includes(q) ||
      item.autor.toLowerCase().includes(q) ||
      (item.causa ?? '').toLowerCase().includes(q) ||
      item.solucao.toLowerCase().includes(q);
    const matchCat = !filtroCategoria || item.categoria === filtroCategoria;
    return matchBusca && matchCat;
  });

  // ── Summary stats ─────────────────────────────────────────────────────────
  const totalRegistros = lista.length;
  const categoriaDistintas = new Set(lista.map(i => i.categoria)).size;
  const ultimoRegistro = lista[0]
    ? new Date(lista[0].criado_em).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—';

  const inputCls =
    'w-full bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50 focus:bg-white/8 transition-colors resize-none';

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="px-6 pt-8 pb-6">
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-500/20 border border-blue-500/30 rounded-2xl flex items-center justify-center">
            <BookOpen size={20} className="text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight text-white">Aprendizados</h1>
              <span className="text-[9px] font-black uppercase tracking-[0.3em] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full">
                BASE DE CONHECIMENTO
              </span>
            </div>
            <p className="text-slate-400 text-xs mt-0.5">Registre lições aprendidas e evite repetir os mesmos erros</p>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total registros', value: totalRegistros },
            { label: 'Categorias', value: categoriaDistintas },
            { label: 'Último registro', value: ultimoRegistro },
          ].map(card => (
            <div
              key={card.label}
              className="bg-slate-900 border border-white/8 rounded-2xl px-4 py-3"
            >
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-1">{card.label}</p>
              <p className="text-white font-black text-lg">{card.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Two-column layout ─────────────────────────────────────────────── */}
      <div className="px-6 pb-10 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* ── LEFT: Form ──────────────────────────────────────────────────── */}
        <div className="bg-slate-900 border border-white/8 rounded-2xl p-6 sticky top-4">
          <h2 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-5">Novo Registro</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Autor */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Autor</label>
              <input
                type="text"
                value={autor}
                readOnly
                className={`${inputCls} opacity-60 cursor-default`}
              />
            </div>

            {/* Categoria */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Categoria <span className="text-red-400">*</span>
              </label>
              <select
                value={categoria}
                onChange={e => setCategoria(e.target.value)}
                required
                className={`${inputCls} appearance-none`}
              >
                <option value="" disabled>Selecionar categoria...</option>
                {CATEGORIAS.map(c => (
                  <option key={c} value={c} className="bg-slate-800">{c}</option>
                ))}
              </select>
            </div>

            {/* Problema */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Problema / Situação <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={2}
                value={problema}
                onChange={e => setProblema(e.target.value)}
                placeholder="Descreva o problema ou situação enfrentada..."
                required
                className={inputCls}
              />
            </div>

            {/* Causa */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Causa</label>
              <textarea
                rows={2}
                value={causa}
                onChange={e => setCausa(e.target.value)}
                placeholder="O que originou o problema?"
                className={inputCls}
              />
            </div>

            {/* Solução */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
                Solução <span className="text-red-400">*</span>
              </label>
              <textarea
                rows={3}
                value={solucao}
                onChange={e => setSolucao(e.target.value)}
                placeholder="Como foi resolvido?"
                required
                className={inputCls}
              />
            </div>

            {/* Como Evitar */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Como Evitar</label>
              <textarea
                rows={2}
                value={comoEvitar}
                onChange={e => setComoEvitar(e.target.value)}
                placeholder="O que fazer para não repetir?"
                className={inputCls}
              />
            </div>

            <button
              type="submit"
              disabled={salvando || !problema.trim() || !solucao.trim() || !categoria}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-black uppercase tracking-widest transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
            >
              {salvando ? 'Salvando...' : 'Salvar Aprendizado'}
            </button>
          </form>
        </div>

        {/* ── RIGHT: List ─────────────────────────────────────────────────── */}
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-blue-400 uppercase tracking-widest">Histórico</h2>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[160px]">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar..."
                className="w-full bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-500 pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-blue-500/50 transition-colors"
              />
            </div>
            <select
              value={filtroCategoria}
              onChange={e => setFiltroCategoria(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl text-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500/50 transition-colors appearance-none"
            >
              <option value="" className="bg-slate-800">Todas</option>
              {CATEGORIAS.map(c => (
                <option key={c} value={c} className="bg-slate-800">{c}</option>
              ))}
            </select>
          </div>

          {/* Cards */}
          {carregando ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-slate-900 border border-white/8 rounded-2xl p-5 animate-pulse h-36" />
              ))}
            </div>
          ) : listaFiltrada.length === 0 ? (
            <div className="bg-slate-900 border border-white/8 rounded-2xl p-12 flex flex-col items-center justify-center gap-3 text-center">
              <span className="text-4xl">📘</span>
              <p className="text-slate-400 font-bold text-sm">Nenhum aprendizado encontrado</p>
              <p className="text-slate-600 text-xs">
                {busca || filtroCategoria
                  ? 'Tente ajustar os filtros de busca'
                  : 'Seja o primeiro a registrar um aprendizado!'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {listaFiltrada.map(item => (
                <AprendizadoCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
