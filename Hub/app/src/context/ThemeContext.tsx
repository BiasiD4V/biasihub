import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';

/**
 * Paletas disponíveis para o Hub.
 * O `accent` substitui o amarelo Biasi (#FFC82D) como cor de destaque.
 * O `bgFrom`/`bgTo` ajustam os gradientes do shell.
 */
export type PaletaId = 'azul' | 'verde' | 'bege' | 'vinho' | 'mono';

export interface Paleta {
  id: PaletaId;
  nome: string;
  descricao: string;
  amostras: string[];
  accent: string;
  accentDark: string;
  bgFrom: string;
  bgTo: string;
}

export const PALETAS: Paleta[] = [
  {
    id: 'azul',
    nome: 'Biasi (Padrão)',
    descricao: 'Azul Coolors com destaque marinho',
    amostras: ['#13293D', '#006494', '#247BA0', '#1B98E0', '#E8F1F2'],
    accent: '#1B98E0',
    accentDark: '#006494',
    bgFrom: '#13293D',
    bgTo: '#0A1A2A',
  },
  {
    id: 'verde',
    nome: 'Verde Oliva',
    descricao: 'Tons orgânicos e equilibrados',
    amostras: ['#1F3D2A', '#3D5C2A', '#7A9D3D', '#B8C76A', '#E8E9A8'],
    accent: '#B8C76A',
    accentDark: '#7A9D3D',
    bgFrom: '#1F3D2A',
    bgTo: '#0F2218',
  },
  {
    id: 'bege',
    nome: 'Rosa Suave',
    descricao: 'Suave, claro e premium',
    amostras: ['#7D5A5A', '#F1D1D1', '#F3E1E1', '#FAF2F2'],
    accent: '#C29B7B',
    accentDark: '#7D5A5A',
    bgFrom: '#2A1F1F',
    bgTo: '#1A1212',
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
  {
    id: 'mono',
    nome: 'Preto & Branco',
    descricao: 'Monocromático, sóbrio e atemporal',
    amostras: ['#0A0A0A', '#3A3A3A', '#8A8A8A', '#D4D4D4', '#FFFFFF'],
    accent: '#FFFFFF',
    accentDark: '#A3A3A3',
    bgFrom: '#0A0A0A',
    bgTo: '#1F1F1F',
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

const STORAGE_KEY = 'biasihub-hub-aparencia';
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
