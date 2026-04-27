import { useState, useMemo, useCallback } from 'react';

export function usePagination(total: number, porPagina = 50) {
  const [pagina, setPagina] = useState(1);

  const totalPaginas = useMemo(
    () => Math.max(1, Math.ceil(total / porPagina)),
    [total, porPagina]
  );

  const irParaPagina = useCallback(
    (p: number) => setPagina(Math.max(1, Math.min(p, totalPaginas))),
    [totalPaginas]
  );

  const proximaPagina = useCallback(
    () => setPagina((p) => Math.min(p + 1, totalPaginas)),
    [totalPaginas]
  );

  const paginaAnterior = useCallback(
    () => setPagina((p) => Math.max(p - 1, 1)),
    []
  );

  const resetar = useCallback(() => setPagina(1), []);

  return { pagina, totalPaginas, irParaPagina, proximaPagina, paginaAnterior, resetar };
}
