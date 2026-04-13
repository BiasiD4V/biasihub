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

const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000;
const STORAGE_KEY = 'remember_me_token';
const REFRESH_KEY = 'remember_me_refresh_token';
const USERID_KEY = 'remember_me_user_id';

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
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar device session no banco:', error);
    }

    localStorage.setItem(STORAGE_KEY, sessionToken);
    localStorage.setItem(`${STORAGE_KEY}_email`, email);
    localStorage.setItem(REFRESH_KEY, supabaseSession.refresh_token);
    localStorage.setItem(USERID_KEY, userId);
    localStorage.setItem(`${STORAGE_KEY}_expires`, expiresAt);
    localStorage.setItem(`${STORAGE_KEY}_ip`, ip);

    return data;
  } catch (error) {
    console.error('Erro ao criar sessão de dispositivo:', error);
    return null;
  }
}

export async function validateRememberedSession(): Promise<{
  valid: boolean;
  userId?: string;
  email?: string;
  session?: unknown;
}> {
  try {
    const storedToken = localStorage.getItem(STORAGE_KEY);
    const storedEmail = localStorage.getItem(`${STORAGE_KEY}_email`);
    const storedRefreshToken = localStorage.getItem(REFRESH_KEY);
    const storedUserId = localStorage.getItem(USERID_KEY);
    const storedExpires = localStorage.getItem(`${STORAGE_KEY}_expires`);
    const storedIp = localStorage.getItem(`${STORAGE_KEY}_ip`);

    if (!storedToken || !storedEmail || !storedRefreshToken || !storedUserId) {
      return { valid: false };
    }

    if (storedExpires && new Date(storedExpires) < new Date()) {
      clearRememberedSession();
      return { valid: false };
    }

    const { data: refreshData, error: refreshError } =
      await supabase.auth.refreshSession({ refresh_token: storedRefreshToken });

    if (refreshError || !refreshData.session) {
      clearRememberedSession();
      return { valid: false };
    }

    const newSession = refreshData.session;
    localStorage.setItem(REFRESH_KEY, newSession.refresh_token);

    supabase
      .from('device_sessions')
      .update({ last_login_at: new Date().toISOString() })
      .eq('session_token', storedToken)
      .then(() => {}, () => {});

    return { valid: true, userId: storedUserId, email: storedEmail, session: newSession };
  } catch (error) {
    console.error('Erro ao validar sessão lembrada:', error);
    return { valid: false };
  }
}

export async function listUserSessions(userId: string): Promise<DeviceSession[]> {
  try {
    const { data, error } = await supabase
      .from('device_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('last_login_at', { ascending: false });

    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
}

export async function revokeDeviceSession(sessionId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('device_sessions')
      .update({ is_active: false })
      .eq('id', sessionId);
    return !error;
  } catch {
    return false;
  }
}

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
    return !error;
  } catch {
    return false;
  }
}

export function clearRememberedSession(): void {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(`${STORAGE_KEY}_email`);
  localStorage.removeItem(`${STORAGE_KEY}_expires`);
  localStorage.removeItem(`${STORAGE_KEY}_ip`);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USERID_KEY);
}
