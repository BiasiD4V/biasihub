/**
 * Serviço para capturar e gerenciar IP do dispositivo
 */

export interface IPInfo {
  ip: string;
  country?: string;
  city?: string;
}

const IP_CACHE_KEY = 'user_device_ip';
const IP_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas

export async function getDeviceIP(): Promise<string> {
  // Verificar cache local primeiro
  const cached = localStorage.getItem(IP_CACHE_KEY);
  const cacheTime = localStorage.getItem(`${IP_CACHE_KEY}_time`);

  if (cached && cacheTime) {
    const cache_age = Date.now() - parseInt(cacheTime);
    if (cache_age < IP_CACHE_DURATION) {
      return cached;
    }
  }

  try {
    // Tentar múltiplos serviços de IP pública
    const ip = await fetchIPFromService();
    
    // Armazenar em cache
    localStorage.setItem(IP_CACHE_KEY, ip);
    localStorage.setItem(`${IP_CACHE_KEY}_time`, Date.now().toString());
    
    return ip;
  } catch (error) {
    console.error('Erro ao obter IP:', error);
    // Retornar hash do navegador como fallback
    return generateDeviceFingerprint();
  }
}

async function fetchIPFromService(): Promise<string> {
  const services = [
    'https://api.ipify.org?format=json', // Serviço simples
    'https://ipapi.co/json/', // Serviço com mais dados
  ];

  for (const service of services) {
    try {
      const response = await fetch(service, { 
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.ip || data.query;
      }
    } catch (error) {
      console.warn(`Erro ao conectar em ${service}:`, error);
      continue;
    }
  }

  throw new Error('Nenhum serviço de IP disponível');
}

/**
 * Gera um identificador único do dispositivo baseado em características locais
 * Usado como fallback se não conseguir capturar IP
 */
function generateDeviceFingerprint(): string {
  const fingerprint = `${navigator.userAgent}_${navigator.language}_${new Date().getTimezoneOffset()}`;
  return btoa(fingerprint).substring(0, 20);
}

export function getDeviceName(): string {
  const userAgent = navigator.userAgent;
  
  // Android deve vir ANTES de Linux (Android UA contém "Linux")
  if (userAgent.includes('Android')) {
    return 'Android';
  } else if (userAgent.includes('iPhone')) {
    return 'iPhone';
  } else if (userAgent.includes('iPad')) {
    return 'iPad';
  } else if (userAgent.includes('Windows')) {
    return 'Windows PC';
  } else if (userAgent.includes('Mac')) {
    return 'Mac';
  } else if (userAgent.includes('Linux')) {
    return 'Linux';
  }
  
  return 'Dispositivo desconhecido';
}

export function getUserAgent(): string {
  return navigator.userAgent;
}

export function generateSessionToken(): string {
  // Gera um token random para a sessão
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(x => x.toString(16).padStart(2, '0'))
    .join('')
    .substring(0, 64);
}
