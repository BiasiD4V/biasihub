/**
 * Serviço para gerenciar sessões de dispositivo (Remember Me)
 */

import { supabase } from '../supabase/client';
import { getDeviceIP, getDeviceName, getUserAgent, generateSessionToken } from './deviceService';

export interface DeviceSession {
  id: string;
  user_id: string;
  email: string;
  ip_address: string;
  device_name: string;
  session_token: string;
  created_at: string;
  last_login_at: string;
  expires_at: string;
  is_active: boolean;
  user_agent: string;
}

const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 dias
const STORAGE_KEY = 'remember_me_token';

/**
 * Cria uma nova sessão de dispositivo (Remember Me)
 */
export async function createDeviceSession(
  userId: string,
  email: string
): Promise<DeviceSession | null> {
  try {
    const ip = await getDeviceIP();
    const deviceName = getDeviceName();
    const userAgent = getUserAgent();
    const sessionToken = generateSessionToken();
    
    const expiresAt = new Date(Date.now() + SESSION_DURATION).toISOString();

    // Obter os tokens de autenticação do Supabase
    const supabaseSession = (await supabase.auth.getSession()).data.session;
    if (!supabaseSession) {
      console.error('Sem sessão Supabase ativa para salvar tokens');
      return null;
    }

    const { data, error } = await supabase
      .from('device_sessions')
      .insert({
        user_id: userId,
        email,
        ip_address: ip,
        device_name: deviceName,
        session_token: sessionToken,
        expires_at: expiresAt,
        user_agent: userAgent,
        access_token: supabaseSession.access_token,
        refresh_token: supabaseSession.refresh_token,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar device session:', error);
      return null;
    }

    // Armazenar token no localStorage
    if (data) {
      localStorage.setItem(STORAGE_KEY, sessionToken);
      localStorage.setItem(`${STORAGE_KEY}_email`, email);
    }

    return data;
  } catch (error) {
    console.error('Erro ao criar sessão de dispositivo:', error);
    return null;
  }
}

/**
 * Valida um token de sessão armazenado e tenta login automático
 */
export async function validateRememberedSession(): Promise<{
  valid: boolean;
  userId?: string;
  email?: string;
  session?: any;
}> {
  try {
    const storedToken = localStorage.getItem(STORAGE_KEY);
    const storedEmail = localStorage.getItem(`${STORAGE_KEY}_email`);

    if (!storedToken || !storedEmail) {
      return { valid: false };
    }

    const currentIP = await getDeviceIP();

    // Buscar a sessão no banco de dados
    const { data, error } = await supabase
      .from('device_sessions')
      .select('*')
      .eq('session_token', storedToken)
      .eq('email', storedEmail)
      .eq('ip_address', currentIP)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error || !data) {
      console.warn('Token de sessão inválido ou expirado');
      clearRememberedSession();
      return { valid: false };
    }

    // Verificar se temos os tokens de autenticação salvos
    if (data.access_token && data.refresh_token) {
      console.log('Tentando restaurar sessão com tokens salvos...');
      
      try {
        // Restaurar a sessão do Supabase Auth
        const { data: sessionData, error: sessionError } = 
          await supabase.auth.setSession({
            access_token: data.access_token,
            refresh_token: data.refresh_token,
          });

        if (sessionError || !sessionData.session) {
          console.warn('Falha ao restaurar sessão com tokens antigas, tentando refresh...');
          
          // Se os tokens expiraram, tentar fazer refresh
          const { data: refreshData, error: refreshError } = 
            await supabase.auth.refreshSession({
              refresh_token: data.refresh_token,
            });

          if (refreshError || !refreshData.session) {
            console.warn('Falha ao fazer refresh de sessão. Limpando tokens...');
            clearRememberedSession();
            return { valid: false };
          }

          // Sucesso! Atualizar tokens no banco de dados para próxima vez
          const newSession = refreshData.session;
          await supabase
            .from('device_sessions')
            .update({ 
              access_token: newSession.access_token,
              refresh_token: newSession.refresh_token,
              last_login_at: new Date().toISOString()
            })
            .eq('id', data.id);

          console.log('✅ Sessão restaurada com sucesso (via refresh)');
          return {
            valid: true,
            userId: data.user_id,
            email: data.email,
            session: newSession,
          };
        }

        // Sucesso! Tokens ainda válidos
        await supabase
          .from('device_sessions')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', data.id);

        console.log('✅ Sessão restaurada com sucesso (tokens ainda válidos)');
        return {
          valid: true,
          userId: data.user_id,
          email: data.email,
          session: sessionData.session,
        };
      } catch (sessionRestoreError) {
        console.error('Erro ao restaurar sessão:', sessionRestoreError);
        return { valid: false };
      }
    } else {
      console.warn('Device session não tem tokens de autenticação salvos');
      return { valid: false };
    }
  } catch (error) {
    console.error('Erro ao validar sessão lembrada:', error);
    return { valid: false };
  }
}

/**
 * Lista todas as sessões ativas do usuário
 */
export async function listUserSessions(userId: string): Promise<DeviceSession[]> {
  try {
    const { data, error } = await supabase
      .from('device_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('last_login_at', { ascending: false });

    if (error) {
      console.error('Erro ao listar sessões:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Erro ao listar sessões do usuário:', error);
    return [];
  }
}

/**
 * Remove uma sessão de dispositivo específica
 */
export async function revokeDeviceSession(sessionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('device_sessions')
      .update({ is_active: false })
      .eq('id', sessionId);

    if (error) {
      console.error('Erro ao revogar sessão:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao revogar sessão:', error);
    return false;
  }
}

/**
 * Remove todas as sessões de um usuário (exceto a atual)
 */
export async function revokeAllDeviceSessions(userId: string, currentSessionId?: string): Promise<boolean> {
  try {
    let query = supabase
      .from('device_sessions')
      .update({ is_active: false })
      .eq('user_id', userId);

    if (currentSessionId) {
      query = query.neq('id', currentSessionId);
    }

    const { error } = await query;

    if (error) {
      console.error('Erro ao revogar todas as sessões:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao revogar sessões:', error);
    return false;
  }
}

/**
 * Limpa o token salvo no localStorage
 */
export function clearRememberedSession(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(`${STORAGE_KEY}_email`);
}
