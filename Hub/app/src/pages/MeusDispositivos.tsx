import { useEffect, useState } from 'react';
import { Laptop, Smartphone, Monitor, Trash2, RefreshCw, Shield, Bot, Eye, EyeOff, Check, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { listUserSessions, revokeDeviceSession, revokeAllDeviceSessions } from '../infrastructure/services/deviceSessionService';
import type { DeviceSession } from '../infrastructure/services/deviceSessionService';

function getDeviceIcon(deviceName: string) {
  if (deviceName?.includes('iPhone') || deviceName?.includes('Android')) return Smartphone;
  if (deviceName?.includes('iPad')) return Smartphone;
  return deviceName?.includes('Mac') ? Monitor : Laptop;
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function ConfiguracaoIA() {
  const bridge = (window as any).electronBridge as ElectronBridge | undefined;
  const [anthropicKey, setAnthropicKey] = useState('');
  const [ollamaModel, setOllamaModel] = useState('llama4');
  const [mostrarChave, setMostrarChave] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState<{ online: boolean; models: string[] } | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  useEffect(() => {
    if (!bridge) return;
    bridge.getAnthropicKey().then(setAnthropicKey);
    bridge.getOllamaModel().then(setOllamaModel);
    verificarOllama();
  }, []);

  async function verificarOllama() {
    if (!bridge) return;
    const status = await bridge.checkOllama();
    setOllamaStatus(status);
  }

  async function salvar() {
    if (!bridge) return;
    setSalvando(true);
    await bridge.setAnthropicKey(anthropicKey);
    await bridge.setOllamaModel(ollamaModel);
    setSalvando(false);
    setSavedMsg('Salvo!');
    setTimeout(() => setSavedMsg(''), 2500);
  }

  if (!bridge) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-violet-600 flex items-center justify-center text-white shadow-2xl">
          <Bot size={24} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Configuração de IA</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Paulo · Igor · Assistentes</p>
        </div>
      </div>

      {/* Status Ollama */}
      <div
        className={`rounded-[24px] border-2 p-5 flex items-center gap-4 cursor-pointer transition-all ${
          ollamaStatus?.online
            ? 'bg-emerald-500/5 border-emerald-500/20 hover:border-emerald-500/40'
            : 'bg-slate-100/60 border-slate-200 hover:border-slate-300'
        }`}
        onClick={verificarOllama}
      >
        {ollamaStatus?.online ? (
          <Wifi size={22} className="text-emerald-500 shrink-0" />
        ) : (
          <WifiOff size={22} className="text-slate-400 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          {ollamaStatus === null ? (
            <p className="text-sm font-bold text-slate-500">Verificando Ollama...</p>
          ) : ollamaStatus.online ? (
            <>
              <p className="text-sm font-black text-emerald-700">Ollama rodando</p>
              {ollamaStatus.models.length > 0 && (
                <p className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-widest mt-0.5 truncate">
                  Modelos: {ollamaStatus.models.join(' · ')}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm font-black text-slate-500">Ollama offline</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                Execute: ollama serve
              </p>
            </>
          )}
        </div>
        <RefreshCw size={14} className="text-slate-400 shrink-0" />
      </div>

      {/* Modelo Ollama */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Modelo Ollama</label>
        <input
          type="text"
          value={ollamaModel}
          onChange={e => setOllamaModel(e.target.value)}
          placeholder="llama4"
          className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 placeholder-slate-300 focus:border-violet-400 focus:outline-none transition-colors"
        />
        <p className="text-[10px] text-slate-400 font-medium ml-1">
          Padrão: llama4 · Outros: llama3.2, mistral, gemma3, etc.
        </p>
      </div>

      {/* Chave Anthropic */}
      <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Chave Anthropic (fallback)</label>
        <div className="relative">
          <input
            type={mostrarChave ? 'text' : 'password'}
            value={anthropicKey}
            onChange={e => setAnthropicKey(e.target.value)}
            placeholder="sk-ant-..."
            className="w-full rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 pr-12 text-sm font-mono text-slate-800 placeholder-slate-300 focus:border-violet-400 focus:outline-none transition-colors"
          />
          <button
            type="button"
            onClick={() => setMostrarChave(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-600"
          >
            {mostrarChave ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 font-medium ml-1">
          Usado se o Ollama não estiver rodando
        </p>
      </div>

      {/* Botão salvar */}
      <button
        onClick={salvar}
        disabled={salvando}
        className="w-full h-12 rounded-2xl bg-violet-600 text-white font-black text-sm uppercase tracking-widest hover:bg-violet-700 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-violet-500/20"
      >
        {savedMsg ? (
          <><Check size={16} /> {savedMsg}</>
        ) : salvando ? (
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : (
          'Salvar Configurações'
        )}
      </button>
    </div>
  );
}

export function MeusDispositivos() {
  const { usuario } = useAuth();
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [revogando, setRevogando] = useState<string | null>(null);

  async function carregar() {
    if (!usuario) return;
    setLoading(true);
    const data = await listUserSessions(usuario.id);
    setSessions(data);
    setLoading(false);
  }

  useEffect(() => { carregar(); }, [usuario]);

  async function revogar(id: string) {
    setRevogando(id);
    await revokeDeviceSession(id);
    setSessions(prev => prev.filter(s => s.id !== id));
    setRevogando(null);
  }

  async function revogarTodos() {
    if (!usuario) return;
    setRevogando('all');
    await revokeAllDeviceSessions(usuario.id);
    setSessions([]);
    setRevogando(null);
  }

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* Header Estilo Singularity */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-2xl">
                <Shield size={24} className="text-sky-400" />
             </div>
             <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Monitoramento de Segurança</h1>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Protocolo de Sessões Ativas</p>
             </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={carregar} 
            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/40 border-2 border-white/60 text-slate-400 hover:text-indigo-600 hover:bg-white hover:border-indigo-500/30 transition-all active:scale-95 shadow-lg"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
          {sessions.length > 1 && (
            <button 
              onClick={revogarTodos} 
              disabled={revogando === 'all'} 
              className="h-12 px-6 flex items-center gap-3 bg-rose-500 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-rose-600 transition-all active:scale-95 shadow-xl shadow-rose-500/20 disabled:opacity-50"
            >
              <Trash2 size={16} /> Purgar Todos os Dispositivos
            </button>
          )}
        </div>
      </div>

      {/* Alerta de Segurança */}
      <div className="premium-glass bg-amber-500/5 border-2 border-amber-500/20 rounded-[32px] p-6 flex flex-col sm:flex-row items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 -translate-y-1/2 translate-x-1/2 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="w-16 h-16 rounded-3xl bg-amber-500 flex items-center justify-center text-white shadow-2xl relative z-10 shrink-0">
           <Shield size={32} />
        </div>
        <div className="space-y-1 relative z-10 text-center sm:text-left">
           <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Protocolo de Emergência</p>
           <p className="text-sm font-black text-amber-900/80 leading-relaxed">
             Caso não reconheça algum dispositivo nesta listagem, execute a revogação imediata. 
             Isso interromperá o acesso do terminal suspeito instantaneamente.
           </p>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
           {[1,2,3,4].map(i => (
             <div key={i} className="h-40 rounded-[32px] bg-slate-900/5 border-2 border-dashed border-slate-900/10" />
           ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="premium-glass bg-white/20 border-2 border-dashed border-white/40 rounded-[48px] py-24 px-12 text-center">
          <Laptop size={64} className="text-slate-300 mx-auto mb-6 opacity-40" />
          <h2 className="text-xl font-black text-slate-400 uppercase tracking-widest">Nenhuma sessão ativa detectada</h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-2">A rede de acesso está limpa</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sessions.map(s => {
            const Icon = getDeviceIcon(s.device_name);
            return (
              <div key={s.id} className="premium-glass bg-white/60 border-2 border-white/40 p-6 rounded-[32px] flex items-center gap-6 group hover:border-indigo-500/30 hover:bg-white transition-all duration-500 shadow-xl shadow-slate-900/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 -translate-y-1/2 translate-x-1/2 bg-indigo-500/5 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="w-16 h-16 rounded-3xl bg-slate-900 flex items-center justify-center text-white shadow-2xl group-hover:bg-indigo-600 transition-colors relative z-10 shrink-0">
                  <Icon size={28} className="group-hover:scale-110 transition-transform" />
                </div>
                
                <div className="flex-1 min-w-0 relative z-10">
                  <p className="font-black text-slate-900 text-lg tracking-tight truncate group-hover:text-indigo-600 transition-colors">{s.device_name || 'Terminal Desconhecido'}</p>
                  <div className="flex flex-col gap-1 mt-2">
                     <div className="flex items-center gap-2">
                         <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">IP Redirecionado: {String(s.ip_address)}</p>
                     </div>
                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-3.5">Última Transmissão: {formatarData(s.last_login_at)}</p>
                     <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest ml-3.5">Expiração de Token: {formatarData(s.expires_at)}</p>
                  </div>
                </div>
                
                <button
                  onClick={() => revogar(s.id)}
                  disabled={revogando === s.id}
                  className="w-12 h-12 flex items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all active:scale-90 flex-shrink-0 relative z-10"
                  title="Expurgar Sessão"
                >
                  {revogando === s.id ? (
                     <div className="w-5 h-5 border-2 border-rose-500/30 border-t-rose-500 rounded-full animate-spin" />
                  ) : (
                     <Trash2 size={18} />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Configuração de IA */}
      <div className="premium-glass bg-white/60 border-2 border-white/40 rounded-[32px] p-8 shadow-xl shadow-slate-900/5">
        <ConfiguracaoIA />
      </div>
    </div>
  );
}

