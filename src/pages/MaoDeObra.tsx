import { useState } from 'react';
import { Hammer, Plus, Trash2, Edit2, Save, X, ChevronDown, ChevronUp } from 'lucide-react';

/* ── Tipos ── */
interface Profissional {
  id: string;
  profissao: string;
  unid: string;
  coef: number;
  hhTotal: number;
}

interface Atividade {
  id: string;
  atividade: string;
  jornada: number;
  unid: string;
  qtd: number;
  tempoTotal: number;
  profissionais: Profissional[];
}

/* ── Componente de Tabela Individual ── */
function TabelaAtividade({
  item,
  onAtualizar,
  onRemover,
}: {
  item: Atividade;
  onAtualizar: (a: Atividade) => void;
  onRemover: (id: string) => void;
}) {
  const [aberto, setAberto] = useState(true);
  const [editando, setEditando] = useState(false);
  const [editado, setEditado] = useState<Atividade>(item);
  const [novProf, setNovProf] = useState({ profissao: '', unid: 'hh', coef: 0, hhTotal: 0 });

  const totalCoef = item.profissionais.reduce((s, p) => s + p.coef, 0);
  const totalHh = item.profissionais.reduce((s, p) => s + p.hhTotal, 0);

  function salvar() {
    onAtualizar(editado);
    setEditando(false);
  }

  function addProf() {
    if (!novProf.profissao.trim()) return;
    setEditado({
      ...editado,
      profissionais: [
        ...editado.profissionais,
        { ...novProf, id: Date.now().toString() },
      ],
    });
    setNovProf({ profissao: '', unid: 'hh', coef: 0, hhTotal: 0 });
  }

  function remProf(pid: string) {
    setEditado({
      ...editado,
      profissionais: editado.profissionais.filter((p) => p.id !== pid),
    });
  }

  /* ── Modo visualização ── */
  if (!editando) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setAberto(!aberto)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Hammer size={16} className="text-blue-600" />
            <div className="text-left">
              <h4 className="font-semibold text-slate-800">{item.atividade}</h4>
              <p className="text-xs text-slate-500">
                Jornada {item.jornada}h · {item.qtd} {item.unid} · {item.tempoTotal} dias ·{' '}
                <span className="font-semibold text-blue-600">{totalHh.toFixed(2)} Hh</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); setEditando(true); setEditado(item); }}
              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onRemover(item.id); }}
              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
            >
              <Trash2 size={14} />
            </button>
            {aberto ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
          </div>
        </button>

        {/* Tabela de profissionais */}
        {aberto && (
          <div className="border-t border-slate-100 px-5 pb-4">
            <table className="w-full text-xs mt-3">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-3 py-2 text-left font-semibold text-slate-600">PROFISSIONAL</th>
                  <th className="px-3 py-2 text-center font-semibold text-slate-600">UNID</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-600">COEF</th>
                  <th className="px-3 py-2 text-right font-semibold text-slate-600">Hh TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {item.profissionais.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2 text-slate-700">{p.profissao}</td>
                    <td className="px-3 py-2 text-center text-slate-500">{p.unid}</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-700">{p.coef.toFixed(4)}</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-blue-600">{p.hhTotal.toFixed(2)}</td>
                  </tr>
                ))}
                {item.profissionais.length > 0 && (
                  <tr className="bg-slate-50 font-semibold">
                    <td colSpan={2} className="px-3 py-2 text-right text-slate-600">TOTAL</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-800">{totalCoef.toFixed(4)}</td>
                    <td className="px-3 py-2 text-right font-mono text-blue-600">{totalHh.toFixed(2)}</td>
                  </tr>
                )}
                {item.profissionais.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-slate-400">
                      Nenhum profissional adicionado. Clique em editar para adicionar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  /* ── Modo edição ── */
  return (
    <div className="bg-blue-50 rounded-xl border-2 border-blue-300 shadow-sm p-5">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
        <div className="lg:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">Atividade</label>
          <input type="text" value={editado.atividade} onChange={(e) => setEditado({ ...editado, atividade: e.target.value })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Jornada (h)</label>
          <input type="number" value={editado.jornada} onChange={(e) => setEditado({ ...editado, jornada: parseFloat(e.target.value) || 0 })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">QTD</label>
          <input type="number" value={editado.qtd} onChange={(e) => setEditado({ ...editado, qtd: parseFloat(e.target.value) || 0 })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Tempo (dias)</label>
          <input type="number" value={editado.tempoTotal} onChange={(e) => setEditado({ ...editado, tempoTotal: parseFloat(e.target.value) || 0 })}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* Profissionais */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
        <h5 className="text-xs font-semibold text-slate-700 mb-3">Profissionais</h5>
        <div className="space-y-2 mb-3">
          {editado.profissionais.map((p) => (
            <div key={p.id} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded-lg">
              <span className="font-medium text-slate-700">{p.profissao}</span>
              <div className="flex items-center gap-3">
                <span className="text-slate-500">{p.coef.toFixed(4)}</span>
                <span className="font-semibold text-blue-600">{p.hhTotal.toFixed(2)}h</span>
                <button onClick={() => remProf(p.id)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-5 gap-2 p-3 bg-slate-50 rounded-lg border border-dashed border-slate-300">
          <input type="text" value={novProf.profissao} onChange={(e) => setNovProf({ ...novProf, profissao: e.target.value })}
            placeholder="Profissão" className="col-span-2 border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
          <input type="number" step="0.0001" value={novProf.coef || ''} onChange={(e) => setNovProf({ ...novProf, coef: parseFloat(e.target.value) || 0 })}
            placeholder="COEF" className="border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
          <input type="number" step="0.01" value={novProf.hhTotal || ''} onChange={(e) => setNovProf({ ...novProf, hhTotal: parseFloat(e.target.value) || 0 })}
            placeholder="Hh Total" className="border border-slate-200 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
          <button onClick={addProf} className="bg-blue-600 hover:bg-blue-700 text-white rounded px-2 py-1.5 text-xs font-medium flex items-center justify-center gap-1">
            <Plus size={12} /> Add
          </button>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={() => setEditando(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
          <X size={14} className="inline mr-1" />Cancelar
        </button>
        <button onClick={salvar} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium">
          <Save size={14} className="inline mr-1" />Salvar
        </button>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   PÁGINA PRINCIPAL — Mão de Obra
   ══════════════════════════════════════════ */
export function MaoDeObra() {
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [adicionando, setAdicionando] = useState(false);
  const [novo, setNovo] = useState({ atividade: '', jornada: 8, unid: 'm', qtd: 1, tempoTotal: 1 });

  const totalHhGeral = atividades.reduce(
    (sum, a) => sum + a.profissionais.reduce((s, p) => s + p.hhTotal, 0), 0
  );
  const totalCoefGeral = atividades.reduce(
    (sum, a) => sum + a.profissionais.reduce((s, p) => s + p.coef, 0), 0
  );

  function addAtividade() {
    if (!novo.atividade.trim()) return;
    setAtividades([
      ...atividades,
      { ...novo, id: Date.now().toString(), profissionais: [] },
    ]);
    setNovo({ atividade: '', jornada: 8, unid: 'm', qtd: 1, tempoTotal: 1 });
    setAdicionando(false);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <Hammer size={24} className="text-blue-600" />
              Mão de Obra
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Gerencie atividades e profissionais para cálculo de horas-homem
            </p>
          </div>
          <button
            onClick={() => setAdicionando(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors shadow-sm"
          >
            <Plus size={16} />
            Nova Atividade
          </button>
        </div>

        {/* KPIs */}
        {atividades.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Total de Atividades</p>
              <p className="text-2xl font-bold text-slate-800">{atividades.length}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
              <p className="text-xs text-slate-500 mb-1">Coeficiente Total</p>
              <p className="text-2xl font-bold text-slate-800">{totalCoefGeral.toFixed(4)}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <p className="text-xs text-blue-600 mb-1">Horas-Homem Total</p>
              <p className="text-2xl font-bold text-blue-600">{totalHhGeral.toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto p-8">
        {/* Form nova atividade */}
        {adicionando && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 mb-6">
            <h3 className="font-semibold text-slate-800 mb-4">Nova Atividade</h3>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
              <div className="lg:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Atividade</label>
                <input type="text" value={novo.atividade} onChange={(e) => setNovo({ ...novo, atividade: e.target.value })}
                  placeholder="Ex: Dellabruna - Galpão e Mezanino" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Jornada (h)</label>
                <input type="number" value={novo.jornada} onChange={(e) => setNovo({ ...novo, jornada: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">QTD</label>
                <input type="number" value={novo.qtd} onChange={(e) => setNovo({ ...novo, qtd: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tempo (dias)</label>
                <input type="number" value={novo.tempoTotal} onChange={(e) => setNovo({ ...novo, tempoTotal: parseFloat(e.target.value) || 0 })}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setAdicionando(false)} className="px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={addAtividade} className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium">
                Adicionar
              </button>
            </div>
          </div>
        )}

        {/* Lista */}
        {atividades.length === 0 && !adicionando ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
              <Hammer size={32} className="text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700">Nenhuma atividade cadastrada</h3>
            <p className="text-sm text-slate-400 mt-1 max-w-sm">
              Clique em "Nova Atividade" para começar a cadastrar as atividades de mão de obra e seus profissionais.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {atividades.map((a) => (
              <TabelaAtividade
                key={a.id}
                item={a}
                onAtualizar={(atualizado) => setAtividades(atividades.map((x) => x.id === atualizado.id ? atualizado : x))}
                onRemover={(id) => setAtividades(atividades.filter((x) => x.id !== id))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
