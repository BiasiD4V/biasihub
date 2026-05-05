import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

/**
 * Paletas disponíveis para o app.
 * O `accent` substitui o amarelo Biasi (#FFC82D) como cor de destaque.
 * O `bgFrom`/`bgTo` ajustam os gradientes do shell em torno dessa cor.
 */
export type PaletaId = 'azul' | 'verde' | 'bege' | 'vinho';

export interface Paleta {
  id: PaletaId;
  nome: string;
  descricao: string;
  /** Amostras exibidas no card (mínimo 4 cores) */
  amostras: string[];
  /** Cor de destaque principal (substitui o amarelo) */
  accent: string;
  /** Variante mais escura do accent (hover, ativos) */
  accentDark: string;
  /** Cor de fundo principal do shell */
  bgFrom: string;
  bgTo: string;
}

export const PALETAS: Paleta[] = [
  {
    id: 'azul',
    nome: 'Biasi (Padrão)',
    descricao: 'Azul profundo + amarelo de destaque',
    amostras: ['#060f2a', '#233772', '#2E63D5', '#FFC82D'],
    accent: '#FFC82D',
    accentDark: '#E0AE00',
    bgFrom: '#060f2a',
    bgTo: '#0d1f4a',
  },
  {
    id: 'verde',
    nome: 'Verde Floresta',
    descricao: 'Tons sóbrios e naturais',
    amostras: ['#0F1F1A', '#1F3D33', '#3F7A5A', '#A6D49F'],
    accent: '#A6D49F',
    accentDark: '#6FA968',
    bgFrom: '#0F1F1A',
    bgTo: '#1F3D33',
  },
  {
    id: 'bege',
    nome: 'Bege Premium',
    descricao: 'Suave, claro e profissional',
    amostras: ['#7D5A5A', '#F1D1D1', '#F3E1E1', '#FAF2F2'],
    accent: '#C29B7B',
    accentDark: '#9C7558',
    bgFrom: '#1A1414',
    bgTo: '#2A2020',
  },
  {
    id: 'vinho',
    nome: 'Vinho Intenso',
    descricao: 'Bordô + coral, energia premium',
    amostras: ['#2D132C', '#801336', '#C72C41', '#EE4540'],
    accent: '#EE4540',
    accentDark: '#C72C41',
    bgFrom: '#2D132C',
    bgTo: '#1A0E1A',
  },
];

interface ThemeState {
  paleta: PaletaId;
  minimalista: boolean;
}

interface ThemeContextValue extends ThemeState {
  paletaAtual: Paleta;
  setPaleta: (id: PaletaId) => void;
  setMinimalista: (v: boolean) => void;
  resetar: () => void;
}

const STORAGE_KEY = 'biasihub-almox-aparencia';
const DEFAULT_STATE: ThemeState = { paleta: 'azul', minimalista: false };

function carregar(): ThemeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw);
    const paleta = PALETAS.find(p => p.id === parsed.paleta) ? parsed.paleta : 'azul';
    return { paleta, minimalista: !!parsed.minimalista };
  } catch {
    return DEFAULT_STATE;
  }
}

function aplicarNoDOM(paleta: Paleta, minimalista: boolean) {
  const root = document.documentElement;
  root.style.setProperty('--biasi-accent', paleta.accent);
  root.style.setProperty('--biasi-accent-dark', paleta.accentDark);
  root.style.setProperty('--biasi-bg-900', paleta.bgFrom);
  root.style.setProperty('--biasi-bg-800', paleta.bgTo);
  root.dataset.paleta = paleta.id;
  root.classList.toggle('biasi-minimal', minimalista);
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<ThemeState>(() => carregar());

  const paletaAtual = useMemo(
    () => PALETAS.find(p => p.id === estado.paleta) ?? PALETAS[0],
    [estado.paleta]
  );

  // Aplica e salva sempre que muda
  useEffect(() => {
    aplicarNoDOM(paletaAtual, estado.minimalista);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
    } catch {
      /* ignore */
    }
  }, [paletaAtual, estado]);

  const value: ThemeContextValue = {
    ...estado,
    paletaAtual,
    setPaleta: (id) => setEstado(s => ({ ...s, paleta: id })),
    setMinimalista: (v) => setEstado(s => ({ ...s, minimalista: v })),
    resetar: () => setEstado(DEFAULT_STATE),
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme precisa estar dentro de <ThemeProvider>');
  return ctx;
}
