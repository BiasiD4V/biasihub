import { Briefcase, Package, HardHat, BarChart3, FileText, Truck } from 'lucide-react';
import { ModuleCard } from '../components/ModuleCard';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../infrastructure/supabase/client';
import { useEffect } from 'react';

interface ModuleDef {
  titulo: string;
  descricao: string;
  icone: typeof Briefcase;
  href?: string;
  cor: string;
  corBg: string;
  disponivel: boolean;
  badge?: string;
  departamento?: string; // departamento que tem acesso
}

// Detecta se está rodando dentro do Electron
const IS_ELECTRON = navigator.userAgent.includes('Electron');

const URLS = {
  comercial:    IS_ELECTRON ? 'app://comercial.local'    : 'https://biasihub-comercial.vercel.app',
  almoxarifado: IS_ELECTRON ? 'app://almoxarifado.local' : 'https://biasihub-almoxarifado-weld.vercel.app',
  obras:        IS_ELECTRON ? 'app://obras.local'        : 'https://erp-gestaodeobras.vercel.app',
};

const MODULES: ModuleDef[] = [
  {
    titulo: 'Comercial',
    descricao: 'Gestão de orçamentos, propostas, kanban comercial e dashboard de BI.',
    icone: Briefcase,
    href: URLS.comercial,
    cor: 'text-blue-600',
    corBg: 'bg-blue-100',
    disponivel: true,
    badge: 'Ativo',
    departamento: 'comercial',
  },
  {
    titulo: 'Almoxarifado',
    descricao: 'Controle de estoque, movimentações, requisições de materiais e frota.',
    icone: Package,
    href: URLS.almoxarifado,
    cor: 'text-blue-600',
    corBg: 'bg-blue-100',
    disponivel: true,
    badge: 'Ativo',
    // Sem restrição de departamento: todos podem solicitar materiais
  },
  {
    titulo: 'Obras',
    descricao: 'Acompanhamento de obras, RDOs, cronograma e medições.',
    icone: HardHat,
    href: URLS.obras,
    cor: 'text-emerald-600',
    corBg: 'bg-emerald-100',
    disponivel: true,
    badge: 'Novo',
    departamento: 'obras',
  },
  {
    titulo: 'Financeiro',
    descricao: 'Fluxo de caixa, controle de custos e relatórios financeiros.',
    icone: BarChart3,
    cor: 'text-purple-600',
    corBg: 'bg-purple-100',
    disponivel: false,
  },
  {
    titulo: 'Contratos',
    descricao: 'Gestão de contratos, aditivos e documentação legal.',
    icone: FileText,
    cor: 'text-rose-600',
    corBg: 'bg-rose-100',
    disponivel: false,
  },
  {
    titulo: 'Logística',
    descricao: 'Rastreamento de entregas, fornecedores e cadeia de suprimentos.',
    icone: Truck,
    cor: 'text-cyan-600',
    corBg: 'bg-cyan-100',
    disponivel: false,
  },
];

const HUB_OPEN_GUARD_KEY = 'hub-open-module-guard-v1';
const HUB_OPEN_GUARD_WINDOW_MS = 30000;

export function HubPortal() {
  const { usuario } = useAuth();

  // Normaliza papel e departamento
  const papel = (usuario?.papel ?? '').toString().trim().toLowerCase();
  const depto = (usuario?.departamento ?? '').toString().trim().toLowerCase();
  const isAdmin = papel === 'admin' || papel === 'dono';

  function temAcesso(mod: ModuleDef): boolean {
    if (!mod.disponivel) return false;
    // Módulos sem departamento restrito são acessíveis a todos
    if (!mod.departamento) return true;
    if (isAdmin) return true;
    return depto === mod.departamento.toLowerCase();
  }

  async function abrirModulo(href: string) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const hash = [
        `access_token=${session.access_token}`,
        `refresh_token=${session.refresh_token}`,
        `token_type=bearer`,
        `expires_in=${session.expires_in ?? 3600}`,
      ].join('&');
      window.location.href = `${href}#${hash}`;
    } else {
      window.location.href = href;
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const open = params.get('open');
    if (!open) return;

    const destino = open.trim().toLowerCase();
    const alvo = MODULES.find((m) => m.titulo.toLowerCase() === destino && m.href);
    if (!alvo) return;
    if (!temAcesso(alvo)) return;

    // Anti-loop: if we already auto-opened very recently, stop redirect chaining.
    try {
      const raw = sessionStorage.getItem(HUB_OPEN_GUARD_KEY);
      const now = Date.now();
      if (raw) {
        const parsed = JSON.parse(raw) as { destino: string; at: number };
        if (parsed.destino === destino && now - parsed.at < HUB_OPEN_GUARD_WINDOW_MS) {
          window.history.replaceState({}, '', window.location.pathname);
          return;
        }
      }
      sessionStorage.setItem(HUB_OPEN_GUARD_KEY, JSON.stringify({ destino, at: now }));
    } catch {
      // ignore storage errors
    }

    abrirModulo(alvo.href!);
  }, [usuario?.id]);

  const saudacao = () => {
    const hora = new Date().getHours();
    if (hora < 12) return 'Bom dia';
    if (hora < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const ativos = MODULES.filter(m => m.disponivel && temAcesso(m));
  const emBreve = MODULES.filter(m => !m.disponivel || (m.disponivel && !temAcesso(m)));

  return (
    <div className="min-h-full p-6 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">
          {saudacao()}, {usuario?.nome?.split(' ')[0]}
        </h1>
        <p className="text-sm text-slate-500 mt-1">Selecione um módulo para acessar</p>
      </div>

      {/* Módulos ativos */}
      <div className="mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Módulos Ativos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ativos.map(m => {
            const acesso = temAcesso(m);
            return (
              <ModuleCard
                key={m.titulo}
                titulo={m.titulo}
                descricao={m.descricao}
                icone={m.icone}
                cor={m.cor}
                corBg={m.corBg}
                disponivel={m.disponivel}
                bloqueado={!acesso}
                badge={m.badge}
                onClick={acesso && m.href ? () => abrirModulo(m.href!) : undefined}
              />
            );
          })}
        </div>
      </div>

      {/* Em breve */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Em Desenvolvimento</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {emBreve.map(m => (
            <ModuleCard
              key={m.titulo}
              titulo={m.titulo}
              descricao={m.descricao}
              icone={m.icone}
              cor={m.cor}
              corBg={m.corBg}
              disponivel={false}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-slate-200">
        <p className="text-xs text-slate-400 text-center">
          BiasíHub — Plataforma Corporativa Biasi Engenharia
        </p>
      </div>
    </div>
  );
}
