import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from '../infrastructure/supabase/client';

// Captura o hash SSO ANTES do HashRouter apagar ele durante o render
const _initialHash = typeof window !== 'undefined' ? window.location.hash : '';
import type { Usuario } from '../domain/entities/Usuario';
import type { PapelUsuario } from '../domain/value-objects/PapelUsuario';
import {
  clearRememberedSession,
  createDeviceSession,
  validateRememberedSession,
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

const AUTH_TIMEOUT_MS = 30000;

function isCapacitorRuntime() {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  return Boolean(
    w.Capacitor ||
      w.cordova ||
      window.location.origin === 'https://localhost' ||
      navigator.userAgent.includes('Capacitor')
  );
}

function hubUrlLocalOuWeb() {
  const isElectron = navigator.userAgent.includes('Electron');
  if (isElectron) return 'app://hub.local/';
  if (isCapacitorRuntime()) return '/index.html#/';
  return 'https://biasihub-portal.vercel.app/';
}

// Consulta o banco para verificar se o papel tem acesso ao módulo
async function podeAcessarModulo(papel: string, moduloKey: string): Promise<boolean> {
  const p = papel.toLowerCase().trim();
  // Admin/Dono sempre têm acesso
  if (p === 'admin' || p === 'dono') return true;

  try {
    const response = await Promise.race([
      supabase.from('modulo_acesso').select('papeis, disponivel').eq('modulo_key', moduloKey).maybeSingle(),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Timeout Modulo')), 15000))
    ]);
    const data = response.data;

    if (!data) {
      return p === 'comercial' || p === 'gestor';
    }
    if (!data.disponivel) return false;
    const papeis = (data.papeis ?? []).map((r: string) => r.toLowerCase());
    return papeis.includes(p);
  } catch (err) {
    console.warn('Fallback ativado devida à timeout no modulo_acesso', err);
    return p === 'comercial' || p === 'gestor';
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [erroConexao, setErroConexao] = useState<string | null>(null);
  const inicializado = useRef(false);

  const loadUserProfile = async (userId: string): Promise<boolean> => {
    try {
      const response = await Promise.race([
        supabase.from('usuarios').select('*').eq('id', userId).single(),
        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Timeout Perfil')), 15000))
      ]);
      const data = response.data;
      const error = response.error;

      if (error) {
        console.error('Erro ao carregar perfil:', error);
        return false;
      }

      if (!data) {
        setUsuario(null);
        return false;
      }

      const novoUsuario = {
        id: data.id,
        nome: data.nome,
        email: data.email,
        papel: data.papel as PapelUsuario,
        ativo: data.ativo,
        departamento: data.departamento || null,
      };

      // Validar acesso ao módulo Comercial via banco (modulo_acesso)
      const temAcesso = await podeAcessarModulo(novoUsuario.papel, 'comercial');
      if (!temAcesso) {
        console.warn(`❌ Usuário ${novoUsuario.email} (papel: ${novoUsuario.papel}) não tem acesso ao módulo Comercial`);
        // Redirecionar para o Hub sem fazer signOut (preserva sessão do Hub)
        window.location.href = hubUrlLocalOuWeb();
        return false;
      }

      setUsuario(novoUsuario);
      return true;
    } catch (error) {
      console.error('❌ Erro crítico ao carregar perfil:', error);
      return false;
    }
  };

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
          try {
            const { data: ssoData } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (ssoData.session?.user) {
              await loadUserProfile(ssoData.session.user.id);
              // Auto-salva sessão local para que refresh de página funcione sem pedir login
              await createDeviceSession(ssoData.session.user.id, ssoData.session.user.email ?? '');
            }
            setLoading(false);
            inicializado.current = true;
            setErroConexao(null);
          } catch (err) {
            console.error('Erro ao restaurar sessão SSO:', err);
            setLoading(false);
            inicializado.current = true;
          }
        }
      }

      // Safety timeout para garantir que o loading termine mesmo em caso de falha de rede
      timeout = setTimeout(() => {
        if (!inicializado.current) {
          inicializado.current = true;
          setLoading(false);
        }
      }, AUTH_TIMEOUT_MS);

      try {
        const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
          // Pular INITIAL_SESSION se SSO já inicializou
          if (inicializado.current && event === 'INITIAL_SESSION') return;

          if (event === 'INITIAL_SESSION') {
            if (session?.user) {
              await loadUserProfile(session.user.id);
            } else {
              const remembered = await validateRememberedSession();
              if (remembered.valid && remembered.userId) {
                await loadUserProfile(remembered.userId);
              } else {
                setUsuario(null);
              }
            }
            setLoading(false);
            inicializado.current = true;
            setErroConexao(null);
            clearTimeout(timeout);
          } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if (session?.user) await loadUserProfile(session.user.id);
            setErroConexao(null);
            clearTimeout(timeout);
          } else if (event === 'SIGNED_OUT') {
            setUsuario(null);
            clearRememberedSession();
            setLoading(false);
            clearTimeout(timeout);
          }
        });
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
    <AuthContext.Provider
      value={{
        isAuthenticated: !!usuario,
        usuario,
        loading,
        erroConexao,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
