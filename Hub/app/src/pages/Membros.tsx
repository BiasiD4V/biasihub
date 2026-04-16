import { useEffect, useState } from 'react';
import { Users, Shield, ShieldCheck, ShieldAlert, HardHat, Briefcase, Wrench, Circle, Pencil, Eye, EyeOff, KeyRound, X, Copy, Check, Wifi, Clock, UserX, UserCheck, ChevronDown, ChevronRight, Crown, Building2, AlertTriangle, Package } from 'lucide-react';
import { supabase } from '../infrastructure/supabase/client';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { acessoRepository, type Cargo } from '../infrastructure/supabase/acessoRepository';

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
  dono:         { label: 'Dono',          icon: Crown,       cor: 'text-amber-700',  corBg: 'bg-amber-50 border-amber-200',   nivel: 0 },
  admin:        { label: 'Admin',         icon: ShieldAlert, cor: 'text-red-700',    corBg: 'bg-red-50 border-red-200',       nivel: 1 },
  gestor:       { label: 'Gestor',        icon: ShieldCheck, cor: 'text-purple-700', corBg: 'bg-purple-50 border-purple-200', nivel: 2 },
  comercial:    { label: 'Comercial',     icon: Briefcase,   cor: 'text-blue-700',   corBg: 'bg-blue-50 border-blue-200',     nivel: 3 },
  engenheiro:   { label: 'Engenheiro',    icon: Wrench,      cor: 'text-cyan-700',   corBg: 'bg-cyan-50 border-cyan-200',     nivel: 3 },
  orcamentista: { label: 'Orçamentista',  icon: HardHat,     cor: 'text-green-700',  corBg: 'bg-green-50 border-green-200',   nivel: 3 },
  membro:       { label: 'Membro',        icon: Package,     cor: 'text-slate-700',  corBg: 'bg-slate-50 border-slate-200',   nivel: 4 },
};

const DEPARTAMENTOS = ['Comercial', 'Almoxarifado', 'Engenharia', 'Administracao'];
const PAPEIS_EDITAVEIS = ['dono', 'admin', 'gestor', 'comercial', 'engenheiro', 'orcamentista', 'membro'];

function getPapelInfo(papel: string) {
  return PAPEIS_INFO[papel] || { label: papel, icon: Users, cor: 'text-slate-600', corBg: 'bg-slate-50 border-slate-200', nivel: 5 };
}

function formatarUltimoAcesso(iso: string | null): string {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
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
  const [deptExpandido, setDeptExpandido] = useState<Record<string, boolean>>({});

  const [editando, setEditando] = useState<Membro | null>(null);
  const [papelSelecionado, setPapelSelecionado] = useState('');
  const [deptoSelecionado, setDeptoSelecionado] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro' | 'aviso'; texto: string } | null>(null);
  const [senhaCopiada, setSenhaCopiada] = useState(false);
  const [confirmDesativar, setConfirmDesativar] = useState<Membro | null>(null);
  const [desativando, setDesativando] = useState(false);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [novoMembroDepto, setNovoMembroDepto] = useState<string | null>(null);
  const [novoNome, setNovoNome] = useState('');
  const [novoEmail, setNovoEmail] = useState('');
  const [novoPapel, setNovoPapel] = useState('membro');
  const [novoSenha, setNovoSenha] = useState('');
  const [criandoMembro, setCriandoMembro] = useState(false);
  const [erroNovo, setErroNovo] = useState('');

  const meuPapel = usuario?.papel || '';
  const isSuper = meuPapel === 'admin' || meuPapel === 'dono';
  const isGestor = meuPapel === 'gestor';

  if (!isSuper && !isGestor) {
    return <Navigate to="/" replace />;
  }

  function podeGerenciar(target: Membro): boolean {
    if (target.id === usuario?.id) return false;
    if (isSuper) return true;
    if (isGestor) {
      // Gestores só podem editar membros do próprio departamento (exceto outros admins/donos)
      const targetInfo = getPapelInfo(target.papel);
      if (targetInfo.nivel <= 1) return false; // não pode editar admin/dono
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

  function fecharModal() { setEditando(null); setMensagem(null); }

  function abrirNovoMembro(dept: string) {
    setNovoMembroDepto(dept);
    setNovoNome('');
    setNovoEmail('');
    setNovoPapel('membro');
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let s = '';
    for (let i = 0; i < 10; i++) s += chars.charAt(Math.floor(Math.random() * chars.length));
    setNovoSenha(s);
    setErroNovo('');
  }

  async function criarMembro() {
    if (!novoNome.trim() || !novoEmail.trim() || !novoSenha.trim()) {
      setErroNovo('Preencha nome, email e senha.'); return;
    }
    setCriandoMembro(true); setErroNovo('');
    try {
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: novoEmail.trim(),
        password: novoSenha,
        options: { data: { nome: novoNome.trim() } },
      });
      if (authErr) throw authErr;
      const uid = authData.user?.id;
      if (uid) {
        await supabase.from('usuarios').upsert({
          id: uid,
          nome: novoNome.trim(),
          email: novoEmail.trim(),
          papel: novoPapel,
          departamento: novoMembroDepto,
          ativo: true,
        }, { onConflict: 'id' });
      }
      setNovoMembroDepto(null);
      await carregarMembros();
    } catch (err: any) {
      setErroNovo(err.message || 'Erro ao criar membro.');
    } finally {
      setCriandoMembro(false);
    }
  }

  function gerarSenha() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let senha = '';
    for (let i = 0; i < 10; i++) senha += chars.charAt(Math.floor(Math.random() * chars.length));
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

  function aplicarAgrupamentoDepartamentos(lista: Membro[]) {
    const expanded: Record<string, boolean> = {};
    lista.forEach((m) => {
      const d = m.departamento || 'Sem departamento';
      expanded[d] = true;
    });
    setDeptExpandido(expanded);
  }

  async function carregarMembrosDireto(): Promise<Membro[]> {
    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('id, nome, email, papel, ativo, criado_em, departamento')
      .order('nome', { ascending: true });

    if (error || !usuarios) return [];

    const { data: sessoes } = await supabase
      .from('device_sessions')
      .select('user_id, last_login_at')
      .order('last_login_at', { ascending: false });

    const ultimoLoginPorUsuario = new Map<string, string>();
    (sessoes ?? []).forEach((s: { user_id: string; last_login_at: string }) => {
      if (!ultimoLoginPorUsuario.has(s.user_id)) {
        ultimoLoginPorUsuario.set(s.user_id, s.last_login_at);
      }
    });

    return (usuarios as Omit<Membro, 'ultimo_login'>[]).map((u) => ({
      ...u,
      ultimo_login: ultimoLoginPorUsuario.get(u.id) ?? null,
    }));
  }

  async function salvarAlteracoes() {
    if (!editando) return;
    setSalvando(true);
    setMensagem(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) { setMensagem({ tipo: 'erro', texto: 'Sessao expirada' }); setSalvando(false); return; }

      const body: Record<string, unknown> = { userId: editando.id };
      if (papelSelecionado !== editando.papel) body.papel = papelSelecionado;
      if (deptoSelecionado !== (editando.departamento || '')) body.departamento = deptoSelecionado || null;
      if (novaSenha.trim()) body.novaSenha = novaSenha.trim();

      if (!body.papel && body.departamento === undefined && !body.novaSenha) {
        setMensagem({ tipo: 'erro', texto: 'Nenhuma alteracao para salvar' });
        setSalvando(false);
        return;
      }

      let atualizadoViaApi = false;

      try {
        const response = await fetch('/api/membros-update', {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        const result = await response.json().catch(() => ({}));

        if (response.ok) {
          atualizadoViaApi = true;
          setMembros(prev => prev.map(m =>
            m.id === editando.id
              ? { ...m, papel: (body.papel as string) || m.papel, departamento: body.departamento !== undefined ? (body.departamento as string | null) : m.departamento }
              : m
          ));
          const msgs: string[] = [];
          if (result.papel) msgs.push(`Papel: ${getPapelInfo(result.papel).label}`);
          if (result.departamento !== undefined) msgs.push(`Dept: ${result.departamento || 'Removido'}`);
          if (result.senhaRedefinida) msgs.push('Senha redefinida');
          setMensagem({ tipo: 'sucesso', texto: msgs.join(' · ') });
        }
      } catch {
        // fallback direto para Supabase abaixo
      }

      if (!atualizadoViaApi) {
        if (body.novaSenha) {
          setMensagem({ tipo: 'aviso', texto: 'Redefinicao de senha disponivel apenas no app desktop.' });
          setSalvando(false);
          return;
        }

        const updateFields: Record<string, unknown> = {};
        if (body.papel) updateFields.papel = body.papel;
        if (body.departamento !== undefined) updateFields.departamento = body.departamento;

        const { error } = await supabase
          .from('usuarios')
          .update(updateFields)
          .eq('id', editando.id);

        if (error) {
          setMensagem({ tipo: 'erro', texto: error.message || 'Erro ao salvar' });
          setSalvando(false);
          return;
        }

        setMembros(prev => prev.map(m =>
          m.id === editando.id
            ? { ...m, papel: (body.papel as string) || m.papel, departamento: body.departamento !== undefined ? (body.departamento as string | null) : m.departamento }
            : m
        ));
        setMensagem({ tipo: 'sucesso', texto: 'Alteracoes salvas com sucesso.' });
      }
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Erro de conexao' });
    }

    setSalvando(false);
  }

  async function toggleAtivo(membro: Membro, novoStatus: boolean) {
    setDesativando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      let atualizado = false;

      if (session?.access_token) {
        try {
          const response = await fetch('/api/membros-update', {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${session.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: membro.id, ativo: novoStatus }),
          });
          atualizado = response.ok;
        } catch {
          atualizado = false;
        }
      }

      if (!atualizado) {
        const { error } = await supabase
          .from('usuarios')
          .update({ ativo: novoStatus })
          .eq('id', membro.id);
        atualizado = !error;
      }

      if (atualizado) {
        setMembros(prev => prev.map(m => m.id === membro.id ? { ...m, ativo: novoStatus } : m));
      }
    } catch {
      // ignore
    }
    setDesativando(false);
    setConfirmDesativar(null);
  }

  async function carregarMembros() {
    let carregados: Membro[] = [];
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        const response = await fetch('/api/membros', {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        });
        if (response.ok) {
          carregados = await response.json() as Membro[];
        }
      }
    } catch (e) {
      console.error('Erro de conexão ao carregar membros:', e);
    }

    if (carregados.length === 0) {
      carregados = await carregarMembrosDireto();
    }

    setMembros(carregados);
    aplicarAgrupamentoDepartamentos(carregados);
    setLoading(false);
  }

  useEffect(() => {
    carregarMembros();
  }, []);

  useEffect(() => {
    async function carregarCargos() {
      const data = await acessoRepository.listarCargos();
      setCargos(data);
    }

    carregarCargos();
    const channel = supabase
      .channel('hub-membros-cargos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cargos' }, () => { carregarCargos(); })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
      .channel('presenca-hub-membros')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'presenca_usuarios' }, (payload) => {
        const p = payload.new as Presenca;
        if (p?.user_id) setPresencas((prev) => ({ ...prev, [p.user_id]: p }));
      })
      .subscribe();
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => { supabase.removeChannel(channel); clearInterval(timer); };
  }, []);

  const STALE_MS = 2 * 60 * 1000;
  function isReallyOnline(p: Presenca) {
    if (!p.esta_online) return false;
    return Date.now() - new Date(p.ultimo_heartbeat).getTime() < STALE_MS;
  }

  const totalAtivos = membros.filter(m => m.ativo).length;
  const totalOnline = Object.values(presencas).filter(isReallyOnline).length;
  const cargosConsole = cargos.filter(c => c.ativo);

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
    <div className="p-6 lg:p-12 max-w-7xl mx-auto min-h-screen space-y-12 font-black animate-in fade-in slide-in-from-bottom-8 duration-700 relative z-10">
      {/* Header Estilo Singularity */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div className="space-y-4">
          <div className="flex items-center gap-4 text-sky-400">
             <div className="w-12 h-12 rounded-2xl bg-slate-900 border-2 border-white/10 flex items-center justify-center text-white shadow-2xl">
                <Users size={24} className="text-sky-400" />
             </div>
             <div>
                <h1 className="text-4xl font-black text-white tracking-tighter uppercase leading-none">Diretorio de Elite</h1>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-2 opacity-60">Sincronizacao de Pessoal Ativa</p>
             </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="premium-glass bg-emerald-500/10 border-2 border-emerald-500/20 px-6 py-3 rounded-2xl flex items-center gap-4 shadow-2xl shadow-emerald-500/5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
              <div className="flex flex-col">
                 <span className="text-[9px] text-emerald-400 uppercase tracking-widest leading-none mb-1">Rede Global</span>
                 <span className="text-sm text-white font-black leading-none">{totalOnline} OPERADORES ONLINE</span>
              </div>
           </div>
        </div>
      </div>

      {/* Stats Grid - Premium Tactical Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total de Ativos', value: membros.length, icon: Users, color: 'text-sky-400', bg: 'bg-sky-500/5', border: 'border-sky-500/20' },
          { label: 'Sessoes Ativas', value: totalOnline, icon: Wifi, color: 'text-emerald-400', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20' },
          { label: 'Pendencias', value: totalAtivos, icon: ShieldAlert, color: 'text-indigo-400', bg: 'bg-indigo-500/5', border: 'border-indigo-500/20' },
          { label: 'Acesso Negado', value: membros.filter(m => !m.ativo).length, icon: UserX, color: 'text-rose-400', bg: 'bg-rose-500/5', border: 'border-rose-500/20' },
        ].map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className={`premium-glass bg-white/5 border-2 ${border} rounded-[32px] p-8 shadow-2xl group hover:bg-white/10 transition-all duration-500`}>
            <div className="flex flex-col gap-6">
              <div className={`${bg} ${color} w-14 h-14 rounded-2xl flex items-center justify-center border-2 ${border} group-hover:scale-110 transition-transform`}>
                <Icon size={24} />
              </div>
              <div>
                <p className="text-3xl font-black text-white leading-none mb-2 tracking-tighter">{value}</p>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.3em]">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Hierarchy Console */}
      <div className="premium-glass bg-slate-900/60 border-2 border-white/10 rounded-[40px] p-8 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-16 -translate-y-1/2 translate-x-1/2 bg-sky-500/5 rounded-full blur-3xl" />
         <div className="flex items-center justify-between mb-8 relative z-10">
            <div className="flex items-center gap-3">
               <Shield size={20} className="text-sky-400" />
               <h2 className="text-[11px] font-black uppercase tracking-[0.4em] text-white">Console de Atribuicoes</h2>
            </div>
            <div className="h-[1px] flex-1 mx-8 bg-gradient-to-r from-white/10 to-transparent" />
            <span className="text-[10px] font-black text-sky-400 uppercase tracking-[0.3em]">{cargosConsole.length} cargos</span>
         </div>
         <div className="flex flex-wrap items-center gap-4 relative z-10">
          {(cargosConsole.length > 0
            ? cargosConsole.map(c => ({ id: c.id, nome: c.nome, papel: c.papel }))
            : Object.entries(PAPEIS_INFO).map(([key, info]) => ({ id: key, nome: info.label, papel: key }))
          ).map((item) => {
            const info = getPapelInfo(item.papel);
            const Icone = info.icon;
            return (
              <div key={item.id} className="flex items-center gap-3 bg-white/5 hover:bg-white/10 border-2 border-white/5 rounded-2xl px-4 py-3 transition-all cursor-default group/item">
                <Icone size={16} className="text-white group-hover/item:text-sky-400 transition-colors" />
                <div className="leading-none">
                  <span className="block text-[10px] font-black text-white uppercase tracking-widest">{item.nome}</span>
                  <span className="block text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">{info.label}</span>
                </div>
              </div>
            );
          })}
         </div>
       </div>

      {loading ? (
        <div className="premium-glass border-2 border-dashed border-white/20 rounded-[48px] p-32 text-center animate-pulse">
            <div className="w-12 h-12 border-4 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
            <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-[10px]">Sincronizando Diretorio...</p>
        </div>
      ) : (
        <div className="space-y-8 pb-20">
          {Object.entries(porDepto).sort(([a], [b]) => {
            const order = ['Administracao', 'Comercial', 'Almoxarifado', 'Engenharia', 'Sem departamento'];
            return (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b));
          }).map(([dept, membrosDept]) => {
            const expanded = deptExpandido[dept] !== false;
            const deptOnline = membrosDept.filter(m => { const p = presencas[m.id]; return p ? isReallyOnline(p) : false; }).length;
            
            return (
              <div key={dept} className="premium-glass bg-white/5 border-2 border-white/10 rounded-[48px] overflow-hidden group/dept shadow-2xl hover:border-white/20 transition-all duration-700">
                <button
                  onClick={() => setDeptExpandido(prev => ({ ...prev, [dept]: !expanded }))}
                  className="w-full flex items-center justify-between px-10 py-8 hover:bg-white/5 transition-all"
                >
                  <div className="flex items-center gap-8">
                    <div className="w-16 h-16 rounded-[28px] bg-slate-900 border-2 border-white/10 flex items-center justify-center text-white shadow-2xl group-hover/dept:rotate-[10deg] transition-all">
                       <Building2 size={28} className="text-sky-400" />
                    </div>
                    <div className="text-left">
                       <h3 className="text-2xl font-black text-white tracking-tighter uppercase leading-none mb-2">{dept}</h3>
                       <div className="flex items-center gap-4">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{membrosDept.length} Membros Registrados</span>
                          {deptOnline > 0 && (
                            <div className="px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2">
                               <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_5px_rgba(52,211,153,0.5)]" />
                               <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">{deptOnline} Ativos</span>
                            </div>
                          )}
                       </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {isSuper && (
                      <button
                        onClick={(e) => { e.stopPropagation(); abrirNovoMembro(dept); }}
                        className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all flex items-center justify-center"
                        title={`Adicionar membro ao ${dept}`}
                      >
                        <span className="text-lg font-black leading-none">+</span>
                      </button>
                    )}
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${expanded ? 'bg-white text-slate-900' : 'bg-white/10 text-white hover:bg-white/20'}`}>
                      {expanded ? <ChevronDown size={24} /> : <ChevronRight size={24} />}
                    </div>
                  </div>
                </button>

                {expanded && (
                  <div className="px-6 pb-6 animate-in fade-in slide-in-from-top-6 duration-700">
                    <div className="premium-glass bg-slate-900/40 border-2 border-white/10 rounded-[36px] overflow-hidden backdrop-blur-3xl">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/10 bg-white/5">
                            <th className="text-left px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Operador</th>
                            <th className="text-left px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hidden lg:table-cell">Comunicacao</th>
                            <th className="text-left px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Patente</th>
                            <th className="text-left px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] hidden md:table-cell text-center">Protocolo</th>
                            <th className="text-center px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {membrosDept.map(m => {
                            const info = getPapelInfo(m.papel);
                            const p = presencas[m.id];
                            const isOnline = p ? isReallyOnline(p) : false;
                            const canManage = podeGerenciar(m);
                            const isMe = m.id === usuario?.id;
                            return (
                              <tr key={m.id} className={`group/row transition-all hover:bg-white/5 ${!m.ativo ? 'opacity-40 grayscale' : ''}`}>
                                <td className="px-8 py-6">
                                  <div className="flex items-center gap-5">
                                    <div className="relative shrink-0">
                                      <div className={`bg-gradient-to-tr ${getAvatarColor(m.nome)} rounded-[20px] w-14 h-14 flex items-center justify-center border-2 border-white/20 shadow-2xl group-hover/row:rotate-6 transition-transform duration-500`}>
                                        <span className="text-white text-xl font-black">{m.nome.charAt(0).toUpperCase()}</span>
                                      </div>
                                      {isOnline && (
                                        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900 shadow-2xl flex items-center justify-center">
                                           <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                                        </div>
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-3">
                                        <span className="text-[13px] font-black text-white hover:text-sky-400 transition-colors uppercase tracking-widest truncate">{m.nome}</span>
                                        {isMe && <span className="text-[8px] bg-sky-500 text-white font-black px-2 py-0.5 rounded-md uppercase tracking-widest shadow-lg shadow-sky-500/20">ME</span>}
                                      </div>
                                      <div className="mt-1">
                                        {isOnline ? (
                                          <span className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em] animate-pulse">Sinal Ativo</span>
                                        ) : p?.ultimo_heartbeat ? (
                                          <span className="text-[9px] font-black text-slate-600 uppercase tracking-[0.2em]">{formatarUltimoVisto(p.ultimo_heartbeat)}</span>
                                        ) : null}
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-8 py-6 text-slate-500 font-black text-[10px] uppercase tracking-widest hidden lg:table-cell opacity-60 group-hover/row:opacity-100 transition-opacity">{m.email}</td>
                                <td className="px-8 py-6">
                                  <div className={`inline-flex items-center gap-3 text-[9px] font-black px-4 py-2 rounded-xl border-2 shadow-2xl ${info.corBg} ${info.cor} uppercase tracking-[0.2em]`}>
                                    <info.icon size={14} />{info.label}
                                  </div>
                                </td>
                                <td className="px-8 py-6 hidden md:table-cell text-center">
                                  <div className={`inline-flex items-center gap-3 text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-inner ${m.ativo ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${m.ativo ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]' : 'bg-rose-400'}`} />
                                    {m.ativo ? 'Autorizado' : 'Restrito'}
                                  </div>
                                </td>
                                <td className="px-8 py-6">
                                  {canManage && (
                                    <div className="flex items-center justify-center gap-3">
                                      <button onClick={() => abrirEdicao(m)} className="w-11 h-11 flex items-center justify-center rounded-2xl bg-white/10 text-white hover:bg-sky-500 transition-all shadow-2xl group/btn" title="Acessar Terminal">
                                        <Pencil size={16} className="group-hover/btn:scale-125 transition-transform" />
                                      </button>
                                      {m.ativo ? (
                                        <button onClick={() => setConfirmDesativar(m)} className="w-11 h-11 flex items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-xl" title="Revogar Credenciais">
                                          <UserX size={16} />
                                        </button>
                                      ) : (
                                        <button onClick={() => toggleAtivo(m, true)} className="w-11 h-11 flex items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all shadow-xl" title="Restaurar Protocolo">
                                          <UserCheck size={16} />
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
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Reconfiguracao dos Modais para Estilo Singularity */}
      {confirmDesativar && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[999] flex items-center justify-center p-6 animate-in fade-in duration-500" onClick={() => setConfirmDesativar(null)}>
          <div className="premium-glass bg-slate-900 border-2 border-rose-500/30 p-10 w-full max-w-md text-center shadow-[0_40px_100px_rgba(0,0,0,0.6)] relative overflow-hidden rounded-[48px]" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-rose-500 to-transparent" />
            <div className="w-24 h-24 rounded-[32px] bg-rose-500 border-4 border-white/20 flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-rose-500/20">
              <ShieldAlert size={48} className="text-white animate-pulse" />
            </div>
            <h3 className="text-3xl font-black text-white tracking-tighter uppercase leading-none mb-4">Revogar Acesso?</h3>
            <p className="text-slate-400 font-black text-[11px] uppercase tracking-widest leading-relaxed mb-10 px-4">
              Atencao: O operador <span className="text-rose-400 underline">{confirmDesativar.nome}</span> terá todas as credenciais invalidadas imediatamente pelo nucleo central de seguranca.
            </p>
            <div className="flex flex-col gap-4">
              <button 
                onClick={() => toggleAtivo(confirmDesativar, false)} 
                disabled={desativando} 
                className="w-full h-16 rounded-[24px] bg-rose-600 text-white font-black text-xs uppercase tracking-[0.3em] hover:bg-rose-700 hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-rose-600/20"
              >
                {desativando ? 'Processando Protocolo...' : 'Confirmar Revogacao'}
              </button>
              <button onClick={() => setConfirmDesativar(null)} className="w-full h-12 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 hover:text-white transition-colors">Abortar Operacao</button>
            </div>
          </div>
        </div>
      )}

      {novoMembroDepto && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[999] flex items-center justify-center p-6" onClick={() => setNovoMembroDepto(null)}>
          <div className="premium-glass bg-slate-900 border-2 border-emerald-500/30 p-10 w-full max-w-md rounded-[48px] shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Novo Membro</h3>
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-8">Departamento: {novoMembroDepto}</p>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Nome Completo</label>
                <input type="text" value={novoNome} onChange={e => setNovoNome(e.target.value)}
                  placeholder="Ex: João Silva"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white font-bold text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Email</label>
                <input type="email" value={novoEmail} onChange={e => setNovoEmail(e.target.value)}
                  placeholder="email@biasi.com"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white font-bold text-sm focus:outline-none focus:border-emerald-500" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Papel</label>
                <select value={novoPapel} onChange={e => setNovoPapel(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white font-bold text-sm focus:outline-none focus:border-emerald-500">
                  {['gestor','comercial','engenheiro','orcamentista','membro'].map(p => (
                    <option key={p} value={p} className="bg-slate-900">{getPapelInfo(p).label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Senha Inicial</label>
                <div className="flex gap-2">
                  <input type="text" value={novoSenha} onChange={e => setNovoSenha(e.target.value)}
                    className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-emerald-400 font-black text-sm font-mono focus:outline-none focus:border-emerald-500" />
                  <button onClick={() => { const c='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'; let s=''; for(let i=0;i<10;i++) s+=c[Math.floor(Math.random()*c.length)]; setNovoSenha(s); }}
                    className="px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-slate-400 hover:text-white text-xs font-bold transition-colors">
                    Gerar
                  </button>
                </div>
              </div>
              {erroNovo && <p className="text-rose-400 text-xs font-bold">{erroNovo}</p>}
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setNovoMembroDepto(null)} className="flex-1 h-12 rounded-2xl border border-white/10 text-slate-400 text-xs font-black uppercase tracking-widest hover:bg-white/5">Cancelar</button>
              <button onClick={criarMembro} disabled={criandoMembro}
                className="flex-[2] h-12 rounded-2xl bg-emerald-600 text-white text-xs font-black uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-50 transition-all">
                {criandoMembro ? 'Criando...' : 'Criar Membro'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editando && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xl z-[998] flex items-center justify-center p-6 animate-in fade-in duration-500 overflow-y-auto pt-20 pb-20" onClick={fecharModal}>
           <div className="premium-glass bg-slate-900 border-2 border-white/10 w-full max-w-2xl rounded-[60px] shadow-[0_60px_120px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col relative" onClick={e => e.stopPropagation()}>
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-sky-400 to-transparent" />
              
              <div className="p-10 lg:p-12 space-y-12">
                 <div className="flex flex-col lg:flex-row items-center lg:items-end justify-between gap-8">
                    <div className="flex items-center gap-8">
                       <div className={`bg-gradient-to-tr ${getAvatarColor(editando.nome)} rounded-[32px] w-20 h-20 flex items-center justify-center shadow-2xl border-4 border-white/20 rotate-3`}>
                         <span className="text-white text-3xl font-black italic">{editando.nome.charAt(0).toUpperCase()}</span>
                       </div>
                       <div className="text-center lg:text-left">
                          <h3 className="text-3xl font-black text-white tracking-tighter uppercase leading-none mb-3">{editando.nome}</h3>
                          <div className="flex items-center gap-4 text-[11px] font-black text-sky-400 uppercase tracking-widest opacity-60">
                             <Briefcase size={12} />
                             {editando.email}
                          </div>
                       </div>
                    </div>
                    <button onClick={fecharModal} className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white/5 text-slate-500 hover:bg-rose-500 hover:text-white transition-all transform hover:scale-110"><X size={28} /></button>
                 </div>

                 <div className="space-y-12">
                    {/* Dept Selector Táctico */}
                    <div className="space-y-6">
                       <div className="flex items-center gap-4">
                          <Building2 size={16} className="text-slate-500" />
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Sincronizacao de Unidade</label>
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                         {DEPARTAMENTOS.map(d => (
                           <button 
                             key={d} 
                             onClick={() => setDeptoSelecionado(d)}
                             className={`h-16 rounded-[24px] border-2 font-black text-[11px] uppercase tracking-widest transition-all ${deptoSelecionado === d ? 'border-sky-500 bg-sky-500/10 text-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.2)]' : 'border-white/5 bg-white/5 text-slate-500 hover:border-white/10 hover:bg-white/10'}`}
                           >
                             {d}
                           </button>
                         ))}
                       </div>
                    </div>

                    {/* Role Selector Táctico */}
                    <div className="space-y-6">
                       <div className="flex items-center gap-4">
                          <Shield size={16} className="text-slate-500" />
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Atribuicao de Patente</label>
                       </div>
                       <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                         {cargos.filter(c => isSuper || getPapelInfo(c.papel).nivel >= 3).map(c => {
                           const info = getPapelInfo(c.papel);
                           const sel = papelSelecionado === c.papel;
                           return (
                             <button 
                               key={c.id} 
                               onClick={() => setPapelSelecionado(c.papel)}
                               className={`flex flex-col items-center justify-center gap-3 p-6 rounded-[28px] border-2 transition-all group/item ${sel ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/5 bg-white/5 hover:border-white/10'}`}
                             >
                               <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${sel ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.5)]' : 'bg-slate-900 text-slate-600 group-hover/item:text-white'}`}>
                                  <info.icon size={24} />
                               </div>
                               <span className={`text-[9px] font-black uppercase tracking-widest text-center leading-tight ${sel ? 'text-white' : 'text-slate-500'}`}>{c.nome}</span>
                             </button>
                           );
                         })}
                       </div>
                    </div>

                    {/* Security Credential Terminal */}
                    <div className="space-y-6">
                       <div className="flex items-center gap-4">
                          <KeyRound size={16} className="text-slate-500" />
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Injecao de Credenciais</label>
                       </div>
                       <div className="flex flex-col lg:flex-row gap-4">
                          <div className="relative flex-1 group">
                             <input 
                               type={mostrarSenha ? 'text' : 'password'}
                               placeholder="CHAVE CRIPTOGRAFICA"
                               value={novaSenha}
                               onChange={e => setNovaSenha(e.target.value)}
                               className="w-full h-16 bg-white/5 border-2 border-white/5 focus:border-indigo-500 focus:bg-white/10 rounded-[24px] px-8 text-sm font-black text-white hover:bg-white/10 transition-all uppercase tracking-[0.3em] placeholder:text-slate-700"
                             />
                             <div className="absolute right-4 top-2 bottom-2 flex gap-2">
                               {novaSenha && (
                                 <button onClick={copiarSenha} className="w-12 h-full flex items-center justify-center rounded-xl bg-white/10 text-sky-400 hover:bg-white/20 transition-all">
                                    {senhaCopiada ? <Check size={18} /> : <Copy size={18} />}
                                 </button>
                               )}
                               <button onClick={() => setMostrarSenha(!mostrarSenha)} className="w-12 h-full flex items-center justify-center rounded-xl bg-white/10 text-slate-400 hover:bg-white/20 transition-all">
                                  {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                               </button>
                             </div>
                          </div>
                          <button onClick={gerarSenha} className="px-10 h-16 bg-white text-slate-900 font-black text-[11px] uppercase tracking-[0.3em] rounded-[24px] hover:bg-sky-400 hover:scale-[1.05] transition-all shadow-2xl flex-shrink-0">Gerar Chave</button>
                       </div>
                    </div>
                 </div>

                 {mensagem && (
                   <div className={`p-6 rounded-[32px] border-2 flex items-center gap-6 animate-in zoom-in-95 duration-500 ${mensagem.tipo === 'sucesso' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                      {mensagem.tipo === 'sucesso' ? <ShieldCheck size={28} /> : <AlertTriangle size={28} />}
                      <span className="text-xs font-black uppercase tracking-widest leading-relaxed">{mensagem.texto}</span>
                   </div>
                 )}
              </div>

              <div className="p-10 lg:p-12 bg-white/5 border-t-2 border-white/5 flex flex-col sm:flex-row items-center justify-between gap-6">
                 <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] text-center sm:text-left">Atencao: Acoes de sistema sao auditadas pelo protocolo Singularity.</p>
                 <div className="flex items-center gap-6 w-full sm:w-auto">
                    <button onClick={fecharModal} className="flex-1 sm:flex-none h-16 px-8 text-[11px] font-black uppercase tracking-[0.3em] text-slate-500 hover:text-white transition-colors">Cancelar</button>
                    <button 
                       onClick={salvarAlteracoes}
                       disabled={salvando}
                       className="flex-1 sm:flex-none h-16 px-12 bg-sky-500 text-white font-black text-[11px] uppercase tracking-[0.3em] rounded-[24px] hover:bg-sky-600 hover:scale-[1.02] shadow-[0_20px_40px_rgba(14,165,233,0.3)] transition-all disabled:opacity-50"
                    >
                       {salvando ? 'Processando...' : 'Efetivar Protocolo'}
                    </button>
                 </div>
              </div>
           </div>
         </div>
      )}
    </div>
  );
}



