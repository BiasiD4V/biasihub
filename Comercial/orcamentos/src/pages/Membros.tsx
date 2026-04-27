import { useEffect, useState } from 'react';
import { Users, Shield, ShieldCheck, ShieldAlert, HardHat, Briefcase, Wrench, Circle, Pencil, Eye, EyeOff, KeyRound, X, Copy, Check, Wifi, Clock, UserX, UserCheck, ChevronDown, ChevronRight, Crown, Building2, AlertTriangle } from 'lucide-react';
import { supabase } from '../infrastructure/supabase/client';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

interface Presenca {
  user_id: string;
  esta_online: boolean;
  ultimo_heartbeat: string;
  ultima_entrada: string | null;
}

interface Membro {
  id: string;
  nome: string;
  email: string;
  papel: string;
  ativo: boolean;
  criado_em: string;
  ultimo_login: string | null;
  departamento: string | null;
}

const PAPEIS_INFO: Record<string, { label: string; icon: React.ElementType; cor: string; corBg: string; nivel: number }> = {
  dono:         { label: 'Dono',              icon: Crown,       cor: 'text-amber-700',  corBg: 'bg-amber-50 border-amber-200',   nivel: 0 },
  admin:        { label: 'Admin Supremo',     icon: ShieldAlert, cor: 'text-red-700',    corBg: 'bg-red-50 border-red-200',       nivel: 1 },
  gestor:       { label: 'Gestor',            icon: ShieldCheck, cor: 'text-purple-700', corBg: 'bg-purple-50 border-purple-200', nivel: 2 },
  comercial:    { label: 'Comercial',         icon: Briefcase,   cor: 'text-blue-700',   corBg: 'bg-blue-50 border-blue-200',     nivel: 3 },
  engenheiro:   { label: 'Engenheiro',        icon: Wrench,      cor: 'text-cyan-700',   corBg: 'bg-cyan-50 border-cyan-200',     nivel: 3 },
  orcamentista: { label: 'Orçamentista',      icon: HardHat,     cor: 'text-green-700',  corBg: 'bg-green-50 border-green-200',   nivel: 3 },
};

const PAPEIS_EDITAVEIS = ['dono', 'admin', 'gestor', 'comercial', 'engenheiro', 'orcamentista'];

function getPapelInfo(papel: string) {
  return PAPEIS_INFO[papel] || { label: papel, icon: Users, cor: 'text-slate-600', corBg: 'bg-slate-50 border-slate-200', nivel: 4 };
}


function formatarUltimoAcesso(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatarTempo(desde: string | null): string {
  if (!desde) return '';
  const diff = Date.now() - new Date(desde).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}min`;
  return `${Math.floor(hrs / 24)}d ${hrs % 24}h`;
}

function formatarUltimoVisto(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `há ${hrs}h`;
  return `há ${Math.floor(hrs / 24)}d`;
}

export function Membros() {
  const { usuario } = useAuth();
  const [membros, setMembros] = useState<Membro[]>([]);
  const [presencas, setPresencas] = useState<Record<string, Presenca>>({});
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);
  const [deptExpandido, setDeptExpandido] = useState<Record<string, boolean>>({ Comercial: true, Engenharia: true, 'Administração': true, 'Sem departamento': true });

  // Modal de edição
  const [editando, setEditando] = useState<Membro | null>(null);
  const [papelSelecionado, setPapelSelecionado] = useState('');
  const [deptoSelecionado, setDeptoSelecionado] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);
  const [senhaCopiada, setSenhaCopiada] = useState(false);
  const [confirmDesativar, setConfirmDesativar] = useState<Membro | null>(null);
  const [desativando, setDesativando] = useState(false);

  const [departamentos, setDepartamentos] = useState<string[]>([]);

  const meuPapel = usuario?.papel || '';
  const isSuper = meuPapel === 'admin' || meuPapel === 'dono';
  const isGestor = meuPapel === 'gestor';

  // Só admin, dono ou gestor pode ver
  if (!isSuper && !isGestor) {
    return <Navigate to="/dashboard" replace />;
  }

  function podeGerenciar(target: Membro): boolean {
    if (target.id === usuario?.id) return false;
    if (isSuper) return true;
    if (isGestor) {
      const targetInfo = getPapelInfo(target.papel);
      if (targetInfo.nivel <= 2) return false;
      return target.departamento === usuario?.departamento;
    }
    return false;
  }

  function abrirEdicao(m: Membro) {
    setEditando(m);
    setPapelSelecionado(m.papel);
    setDeptoSelecionado(m.departamento || '');
    setNovaSenha('');
    setMostrarSenha(false);
    setMensagem(null);
    setSenhaCopiada(false);
  }

  function fecharModal() {
    setEditando(null);
    setMensagem(null);
  }

  function gerarSenha() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let senha = '';
    for (let i = 0; i < 10; i++) {
      senha += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNovaSenha(senha);
    setMostrarSenha(true);
  }

  async function copiarSenha() {
    if (novaSenha) {
      await navigator.clipboard.writeText(novaSenha);
      setSenhaCopiada(true);
      setTimeout(() => setSenhaCopiada(false), 2000);
    }
  }

  async function salvarAlteracoes() {
    if (!editando) return;
    setSalvando(true);
    setMensagem(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setMensagem({ tipo: 'erro', texto: 'Sessão expirada' });
        setSalvando(false);
        return;
      }

      const body: Record<string, unknown> = { userId: editando.id };
      
      if (papelSelecionado !== editando.papel) body.papel = papelSelecionado;
      if (deptoSelecionado !== (editando.departamento || '')) body.departamento = deptoSelecionado || null;
      if (novaSenha.trim()) body.novaSenha = novaSenha.trim();

      if (!body.papel && body.departamento === undefined && !body.novaSenha) {
        setMensagem({ tipo: 'erro', texto: 'Nenhuma alteração para salvar' });
        setSalvando(false);
        return;
      }

      const response = await fetch('/api/membros-update', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (response.ok) {
        // Atualizar lista local
        setMembros(prev => prev.map(m => 
          m.id === editando.id 
            ? { ...m, papel: (body.papel as string) || m.papel, departamento: body.departamento !== undefined ? (body.departamento as string | null) : m.departamento } 
            : m
        ));

        const msgs: string[] = [];
        if (result.papel) msgs.push(`Papel alterado para ${getPapelInfo(result.papel).label}`);
        if (result.departamento !== undefined) msgs.push(`Departamento: ${result.departamento || 'Removido'}`);
        if (result.senhaRedefinida) msgs.push('Senha redefinida');
        setMensagem({ tipo: 'sucesso', texto: msgs.join(' · ') });
      } else {
        setMensagem({ tipo: 'erro', texto: result.error || 'Erro ao salvar' });
      }
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Erro de conexão' });
    }
    setSalvando(false);
  }

  async function toggleAtivo(membro: Membro, novoStatus: boolean) {
    setDesativando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch('/api/membros-update', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: membro.id, ativo: novoStatus }),
      });

      if (response.ok) {
        setMembros(prev => prev.map(m => m.id === membro.id ? { ...m, ativo: novoStatus } : m));
      }
    } catch { /* ignore */ }
    setDesativando(false);
    setConfirmDesativar(null);
  }

  useEffect(() => {
    async function carregarMembros() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) { setLoading(false); return; }
        const response = await fetch('/api/membros', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        });
        if (response.ok) setMembros(await response.json() as Membro[]);
      } catch { /* ignore */ }
      setLoading(false);
    }
    carregarMembros();
  }, []);

  useEffect(() => {
    supabase.from('usuarios')
      .select('departamento')
      .not('departamento', 'is', null)
      .eq('ativo', true)
      .then(({ data }) => {
        const depts = [...new Set((data || []).map((u: any) => u.departamento).filter(Boolean) as string[])].sort();
        setDepartamentos(depts);
      });
  }, []);

  useEffect(() => {
    async function carregarPresencas() {
      const { data } = await supabase.from('presenca_usuarios').select('*');
      if (data) {
        const map: Record<string, Presenca> = {};
        (data as Presenca[]).forEach((p) => { map[p.user_id] = p; });
        setPresencas(map);
      }
    }
    carregarPresencas();
    const channel = supabase
      .channel('presenca-realtime-membros')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presenca_usuarios' }, (payload) => {
        const p = payload.new as Presenca;
        if (p?.user_id) setPresencas((prev) => ({ ...prev, [p.user_id]: p }));
      })
      .subscribe();
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => { supabase.removeChannel(channel); clearInterval(timer); };
  }, []);

  const totalAtivos = membros.filter(m => m.ativo).length;
  const STALE_MS = 2 * 60 * 1000;
  function isReallyOnline(p: Presenca) {
    if (!p.esta_online) return false;
    return Date.now() - new Date(p.ultimo_heartbeat).getTime() < STALE_MS;
  }
  const totalOnline = Object.values(presencas).filter(isReallyOnline).length;

  // Group by department
  const porDepto: Record<string, Membro[]> = {};
  membros.forEach(m => {
    const dept = m.departamento || 'Sem departamento';
    if (!porDepto[dept]) porDepto[dept] = [];
    porDepto[dept].push(m);
  });
  Object.values(porDepto).forEach(arr => arr.sort((a, b) => {
    const na = getPapelInfo(a.papel).nivel;
    const nb = getPapelInfo(b.papel).nivel;
    return na !== nb ? na - nb : a.nome.localeCompare(b.nome);
  }));

  const AVATAR_COLORS = [
    'from-blue-500 to-blue-600', 'from-emerald-500 to-emerald-600', 'from-violet-500 to-violet-600',
    'from-amber-500 to-amber-600', 'from-rose-500 to-rose-600', 'from-cyan-500 to-cyan-600',
  ];
  function getAvatarColor(name: string) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
  }

  return (
    <div className="space-y-6 p-4 lg:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Gestão de Membros</h1>
        <p className="text-sm text-slate-500 mt-1">Hierarquia da equipe — gerencie papéis, departamentos e acessos</p>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 rounded-lg p-2"><Users size={18} className="text-blue-600" /></div>
            <div><p className="text-xl font-bold text-slate-800">{membros.length}</p><p className="text-[10px] text-slate-500">Total</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 rounded-lg p-2"><Circle size={18} className="text-green-600 fill-green-600" /></div>
            <div><p className="text-xl font-bold text-slate-800">{totalAtivos}</p><p className="text-[10px] text-slate-500">Ativos</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 rounded-lg p-2"><Wifi size={18} className="text-emerald-600" /></div>
            <div><p className="text-xl font-bold text-slate-800">{totalOnline}</p><p className="text-[10px] text-slate-500">Online</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 rounded-lg p-2"><UserX size={18} className="text-red-600" /></div>
            <div><p className="text-xl font-bold text-slate-800">{membros.filter(m => !m.ativo).length}</p><p className="text-[10px] text-slate-500">Inativos</p></div>
          </div>
        </div>
      </div>

      {/* Hierarchy info banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-xl p-4 text-white">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">Hierarquia de Acesso</p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {Object.entries(PAPEIS_INFO).map(([key, info]) => {
            const Icone = info.icon;
            return (
              <div key={key} className="flex items-center gap-1.5 bg-white/10 rounded-lg px-2.5 py-1.5">
                <Icone size={12} />
                <span className="font-medium">{info.label}</span>
              </div>
            );
          })}
        </div>
        <p className="text-[10px] text-slate-400 mt-2">Dono e Admin Supremo podem gerenciar todos · Gestores podem ativar/desativar membros do seu departamento</p>
      </div>

      {/* Members grouped by department */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center text-slate-400 text-sm">Carregando membros...</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(porDepto).sort(([a], [b]) => {
            if (a === 'Sem departamento') return 1;
            if (b === 'Sem departamento') return -1;
            return a.localeCompare(b, 'pt-BR');
          }).map(([dept, membrosDept]) => {
            const expanded = deptExpandido[dept] !== false;
            const deptOnline = membrosDept.filter(m => { const p = presencas[m.id]; return p ? isReallyOnline(p) : false; }).length;
            return (
              <div key={dept} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <button
                  onClick={() => setDeptExpandido(prev => ({ ...prev, [dept]: !expanded }))}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {expanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                    <Building2 size={16} className="text-slate-500" />
                    <span className="font-semibold text-sm text-slate-700">{dept}</span>
                    <span className="text-xs text-slate-400">{membrosDept.length} membro{membrosDept.length !== 1 ? 's' : ''}</span>
                    {deptOnline > 0 && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium bg-emerald-50 rounded-full px-2 py-0.5">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        {deptOnline} online
                      </span>
                    )}
                  </div>
                </button>

                {expanded && (
                  <div className="border-t border-slate-100">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50/70">
                          <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Membro</th>
                          <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide hidden sm:table-cell">E-mail</th>
                          <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Papel</th>
                          <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide hidden md:table-cell">Status</th>
                          <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide hidden lg:table-cell">Último acesso</th>
                          <th className="text-left px-5 py-2.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {membrosDept.map(m => {
                          const info = getPapelInfo(m.papel);
                          const Icone = info.icon;
                          const p = presencas[m.id];
                          const isOnline = p ? isReallyOnline(p) : false;
                          const canManage = podeGerenciar(m);
                          const isMe = m.id === usuario?.id;
                          return (
                            <tr key={m.id} className={`transition-colors ${!m.ativo ? 'opacity-50 bg-slate-50' : 'hover:bg-slate-50/50'}`}>
                              <td className="px-5 py-3">
                                <div className="flex items-center gap-3">
                                  <div className="relative flex-shrink-0">
                                    <div className={`bg-gradient-to-br ${getAvatarColor(m.nome)} rounded-full w-8 h-8 flex items-center justify-center`}>
                                      <span className="text-white text-xs font-bold">{m.nome.charAt(0).toUpperCase()}</span>
                                    </div>
                                    {isOnline && <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-medium text-slate-700 truncate">{m.nome}</span>
                                      {isMe && <span className="text-[9px] bg-blue-100 text-blue-600 font-semibold px-1.5 py-0.5 rounded-full">Você</span>}
                                    </div>
                                    {isOnline ? (
                                      <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                                        <Wifi size={9} />
                                        Online {p?.ultima_entrada ? `· ${formatarTempo(p.ultima_entrada)}` : ''}
                                      </div>
                                    ) : p?.ultimo_heartbeat ? (
                                      <div className="text-[10px] text-slate-400">Visto {formatarUltimoVisto(p.ultimo_heartbeat)}</div>
                                    ) : null}
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-3 text-slate-500 text-xs hidden sm:table-cell">{m.email}</td>
                              <td className="px-5 py-3">
                                <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full border ${info.corBg} ${info.cor}`}>
                                  <Icone size={11} />
                                  {info.label}
                                </span>
                              </td>
                              <td className="px-5 py-3 hidden md:table-cell">
                                <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full ${m.ativo ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${m.ativo ? 'bg-green-500' : 'bg-red-400'}`} />
                                  {m.ativo ? 'Ativo' : 'Desativado'}
                                </span>
                              </td>
                              <td className="px-5 py-3 hidden lg:table-cell">
                                <div className="flex items-center gap-1">
                                  <Clock size={11} className="text-slate-400" />
                                  <span className="text-[11px] text-slate-600">{formatarUltimoAcesso(m.ultimo_login)}</span>
                                </div>
                              </td>
                              <td className="px-5 py-3">
                                {canManage && (
                                  <div className="flex items-center gap-1">
                                    <button onClick={() => abrirEdicao(m)} className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Editar">
                                      <Pencil size={14} />
                                    </button>
                                    {m.ativo ? (
                                      <button onClick={() => setConfirmDesativar(m)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Desativar acesso">
                                        <UserX size={14} />
                                      </button>
                                    ) : (
                                      <button onClick={() => toggleAtivo(m, true)} className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors" title="Reativar acesso">
                                        <UserCheck size={14} />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════ Confirm Deactivation ═══════ */}
      {confirmDesativar && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setConfirmDesativar(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="bg-red-100 rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={28} className="text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Desativar acesso?</h3>
              <p className="text-sm text-slate-500 mt-2">
                <strong>{confirmDesativar.nome}</strong> perderá acesso ao sistema imediatamente. Você pode reativar depois.
              </p>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setConfirmDesativar(null)} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                Cancelar
              </button>
              <button
                onClick={() => toggleAtivo(confirmDesativar, false)}
                disabled={desativando}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl transition-colors"
              >
                {desativando ? 'Desativando...' : 'Desativar Agora'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ Edit Modal ═══════ */}
      {editando && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={fecharModal}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className={`bg-gradient-to-br ${getAvatarColor(editando.nome)} rounded-full w-10 h-10 flex items-center justify-center`}>
                  <span className="text-white text-sm font-bold">{editando.nome.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{editando.nome}</h3>
                  <p className="text-xs text-slate-500">{editando.email}</p>
                </div>
              </div>
              <button onClick={fecharModal} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>

            <div className="p-5 space-y-5">
              {/* Departamento */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Building2 size={14} className="inline mr-1.5" />
                  Departamento
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {departamentos.length > 0 ? departamentos.map(d => (
                    <button
                      key={d}
                      onClick={() => setDeptoSelecionado(d)}
                      className={`p-2.5 rounded-xl border-2 text-xs font-medium transition-all ${
                        deptoSelecionado === d ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      {d}
                    </button>
                  )) : (
                    <p className="col-span-3 text-xs text-slate-400 italic py-2">Carregando departamentos...</p>
                  )}
                </div>
              </div>

              {/* Papel */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <Shield size={14} className="inline mr-1.5" />
                  Função / Papel
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PAPEIS_EDITAVEIS.filter(p => {
                    if (!isSuper) return getPapelInfo(p).nivel >= 3;
                    return true;
                  }).map(p => {
                    const info = getPapelInfo(p);
                    const Ic = info.icon;
                    const sel = papelSelecionado === p;
                    return (
                      <button
                        key={p}
                        onClick={() => setPapelSelecionado(p)}
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all text-xs ${
                          sel ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        <Ic size={16} />
                        <span className="font-medium text-[10px]">{info.label}</span>
                      </button>
                    );
                  })}
                </div>
                {papelSelecionado !== editando.papel && (
                  <p className="text-xs text-amber-600 mt-1.5">
                    Papel: {getPapelInfo(editando.papel).label} → {getPapelInfo(papelSelecionado).label}
                  </p>
                )}
              </div>

              {/* Redefinir Senha */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  <KeyRound size={14} className="inline mr-1.5" />
                  Redefinir Senha
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={mostrarSenha ? 'text' : 'password'}
                      placeholder="Nova senha..."
                      value={novaSenha}
                      onChange={e => setNovaSenha(e.target.value)}
                      className="w-full px-3 py-2.5 pr-20 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5">
                      {novaSenha && (
                        <button onClick={copiarSenha} className="p-1.5 rounded text-slate-400 hover:text-blue-600" title="Copiar">
                          {senhaCopiada ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        </button>
                      )}
                      <button onClick={() => setMostrarSenha(!mostrarSenha)} className="p-1.5 rounded text-slate-400 hover:text-slate-600">
                        {mostrarSenha ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <button onClick={gerarSenha} className="px-3 py-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl border border-blue-200 transition-colors whitespace-nowrap">
                    Gerar
                  </button>
                </div>
              </div>

              {mensagem && (
                <div className={`text-sm px-4 py-3 rounded-xl ${
                  mensagem.tipo === 'sucesso' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                }`}>
                  {mensagem.texto}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 p-5 border-t border-slate-100">
              <button onClick={fecharModal} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
                Cancelar
              </button>
              <button
                onClick={salvarAlteracoes}
                disabled={salvando}
                className="px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors"
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
