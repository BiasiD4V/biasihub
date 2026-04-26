export interface IPInfo {
  ip: string;
  country?: string;
  city?: string;
}

const IP_CACHE_KEY = 'user_device_ip';
const IP_CACHE_DURATION = 24 * 60 * 60 * 1000;

export async function getDeviceIP(): Promise<string> {
  const cached = localStorage.getItem(IP_CACHE_KEY);
  const cacheTime = localStorage.getItem(`${IP_CACHE_KEY}_time`);

  if (cached && cacheTime) {
    const cache_age = Date.now() - parseInt(cacheTime);
    if (cache_age < IP_CACHE_DURATION) {
      return cached;
    }
  }

  try {
    const ip = await fetchIPFromService();
    localStorage.setItem(IP_CACHE_KEY, ip);
    localStorage.setItem(`${IP_CACHE_KEY}_time`, Date.now().toString());
    return ip;
  } catch (error) {
    console.error('Erro ao obter IP:', error);
    return generateDeviceFingerprint();
  }
}

async function fetchIPFromService(): Promise<string> {
  const services = [
    'https://api.ipify.org?format=json',
    'https://ipapi.co/json/',
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
    } catch {
      continue;
    }
  }

  throw new Error('Nenhum servico de IP disponivel');
}

function generateDeviceFingerprint(): string {
  const fingerprint = `${navigator.userAgent}_${navigator.language}_${new Date().getTimezoneOffset()}`;
  return btoa(fingerprint).substring(0, 20);
}

export function getDeviceName(): string {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iPhone')) return 'iPhone';
  if (userAgent.includes('iPad')) return 'iPad';
  if (userAgent.includes('Windows')) return 'Windows PC';
  if (userAgent.includes('Mac')) return 'Mac';
  if (userAgent.includes('Linux')) return 'Linux';
  return 'Dispositivo desconhecido';
}

export function getUserAgent(): string {
  return navigator.userAgent;
}

export function generateSessionToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(x => x.toString(16).padStart(2, '0'))
    .join('')
    .substring(0, 64);
}

