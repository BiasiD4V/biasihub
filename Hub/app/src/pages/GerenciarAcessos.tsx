import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  ClipboardList, Briefcase, LayoutGrid, Check, X, ChevronDown,
  Plus, Trash2, ToggleLeft, ToggleRight, AlertTriangle, Clock,
  Mail, ShieldCheck, RefreshCw, Shield, KeyRound, Eye, EyeOff,
  Copy, Pencil, Building2, Users, UserCheck, UserX, Wifi, Fingerprint,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../infrastructure/supabase/client';
import { acessoRepository, type Solicitacao, type Cargo, type ModuloAcesso } from '../infrastructure/supabase/acessoRepository';

// ------------------------------------------------------------

const PAPEIS_OPCOES = [
  { value: 'dono',          label: 'Dono' },
  { value: 'admin',         label: 'Admin' },
  { value: 'gestor',        label: 'Gestor' },
  { value: 'almoxarifado',  label: 'Almoxarifado' },
  { value: 'comercial',     label: 'Comercial' },
  { value: 'visualizador',  label: 'Visualizador' },
];

const MODULOS_LISTA = [
  { key: 'comercial',     label: 'Comercial',     descricao: 'Orçamentos, propostas e clientes' },
  { key: 'almoxarifado',  label: 'Almoxarifado',  descricao: 'Estoque, requisições e materiais' },
  { key: 'obras',         label: 'Obras',         descricao: 'Gestão de contratos e canteiros' },
  { key: 'financeiro',    label: 'Financeiro',    descricao: 'Fluxo de caixa e relatórios' },
  { key: 'contratos',     label: 'Contratos',     descricao: 'Documentos e contratos digitais' },
  { key: 'logistica',     label: 'Logística',     descricao: 'Frota, rotas e entregas' },
];

// ------------------------------------------------------------

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string; icon: any }> = {
    pendente: { label: 'Aguardando',  className: 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/5', icon: Clock },
    aprovado: { label: 'Autorizado', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/5', icon: ShieldCheck },
    negado:   { label: 'Recusado',   className: 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-rose-500/5', icon: X },
  };
  const info = map[status] ?? { label: status, className: 'bg-slate-500/10 text-slate-400 border-white/10', icon: AlertTriangle };
  const Icon = info.icon;

  return (
    <span className={`inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl border-2 shadow-2xl backdrop-blur-md ${info.className}`}>
      <Icon size={12} className={status === 'pendente' ? 'animate-pulse' : ''} />
      {info.label}
    </span>
  );
}

// ------------------------------------------------------------

function TabSolicitacoes({ usuarioId }: { usuarioId: string }) {
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<'pendente' | 'aprovado' | 'negado' | 'todos'>('pendente');

  const [modalAprovar, setModalAprovar] = useState<Solicitacao | null>(null);
  const [cargoSelecionado, setCargoSelecionado] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [senhaAprovacao, setSenhaAprovacao] = useState<{ nome: string; email: string; senha: string } | null>(null);

  const [modalNegar, setModalNegar] = useState<Solicitacao | null>(null);
  const [observacaoNegar, setObservacaoNegar] = useState('');

  async function carregar() {
    setLoading(true);
    const [sols, cars] = await Promise.all([
      acessoRepository.listarSolicitacoes(filtro === 'todos' ? undefined : filtro),
      acessoRepository.listarCargos(),
    ]);
    setSolicitacoes(sols);
    setCargos(cars);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, [filtro]);

  async function handleAprovar() {
    if (!modalAprovar || !cargoSelecionado) return;
    setSalvando(true);
    const resultado = await acessoRepository.aprovarSolicitacao(modalAprovar.id, cargoSelecionado, usuarioId);
    if (resultado.sucesso) {
      if (resultado.senhaTemp) {
        setSenhaAprovacao({ nome: modalAprovar.nome, email: modalAprovar.email, senha: resultado.senhaTemp });
      } else {
        setMensagem({ tipo: 'sucesso', texto: 'PROTOCOLO DE ACESSO EFETIVADO COM SUCESSO.' });
      }
      setModalAprovar(null);
      await carregar();
    } else {
      setMensagem({ tipo: 'erro', texto: resultado.erro ?? 'FALHA NA AUTENTICAÇÃO DO PROTOCOLO.' });
    }
    setSalvando(false);
  }

  async function handleNegar() {
    if (!modalNegar) return;
    setSalvando(true);
    const resultado = await acessoRepository.negarSolicitacao(modalNegar.id, usuarioId, observacaoNegar || undefined);
    if (resultado.sucesso) {
      setMensagem({ tipo: 'sucesso', texto: 'Solicitação negada.' });
      setModalNegar(null);
      setObservacaoNegar('');
      await carregar();
    } else {
      setMensagem({ tipo: 'erro', texto: resultado.erro ?? 'Erro ao negar.' });
    }
    setSalvando(false);
  }

  const pendentes = solicitacoes.filter(s => s.status === 'pendente').length;

  return (
    <div className="space-y-6">
      {/* Filtros Singularity */}
      <div className="flex flex-wrap items-center gap-4">
        {(['pendente', 'aprovado', 'negado', 'todos'] as const).map(f => {
          const active = filtro === f;
          return (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`relative px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] transition-all duration-300 border-2 overflow-hidden group ${
                active 
                  ? 'bg-white text-slate-900 border-white shadow-[0_20px_40px_rgba(255,255,255,0.1)] scale-105' 
                  : 'premium-glass bg-white/5 border-white/10 text-slate-500 hover:border-white/20 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center gap-3 relative z-10">
                {f === 'pendente' ? 'Fila de Triagem' : f === 'aprovado' ? 'Acessos Ativos' : f === 'negado' ? 'Histórico de Recusas' : 'Relatório Global'}
                {f === 'pendente' && pendentes > 0 && (
                  <span className="bg-amber-500 text-white px-2 py-0.5 rounded-lg leading-none text-[8px] animate-pulse shadow-lg shadow-amber-500/20">{pendentes}</span>
                )}
              </div>
            </button>
          );
        })}
        <button onClick={carregar} className="ml-auto w-10 h-10 flex items-center justify-center rounded-2xl bg-white/40 border border-white/20 text-slate-400 hover:text-indigo-600 hover:bg-white transition-all shadow-sm">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {mensagem && (
        <div className={`p-6 rounded-[32px] border-2 flex items-center gap-6 animate-in zoom-in-95 duration-500 shadow-2xl backdrop-blur-3xl ${mensagem.tipo === 'sucesso' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/5' : 'bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-rose-500/5'}`}>
          {mensagem.tipo === 'sucesso' ? <ShieldCheck size={28} /> : <AlertTriangle size={28} />}
          <span className="text-xs font-black uppercase tracking-[0.3em]">{mensagem.texto}</span>
        </div>
      )}

      {loading ? (
        <div className="premium-glass border-2 border-dashed border-white/10 rounded-[48px] p-32 text-center animate-pulse shadow-2xl">
          <div className="w-16 h-16 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-8 shadow-[0_0_20px_rgba(56,189,248,0.3)]" />
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] opacity-60">Interceptando Tráfego de Credenciais...</p>
        </div>
      ) : solicitacoes.length === 0 ? (
        <div className="premium-glass bg-white/5 border-2 border-white/10 rounded-[60px] p-40 text-center shadow-2xl relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-50" />
          <ClipboardList size={64} className="mx-auto text-slate-800 mb-8 opacity-20 group-hover:scale-110 transition-transform duration-700" />
          <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.6em] relative z-10">O Radar De Segurança Está Limpo · Sem Solicitações</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {solicitacoes.map(sol => (
            <div key={sol.id} className="bg-white/40 backdrop-blur-xl border border-white/30 rounded-[32px] p-6 shadow-xl shadow-slate-900/5 group transition-all hover:bg-white/60">
              <div className="flex items-start gap-5">
                <div className="w-14 h-14 rounded-[20px] bg-slate-900 flex items-center justify-center text-white text-xl font-black shadow-2xl group-hover:rotate-3 transition-transform">
                  {sol.nome.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-black text-slate-900 tracking-tight truncate">{sol.nome}</span>
                    <StatusBadge status={sol.status} />
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                    <Mail size={12} className="text-slate-300" /> {sol.email}
                  </div>
                  
                  {sol.status === 'aprovado' && sol.cargo && (
                    <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-700 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest mb-3 border border-emerald-500/20">
                      <Briefcase size={12} /> {sol.cargo.nome}
                    </div>
                  )}
                  {sol.status === 'negado' && sol.observacao && (
                    <div className="bg-rose-500/5 text-rose-600 p-3 rounded-2xl text-[10px] font-bold border border-rose-500/10 mb-3 italic">
                      " {sol.observacao} "
                    </div>
                  )}

                  <div className="flex items-center gap-4 mt-2 pt-4 border-t border-white/30">
                    <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      <Clock size={12} /> {formatarData(sol.criado_em)}
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      {sol.status === 'pendente' && (
                        <>
                          <button onClick={() => { setModalAprovar(sol); setCargoSelecionado(''); setMensagem(null); }} className="h-12 px-6 rounded-2xl bg-white text-slate-900 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-sky-400 hover:text-white transition-all shadow-2xl hover:scale-105 active:scale-95">Liberar</button>
                          <button onClick={() => { setModalNegar(sol); setObservacaoNegar(''); setMensagem(null); }} className="h-12 px-6 rounded-2xl premium-glass bg-white/5 border-2 border-white/10 text-rose-400 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-rose-500 hover:text-white transition-all hover:scale-105 active:scale-95">Negar</button>
                        </>
                      )}
                      <button 
                        onClick={async () => {
                          if (!confirm(`Remover solicitação de "${sol.nome}"?`)) return;
                          const res = await acessoRepository.deletarSolicitacao(sol.id);
                          if (res.sucesso) { setMensagem({ tipo: 'sucesso', texto: 'REGISTRO DELETADO DO DIARIO.' }); await carregar(); }
                        }}
                        className="w-12 h-12 flex items-center justify-center rounded-2xl text-slate-700 hover:text-rose-500 hover:bg-rose-500/10 transition-all group/trash"
                      >
                        <Trash2 size={20} className="group-hover/trash:scale-125 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAprovar && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[999] flex items-center justify-center p-6" onClick={() => setModalAprovar(null)}>
          <div className="premium-glass bg-slate-900 border-2 border-white/10 p-12 w-full max-w-lg rounded-[60px] shadow-[0_60px_120px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-500 relative overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
            
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-[24px] bg-emerald-500 border-4 border-white/20 flex items-center justify-center text-white shadow-2xl shadow-emerald-500/20">
                  <UserCheck size={32} />
                </div>
                <div>
                  <h3 className="text-3xl font-black text-white tracking-tighter uppercase leading-none mb-2">Autorizar Operador</h3>
                  <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.4em]">Protocolo de Seguranca Nivel Omega</p>
                </div>
              </div>
              <button onClick={() => setModalAprovar(null)} className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white/5 text-slate-500 hover:bg-rose-500 hover:text-white transition-all"><X size={28} /></button>
            </div>

            <div className="premium-glass bg-white/5 border-2 border-white/5 rounded-[40px] p-8 mb-10 shadow-2xl">
              <div className="flex items-center gap-6 mb-10">
                 <div className="w-16 h-16 rounded-[24px] bg-slate-900 border-2 border-white/10 flex items-center justify-center text-sky-400 text-2xl font-black italic shadow-2xl transition-transform hover:rotate-12">{modalAprovar.nome.charAt(0)}</div>
                 <div className="flex-1 min-w-0">
                    <p className="text-white font-black text-xl uppercase tracking-tighter truncate leading-none mb-2">{modalAprovar.nome}</p>
                    <p className="text-sky-400/60 font-black text-[10px] uppercase tracking-[0.3em] truncate">{modalAprovar.email}</p>
                 </div>
              </div>
              
              <div className="space-y-4">
                <label className="flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mb-4 ml-2">
                   <Shield size={14} className="text-sky-400" />
                   Atribuição de Cargo Central
                </label>
                <div className="relative group">
                  <select
                    value={cargoSelecionado}
                    onChange={e => setCargoSelecionado(e.target.value)}
                    className="w-full h-20 bg-slate-950 border-2 border-white/10 rounded-[28px] px-8 text-white text-sm font-black focus:border-emerald-500 focus:outline-none appearance-none transition-all uppercase tracking-[0.2em] shadow-inner group-hover:border-white/20"
                  >
                    <option value="" className="bg-slate-950 text-slate-600">- Selecionar Identidade Militar -</option>
                    {cargos.map(c => (
                      <option key={c.id} value={c.id} className="bg-slate-950 text-white font-black">{c.nome.toUpperCase()} ({c.papel.toUpperCase()})</option>
                    ))}
                  </select>
                  <ChevronDown size={24} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700 pointer-events-none group-hover:text-emerald-400 transition-colors" />
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-6">
              <button onClick={() => setModalAprovar(null)} className="h-16 flex-1 text-[11px] font-black uppercase tracking-[0.4em] text-slate-600 hover:text-white transition-colors">Abortar Acao</button>
              <button 
                onClick={handleAprovar}
                disabled={salvando || !cargoSelecionado}
                className="h-16 flex-[2] rounded-[24px] bg-emerald-500 text-white text-[12px] font-black uppercase tracking-[0.4em] shadow-[0_20px_40px_rgba(16,185,129,0.3)] hover:bg-emerald-600 hover:scale-[1.02] active:scale-95 disabled:opacity-50 transition-all border-b-4 border-emerald-700"
              >
                {salvando ? 'PROCESSANDO CRIPTOGRAFIA...' : 'EFETIVAR CREDENCIAIS'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Negar - Singularity Red Design */}
      {modalNegar && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[999] flex items-center justify-center p-6" onClick={() => setModalNegar(null)}>
          <div className="premium-glass bg-slate-900 border-2 border-rose-500/30 p-12 w-full max-w-lg rounded-[60px] shadow-[0_60px_120px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in-95 duration-500 relative overflow-hidden" onClick={e => e.stopPropagation()}>
             <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent" />
             
             <div className="flex items-center gap-6 mb-12">
                <div className="w-16 h-16 rounded-[24px] bg-rose-500 border-4 border-white/20 flex items-center justify-center text-white shadow-2xl shadow-rose-500/20">
                  <UserX size={32} />
                </div>
                <div>
                   <h3 className="text-3xl font-black text-white tracking-tighter uppercase leading-none mb-2">Bloquear Operador</h3>
                   <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.4em]">Protocolo de Exclusao de Rede</p>
                </div>
             </div>

             <div className="space-y-4 mb-10">
                <label className="flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mb-4 ml-2">Justificativa do Protocolo</label>
                <textarea
                   value={observacaoNegar}
                   onChange={e => setObservacaoNegar(e.target.value)}
                   placeholder="Detalhamento da violacao ou motivo da recusa..."
                   rows={4}
                   className="w-full bg-slate-950 border-2 border-white/5 rounded-[32px] p-8 text-sm font-black text-white focus:border-rose-500 focus:outline-none transition-all placeholder:text-slate-800 uppercase tracking-[0.1em] shadow-inner leading-relaxed"
                />
             </div>

            <div className="flex flex-col sm:flex-row gap-6">
              <button onClick={() => setModalNegar(null)} className="h-16 flex-1 text-[11px] font-black uppercase tracking-[0.4em] text-slate-600 hover:text-white transition-colors">Abortar</button>
              <button 
                onClick={handleNegar}
                disabled={salvando}
                className="h-16 flex-[2] rounded-[24px] bg-rose-600 text-white text-[12px] font-black uppercase tracking-[0.4em] shadow-[0_20px_40px_rgba(225,29,72,0.3)] hover:bg-rose-700 hover:translate-y-[-4px] active:scale-95 transition-all border-b-4 border-rose-800"
              >
                {salvando ? 'PROCESSANDO...' : 'CONFIRMAR REJEIÇÃO'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Senha Temporaria - Singularity Cipher Style */}
      {senhaAprovacao && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-3xl z-[1000] flex items-center justify-center p-6 animate-in fade-in duration-700">
          <div className="premium-glass bg-slate-900 border-2 border-sky-500/30 p-12 w-full max-w-lg rounded-[60px] shadow-[0_80px_160px_rgba(0,0,0,0.9)] relative overflow-hidden text-center">
            <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
            
            <div className="relative z-10 mb-12">
              <div className="w-24 h-24 rounded-[36px] bg-emerald-500 border-4 border-white/20 flex items-center justify-center text-white mx-auto mb-8 shadow-[0_0_40px_rgba(16,185,129,0.4)] animate-bounce-slow">
                <Fingerprint size={48} />
              </div>
              <h3 className="text-4xl font-black text-white tracking-tighter uppercase leading-none mb-4">Acesso Gerado</h3>
              <p className="text-[11px] font-black text-sky-400 uppercase tracking-[0.5em] opacity-80">Identidade Criptografica Ativada</p>
            </div>

            <div className="premium-glass bg-black border-2 border-white/10 rounded-[40px] p-10 mb-10 relative z-10 shadow-inner group">
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mb-6">Chave Mestra Temporaria</p>
               <div className="flex flex-col gap-6">
                 <div className="bg-white/5 p-8 rounded-[28px] border-2 border-white/5 group-hover:border-sky-500/50 transition-all duration-500 relative">
                    <code className="text-5xl font-mono font-black text-sky-400 tracking-[0.3em] block select-all">
                      {senhaAprovacao.senha}
                    </code>
                 </div>
                 <button 
                   onClick={() => { navigator.clipboard?.writeText(senhaAprovacao.senha); }} 
                   className="w-full h-16 flex items-center justify-center gap-4 rounded-[24px] bg-sky-500 text-white font-black text-xs uppercase tracking-[0.4em] hover:bg-sky-600 transition-all shadow-[0_15px_30px_rgba(14,165,233,0.3)] hover:scale-[1.02]"
                 >
                   <Copy size={20} />
                   Copiar Identidade
                 </button>
               </div>
            </div>

            <div className="bg-amber-500/10 border-2 border-amber-500/20 rounded-[28px] p-6 mb-12 relative z-10">
               <p className="text-[10px] font-black text-amber-500 uppercase tracking-[0.3em] leading-relaxed">
                 Atenção: esta chave será invalidada após o primeiro login. Solicite a reconfiguração imediata.
               </p>
            </div>

            <button
              onClick={() => setSenhaAprovacao(null)}
              className="w-full h-16 rounded-[24px] premium-glass bg-white/5 border-2 border-white/10 text-white font-black text-xs uppercase tracking-[0.5em] hover:bg-white hover:text-slate-900 transition-all shadow-2xl relative z-10"
            >
              Fechar Terminal de Seguranca
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------

function TabCargos() {
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  const [novoNome, setNovoNome] = useState('');
  const [novoPapel, setNovoPapel] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');

  const [confirmDesativar, setConfirmDesativar] = useState<Cargo | null>(null);
  const [desativando, setDesativando] = useState(false);

  async function carregar() {
    setLoading(true);
    const data = await acessoRepository.listarTodosCargos();
    setCargos(data);
    setLoading(false);
  }

  useEffect(() => {
    carregar();
    const channel = supabase
      .channel('hub-gerenciar-acessos-modulos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'modulo_acesso' }, () => { carregar(); })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cargos' }, () => { carregar(); })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function handleCriarCargo(e: React.FormEvent) {
    e.preventDefault();
    if (!novoNome.trim() || !novoPapel) return;
    setSalvando(true);
    const resultado = await acessoRepository.criarCargo(novoNome.trim(), novoPapel, novaDescricao.trim());
    if (resultado.sucesso) {
      setMensagem({ tipo: 'sucesso', texto: `CARGO "${novoNome.toUpperCase()}" INTEGRADO À REDE.` });
      setNovoNome(''); setNovoPapel(''); setNovaDescricao('');
      setMostrarForm(false);
      await carregar();
    } else {
      setMensagem({ tipo: 'erro', texto: resultado.erro ?? 'FALHA NA INTEGRAÇÃO DO CARGO.' });
    }
    setSalvando(false);
  }

  async function handleDesativar(cargo: Cargo) {
    setDesativando(true);
    const resultado = await acessoRepository.desativarCargo(cargo.id);
    if (resultado.sucesso) {
      setMensagem({ tipo: 'sucesso', texto: `CARGO "${cargo.nome.toUpperCase()}" ARQUIVADO.` });
      await carregar();
    } else {
      setMensagem({ tipo: 'erro', texto: resultado.erro ?? 'ERRO AO ARQUIVAR CARGO.' });
    }
    setDesativando(false);
    setConfirmDesativar(null);
  }

  const ativos = cargos.filter(c => c.ativo);
  const inativos = cargos.filter(c => !c.ativo);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Singularity */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-6">
           <div className="w-16 h-16 rounded-[24px] bg-indigo-500/10 border-2 border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.1)]">
              <Briefcase size={32} />
           </div>
           <div>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] leading-none mb-3">Matriz de Hierarquia</p>
              <h2 className="text-3xl font-black text-white tracking-tighter uppercase leading-none">{ativos.length} Patentes Operacionais</h2>
           </div>
        </div>
        <button
          onClick={() => { setMostrarForm(v => !v); setMensagem(null); }}
          className="w-full sm:w-auto flex items-center justify-center gap-4 h-16 px-10 rounded-[28px] bg-white text-slate-900 text-xs font-black uppercase tracking-[0.3em] hover:bg-sky-400 hover:text-white transition-all shadow-2xl hover:scale-[1.05] active:scale-95 border-b-4 border-slate-300 hover:border-sky-600"
        >
          <Plus size={20} />
          Nova Autoridade
        </button>
      </div>

      {mensagem && (
        <div className={`p-6 rounded-[32px] border-2 flex items-center gap-6 animate-in zoom-in-95 duration-500 shadow-2xl backdrop-blur-3xl ${mensagem.tipo === 'sucesso' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
          {mensagem.tipo === 'sucesso' ? <ShieldCheck size={28} /> : <AlertTriangle size={28} />}
          <span className="text-xs font-black uppercase tracking-[0.3em]">{mensagem.texto}</span>
        </div>
      )}

      {/* Form Novo Cargo - Singularity Glass Design */}
      {mostrarForm && (
        <div className="premium-glass bg-white/5 border-2 border-white/10 p-12 rounded-[60px] shadow-2xl animate-in slide-in-from-top-12 duration-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2" />
          
          <div className="flex items-center gap-4 mb-12 relative z-10">
             <div className="w-14 h-14 rounded-2xl bg-slate-900 border-2 border-white/10 flex items-center justify-center text-white">
                <Plus size={28} className="text-sky-400" />
             </div>
             <div>
                <h3 className="text-3xl font-black text-white tracking-tighter uppercase leading-none mb-2">Protocolar Nova Função</h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Expansão de Estrutura Organizacional</p>
             </div>
          </div>
          
          <form onSubmit={handleCriarCargo} className="space-y-10 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-4">
                <label className="flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mb-4 ml-2">Titulo do Cargo</label>
                <input
                  type="text"
                  value={novoNome}
                  onChange={e => setNovoNome(e.target.value)}
                  placeholder="EX: LIDER DE INFRAESTRUTURA"
                  required
                  className="w-full h-20 bg-slate-950 border-2 border-white/5 rounded-[32px] px-8 text-sm font-black text-white focus:border-sky-500 focus:outline-none transition-all uppercase tracking-[0.2em] shadow-inner placeholder:text-slate-800"
                />
              </div>
              <div className="space-y-4">
                <label className="flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mb-4 ml-2">Protocolo Base</label>
                <div className="relative group">
                  <select
                    value={novoPapel}
                    onChange={e => setNovoPapel(e.target.value)}
                    required
                    className="w-full h-20 bg-slate-950 border-2 border-white/5 rounded-[32px] px-8 text-sm font-black text-white focus:border-sky-500 focus:outline-none appearance-none transition-all uppercase tracking-[0.2em] shadow-inner group-hover:border-white/10"
                  >
                    <option value="" className="bg-slate-950 text-slate-700">- SELECIONAR NÍVEL -</option>
                    {PAPEIS_OPCOES.map(p => (
                      <option key={p.value} value={p.value} className="bg-slate-950 text-white font-black">{p.label.toUpperCase()}</option>
                    ))}
                  </select>
                  <ChevronDown size={24} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-700 pointer-events-none group-hover:text-sky-400 transition-colors" />
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <label className="flex items-center gap-3 text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] mb-4 ml-2">Descrição de Atribuicoes</label>
              <textarea
                value={novaDescricao}
                onChange={e => setNovaDescricao(e.target.value)}
                placeholder="DETALHAMENTO DO ESCOPO DE ACESSO E RESPONSABILIDADES..."
                rows={3}
                className="w-full bg-slate-950 border-2 border-white/5 rounded-[32px] p-8 text-sm font-black text-white focus:border-sky-500 focus:outline-none transition-all placeholder:text-slate-800 uppercase tracking-[0.1em] shadow-inner"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-8 pt-10 border-t-2 border-white/5">
              <button
                type="button"
                onClick={() => setMostrarForm(false)}
                className="h-16 flex-1 text-[11px] font-black uppercase tracking-[0.5em] text-slate-600 hover:text-white transition-all"
              >
                Abortar Protocolo
              </button>
              <button
                type="submit"
                disabled={salvando}
                className="h-16 flex-[2] bg-white text-slate-900 rounded-[28px] text-[12px] font-black uppercase tracking-[0.4em] hover:bg-sky-500 hover:text-white shadow-2xl hover:scale-105 active:scale-95 transition-all border-b-4 border-slate-300 hover:border-sky-700"
              >
                {salvando ? 'PROCESSANDO SINCRONIA...' : 'GRAVAR IDENTIDADE'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Cargos Singularity */}
      {loading ? (
        <div className="premium-glass border-2 border-dashed border-white/10 rounded-[60px] p-40 text-center animate-pulse shadow-2xl">
          <div className="w-16 h-16 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mx-auto mb-8 shadow-[0_0_20px_rgba(99,102,241,0.3)]" />
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.6em] opacity-60">Varrendo Diretório de Colaboradores...</p>
        </div>
      ) : cargos.length === 0 ? (
        <div className="premium-glass bg-white/5 border-2 border-white/10 rounded-[60px] p-40 text-center shadow-2xl relative group">
          <Briefcase size={64} className="mx-auto text-slate-800 mb-8 opacity-20 group-hover:scale-110 transition-all duration-700" />
          <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.6em]">Nenhuma Patente Registrada na Matriz</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-10">
          {ativos.length > 0 && (
            <div className="premium-glass bg-slate-900/40 border-2 border-white/5 rounded-[60px] overflow-hidden shadow-2xl backdrop-blur-3xl">
              <div className="px-12 py-8 border-b-2 border-white/5 bg-white/5 flex items-center justify-between">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">Quadro de Autoridades Ativas</p>
                <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{ativos.length} Registros</div>
              </div>
              <div className="divide-y-2 divide-white/5">
                {ativos.map(c => (
                  <div key={c.id} className="flex items-center gap-10 px-12 py-8 hover:bg-white/5 transition-all group duration-500">
                    <div className="w-16 h-16 rounded-[24px] bg-slate-900 border-2 border-white/10 flex items-center justify-center text-white shadow-2xl group-hover:rotate-[15deg] group-hover:scale-110 group-hover:border-sky-500/50 transition-all duration-500">
                      <ShieldCheck size={28} className="text-sky-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-6 mb-2">
                        <span className="text-xl font-black text-white tracking-tighter uppercase leading-none group-hover:text-sky-400 transition-colors">{c.nome}</span>
                        <div className="px-5 py-2 rounded-xl bg-indigo-500/10 border-2 border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em] shadow-xl">
                          NÍVEL: {PAPEIS_OPCOES.find(p => p.value === c.papel)?.label.toUpperCase() ?? c.papel.toUpperCase()}
                        </div>
                      </div>
                      {c.descricao && (
                        <p className="text-xs font-black text-slate-500 uppercase tracking-widest truncate opacity-60 group-hover:opacity-100 transition-opacity">{c.descricao}</p>
                      )}
                    </div>
                    <button
                      onClick={() => setConfirmDesativar(c)}
                      className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white/5 text-slate-700 hover:bg-rose-500 hover:text-white hover:scale-110 active:scale-95 transition-all group/btn shadow-xl"
                      title="Desativar cargo"
                    >
                      <Trash2 size={24} className="group-hover/btn:rotate-12 transition-transform" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {inativos.length > 0 && (
            <div className="premium-glass bg-white/5 border-2 border-white/5 rounded-[60px] overflow-hidden opacity-40 grayscale transition-all hover:grayscale-0 hover:opacity-100 duration-700">
              <div className="px-12 py-8 border-b-2 border-white/5 bg-white/5">
                <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.4em]">Arquivo Histórico de Patentes</p>
              </div>
              <div className="divide-y-2 divide-white/5">
                {inativos.map(c => (
                  <div key={c.id} className="flex items-center gap-10 px-12 py-8">
                    <div className="w-16 h-16 rounded-[24px] bg-slate-950 border-2 border-white/5 flex items-center justify-center text-slate-800">
                      <Lock size={28} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-6">
                        <span className="text-xl font-black text-slate-700 tracking-tighter uppercase leading-none line-through">{c.nome}</span>
                        <span className="text-[10px] font-black px-4 py-1.5 rounded-xl bg-white/5 text-slate-800 border-2 border-white/5 uppercase tracking-[0.4em]">DESATIVADA</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Confirm Desativar - Singularity Red Termnal */}
      {confirmDesativar && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[999] flex items-center justify-center p-6 animate-in fade-in duration-500" onClick={() => setConfirmDesativar(null)}>
          <div className="premium-glass bg-slate-900 border-2 border-rose-500/40 p-12 w-full max-w-lg text-center rounded-[60px] shadow-[0_60px_120px_rgba(0,0,0,0.8)] relative overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent" />
            <div className="w-24 h-24 bg-rose-500 border-4 border-white/20 rounded-[40px] flex items-center justify-center mx-auto mb-10 shadow-[0_0_50px_rgba(225,29,72,0.4)] animate-pulse">
              <AlertTriangle size={48} className="text-white" />
            </div>
            <h3 className="text-4xl font-black text-white tracking-tighter uppercase leading-none mb-4">Suspender Função?</h3>
            <p className="text-slate-400 font-black text-xs uppercase tracking-[0.3em] mb-12 leading-relaxed px-6">
              A patente <strong>"{confirmDesativar.nome.toUpperCase()}"</strong> sera revogada dos registros de autoridade. Esta acao e auditada.
            </p>
            <div className="flex flex-col sm:flex-row gap-6">
              <button
                onClick={() => setConfirmDesativar(null)}
                className="h-16 flex-1 text-[11px] font-black uppercase tracking-[0.5em] text-slate-600 hover:text-white transition-all"
              >
                Abortar
              </button>
              <button
                onClick={() => handleDesativar(confirmDesativar)}
                disabled={desativando}
                className="h-16 flex-[2] bg-rose-600 text-white rounded-[24px] text-[12px] font-black uppercase tracking-[0.4em] shadow-[0_20px_40px_rgba(225,29,72,0.3)] hover:bg-rose-700 hover:translate-y-[-4px] active:scale-95 transition-all border-b-4 border-rose-800"
              >
                {desativando ? 'PROCESSANDO...' : 'CONFIRMAR BLOQUEIO'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------

function TabModulos({ usuarioId }: { usuarioId: string }) {
  const [modulos, setModulos] = useState<Record<string, ModuloAcesso>>({});
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Record<string, { papeis: string[]; disponivel: boolean }>>({});
  const [salvando, setSalvando] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<Record<string, { tipo: 'sucesso' | 'erro'; texto: string }>>({});

  async function carregar() {
    setLoading(true);
    const [modulosData, cargosData] = await Promise.all([
      acessoRepository.listarModulos(),
      acessoRepository.listarTodosCargos(),
    ]);
    const map: Record<string, ModuloAcesso> = {};
    modulosData.forEach(m => { map[m.modulo_key] = m; });
    setModulos(map);
    setCargos(cargosData.filter(c => c.ativo));

    const draftInit: Record<string, { papeis: string[]; disponivel: boolean }> = {};
    MODULOS_LISTA.forEach(m => {
      const existing = map[m.key];
      draftInit[m.key] = {
        papeis: existing?.papeis ?? [],
        disponivel: existing?.disponivel ?? false,
      };
    });
    setDraft(draftInit);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, []);

  function togglePapel(moduloKey: string, papel: string) {
    setDraft(prev => {
      const current = prev[moduloKey] ?? { papeis: [], disponivel: false };
      const papelNormalizado = papel.toLowerCase();
      const jaAtivo = current.papeis.some(p => p.toLowerCase() === papelNormalizado);
      const papeis = jaAtivo
        ? current.papeis.filter(p => p.toLowerCase() !== papelNormalizado)
        : [...current.papeis, papelNormalizado];
      return { ...prev, [moduloKey]: { ...current, papeis } };
    });
  }

  function toggleDisponivel(moduloKey: string) {
    setDraft(prev => {
      const current = prev[moduloKey] ?? { papeis: [], disponivel: false };
      return { ...prev, [moduloKey]: { ...current, disponivel: !current.disponivel } };
    });
  }

  async function salvarModulo(moduloKey: string) {
    const d = draft[moduloKey];
    if (!d) return;
    setSalvando(moduloKey);
    const resultado = await acessoRepository.salvarModulo(moduloKey, d.papeis, d.disponivel, usuarioId);
    if (resultado.sucesso) {
      setMensagens(prev => ({ ...prev, [moduloKey]: { tipo: 'sucesso', texto: 'SINC' } }));
      await carregar();
    } else {
      setMensagens(prev => ({ ...prev, [moduloKey]: { tipo: 'erro', texto: 'FALHA' } }));
    }
    setSalvando(null);
    setTimeout(() => setMensagens(prev => { const next = { ...prev }; delete next[moduloKey]; return next; }), 3000);
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700 pb-20">
      {loading ? (
        <div className="premium-glass border-2 border-dashed border-white/10 rounded-[60px] p-40 text-center animate-pulse shadow-2xl">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-8 shadow-[0_0_20px_rgba(168,85,247,0.3)]" />
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.6em] opacity-60">Sincronizando Módulos Centrais...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
          {MODULOS_LISTA.map(m => {
            const d = draft[m.key] ?? { papeis: [], disponivel: false };
            const msg = mensagens[m.key];
            const isSaving = salvando === m.key;
            const referenciasAcesso = cargos.length > 0
              ? cargos.map(c => ({
                  key: c.id,
                  nome: c.nome,
                  papel: c.papel.toLowerCase(),
                  subtitulo: c.papel.toUpperCase(),
                }))
              : PAPEIS_OPCOES.map(p => ({
                  key: p.value,
                  nome: p.label,
                  papel: p.value.toLowerCase(),
                  subtitulo: 'PADRAO',
                }));
            const ativosCount = referenciasAcesso.filter(r =>
              d.papeis.some(p => p.toLowerCase() === r.papel)
            ).length;
            const bloqueadosCount = referenciasAcesso.length - ativosCount;

            return (
              <div
                key={m.key}
                className={`premium-glass p-10 rounded-[60px] border-2 transition-all duration-700 flex flex-col gap-10 group relative overflow-hidden ${
                  d.disponivel ? 'border-sky-500/20 bg-white/5 shadow-2xl' : 'border-white/5 bg-slate-950/20 grayscale opacity-40'
                }`}
              >
                {d.disponivel && (
                   <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-sky-500/10 transition-colors duration-700" />
                )}

                <div className="flex flex-col sm:flex-row items-start justify-between gap-8 relative z-10">
                  <div className="flex items-center gap-6">
                    <div className={`w-20 h-20 rounded-[28px] flex items-center justify-center shadow-2xl transition-all duration-700 group-hover:rotate-12 group-hover:scale-110 border-2 ${
                      d.disponivel ? 'bg-slate-900 border-sky-500/30 text-sky-400' : 'bg-slate-950 border-white/5 text-slate-800'
                    }`}>
                      <LayoutGrid size={32} />
                    </div>
                    <div>
                      <h3 className="text-3xl font-black text-white tracking-tighter uppercase leading-none mb-3 group-hover:text-sky-400 transition-colors">{m.label}</h3>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] leading-none opacity-60">ID: {m.key.toUpperCase()}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleDisponivel(m.key)}
                    className="relative focus:outline-none hover:scale-110 transition-transform active:scale-95"
                  >
                    <div className={`w-20 h-10 rounded-full p-1.5 transition-all duration-500 border-2 ${d.disponivel ? 'bg-emerald-500 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-slate-900 border-white/10'}`}>
                      <div className={`w-6 h-6 bg-white rounded-full shadow-2xl transition-all duration-500 transform ${d.disponivel ? 'translate-x-10' : 'translate-x-0'}`} />
                    </div>
                  </button>
                </div>

                <p className="text-sm font-black text-slate-500 uppercase tracking-widest leading-relaxed min-h-[48px] opacity-60 group-hover:opacity-100 transition-opacity relative z-10">
                  {m.descricao.toUpperCase()}
                </p>

                <div className="space-y-6 relative z-10">
                  <div className="flex items-center justify-between mb-4">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] ml-2">Protocolos de Acesso</p>
                     <div className="h-[1px] flex-1 mx-6 bg-gradient-to-r from-white/10 to-transparent" />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 text-[10px] font-black uppercase tracking-[0.2em]">
                      <Check size={12} />
                      Com acesso: {ativosCount}
                    </span>
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/15 border border-rose-400/30 text-rose-300 text-[10px] font-black uppercase tracking-[0.2em]">
                      <X size={12} />
                      Sem acesso: {bloqueadosCount}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {referenciasAcesso.map(ref => {
                      const ativo = d.papeis.some(p => p.toLowerCase() === ref.papel);
                      
                      return (
                        <button
                          key={ref.key}
                          onClick={() => togglePapel(m.key, ref.papel)}
                          disabled={!d.disponivel}
                          className={`px-4 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.18em] border-2 transition-all duration-300 flex items-center gap-3 ${
                            ativo
                              ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40 shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:bg-emerald-500/30'
                              : 'premium-glass bg-white/5 text-slate-300 border-white/20 hover:border-white/40 hover:bg-white/10'
                          } disabled:opacity-30 disabled:pointer-events-none`}
                          title={ativo ? 'Tem acesso a este módulo' : 'Sem acesso a este módulo'}
                        >
                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full border ${ativo ? 'border-emerald-300/60 bg-emerald-400/20 text-emerald-200' : 'border-slate-500 bg-slate-800 text-slate-300'}`}>
                            {ativo ? <Check size={12} /> : <X size={12} />}
                          </span>
                          <span className="leading-none text-left">
                            {ref.nome}
                            <span className="block text-[8px] tracking-[0.2em] opacity-70 mt-1">{ref.subtitulo}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-6 pt-10 border-t-2 border-white/5 mt-auto relative z-10">
                  <div className="flex items-center gap-4">
                    {msg && (
                      <span className={`flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.5em] animate-in slide-in-from-left-4 duration-500 ${
                        msg.tipo === 'sucesso' ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        <div className={`w-2 h-2 rounded-full ${msg.tipo === 'sucesso' ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]' : 'bg-rose-400'}`} />
                        {msg.texto === 'SINC' ? 'SINCRONIZADO' : 'ERRO'}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => salvarModulo(m.key)}
                    disabled={isSaving || !d.disponivel}
                    className="h-16 px-10 rounded-[28px] bg-slate-900 border-2 border-white/10 text-white text-[11px] font-black uppercase tracking-[0.4em] hover:bg-sky-500 hover:border-sky-400 shadow-2xl disabled:opacity-20 transition-all flex items-center justify-center gap-4 group/save"
                  >
                    {isSaving ? <RefreshCw size={20} className="animate-spin" /> : <ShieldCheck size={20} className="text-emerald-400 group-hover/save:scale-125 transition-transform" />}
                    {isSaving ? 'GRAVANDO...' : 'EFETIVAR'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Security Tip Singularity */}
      <div className="premium-glass bg-indigo-500/5 border-2 border-indigo-500/10 rounded-[48px] p-10 flex items-center gap-10 shadow-2xl relative overflow-hidden group">
         <div className="absolute top-0 right-0 p-20 -translate-y-1/2 translate-x-1/2 bg-indigo-500/10 rounded-full blur-[60px] group-hover:bg-indigo-500/20 transition-all duration-700" />
         <div className="w-20 h-20 rounded-[32px] bg-slate-900 border-2 border-indigo-500/20 flex items-center justify-center text-indigo-400 flex-shrink-0 shadow-2xl relative z-10">
            <Shield size={36} className="group-hover:rotate-12 transition-transform duration-500" />
         </div>
         <div className="relative z-10">
            <p className="text-[12px] font-black text-indigo-400/80 leading-relaxed uppercase tracking-[0.4em]">
              Protocolo global: alterações em módulos são imediatas. O estado OFFLINE bloqueia acesso até reativação manual.
            </p>
         </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------

type TabStatus = 'solicitacoes' | 'cargos' | 'modulos';

export function GerenciarAcessos() {
  const { usuario } = useAuth();
  const [tab, setTab] = useState<TabStatus>('solicitacoes');
  const [pendentes, setPendentes] = useState(0);
  const [cargosAtivosCount, setCargosAtivosCount] = useState(0);

  const papel = usuario?.papel ?? '';
  const isAdmin = papel === 'admin' || papel === 'dono';

  useEffect(() => {
    if (!isAdmin) return;
    const atualizar = async () => {
      const [pendentesCount, cargosAtivos] = await Promise.all([
        acessoRepository.contarPendentes(),
        acessoRepository.listarCargos(),
      ]);
      setPendentes(pendentesCount);
      setCargosAtivosCount(cargosAtivos.length);
    };
    atualizar();
    const interval = setInterval(() => {
      atualizar();
    }, 30000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="p-6 lg:p-12 max-w-7xl mx-auto min-h-screen space-y-16 relative z-10 animate-in fade-in duration-1000">
      {/* Header Singularity */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
        <div className="space-y-4">
          <div className="flex items-center gap-6">
             <div className="w-16 h-16 rounded-[28px] bg-slate-900 border-2 border-white/10 flex items-center justify-center text-white shadow-[0_20px_40px_rgba(0,0,0,0.4)]">
                <Shield size={32} className="text-sky-400" />
             </div>
             <div>
                <h1 className="text-5xl font-black text-white tracking-tighter uppercase leading-none mb-3">Core Control</h1>
                <p className="text-[12px] font-black text-white uppercase tracking-[0.18em] opacity-100 [text-shadow:0_2px_10px_rgba(0,0,0,0.9)]">Matriz de Autorizacoes e Protocolos</p>
             </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="premium-glass bg-indigo-500/10 border-2 border-indigo-500/20 px-8 py-4 rounded-[28px] flex items-center gap-6 shadow-2xl relative overflow-hidden group">
              <div className="w-3 h-3 rounded-full bg-indigo-400 animate-ping shadow-[0_0_15px_rgba(99,102,241,0.8)]" />
              <div className="flex flex-col">
                 <span className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.5em] leading-none mb-2">Central de Comando</span>
                 <span className="text-xl text-white font-black leading-none tracking-tight">TERMINAL ATIVO</span>
              </div>
           </div>
        </div>
      </div>

      {/* Stats Grid Singularity */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
        {[
          { label: 'Fila de Triagem', value: pendentes, icon: ClipboardList, color: 'text-amber-400', bg: 'bg-amber-500/5', border: 'border-amber-500/20' },
          { label: 'Patentes Registradas', value: cargosAtivosCount, icon: Briefcase, color: 'text-sky-400', bg: 'bg-sky-500/5', border: 'border-sky-500/20' },
          { label: 'Unidades de Rede', value: MODULOS_LISTA.length, icon: LayoutGrid, color: 'text-purple-400', bg: 'bg-purple-500/5', border: 'border-purple-500/20' },
        ].map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className={`premium-glass bg-white/5 border-2 ${border} rounded-[48px] p-10 shadow-2xl group hover:bg-white/10 hover:translate-y-[-12px] transition-all duration-700`}>
            <div className="flex items-center gap-8">
              <div className={`${bg} ${color} w-20 h-20 rounded-[32px] flex items-center justify-center border-2 ${border} shadow-2xl group-hover:rotate-12 transition-transform duration-500`}>
                <Icon size={32} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-4xl font-black text-white leading-none mb-3 tracking-tighter">{value}</p>
                <p className="inline-flex items-center px-2 py-1 rounded-lg bg-slate-950/45 text-[13px] font-black text-white uppercase tracking-[0.08em] leading-tight [text-shadow:0_2px_8px_rgba(0,0,0,0.9)] border border-white/15">
                  {label}
                </p>
              </div>
            </div>
            <div className="mt-8 h-1 w-full bg-white/5 rounded-full overflow-hidden">
               <div className={`h-full ${bg} transition-all duration-1000 w-[60%]`} />
            </div>
          </div>
        ))}
      </div>

      {/* Tabs System Singularity - Tech Capsule */}
      <div className="flex justify-center relative pb-4">
        <div className="premium-glass bg-slate-950/40 p-2.5 rounded-[36px] border-2 border-white/10 shadow-[0_40px_80px_rgba(0,0,0,0.6)] flex items-center gap-3">
          {TABS.map(({ key, label, icon: Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                onClick={() => setTab(key as any)}
                className={`relative flex items-center gap-4 px-10 h-16 rounded-[28px] text-[11px] font-black uppercase tracking-[0.4em] transition-all duration-500 group ${
                  active ? 'text-white' : 'text-slate-600 hover:text-slate-300'
                }`}
              >
                {active && (
                  <div className="absolute inset-0 bg-white rounded-[28px] shadow-[0_15px_40px_rgba(255,255,255,0.15)] animate-in zoom-in-95" />
                )}
                <Icon size={20} className={`relative z-10 transition-colors duration-500 ${active ? 'text-slate-900' : 'group-hover:text-sky-400'}`} />
                <span className={`relative z-10 ${active ? 'text-slate-900' : ''}`}>{label}</span>
                {key === 'solicitacoes' && pendentes > 0 && (
                  <span className={`relative z-10 text-[9px] font-black px-2.5 py-1 rounded-full shadow-2xl transition-all duration-500 ${active ? 'bg-slate-900 text-white' : 'bg-amber-500 text-white animate-pulse'}`}>
                    {pendentes}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="relative z-10">
        {tab === 'solicitacoes' && <TabSolicitacoes usuarioId={usuario!.id} />}
        {tab === 'cargos'       && <TabCargos />}
        {tab === 'modulos'      && <TabModulos usuarioId={usuario!.id} />}
      </main>
    </div>
  );
}

const TABS = [
  { key: 'solicitacoes', label: 'Solicitações', icon: ClipboardList },
  { key: 'cargos',       label: 'Cargos',       icon: Briefcase },
  { key: 'modulos',      label: 'Módulos',      icon: LayoutGrid },
];




