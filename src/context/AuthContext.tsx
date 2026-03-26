import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../infrastructure/supabase/client';
import type { Usuario } from '../domain/entities/Usuario';
import type { PapelUsuario } from '../domain/value-objects/PapelUsuario';

interface AuthContextType {
  isAuthenticated: boolean;
  usuario: Usuario | null;
  loading: boolean;
  login: (email: string, senha: string) => Promise<{ sucesso: boolean; erro?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar se já existe uma sessão ativa
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await loadUserProfile(session.user.id);
        }
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();

    // Escutar mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setUsuario(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Erro ao carregar perfil:', error);
        return;
      }

      if (data) {
        setUsuario({
          id: data.id,
          nome: data.nome,
          email: data.email,
          papel: data.papel as PapelUsuario,
          ativo: data.ativo,
        });
      }
    } catch (error) {
      console.error('Erro ao carregar perfil do usuário:', error);
    }
  };

  async function login(
    email: string,
    senha: string
  ): Promise<{ sucesso: boolean; erro?: string }> {
    if (!email.trim() || !senha.trim()) {
      return { sucesso: false, erro: 'Preencha e-mail e senha.' };
    }

    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: senha,
      });

      if (error) {
        return { sucesso: false, erro: 'E-mail ou senha incorretos.' };
      }

      if (data.user) {
        // O perfil será carregado automaticamente pelo onAuthStateChange
        return { sucesso: true };
      }

      return { sucesso: false, erro: 'Erro inesperado no login.' };
    } catch (error) {
      console.error('Erro no login:', error);
      return { sucesso: false, erro: 'Erro ao fazer login. Tente novamente.' };
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await supabase.auth.signOut();
      setUsuario(null);
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  }

  return (
    <AuthContext.Provider value={{
      isAuthenticated: !!usuario,
      usuario,
      loading,
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
