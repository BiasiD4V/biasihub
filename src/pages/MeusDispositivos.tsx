import { useEffect, useState } from 'react';
import { Trash2, Smartphone, MapPin, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  listUserSessions, 
  revokeDeviceSession, 
  revokeAllDeviceSessions,
  type DeviceSession 
} from '../infrastructure/services/deviceSessionService';

export function MeusDispositivos() {
  const { usuario } = useAuth();
  const [sessoes, setSessoes] = useState<DeviceSession[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [removendo, setRemovendo] = useState<string | null>(null);

  useEffect(() => {
    carregarSessoes();
  }, [usuario?.id]);

  async function carregarSessoes() {
    if (!usuario?.id) return;
    
    setCarregando(true);
    const dados = await listUserSessions(usuario.id);
    setSessoes(dados);
    setCarregando(false);
  }

  async function handleRemoverDispositivo(sessionId: string) {
    if (!confirm('Tem certeza que deseja revogar o acesso deste dispositivo?')) return;

    setRemovendo(sessionId);
    const sucesso = await revokeDeviceSession(sessionId);
    setRemovendo(null);

    if (sucesso) {
      setSessoes(s => s.filter(sess => sess.id !== sessionId));
    }
  }

  async function handleRevogarTodos() {
    if (!confirm('Tem certeza que deseja revogar TODOS os dispositivos? Você precisará fazer login novamente.')) return;

    const sucesso = await revokeAllDeviceSessions(usuario?.id || '');
    if (sucesso) {
      setSessoes([]);
    }
  }

  function formatarData(data: string) {
    return new Date(data).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Meus Dispositivos</h1>
        <p className="text-sm text-slate-500 mt-1">
          Gerencie os computadores que têm acesso salvo à sua conta
        </p>
      </div>

      {carregando ? (
        <div className="bg-slate-50 rounded-lg p-8 flex items-center justify-center">
          <div className="w-6 h-6 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
          <span className="ml-3 text-slate-600">Carregando dispositivos...</span>
        </div>
      ) : sessoes.length === 0 ? (
        <div className="bg-slate-50 rounded-lg p-8 text-center">
          <Smartphone className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600">Nenhum dispositivo salvo</p>
          <p className="text-sm text-slate-500 mt-1">
            Use a opção "Lembrar de mim" no login para salvar um dispositivo
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sessoes.map((sessao) => (
            <div
              key={sessao.id}
              className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-1">
                    <Smartphone className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-800">
                      {sessao.device_name}
                    </h3>
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="font-mono">{sessao.ip_address}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>
                          Último acesso: {formatarData(sessao.last_login_at)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        Criado em {formatarData(sessao.created_at)}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => handleRemoverDispositivo(sessao.id)}
                  disabled={removendo === sessao.id}
                  className="ml-3 flex-shrink-0 p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Remover dispositivo"
                >
                  {removendo === sessao.id ? (
                    <div className="w-4 h-4 border-2 border-red-200 border-t-red-600 rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}

          {sessoes.length > 1 && (
            <div className="pt-4 border-t border-slate-200">
              <button
                onClick={handleRevogarTodos}
                className="w-full px-4 py-2.5 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors font-medium text-sm"
              >
                Revogar todos os dispositivos
              </button>
            </div>
          )}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>💡 Dica:</strong> Quando você marca "Lembrar de mim" no login, este dispositivo é salvo e você será desconectado de todos os outros.
          Isso garante que apenas este computador tem acesso à sua conta usando "lembrar de mim".
        </p>
      </div>
    </div>
  );
}
