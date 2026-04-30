import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { supabase } from '../infrastructure/supabase/client';
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
  precisaDefinirSenha: boolean;
  login: (email: string, senha: string, rememberMe?: boolean) => Promise<{ sucesso: boolean; erro?: string }>;
  loginComOtp: (email: string, token: string) => Promise<{ sucesso: boolean; erro?: string }>;
  enviarOtp: (email: string) => Promise<{ sucesso: boolean; erro?: string }>;
  definirSenha: (novaSenha: string) => Promise<{ sucesso: boolean; erro?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return await Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [erroConexao, setErroConexao] = useState<string | null>(null);
  const [precisaDefinirSenha, setPrecisaDefinirSenha] = useState(false);
  const inicializado = useRef(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!inicializado.current) {
        inicializado.current = true;
        setLoading(false);
      }
    }, 10000);

    let subscription: { unsubscribe: () => void } | null = null;
    let disposed = false;

    async function bootstrapAuth() {
      try {
        const hash = window.location.hash;
        if (hash.includes('access_token=')) {
          const params = new URLSearchParams(hash.slice(1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          window.history.replaceState({}, '', `${window.location.pathname}${window.location.search}`);

          if (accessToken && refreshToken) {
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              console.error('Erro ao restaurar sessao via hash:', sessionError);
            } else if (sessionData.session?.user && !disposed) {
              await loadUserProfile(sessionData.session.user.id);
              setLoading(false);
              inicializado.current = true;
              setErroConexao(null);
            }
          }
        }

        const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
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
            setErroConexao(erroInicial);
            clearTimeout(timeout);
          } else if (_event === 'SIGNED_IN') {
            setErroConexao(null);
          } else if (_event === 'SIGNED_OUT') {
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

    bootstrapAuth();

    return () => {
      disposed = true;
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
        setUsuario({
          id: data.id,
          nome: data.nome,
          email: data.email,
          papel: data.papel as PapelUsuario,
          ativo: data.ativo,
          departamento: data.departamento || null,
        });
        setPrecisaDefinirSenha(data.senha_definida === false);
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
      const normalizedEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
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
          await createDeviceSession(data.user.id, normalizedEmail);
        }

        return { sucesso: true };
      }

      return { sucesso: false, erro: 'Erro inesperado no login.' };
    } catch {
      return { sucesso: false, erro: 'Erro de conexão. Verifique sua internet e tente novamente.' };
    }
  }

  async function enviarOtp(email: string): Promise<{ sucesso: boolean; erro?: string }> {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: false },
    });
    if (error) return { sucesso: false, erro: 'E-mail não encontrado ou erro ao enviar código.' };
    return { sucesso: true };
  }

  async function loginComOtp(email: string, token: string): Promise<{ sucesso: boolean; erro?: string }> {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token,
      type: 'email',
    });
    if (error) return { sucesso: false, erro: 'Código inválido ou expirado.' };
    if (data.user) {
      const ok = await loadUserProfile(data.user.id);
      if (!ok) return { sucesso: false, erro: 'Perfil não encontrado. Contate o administrador.' };
    }
    return { sucesso: true };
  }

  async function definirSenha(novaSenha: string): Promise<{ sucesso: boolean; erro?: string }> {
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    if (error) return { sucesso: false, erro: 'Erro ao definir senha. Tente novamente.' };

    if (usuario) {
      await supabase.from('usuarios').update({ senha_definida: true }).eq('id', usuario.id);
    }
    setPrecisaDefinirSenha(false);
    return { sucesso: true };
  }

  async function logout() {
    try {
      await supabase.auth.signOut();
      setUsuario(null);
      setPrecisaDefinirSenha(false);
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
      precisaDefinirSenha,
      login,
      loginComOtp,
      enviarOtp,
      definirSenha,
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
