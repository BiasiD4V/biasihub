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
  login: (email: string, senha: string, rememberMe?: boolean) => Promise<{ sucesso: boolean; erro?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [erroConexao, setErroConexao] = useState<string | null>(null);
  const inicializado = useRef(false);

  useEffect(() => {
    // Timeout de segurança: se Supabase não responder em 5s, libera a tela de login
    const timeout = setTimeout(() => {
      if (!inicializado.current) {
        inicializado.current = true;
        console.warn('Supabase não respondeu em 5s — liberando tela de login');
        setLoading(false);
      }
    }, 5000);

    let subscription: { unsubscribe: () => void } | null = null;

    try {
      const { data } = supabase.auth.onAuthStateChange(
        async (_event, session) => {
          if (inicializado.current && _event === 'INITIAL_SESSION') return;

          clearTimeout(timeout);

          if (_event === 'INITIAL_SESSION') {
            if (session?.user) {
              await loadUserProfile(session.user.id);
            } else {
              // Tentar validar Remember Me antes de liberar para login
              console.log('Nenhuma sessão ativa — testando Remember Me...');
              const remembered = await validateRememberedSession();
              
              if (remembered.valid && remembered.userId) {
                console.log('✅ Sessão lembrada encontrada! Fazendo auto-login...');
                // A sessão foi restaurada no Supabase Auth pelo validateRememberedSession
                // Buscar o usuário para carregar o perfil
                await loadUserProfile(remembered.userId);
              } else {
                console.log('❌ Nenhuma sessão lembrada válida — mostrando login');
                setUsuario(null);
              }
            }
            setLoading(false);
            inicializado.current = true;
            setErroConexao(null);
          } else if (_event === 'SIGNED_IN') {
            // loadUserProfile já é chamado por login() e pelo INITIAL_SESSION (Remember Me)
            // Não chamar aqui para evitar race condition
            setErroConexao(null);
          } else if (_event === 'SIGNED_OUT') {
            setUsuario(null);
            clearRememberedSession();
            setLoading(false);
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
        setUsuario({
          id: data.id,
          nome: data.nome,
          email: data.email,
          papel: data.papel as PapelUsuario,
          ativo: data.ativo,
        });
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

        // Se "Lembrar de mim" está marcado, criar sessão de dispositivo
        if (rememberMe) {
          await createDeviceSession(data.user.id, email.trim());
        }

        return { sucesso: true };
      }

      return { sucesso: false, erro: 'Erro inesperado no login.' };
    } catch (error) {
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
