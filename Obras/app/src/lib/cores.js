// ============================================================================
// lib/cores.js
// Mapeamentos centralizados de cores para semáforos, badges e status
// Evita duplicação em múltiplos arquivos
// ============================================================================

/**
 * Cores RGB de semáforos (para gráficos)
 */
export const CORES_RGB = {
  verde: '#16a34a',
  amarelo: '#ca8a04',
  vermelho: '#dc2626',
}

/**
 * Classes Tailwind para semáforos (badges com fundo e texto colorido)
 */
export const CORES_TAILWIND_SEMAFORO = {
  verde: 'bg-green-100 text-green-700 border border-green-200',
  amarelo: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
  vermelho: 'bg-red-100 text-red-700 border border-red-200',
}

/**
 * Classes Tailwind para ícones/pontos de semáforo (background)
 */
export const CORES_BG_SEMAFORO = {
  verde: 'bg-green-500',
  amarelo: 'bg-yellow-500',
  vermelho: 'bg-red-500',
}

/**
 * Classes Tailwind para ícones/pontos de semáforo (texto)
 */
export const CORES_TEXT_SEMAFORO = {
  verde: 'text-green-500',
  amarelo: 'text-yellow-500',
  vermelho: 'text-red-500',
}

/**
 * Classes Tailwind para badges genéricos (variantes)
 */
export const CORES_BADGES_VARIANTESS = {
  default: 'bg-slate-100 text-slate-700',
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  red: 'bg-red-100 text-red-700',
  purple: 'bg-purple-100 text-purple-700',
  orange: 'bg-orange-100 text-orange-700',
  cyan: 'bg-cyan-100 text-cyan-700',
}

/**
 * Classes Tailwind para status de atividade (crítico, liberado, etc)
 */
export const CORES_STATUS_ATIVIDADE = {
  'CRITICO': 'bg-red-100 text-red-800 border border-red-300',
  'IMPEDIMENTO_CIVIL': 'bg-orange-100 text-orange-800 border border-orange-300',
  'PENDENCIA_INFRA': 'bg-yellow-100 text-yellow-800 border border-yellow-300',
  'LIBERADO': 'bg-blue-100 text-blue-700 border border-blue-200',
  'EM_ANDAMENTO': 'bg-cyan-100 text-cyan-700 border border-cyan-200',
  'CONCLUIDO': 'bg-green-100 text-green-700 border border-green-200',
}

/**
 * Classes Tailwind para status geral de obra (em_andamento, concluido, etc)
 */
export const CORES_STATUS_OBRA = {
  em_andamento: 'bg-blue-100 text-blue-700 border border-blue-200',
  concluido: 'bg-green-100 text-green-700 border border-green-200',
  paralisado: 'bg-red-100 text-red-700 border border-red-200',
  planejado: 'bg-slate-100 text-slate-700 border border-slate-200',
  cancelado: 'bg-gray-100 text-gray-500 border border-gray-200 line-through',
}

/**
 * Retorna cor RGB a partir de estado semáforo (verde/amarelo/vermelho)
 */
export function getCoreRGB(estado) {
  return CORES_RGB[estado] || CORES_RGB.verde
}

/**
 * Retorna classes Tailwind para semáforo
 */
export function getCoresTailwindSemaforo(estado) {
  return CORES_TAILWIND_SEMAFORO[estado] || CORES_TAILWIND_SEMAFORO.verde
}

/**
 * Retorna classes background para ponto de semáforo
 */
export function getCoresBGSemaforo(estado) {
  return CORES_BG_SEMAFORO[estado] || CORES_BG_SEMAFORO.verde
}

/**
 * Retorna classes text para ícone de semáforo
 */
export function getCoresTextSemaforo(estado) {
  return CORES_TEXT_SEMAFORO[estado] || CORES_TEXT_SEMAFORO.verde
}
