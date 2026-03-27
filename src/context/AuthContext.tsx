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
    const timeout = setTimeout(() => setLoading(false), 10000);
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          await loadUserProfile(session.user.id);
        } else {
          setUsuario(null);
        }
        clearTimeout(timeout);
        setLoading(false);
      }
    );
    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const loadUserProfile = async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) { console.error('Erro ao carregar perfil:', error); return false; }
      if (data) {
        setUsuario({ id: data.id, nome: data.nome, email: data.email, papel: data.papel as PapelUsuario, ativo: data.ativo });
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erro ao carregar perfil do usuário:', error);
      return false;
    }
  };

  async function login(email: string, senha: string): Promise<{ sucesso: boolean; erro?: string }> {
    if (!email.trim() || !senha.trim()) return { sucesso: false, erro: 'Preencha e-mail e senha.' };
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
      if (error) {
        if (error.message.includes('Invalid login credentials')) return { sucesso: false, erro: 'E-mail ou senha incorretos.' };
        return { sucesso: false, erro: 'Erro ao fazer login: ' + error.message };
      }
      if (data.user) {
        const ok = await loadUserProfile(data.user.id);
        if (!ok) { await supabase.auth.signOut(); return { sucesso: false, erro: 'Perfil não encontrado. Contate o administrador.' }; }
        return { sucesso: true };
      }
      return { sucesso: false, erro: 'Erro inesperado no login.' };
    } catch (error) {
      return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
    }
  }

  async function logout() {
    try { await supabase.auth.signOut(); setUsuario(null); }
    catch (error) { console.error('Erro no logout:', error); }
  }

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!usuario, usuario, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
