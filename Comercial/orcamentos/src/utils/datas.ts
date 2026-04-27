export function parseDataFlexivel(dataValor: string | null | undefined): Date | null {
  if (!dataValor) return null;
  const valor = dataValor.trim();
  if (!valor) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    const dt = new Date(`${valor}T12:00:00`);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(valor)) {
    const [dia, mes, ano] = valor.split('/');
    const dt = new Date(`${ano}-${mes}-${dia}T12:00:00`);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }

  // Supabase/PostgreSQL timestamptz pode vir com espaço em vez de 'T'
  // ex: "2025-04-06 14:30:45.123456+00:00" → normaliza para ISO 8601
  const normalizado = valor.replace(/^(\d{4}-\d{2}-\d{2}) /, '$1T');
  const dt = new Date(normalizado);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function formatarData(dataValor: string | null | undefined): string {
  const dt = parseDataFlexivel(dataValor);
  return dt ? dt.toLocaleDateString('pt-BR') : '—';
}

export function formatarDataHora(dataValor: string | null | undefined): string {
  const dt = parseDataFlexivel(dataValor);
  if (!dt) return '—';
  return dt.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
