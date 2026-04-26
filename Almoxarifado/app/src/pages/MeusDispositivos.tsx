import { useEffect, useState } from 'react';
import { Laptop, Smartphone, Monitor, Trash2, RefreshCw, Shield } from 'lucide-react';
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

export function MeusDispositivos() {
  const { usuario } = useAuth();
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [revogando, setRevogando] = useState<string | null>(null);

  async function carregar() {
    if (!usuario) {
      setLoading(false);
      setSessions([]);
      return;
    }
    setLoading(true);
    try {
      const data = await listUserSessions(usuario.id);
      setSessions(data);
    } catch (err) {
      console.error('[MeusDispositivos] erro ao carregar sessões:', err);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { carregar(); }, [usuario]);

  async function revogar(id: string) {
    setRevogando(id);
    try {
      const ok = await revokeDeviceSession(id);
      if (ok) {
        setSessions(prev => prev.filter(s => s.id !== id));
      }
    } finally {
      setRevogando(null);
    }
  }

  async function revogarTodos() {
    if (!usuario) return;
    setRevogando('all');
    try {
      const ok = await revokeAllDeviceSessions(usuario.id);
      if (ok) {
        setSessions([]);
      }
    } finally {
      setRevogando(null);
    }
  }

  return (
    <div className="space-y-6 p-4 lg:p-6 max-w-3xl mx-auto">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Meus Dispositivos</h1>
          <p className="text-sm text-slate-500 mt-1">Sessões salvas com "Lembrar de mim"</p>
        </div>
        <div className="flex gap-2">
          <button onClick={carregar} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <RefreshCw size={18} />
          </button>
          {sessions.length > 1 && (
            <button onClick={revogarTodos} disabled={revogando === 'all'} className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-xl border border-red-200 transition-colors disabled:opacity-50">
              <Trash2 size={14} />Revogar todos
            </button>
          )}
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <Shield size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-700">Revogue sessões de dispositivos que você não reconhece. Isso irá deslogar aquele dispositivo.</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-sm">Carregando...</div>
      ) : sessions.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Laptop size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Nenhuma sessão salva</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(s => {
            const Icon = getDeviceIcon(s.device_name);
            return (
              <div key={s.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
                <div className="bg-slate-100 rounded-xl p-3 flex-shrink-0">
                  <Icon size={20} className="text-slate-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 text-sm">{s.device_name || 'Dispositivo'}</p>
                  <p className="text-xs text-slate-400">IP: {String(s.ip_address)}  -  Último acesso: {formatarData(s.last_login_at)}</p>
                  <p className="text-xs text-slate-400">Expira em: {formatarData(s.expires_at)}</p>
                </div>
                <button
                  onClick={() => revogar(s.id)}
                  disabled={revogando === s.id}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                  title="Revogar sessão"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

