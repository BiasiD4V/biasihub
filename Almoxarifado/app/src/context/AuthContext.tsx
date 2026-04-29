import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { supabase } from '../infrastructure/supabase/client';

// Captura o hash SSO ANTES do HashRouter apagar ele durante o render
const _initialHash = typeof window !== 'undefined' ? window.location.hash : '';
import type { Usuario } from '../domain/entities/Usuario';
import type { PapelUsuario } from '../domain/value-objects/PapelUsuario';
import {
  createDeviceSession,
  validateRememberedSession,
  clearRememberedSession
} from '../infrastructure/services/deviceSessionService';

interface AuthContextType {
  isAuthenticated: boolean;
  usuario: Usuario | null;
  loading: boolean;
  erroConexao: string | null;
  login: (email: string, senha: string, rememberMe?: boolean) => Promise<{ sucesso: boolean; erro?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Consulta o banco para verificar se o papel tem acesso ao módulo
async function podeAcessarModulo(papel: string, moduloKey: string): Promise<boolean> {
  const p = papel.toLowerCase().trim();
  // Admin/Dono sempre tem acesso
  if (p === 'admin' || p === 'dono') return true;

  try {
    const { data } = await supabase
      .from('modulo_acesso')
      .select('papeis, disponivel')
      .eq('modulo_key', moduloKey)
      .maybeSingle();

    if (!data) {
      // Sem configuração no banco -> fallback para almoxarifado/gestor
      return p === 'almoxarifado' || p === 'gestor';
    }
    if (!data.disponivel) return false;
    const papeis = (data.papeis ?? []).map((r: string) => r.toLowerCase());
    return papeis.includes(p);
  } catch {
    return p === 'almoxarifado' || p === 'gestor';
  }
}

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(fallback), ms);
    }),
  ]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [erroConexao, setErroConexao] = useState<string | null>(null);
  const inicializado = useRef(false);

  useEffect(() => {
    let subscription: { unsubscribe: () => void } | null = null;
    let timeout: ReturnType<typeof setTimeout>;

    async function init() {
      // SSO: usa o hash capturado no módulo (antes do HashRouter apagar)
      const hash = _initialHash;
      if (hash.includes('access_token=')) {
        const params = new URLSearchParams(hash.slice(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        window.history.replaceState({}, '', window.location.pathname);
        if (accessToken && refreshToken) {
          const { data: ssoData } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (ssoData.session?.user) {
            await loadUserProfile(ssoData.session.user.id);
            // Auto-salva sessão local para que refresh de página funcione sem pedir login
            await createDeviceSession(ssoData.session.user.id, ssoData.session.user.email ?? '');
            setLoading(false);
            inicializado.current = true;
            setErroConexao(null);
          }
        }
      }

      timeout = setTimeout(() => {
        if (!inicializado.current) {
          inicializado.current = true;
          setLoading(false);
        }
      }, 12000);

      try {
        const { data } = supabase.auth.onAuthStateChange(
          async (_event, session) => {
            // Skip INITIAL_SESSION if SSO already initialized
            if (inicializado.current && _event === 'INITIAL_SESSION') return;

            if (_event === 'INITIAL_SESSION') {
              let erroInicial: string | null = null;
              if (session?.user) {
                const ok = await withTimeout(loadUserProfile(session.user.id), 8000, false);
                if (!ok) {
                  setUsuario(null);
                  erroInicial = 'Não foi possível carregar o perfil no tempo esperado.';
                }
              } else {
                const remembered = await withTimeout(
                  validateRememberedSession(),
                  8000,
                  { valid: false as const }
                );
                if (remembered.valid && remembered.userId) {
                  const ok = await withTimeout(loadUserProfile(remembered.userId), 8000, false);
                  if (!ok) {
                    setUsuario(null);
                    erroInicial = 'Não foi possível recuperar a sessão salva neste dispositivo.';
                  }
                } else {
                  setUsuario(null);
                }
              }
              setLoading(false);
              inicializado.current = true;
              clearTimeout(timeout);
              setErroConexao(erroInicial);
            } else if (_event === 'SIGNED_IN') {
              if (session?.user) await loadUserProfile(session.user.id);
              setErroConexao(null);
            } else if (_event === 'SIGNED_OUT') {
              setUsuario(null);
              clearRememberedSession();
              setLoading(false);
              clearTimeout(timeout);
            }
          }
        );
        subscription = data.subscription;
      } catch (err) {
        clearTimeout(timeout);
        inicializado.current = true;
        console.error('Erro ao conectar com Supabase Auth:', err);
        setErroConexao('Não foi possível conectar ao servidor de autenticação.');
        setLoading(false);
      }
    }

    init();

    return () => {
      clearTimeout(timeout);
      subscription?.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Erro ao carregar perfil:', error);
        return false;
      }

      if (data) {
        const novoUsuario = {
          id: data.id,
          nome: data.nome,
          email: data.email,
          papel: data.papel as PapelUsuario,
          ativo: data.ativo,
          departamento: data.departamento || null,
        };

        // Validar acesso ao módulo Almoxarifado via banco (modulo_acesso)
        const temAcesso = await podeAcessarModulo(novoUsuario.papel, 'almoxarifado');
        if (!temAcesso) {
          console.warn(`❌ Usuário ${novoUsuario.email} (papel: ${novoUsuario.papel}) não tem acesso ao módulo Almoxarifado`);
          // Redirecionar para o Hub sem fazer signOut (preserva sessão do Hub)
          const isElectron = navigator.userAgent.includes('Electron');
          const isCapacitor = !!(window as any).Capacitor;
          window.location.href = isElectron
            ? 'app://hub.local/'
            : isCapacitor
              ? '/index.html#/' // No APK, volta pro Hub empacotado localmente
              : 'https://biasihub-hub.vercel.app/';
          return false;
        }

        setUsuario(novoUsuario);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao carregar perfil do usuário:', error);
      return false;
    }
  };

  async function login(
    email: string,
    senha: string,
    rememberMe: boolean = false
  ): Promise<{ sucesso: boolean; erro?: string }> {
    if (!email.trim() || !senha.trim()) {
      return { sucesso: false, erro: 'Preencha e-mail e senha.' };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          return { sucesso: false, erro: 'E-mail ou senha incorretos.' };
        }
        return { sucesso: false, erro: `Erro ao fazer login: ${error.message}` };
      }

      if (data.user) {
        const ok = await loadUserProfile(data.user.id);
        if (!ok) {
          await supabase.auth.signOut();
          return { sucesso: false, erro: 'Perfil de usuário não encontrado. Contate o administrador.' };
        }

        if (rememberMe) {
          await createDeviceSession(data.user.id, email.trim());
        }

        return { sucesso: true };
      }

      return { sucesso: false, erro: 'Erro inesperado no login.' };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Verifique sua internet e tente novamente.' };
    }
  }

  async function logout() {
    try {
      await supabase.auth.signOut();
      setUsuario(null);
      clearRememberedSession();
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  }

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!usuario,
      usuario,
      loading,
      erroConexao,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

