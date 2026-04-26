import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Captura falhas de carregamento de chunks (lazy() / dynamic import).
 *
 * Cenário típico: o usuário tem o app aberto há um tempo. Sai um deploy
 * novo (o hash dos arquivos muda). Quando ele navega pra uma rota com
 * `lazy()`, o navegador tenta importar `Movimentacoes-OLD.js` que agora
 * é 404 — o `import()` rejeita e o `Suspense` fica preso pra sempre.
 *
 * Esta boundary detecta esse caso (mensagem "Failed to fetch dynamically
 * imported module" / "Loading chunk N failed" / "Importing a module
 * script failed") e força um reload, que pega o `index.html` novo com
 * os hashes corretos. Para erros não relacionados a chunk, mostra uma
 * UI de fallback com botão de "Recarregar".
 */

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  isChunkError: boolean;
  message: string;
}

const CHUNK_ERROR_PATTERNS = [
  /Loading chunk \d+ failed/i,
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /ChunkLoadError/i,
  /Loading CSS chunk \d+ failed/i,
];

function isChunkLoadError(error: unknown): boolean {
  const msg = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  return CHUNK_ERROR_PATTERNS.some((re) => re.test(msg));
}

export class ChunkErrorBoundary extends Component<Props, State> {
  private autoReloadTimer: ReturnType<typeof setTimeout> | null = null;

  state: State = {
    hasError: false,
    isChunkError: false,
    message: '',
  };

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      isChunkError: isChunkLoadError(error),
      message: error instanceof Error ? error.message : String(error),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ChunkErrorBoundary] erro capturado:', error, info);

    if (isChunkLoadError(error)) {
      // Auto-reload após 2.5s para falhas de chunk (deploy novo); o usuário
      // mal vê a tela. Se ele clicar antes, reload imediato.
      this.autoReloadTimer = setTimeout(() => {
        window.location.reload();
      }, 2500);
    }
  }

  componentWillUnmount() {
    if (this.autoReloadTimer) clearTimeout(this.autoReloadTimer);
  }

  handleReload = () => {
    if (this.autoReloadTimer) clearTimeout(this.autoReloadTimer);
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.state.isChunkError) {
      return (
        <div className="min-h-screen w-full bg-slate-900 text-white flex items-center justify-center p-6">
          <div className="max-w-sm text-center space-y-4">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/15 border-t-[#FFC82D]" />
            <h2 className="text-lg font-extrabold">Atualizando o app...</h2>
            <p className="text-sm text-slate-300">
              Uma versão mais nova foi publicada. Vamos recarregar para você usar a versão atual.
            </p>
            <button
              onClick={this.handleReload}
              className="rounded-xl border border-[#FFC82D]/40 bg-[#FFC82D]/15 px-4 py-2 text-sm font-bold text-[#FFC82D] hover:bg-[#FFC82D] hover:text-slate-900 transition"
            >
              Recarregar agora
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen w-full bg-slate-900 text-white flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 border border-rose-400/40 text-2xl">
            ⚠️
          </div>
          <h2 className="text-lg font-extrabold">Algo deu errado</h2>
          <p className="text-sm text-slate-300 break-words">{this.state.message || 'Erro inesperado.'}</p>
          <div className="flex justify-center gap-2">
            <button
              onClick={this.handleReload}
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-bold hover:bg-white/10 transition"
            >
              Recarregar
            </button>
          </div>
        </div>
      </div>
    );
  }
}
