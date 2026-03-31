/**
 * Serviço para gerenciar sessões de dispositivo (Remember Me)
 * 
 * Abordagem: Salva TUDO no localStorage + registra no banco para listagem.
 * Os tokens Supabase ficam SÓ no localStorage (seguro, sem precisar de migration SQL).
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
const REFRESH_KEY = 'remember_me_refresh_token';
const USERID_KEY = 'remember_me_user_id';

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

    // Salvar no banco (para listagem em "Meus Dispositivos") - best effort, sem campos de token
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
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar device session no banco:', error);
      // Mesmo com erro no banco, salva no localStorage para auto-login funcionar
    }

    // SALVAR TUDO NO LOCALSTORAGE — é aqui que o auto-login acontece
    localStorage.setItem(STORAGE_KEY, sessionToken);
    localStorage.setItem(`${STORAGE_KEY}_email`, email);
    localStorage.setItem(REFRESH_KEY, supabaseSession.refresh_token);
    localStorage.setItem(USERID_KEY, userId);
    localStorage.setItem(`${STORAGE_KEY}_expires`, expiresAt);
    localStorage.setItem(`${STORAGE_KEY}_ip`, ip);

    console.log('✅ Remember Me salvo com sucesso (localStorage + banco)');
    return data;
  } catch (error) {
    console.error('Erro ao criar sessão de dispositivo:', error);
    return null;
  }
}

/**
 * Valida um token de sessão e tenta login automático
 * Usa APENAS localStorage — sem depender de colunas extras no banco
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
    const storedRefreshToken = localStorage.getItem(REFRESH_KEY);
    const storedUserId = localStorage.getItem(USERID_KEY);
    const storedExpires = localStorage.getItem(`${STORAGE_KEY}_expires`);
    const storedIp = localStorage.getItem(`${STORAGE_KEY}_ip`);

    // Verificar se temos todos os dados necessários
    if (!storedToken || !storedEmail || !storedRefreshToken || !storedUserId) {
      console.log('Remember Me: dados incompletos no localStorage');
      return { valid: false };
    }

    // Verificar se a sessão expirou
    if (storedExpires && new Date(storedExpires) < new Date()) {
      console.warn('Remember Me: sessão expirada');
      clearRememberedSession();
      return { valid: false };
    }

    // Verificar se o IP mudou (segurança)
    try {
      const currentIP = await getDeviceIP();
      if (storedIp && storedIp !== currentIP) {
        console.warn('Remember Me: IP mudou, invalidando sessão por segurança');
        clearRememberedSession();
        return { valid: false };
      }
    } catch (ipError) {
      // Se não conseguir pegar o IP, continua mesmo assim (pode ser offline temp)
      console.warn('Remember Me: não conseguiu verificar IP, continuando...');
    }

    // RESTAURAR SESSÃO SUPABASE usando refresh_token salvo no localStorage
    console.log('Remember Me: tentando restaurar sessão Supabase...');

    const { data: refreshData, error: refreshError } = 
      await supabase.auth.refreshSession({
        refresh_token: storedRefreshToken,
      });

    if (refreshError || !refreshData.session) {
      console.warn('Remember Me: falha ao restaurar sessão:', refreshError?.message);
      clearRememberedSession();
      return { valid: false };
    }

    // SUCESSO! Atualizar o refresh_token no localStorage (pode ter mudado)
    const newSession = refreshData.session;
    localStorage.setItem(REFRESH_KEY, newSession.refresh_token);

    // Atualizar último login no banco (best-effort)
    supabase
      .from('device_sessions')
      .update({ last_login_at: new Date().toISOString() })
      .eq('session_token', storedToken)
      .then(() => {}, () => {});

    console.log('✅ Remember Me: sessão restaurada com sucesso!');
    return {
      valid: true,
      userId: storedUserId,
      email: storedEmail,
      session: newSession,
    };
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
 * Limpa TODOS os tokens salvos no localStorage
 */
export function clearRememberedSession(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(`${STORAGE_KEY}_email`);
  localStorage.removeItem(`${STORAGE_KEY}_expires`);
  localStorage.removeItem(`${STORAGE_KEY}_ip`);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USERID_KEY);
}
