import { useState, useEffect, useMemo } from 'react';
import {
  Building2, FileText, ChevronRight,
  Cloud, Sun, CloudRain, Loader2, AlertCircle, Camera, Users,
  Wrench, MessageSquare, Clock, Search, ArrowLeft,
} from 'lucide-react';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { fetchAutenticado } from '../utils/fetchAutenticado';

// Types
interface ObraRDO {
  _id: string;
  nome: string;
  totalRelatorios: number;
  totalFotos: number;
  status: { id: number; descricao: string };
  created: string;
  modified: string;
  ultimoRelatorio: { data: string | null; numero: number | null } | null;
}

interface RelatorioResumo {
  _id: string;
  data: string;
  dataFim: string | null;
  diaDaSemana: string;
  numero: number;
  status: { id: number; descricao: string };
  obra: { _id: string; nome: string };
  modeloDeRelatorioGlobal: { _id: string; descricao: string };
  criadoPor: { appIss: string; dataHora: string; usuario: { _id: string; nome: string; cargo: string; email: string } };
}

interface RelatorioDetalhe {
  _id: string;
  data: string;
  dataFim: string | null;
  diaDaSemana: string;
  numero: number;
  status: { id: number; descricao: string };
  horarioDeTrabalho: { expedienteInicio: string; expedienteFim: string; horasTrabalhadas: string } | null;
  clima: {
    manha: { clima: string; condicao: string; ativo: boolean } | null;
    tarde: { clima: string; condicao: string; ativo: boolean } | null;
    noite: { clima: string; condicao: string; ativo: boolean } | null;
  } | null;
  maoDeObra: {
    opcaoSelecionada: string;
    padrao: { _id: string; descricao: string; quantidade: number }[];
    personalizada: { _id: string; nome: string; funcao: string; presenca: boolean; horasTrabalhadas: string }[];
  } | null;
  equipamentos: { _id: string; descricao: string; quantidade: number }[];
  atividades: {
    descricao: string;
    observacao: string | null;
    porcentagem: number;
    porcentagemAnterior: number;
    status: { id: number; descricao: string } | null;
    fotos: { url: string; urlMiniatura: string }[];
  }[];
  ocorrencias: {
    _id: string;
    descricao: string;
    tags: { descricao: string }[];
    fotos: { url: string; urlMiniatura: string }[];
  }[];
  comentarios: { descricao: string; dataHora: string; usuario: { nome: string } }[];
  galeriaDeFotos: { url: string; urlMiniatura: string; descricao: string }[];
  controleDeMaterial: { recebido: { descricao: string; quantidade: string }[]; utilizado: { descricao: string; quantidade: string }[] } | null;
}

// API helper
const API_BASE = import.meta.env.DEV ? 'http://localhost:3001' : '';

async function rdoFetch<T>(path: string, params?: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams({ path, ...params }).toString();
  const url = `${API_BASE}/api/rdo?${qs}`;
  let res: Response;
  try {
    res = await fetchAutenticado(url);
  } catch (e: unknown) {
    throw new Error(`Falha de conexão: ${(e as Error).message}`);
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Erro ${res.status}: ${txt.slice(0, 120)}`);
  }
  return res.json();
}

// Climate icon
function ClimaIcon({ clima }: { clima: string }) {
  const lower = clima?.toLowerCase() || '';
  if (lower.includes('chuva') || lower.includes('chuvoso')) return <CloudRain size={14} className="text-blue-500" />;
  if (lower.includes('nublado') || lower.includes('parcial')) return <Cloud size={14} className="text-slate-400" />;
  return <Sun size={14} className="text-amber-400" />;
}

// Status color
function statusCor(id: number) {
  switch (id) {
    case 1: return 'bg-amber-100 text-amber-700'; // Não iniciada
    case 2: return 'bg-red-100 text-red-700'; // Paralisada
    case 3: return 'bg-green-100 text-green-700'; // Em Andamento
    case 4: return 'bg-slate-100 text-slate-600'; // Concluída
    default: return 'bg-slate-100 text-slate-500';
  }
}

function relStatusCor(id: number) {
  switch (id) {
    case 1: return 'bg-amber-100 text-amber-700'; // Preenchendo
    case 3: return 'bg-blue-100 text-blue-700'; // Revisar
    case 4: return 'bg-green-100 text-green-700'; // Aprovado
    default: return 'bg-slate-100 text-slate-500';
  }
}

// ─── Main Component ─────────────────────────────────

export function DiarioDeObra() {
  const [obras, setObras] = useState<ObraRDO[]>([]);
  const [obraSelecionada, setObraSelecionada] = useState<string | null>(null);
  const [relatorios, setRelatorios] = useState<RelatorioResumo[]>([]);
  const [relatorioDetalhe, setRelatorioDetalhe] = useState<RelatorioDetalhe | null>(null);
  const [relatorioId, setRelatorioId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRel, setLoadingRel] = useState(false);
  const [, setLoadingDetalhe] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [busca, setBusca] = useState('');
  const [fotoExpandida, setFotoExpandida] = useState<string | null>(null);

  // Load obras
  function carregarObras() {
    setLoading(true);
    setErro(null);
    rdoFetch<ObraRDO[]>('obras')
      .then(setObras)
      .catch((e) => setErro(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => { carregarObras(); }, []);

  // Load relatorios when obra selected
  useEffect(() => {
    if (!obraSelecionada) { setRelatorios([]); return; }
    setLoadingRel(true);
    setRelatorioDetalhe(null);
    setRelatorioId(null);
    rdoFetch<RelatorioResumo[]>(`obras/${obraSelecionada}/relatorios`, { limite: '200', ordem: 'desc' })
      .then(setRelatorios)
      .catch((e) => setErro(e.message))
      .finally(() => setLoadingRel(false));
  }, [obraSelecionada]);

  // Load relatorio detail
  useEffect(() => {
    if (!obraSelecionada || !relatorioId) { setRelatorioDetalhe(null); return; }
    setLoadingDetalhe(true);
    rdoFetch<RelatorioDetalhe>(`obras/${obraSelecionada}/relatorios/${relatorioId}`)
      .then(setRelatorioDetalhe)
      .catch((e) => setErro(e.message))
      .finally(() => setLoadingDetalhe(false));
  }, [obraSelecionada, relatorioId]);

  const obrasFiltradas = useMemo(() => {
    if (!busca.trim()) return obras;
    const q = busca.toLowerCase();
    return obras.filter((o) => o.nome.toLowerCase().includes(q));
  }, [obras, busca]);

  const obraAtual = obras.find((o) => o._id === obraSelecionada);

  // ─── Loading / Error ───
  if (loading) {
    return <LoadingSpinner />;
  }

  if (erro) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <AlertCircle size={32} className="text-red-400 mx-auto mb-2" />
          <p className="text-sm text-slate-700 font-semibold">Erro ao carregar</p>
          <p className="text-xs text-slate-500 mb-3 max-w-md">{erro}</p>
          <button
            onClick={carregarObras}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  // ─── Relatório Detalhe View ───
  if (relatorioDetalhe && obraAtual) {
    return (
      <div className="flex flex-col h-full">
        {/* Photo modal */}
        {fotoExpandida && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setFotoExpandida(null)}>
            <img src={fotoExpandida} alt="" className="max-h-[90vh] max-w-[90vw] rounded-lg" />
          </div>
        )}

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white">
          <button onClick={() => setRelatorioId(null)} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-2">
            <ArrowLeft size={14} /> Voltar aos relatórios
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                RDO #{relatorioDetalhe.numero} — {relatorioDetalhe.data}
              </h1>
              <p className="text-sm text-slate-500">{obraAtual.nome} • {relatorioDetalhe.diaDaSemana}</p>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${relStatusCor(relatorioDetalhe.status?.id ?? 0)}`}>
              {relatorioDetalhe.status?.descricao}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-5">
          {/* Clima + Horário */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {relatorioDetalhe.clima && (
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Cloud size={16} className="text-blue-500" /> Clima
                </h3>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {(['manha', 'tarde', 'noite'] as const).map((p) => {
                    const c = relatorioDetalhe.clima?.[p];
                    if (!c?.ativo) return null;
                    return (
                      <div key={p} className="bg-slate-50 rounded-lg p-2 text-center">
                        <p className="text-slate-400 uppercase font-medium mb-1">{p === 'manha' ? 'Manhã' : p === 'tarde' ? 'Tarde' : 'Noite'}</p>
                        <div className="flex items-center justify-center gap-1">
                          <ClimaIcon clima={c.clima} />
                          <span className="text-slate-700">{c.clima}</span>
                        </div>
                        <p className="text-slate-500 mt-0.5">{c.condicao}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {relatorioDetalhe.horarioDeTrabalho && (
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Clock size={16} className="text-blue-500" /> Expediente
                </h3>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-slate-600">{relatorioDetalhe.horarioDeTrabalho.expedienteInicio} — {relatorioDetalhe.horarioDeTrabalho.expedienteFim}</span>
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                    {relatorioDetalhe.horarioDeTrabalho.horasTrabalhadas}h
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Mão de Obra */}
          {relatorioDetalhe.maoDeObra && (relatorioDetalhe.maoDeObra.padrao.length > 0 || relatorioDetalhe.maoDeObra.personalizada.length > 0) && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Users size={16} className="text-orange-500" /> Mão de Obra
              </h3>
              {relatorioDetalhe.maoDeObra.padrao.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-slate-400 mb-1 uppercase font-medium">Padrão</p>
                  <div className="flex flex-wrap gap-2">
                    {relatorioDetalhe.maoDeObra.padrao.map((m) => (
                      <span key={m._id} className="bg-orange-50 text-orange-700 text-xs px-2 py-1 rounded-lg">
                        {m.descricao} × {m.quantidade}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {relatorioDetalhe.maoDeObra.personalizada.length > 0 && (
                <div>
                  <p className="text-xs text-slate-400 mb-1 uppercase font-medium">Equipe ({relatorioDetalhe.maoDeObra.personalizada.filter(p => p.presenca).length} presentes)</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                    {relatorioDetalhe.maoDeObra.personalizada.map((m) => (
                      <div key={m._id} className={`flex items-center justify-between text-xs px-2 py-1.5 rounded ${m.presenca ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-400 line-through'}`}>
                        <span>{m.nome}</span>
                        <span className="text-[10px] opacity-70">{m.funcao} • {m.horasTrabalhadas}h</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Equipamentos */}
          {relatorioDetalhe.equipamentos.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Wrench size={16} className="text-purple-500" /> Equipamentos
              </h3>
              <div className="flex flex-wrap gap-2">
                {relatorioDetalhe.equipamentos.map((e) => (
                  <span key={e._id} className="bg-purple-50 text-purple-700 text-xs px-2 py-1 rounded-lg">
                    {e.descricao} × {e.quantidade}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Atividades */}
          {relatorioDetalhe.atividades.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <FileText size={16} className="text-green-500" /> Atividades ({relatorioDetalhe.atividades.length})
              </h3>
              <div className="space-y-3">
                {relatorioDetalhe.atividades.map((a, i) => (
                  <div key={i} className="border border-slate-100 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm text-slate-800 font-medium">{a.descricao}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {a.porcentagemAnterior !== undefined && a.porcentagemAnterior !== a.porcentagem && (
                          <span className="text-[10px] text-slate-400">{a.porcentagemAnterior}% →</span>
                        )}
                        <span className={`text-xs font-bold ${a.porcentagem === 100 ? 'text-green-600' : 'text-blue-600'}`}>
                          {a.porcentagem}%
                        </span>
                      </div>
                    </div>
                    {a.observacao && <p className="text-xs text-slate-500 mb-1">{a.observacao}</p>}
                    {/* Progress bar */}
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1">
                      <div className={`h-1.5 rounded-full ${a.porcentagem === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${a.porcentagem}%` }} />
                    </div>
                    {/* Fotos */}
                    {a.fotos.length > 0 && (
                      <div className="flex gap-2 mt-2 overflow-x-auto">
                        {a.fotos.map((f, fi) => (
                          <img key={fi} src={f.urlMiniatura || f.url} alt="" className="w-16 h-16 rounded-lg object-cover cursor-pointer hover:opacity-80" onClick={() => setFotoExpandida(f.url)} />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ocorrências */}
          {relatorioDetalhe.ocorrencias.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <AlertCircle size={16} className="text-red-500" /> Ocorrências ({relatorioDetalhe.ocorrencias.length})
              </h3>
              <div className="space-y-2">
                {relatorioDetalhe.ocorrencias.map((o) => (
                  <div key={o._id} className="bg-red-50 rounded-lg p-3">
                    <p className="text-sm text-slate-800">{o.descricao}</p>
                    {o.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {o.tags.map((t, ti) => (
                          <span key={ti} className="bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded">{t.descricao}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Material */}
          {relatorioDetalhe.controleDeMaterial && (relatorioDetalhe.controleDeMaterial.recebido.length > 0 || relatorioDetalhe.controleDeMaterial.utilizado.length > 0) && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Controle de Material</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {relatorioDetalhe.controleDeMaterial.recebido.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-medium mb-1">Recebido</p>
                    {relatorioDetalhe.controleDeMaterial.recebido.map((m, i) => (
                      <p key={i} className="text-xs text-slate-600">{m.descricao}: {m.quantidade}</p>
                    ))}
                  </div>
                )}
                {relatorioDetalhe.controleDeMaterial.utilizado.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-medium mb-1">Utilizado</p>
                    {relatorioDetalhe.controleDeMaterial.utilizado.map((m, i) => (
                      <p key={i} className="text-xs text-slate-600">{m.descricao}: {m.quantidade}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Comentários */}
          {relatorioDetalhe.comentarios.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <MessageSquare size={16} className="text-blue-500" /> Comentários
              </h3>
              <div className="space-y-2">
                {relatorioDetalhe.comentarios.map((c, i) => (
                  <div key={i} className="bg-slate-50 rounded-lg p-2.5">
                    <p className="text-xs text-slate-800">{c.descricao}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{c.usuario.nome} • {c.dataHora}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Galeria */}
          {relatorioDetalhe.galeriaDeFotos.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <Camera size={16} className="text-blue-500" /> Fotos ({relatorioDetalhe.galeriaDeFotos.length})
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                {relatorioDetalhe.galeriaDeFotos.map((f, i) => (
                  <div key={i} className="relative group">
                    <img src={f.urlMiniatura || f.url} alt={f.descricao || ''} className="w-full aspect-square rounded-lg object-cover cursor-pointer hover:opacity-80" onClick={() => setFotoExpandida(f.url)} />
                    {f.descricao && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] px-1 py-0.5 rounded-b-lg truncate opacity-0 group-hover:opacity-100 transition-opacity">
                        {f.descricao}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Relatórios List View ───
  if (obraSelecionada && obraAtual) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-white">
          <button onClick={() => setObraSelecionada(null)} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-2">
            <ArrowLeft size={14} /> Voltar às obras
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Building2 size={20} className="text-blue-600" />
                {obraAtual.nome}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {obraAtual.totalRelatorios} relatórios • {obraAtual.totalFotos} fotos
              </p>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusCor(obraAtual.status.id)}`}>
              {obraAtual.status.descricao}
            </span>
          </div>
        </div>

        {/* Relatórios */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          {loadingRel ? (
            <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-blue-500" /></div>
          ) : relatorios.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText size={32} className="mx-auto mb-2" />
              <p className="text-sm">Nenhum relatório encontrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {relatorios.map((r) => (
                <div
                  key={r._id}
                  onClick={() => setRelatorioId(r._id)}
                  className="bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-blue-50 rounded-lg w-12 h-12 flex items-center justify-center shrink-0">
                      <span className="text-lg font-bold text-blue-600">#{r.numero}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-800">{r.data}</p>
                        <span className="text-xs text-slate-400">{r.diaDaSemana}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {r.modeloDeRelatorioGlobal?.descricao} • {r.criadoPor?.usuario?.nome}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${relStatusCor(r.status?.id ?? 0)}`}>
                      {r.status?.descricao}
                    </span>
                    <ChevronRight size={16} className="text-slate-300" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Obras List View ───
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-8 py-6 border-b border-slate-200 bg-white">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <Building2 size={24} className="text-blue-600" />
          Diário de Obra (RDO)
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Relatórios diários de obra importados automaticamente.
        </p>
      </div>

      {/* Busca */}
      <div className="px-8 py-4 bg-white border-b border-slate-100">
        <div className="relative max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar obra..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* KPIs */}
      <div className="px-8 py-4 bg-slate-50 border-b border-slate-100">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl p-3 border border-slate-200">
            <p className="text-xs text-slate-500">Total de obras</p>
            <p className="text-xl font-bold text-slate-800">{obras.length}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-slate-200">
            <p className="text-xs text-slate-500">Em Andamento</p>
            <p className="text-xl font-bold text-green-600">{obras.filter(o => o.status.id === 3).length}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-slate-200">
            <p className="text-xs text-slate-500">Total Relatórios</p>
            <p className="text-xl font-bold text-blue-600">{obras.reduce((s, o) => s + o.totalRelatorios, 0)}</p>
          </div>
          <div className="bg-white rounded-xl p-3 border border-slate-200">
            <p className="text-xs text-slate-500">Total Fotos</p>
            <p className="text-xl font-bold text-purple-600">{obras.reduce((s, o) => s + o.totalFotos, 0).toLocaleString('pt-BR')}</p>
          </div>
        </div>
      </div>

      {/* Obras Grid */}
      <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {obrasFiltradas.map((obra) => (
            <div
              key={obra._id}
              onClick={() => setObraSelecionada(obra._id)}
              className="bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-2 flex-1 mr-2">
                  {obra.nome}
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${statusCor(obra.status.id)}`}>
                  {obra.status.descricao}
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <FileText size={12} /> {obra.totalRelatorios} relatórios
                </span>
                <span className="flex items-center gap-1">
                  <Camera size={12} /> {obra.totalFotos} fotos
                </span>
              </div>
              {obra.ultimoRelatorio?.data && (
                <p className="text-[10px] text-slate-400 mt-2">
                  Último RDO: #{obra.ultimoRelatorio.numero} em {obra.ultimoRelatorio.data}
                </p>
              )}
              <div className="flex justify-end mt-2">
                <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-400 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
