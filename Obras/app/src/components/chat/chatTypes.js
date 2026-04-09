export const AVATAR_COLORS = [
  'from-blue-500 to-blue-600',
  'from-emerald-500 to-emerald-600',
  'from-violet-500 to-violet-600',
  'from-amber-500 to-amber-600',
  'from-rose-500 to-rose-600',
  'from-cyan-500 to-cyan-600',
  'from-fuchsia-500 to-fuchsia-600',
  'from-orange-500 to-orange-600',
];

export function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function formatDateSeparator(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Hoje';
  if (date.toDateString() === yesterday.toDateString()) return 'Ontem';
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function shouldShowDateSeparator(msgs, idx) {
  if (idx === 0) return true;
  const curr = new Date(msgs[idx].criado_em).toDateString();
  const prev = new Date(msgs[idx - 1].criado_em).toDateString();
  return curr !== prev;
}

export function isConsecutive(msgs, idx) {
  if (idx === 0) return false;
  const prev = msgs[idx - 1];
  const curr = msgs[idx];
  if (prev.remetente_id !== curr.remetente_id) return false;
  const diff = new Date(curr.criado_em).getTime() - new Date(prev.criado_em).getTime();
  return diff < 120000;
}

export function formatTempoOnline(conectadoDesde) {
  if (!conectadoDesde) return 'Online';
  const diff = Date.now() - new Date(conectadoDesde).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Online agora';
  if (min < 60) return `Online há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Online há ${h}h${min % 60 > 0 ? `${min % 60}min` : ''}`;
  return `Online há ${Math.floor(h / 24)}d`;
}

export function formatUltimoVisto(ultimoVisto) {
  if (!ultimoVisto) return 'Offline';
  const diff = Date.now() - new Date(ultimoVisto).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'Visto agora';
  if (min < 60) return `Visto há ${min}min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `Visto há ${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Visto ontem';
  return `Visto há ${d}d`;
}
