import { useEffect, useMemo, useState } from 'react';
import { Building2, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { supabase } from '../infrastructure/supabase/client';
import { useAuth } from '../context/AuthContext';

type ObraItem = {
  id: string;
  nome: string;
};

const CARD =
  'rounded-[24px] border border-[rgba(113,154,255,0.28)] bg-[linear-gradient(180deg,rgba(24,55,120,0.92),rgba(20,48,111,0.95))] shadow-[0_18px_35px_rgba(0,0,0,0.22)]';

export function Obras() {
  const { usuario } = useAuth();
  const canEdit = ['gestor', 'admin', 'dono'].includes((usuario?.papel ?? '').toLowerCase());

  const [obras, setObras] = useState<ObraItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [busca, setBusca] = useState('');

  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<ObraItem | null>(null);
  const [nome, setNome] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function carregarObras() {
    setLoading(true);
    setErro('');
    try {
      const { data, error } = await supabase.from('obras').select('id,nome').order('nome');
      if (error) throw error;
      setObras((data || []) as ObraItem[]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao carregar obras.';
      setErro(msg);
      setObras([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void carregarObras();
  }, []);

  const obrasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return obras;
    return obras.filter((o) => o.nome.toLowerCase().includes(q));
  }, [busca, obras]);

  function abrirNova() {
    setEditando(null);
    setNome('');
    setErro('');
    setModalAberto(true);
  }

  function abrirEdicao(obra: ObraItem) {
    setEditando(obra);
    setNome(obra.nome);
    setErro('');
    setModalAberto(true);
  }

  function fecharModal() {
    setModalAberto(false);
    setEditando(null);
    setNome('');
    setErro('');
  }

  async function salvar() {
    const nomeFinal = nome.trim();
    if (!nomeFinal) {
      setErro('Informe o nome da obra.');
      return;
    }

    setSalvando(true);
    setErro('');
    try {
      if (editando) {
        const { error } = await supabase.from('obras').update({ nome: nomeFinal }).eq('id', editando.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('obras').insert({ nome: nomeFinal });
        if (error) throw error;
      }

      await carregarObras();
      fecharModal();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível salvar a obra.';
      setErro(msg);
    } finally {
      setSalvando(false);
    }
  }

  async function remover(obra: ObraItem) {
    const ok = window.confirm(`Remover a obra "${obra.nome}"?`);
    if (!ok) return;

    setErro('');
    try {
      const { error } = await supabase.from('obras').delete().eq('id', obra.id);
      if (error) throw error;
      await carregarObras();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Não foi possível remover a obra.';
      setErro(msg);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071b49] to-[#0b2260] text-[#f4f7ff] px-4 py-6">
      <div className="max-w-5xl mx-auto">
        <section className={CARD + ' p-6 mb-6'}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#3560b8] bg-[rgba(7,22,64,0.28)] text-[11px] font-extrabold uppercase tracking-[0.12em] mb-3">
                <Building2 size={14} /> Cadastro de Obras
              </p>
              <h1 className="text-[2rem] leading-tight font-extrabold">Obras</h1>
              <p className="text-[#b8c5eb] mt-2">Cadastre as obras oficiais para serem usadas no formulário de requisições.</p>
            </div>

            {canEdit && (
              <button
                type="button"
                onClick={abrirNova}
                className="inline-flex items-center gap-2 rounded-[14px] bg-[linear-gradient(180deg,#4b7bf0,#3d6fe0)] px-4 py-2.5 font-extrabold shadow-[0_10px_24px_rgba(52,104,223,0.35)] hover:opacity-95"
              >
                <Plus size={16} /> Nova obra
              </button>
            )}
          </div>
        </section>

        <section className={CARD + ' p-6'}>
          <div className="flex items-center gap-2 rounded-[14px] border border-[#3560b8] bg-[rgba(10,30,77,0.32)] px-3 mb-4">
            <Search size={16} className="text-[#89a2e2]" />
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar obra..."
              className="w-full bg-transparent py-3 outline-none text-[#f4f7ff] placeholder:text-[#89a2e2]"
            />
          </div>

          {erro && <div className="mb-4 rounded-[14px] border border-[rgba(255,107,107,0.35)] bg-[rgba(255,107,107,0.12)] px-4 py-3 text-[#ffb6b6]">{erro}</div>}

          {loading ? (
            <div className="text-[#b8c5eb] py-8">Carregando obras...</div>
          ) : obrasFiltradas.length === 0 ? (
            <div className="text-[#b8c5eb] py-8">Nenhuma obra encontrada.</div>
          ) : (
            <div className="divide-y divide-white/10 rounded-[14px] border border-white/10 overflow-hidden">
              {obrasFiltradas.map((obra) => (
                <div key={obra.id} className="px-4 py-3 bg-[rgba(7,22,64,0.25)] flex items-center justify-between gap-3">
                  <div className="font-semibold text-white truncate">{obra.nome}</div>
                  {canEdit && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => abrirEdicao(obra)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#3560b8] px-2.5 py-1.5 text-xs font-bold hover:bg-white/10"
                      >
                        <Pencil size={13} /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => void remover(obra)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[rgba(255,107,107,0.45)] px-2.5 py-1.5 text-xs font-bold text-[#ffb6b6] hover:bg-[rgba(255,107,107,0.12)]"
                      >
                        <Trash2 size={13} /> Remover
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {modalAberto && (
        <div className="fixed inset-0 z-[120] bg-black/70 p-4 flex items-center justify-center">
          <div className="w-full max-w-md rounded-[20px] border border-[rgba(113,154,255,0.35)] bg-[linear-gradient(180deg,rgba(24,55,120,0.98),rgba(20,48,111,0.98))] p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-extrabold">{editando ? 'Editar obra' : 'Nova obra'}</h3>
              <button type="button" onClick={fecharModal} className="text-[#b8c5eb] hover:text-white">
                <X size={18} />
              </button>
            </div>

            <label className="text-sm font-bold text-[#89a2e2] uppercase tracking-[0.08em]">Nome da obra</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full mt-2 rounded-[14px] border border-[#3560b8] bg-[rgba(10,30,77,0.32)] text-[#f4f7ff] px-3 py-3 outline-none"
              placeholder="Ex.: Della Bruna"
            />

            <div className="flex justify-end gap-2 mt-5">
              <button type="button" onClick={fecharModal} className="rounded-[12px] border border-white/20 px-3 py-2 text-sm font-bold text-[#b8c5eb] hover:bg-white/10">
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void salvar()}
                disabled={salvando}
                className="rounded-[12px] bg-[linear-gradient(180deg,#4b7bf0,#3d6fe0)] px-4 py-2 text-sm font-extrabold shadow-[0_10px_24px_rgba(52,104,223,0.35)] disabled:opacity-60"
              >
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


