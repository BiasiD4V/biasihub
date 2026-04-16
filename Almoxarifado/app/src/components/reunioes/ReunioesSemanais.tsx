import React, { useState, useEffect, useCallback } from 'react';
import {
  Calendar, ChevronLeft, Trash, Save, Info, Plus, ChevronDown, RefreshCw
} from 'lucide-react';
import {
  comercialReunioesRepository,
  type ReuniaoSemanal
} from '../../infrastructure/supabase/comercialReunioesRepository';
import { useAuth } from '../../context/AuthContext';

interface SectionHeaderProps {
  icon: React.ElementType;
  title: string;
  sub?: string;
  cor: string;
}

function SectionHeader({ icon: Icon, title, sub, cor }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <div className={`p-2.5 rounded-2xl ${cor}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <h2 className="text-lg font-black text-slate-800 leading-none">{title}</h2>
        {sub && <p className="text-xs text-slate-400 mt-0.5 font-medium">{sub}</p>}
      </div>
    </div>
  );
}

export function ReunioesSemanais({ membrosDisponiveis }: { membrosDisponiveis: string[] }) {
  const { usuario } = useAuth();
  const primeiroNome = usuario?.nome?.split(' ')[0]?.toLowerCase() ?? '';
  const [semanas, setSemanas] = useState<ReuniaoSemanal[]>([]);
  const [carregandoSemanas, setCarregandoSemanas] = useState(true);
  const [view, setView] = useState<'menu' | 'editor'>('menu');
  const [selecionada, setSelecionada] = useState<ReuniaoSemanal | null>(null);
  const [salvando, setSalvando] = useState(false);

  const carregarSemanas = useCallback(async () => {
    setCarregandoSemanas(true);
    try {
      const data = await comercialReunioesRepository.listar();
      setSemanas(data);
    } catch (err) {
      console.error('Erro ao carregar reuniões:', err);
    } finally {
      setCarregandoSemanas(false);
    }
  }, []);

  useEffect(() => { carregarSemanas(); }, [carregarSemanas]);

  function handleNovaSemana() {
    const hoje = new Date();
    const dataFormat = hoje.toISOString().split('T')[0];
    const brFormat = hoje.toLocaleDateString('pt-BR');
    const nova: Partial<ReuniaoSemanal> = {
      titulo: `REUNIÃO ${brFormat}`,
      data: dataFormat,
      resumo: 'Nova pauta de resoluções semanais.',
      dados: membrosDisponiveis.map(m => ({
        name: m.split(' ')[0], // Nome curto
        problem: '',
        solutions: [{ text: '', responsible: m, idealizer: '', status: 'Parado' }]
      }))
    };
    setSelecionada(nova as ReuniaoSemanal);
    setView('editor');
  }

  async function handleSalvar() {
    if (!selecionada) return;
    setSalvando(true);
    try {
      const resp = await comercialReunioesRepository.upsert(selecionada);
      setSelecionada(resp);
      await carregarSemanas();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar reunião. Verifique o banco de dados.');
    } finally {
      setSalvando(false);
    }
  }

  function gerarPDF() {
    if (!selecionada) return;

    // Agrupa soluções por responsável
    const porResponsavel: Record<string, { acao: string; membro: string; status: string }[]> = {};

    for (const card of selecionada.dados) {
      for (const sol of card.solutions) {
        if (!sol.text?.trim()) continue;
        const resp = (sol.responsible || card.name || 'Sem responsável').trim();
        if (!porResponsavel[resp]) porResponsavel[resp] = [];
        porResponsavel[resp].push({
          acao: sol.text,
          membro: card.name,
          status: sol.status || 'Parado',
        });
      }
    }

    const dataBR = selecionada.data
      ? new Date(selecionada.data + 'T12:00:00').toLocaleDateString('pt-BR')
      : '';

    const statusCor = (s: string) =>
      s === 'Concluída' ? '#16a34a' : s === 'Em andamento' ? '#d97706' : '#6b7280';

    const blocos = Object.entries(porResponsavel)
      .map(([nome, acoes]) => `
        <div class="bloco">
          <h2>${nome.toUpperCase()}</h2>
          <ul>
            ${acoes.map(a => `
              <li>
                <span class="acao">${a.acao}</span>
                <span class="meta">de: ${a.membro} &nbsp;·&nbsp; <span style="color:${statusCor(a.status)}">${a.status}</span></span>
              </li>
            `).join('')}
          </ul>
        </div>
      `).join('');

    // Gera HTML compatível com Word (.doc)
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8"/>
  <title>${selecionada.titulo}</title>
  <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
  <style>
    body { font-family: Calibri, Arial, sans-serif; color: #1e293b; margin: 2cm; }
    h1 { font-size: 18pt; font-weight: bold; color: #1e293b; text-transform: uppercase; border-bottom: 3pt solid #4f46e5; padding-bottom: 6pt; margin-bottom: 4pt; }
    .sub { font-size: 10pt; color: #64748b; margin-bottom: 24pt; }
    h2 { font-size: 11pt; font-weight: bold; color: #4f46e5; text-transform: uppercase; letter-spacing: 1pt; background: #eef2ff; padding: 4pt 8pt; margin-top: 18pt; margin-bottom: 8pt; border-left: 4pt solid #4f46e5; }
    .item { margin-left: 12pt; margin-bottom: 6pt; border-left: 2pt solid #e2e8f0; padding-left: 8pt; }
    .acao { font-size: 11pt; font-weight: 600; color: #1e293b; }
    .meta { font-size: 9pt; color: #94a3b8; }
    .status-ok { color: #16a34a; }
    .status-wip { color: #d97706; }
    .status-no { color: #6b7280; }
    .footer { margin-top: 32pt; border-top: 1pt solid #e2e8f0; padding-top: 8pt; font-size: 8pt; color: #94a3b8; text-align: center; }
  </style>
</head>
<body>
  <h1>${selecionada.titulo}</h1>
  <div class="sub">Data: ${dataBR}${selecionada.resumo ? ' · ' + selecionada.resumo : ''}</div>
  ${blocos || '<p style="color:#94a3b8">Nenhuma resolução registrada.</p>'}
  <div class="footer">Gerado pelo BiasíHub · ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
</body>
</html>`;

    // Download direto como .doc (Word abre nativamente)
    const blob = new Blob(['\ufeff' + html], { type: 'application/msword;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const nomeArquivo = selecionada.titulo.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_') || 'reuniao';
    a.href = url;
    a.download = `${nomeArquivo}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function handleSalvarEGerarPDF() {
    await handleSalvar();
    gerarPDF();
  }

  async function handleExcluir() {
    if (!selecionada?.id || !window.confirm('Excluir esta reunião permanentemente?')) return;
    try {
      await comercialReunioesRepository.deletar(selecionada.id);
      setView('menu');
      setSelecionada(null);
      await carregarSemanas();
    } catch (err) {
       console.error(err);
    }
  }

  // View: Menu Principal
  if (view === 'menu') {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 p-6">
        <div className="flex items-center justify-between mb-8">
           <SectionHeader icon={Calendar} title="Pautas e Resoluções" sub="Histórico de reuniões semanais do time" cor="bg-blue-600" />
           <button 
             onClick={handleNovaSemana}
             className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition-all hover:scale-105"
           >
             <Plus size={16} /> Nova Semana
           </button>
        </div>

        {carregandoSemanas ? (
          <div className="py-20 text-center"><RefreshCw className="animate-spin text-slate-300 mx-auto" /></div>
        ) : semanas.length === 0 ? (
          <div className="premium-glass bg-white/40 border-2 border-dashed border-slate-200 rounded-[32px] p-20 text-center">
             <Calendar size={48} className="text-slate-200 mx-auto mb-4" />
             <p className="text-slate-400 font-bold italic">Nenhuma reunião registrada ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {semanas.map(s => (
              <div 
                key={s.id} 
                onClick={() => { setSelecionada(s); setView('editor'); }}
                className="premium-glass bg-white/80 border-2 border-slate-100/50 rounded-[32px] p-6 cursor-pointer hover:border-blue-400 hover:shadow-2xl transition-all group"
              >
                <div className="flex items-center justify-between mb-4">
                   <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <Calendar size={20} />
                   </div>
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(s.data).toLocaleDateString('pt-BR')}</span>
                </div>
                <h3 className="font-black text-slate-800 text-lg leading-tight mb-3 group-hover:text-blue-700">{s.titulo}</h3>
                <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed h-8">{s.resumo || 'Clique para ver detalhes.'}</p>
                <div className="mt-6 flex items-center gap-2">
                   <div className="flex -space-x-2">
                      {s.dados.slice(0, 4).map((d, i) => (
                        <div key={i} className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[8px] font-bold text-slate-600">{d.name.charAt(0)}</div>
                      ))}
                      {s.dados.length > 4 && <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-slate-400">+{s.dados.length - 4}</div>}
                   </div>
                   <span className="text-[10px] font-bold text-slate-400 uppercase ml-auto">Ver Pauta →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // View: Editor de Semana
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-500 p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
           <button onClick={() => setView('menu')} className="w-12 h-12 rounded-2xl bg-white border-2 border-slate-100 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-all hover:border-blue-200 shadow-sm">
              <ChevronLeft size={24} />
           </button>
           <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">{selecionada?.titulo || 'Nova Reunião'}</h2>
              <div className="flex items-center gap-2 mt-1">
                 <span className="pill green text-[10px]">{new Date(selecionada?.data || '').toLocaleDateString('pt-BR')}</span>
                 <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Editor de Resoluções</span>
              </div>
           </div>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button onClick={handleExcluir} className="flex-1 sm:flex-none h-12 px-6 rounded-2xl bg-rose-50 text-rose-500 font-bold text-xs uppercase tracking-widest hover:bg-rose-100 transition-all">
             <Trash size={16} className="inline mr-2" /> Excluir
          </button>
          <button onClick={handleSalvar} disabled={salvando} className="flex-[2] sm:flex-none h-12 px-8 rounded-2xl bg-blue-600 text-white font-black text-xs uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-600/20 transition-all flex items-center justify-center gap-2">
             {salvando ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
             {salvando ? 'Salvando...' : 'Salvar Reunião'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configurações Básicas */}
        <div className="lg:col-span-1 space-y-6">
           <div className="premium-glass bg-white/60 p-8 rounded-[32px] border-2 border-white shadow-xl">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                 <Info size={14} className="text-blue-500" /> Metadados da Reunião
              </h3>
              <div className="space-y-5">
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Título</label>
                    <input 
                      type="text" 
                      value={selecionada?.titulo || ''} 
                      onChange={e => setSelecionada(s => s ? ({...s, titulo: e.target.value}) : null)}
                      className="w-full px-5 py-4 font-bold bg-white/50 border-2 border-slate-100 rounded-2xl focus:border-blue-400 transition-all text-sm"
                    />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Data</label>
                    <input 
                      type="date" 
                      value={selecionada?.data || ''} 
                      onChange={e => setSelecionada(s => s ? ({...s, data: e.target.value}) : null)}
                      className="w-full px-5 py-4 font-bold bg-white/50 border-2 border-slate-100 rounded-2xl focus:border-blue-400 transition-all text-sm"
                    />
                 </div>
                 <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Resumo Curto</label>
                    <textarea 
                      rows={3}
                      value={selecionada?.resumo || ''} 
                      onChange={e => setSelecionada(s => s ? ({...s, resumo: e.target.value}) : null)}
                      className="w-full px-5 py-4 font-medium bg-white/50 border-2 border-slate-100 rounded-2xl focus:border-blue-400 transition-all text-sm resize-none"
                      placeholder="Destaques principais da reunião..."
                    />
                 </div>
              </div>
           </div>
        </div>

        {/* Cards dos Membros */}
        <div className="lg:col-span-2 space-y-6 pb-20">
           <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] ml-2">Cards Resolucionais do Time</h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase">{selecionada?.dados.length} pessoas</span>
           </div>

           {selecionada?.dados.map((card, cardIdx) => {
             return (
             <details key={cardIdx} className="group premium-glass bg-white/50 border-2 border-white rounded-[32px] overflow-hidden transition-all open:shadow-2xl open:bg-white open:border-blue-100" open={cardIdx === 0}>
               <summary className="flex items-center justify-between p-6 cursor-pointer list-none">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-lg bg-gradient-to-br from-indigo-500 to-blue-600 shadow-blue-500/20">
                      {card.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-slate-800">{card.name}</h4>
                      </div>
                      <p className="text-xs text-slate-400 truncate max-w-[200px] sm:max-w-md">{card.problem || 'Pendente de pauta...'}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-3">
                    <span className={`pill text-[9px] ${card.solutions.every(s => s.status === 'Concluída') ? 'green' : 'blue'}`}>
                      {card.solutions.length} ações
                    </span>
                    <ChevronDown size={18} className="text-slate-300 transition-transform group-open:rotate-180" />
                 </div>
               </summary>
               <div className="px-6 pb-8 pt-2 space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-blue-600/60 uppercase tracking-widest ml-2">Dificuldade / Problema</label>
                    <textarea 
                      value={card.problem}
                      onChange={e => {
                        const novados = [...selecionada.dados];
                        novados[cardIdx].problem = e.target.value;
                        setSelecionada({...selecionada, dados: novados});
                      }}
                      className="w-full px-6 py-5 bg-slate-50 border-2 border-transparent rounded-[24px] focus:bg-white focus:border-blue-200 transition-all text-sm font-medium leading-relaxed"
                      placeholder={`O que está travando o(a) ${card.name} esta semana?`}
                    />
                 </div>

                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest ml-2">Plano de Ação</label>
                    <div className="space-y-3">
                      {card.solutions.map((sol, solIdx) => (
                        <div key={solIdx} className="bg-slate-50/50 border border-slate-100 rounded-3xl p-5 space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resolução {solIdx + 1}</span>
                            <button 
                              onClick={() => {
                                const novados = [...selecionada.dados];
                                novados[cardIdx].solutions = novados[cardIdx].solutions.filter((_, i) => i !== solIdx);
                                if (novados[cardIdx].solutions.length === 0) novados[cardIdx].solutions = [{ text: '', responsible: card.name, status: 'Parado' }];
                                setSelecionada({...selecionada, dados: novados});
                              }}
                              className="text-rose-400 hover:text-rose-600 transition-colors"
                            >
                              <Trash size={14} />
                            </button>
                          </div>
                          <textarea 
                            value={sol.text}
                            onChange={e => {
                              const novados = [...selecionada.dados];
                              novados[cardIdx].solutions[solIdx].text = e.target.value;
                              setSelecionada({...selecionada, dados: novados});
                            }}
                            className="w-full bg-transparent border-none p-0 text-sm font-bold text-slate-700 focus:ring-0 resize-none"
                            placeholder="Descreva a ação corretiva..."
                            rows={2}
                          />
                          <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-slate-200/50">
                             <div className="flex-1">
                                <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Idealizador</label>
                                <select 
                                  value={sol.idealizer || ''}
                                  onChange={e => {
                                    const novados = [...selecionada.dados];
                                    novados[cardIdx].solutions[solIdx].idealizer = e.target.value;
                                    setSelecionada({...selecionada, dados: novados});
                                  }}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 appearance-none"
                                >
                                  <option value="">Selecionar</option>
                                  {membrosDisponiveis.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                             </div>
                             {(() => {
                               const euSouResponsavel = primeiroNome !== '' && sol.responsible?.toLowerCase().includes(primeiroNome);
                               return (
                               <div className={`flex-1 ${euSouResponsavel ? 'ring-2 ring-amber-400 rounded-xl shadow-[0_0_8px_2px_rgba(251,191,36,0.25)]' : ''}`}>
                                <label className={`text-[9px] font-bold uppercase mb-1 block ${euSouResponsavel ? 'text-amber-600' : 'text-slate-400'}`}>
                                  {euSouResponsavel ? '⭐ Responsável' : 'Responsável'}
                                </label>
                                <select
                                  value={sol.responsible}
                                  onChange={e => {
                                    const novados = [...selecionada.dados];
                                    novados[cardIdx].solutions[solIdx].responsible = e.target.value;
                                    setSelecionada({...selecionada, dados: novados});
                                  }}
                                  className={`w-full rounded-xl px-3 py-2 text-xs font-bold appearance-none ${euSouResponsavel ? 'bg-amber-50 border border-amber-300 text-amber-800' : 'bg-white border border-slate-200 text-slate-600'}`}
                                >
                                  <option value="">Selecionar</option>
                                  {membrosDisponiveis.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                             </div>
                             );
                             })()}
                             <div className="w-full sm:w-40">
                                <label className="text-[9px] font-bold text-slate-400 uppercase mb-1 block">Status</label>
                                <select 
                                  value={sol.status}
                                  onChange={e => {
                                    const novados = [...selecionada.dados];
                                    novados[cardIdx].solutions[solIdx].status = e.target.value as any;
                                    setSelecionada({...selecionada, dados: novados});
                                  }}
                                  className={`w-full border-none rounded-xl px-3 py-2 text-xs font-black uppercase tracking-wider ${
                                    sol.status === 'Concluída' ? 'bg-emerald-100 text-emerald-700' : 
                                    sol.status === 'Em andamento' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {['Parado', 'Em andamento', 'Concluída'].map(st => <option key={st} value={st}>{st}</option>)}
                                </select>
                             </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={() => {
                        const novados = [...selecionada.dados];
                        novados[cardIdx].solutions.push({ text: '', responsible: card.name, idealizer: '', status: 'Parado' });
                        setSelecionada({...selecionada, dados: novados});
                      }}
                      className="w-full py-4 border-2 border-dashed border-slate-200 rounded-[24px] text-[10px] font-black text-slate-400 uppercase tracking-widest hover:border-emerald-300 hover:text-emerald-500 hover:bg-emerald-50 transition-all"
                    >
                      + Nova Resolução para {card.name}
                    </button>
                 </div>
               </div>
             </details>
             );
           })}

           <div className="flex justify-center pt-8 gap-3">
              <button
                onClick={handleSalvar}
                disabled={salvando}
                className="bg-slate-700 text-white px-8 py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-lg hover:bg-slate-600 transition-all flex items-center gap-3"
              >
                {salvando ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                Salvar
              </button>
              <button
                onClick={handleSalvarEGerarPDF}
                disabled={salvando}
                className="bg-indigo-600 text-white px-12 py-5 rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all flex items-center gap-3"
              >
                {salvando ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                Confirmar + Gerar PDF
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}
