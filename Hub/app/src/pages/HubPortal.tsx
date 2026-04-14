import { Briefcase, Package, HardHat, BarChart3, FileText, Truck, ChevronLeft, ChevronRight } from 'lucide-react';
import { ModuleCard } from '../components/ModuleCard';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../infrastructure/supabase/client';
import { acessoRepository } from '../infrastructure/supabase/acessoRepository';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModuleDef {
  titulo: string;
  descricao: string;
  icone: any;
  href?: string;
  cor: string;
  corBg: string;
  disponivel: boolean;
  badge?: string;
  papel?: string;
}

const IS_ELECTRON = navigator.userAgent.includes('Electron');
const IS_DEV = import.meta.env.DEV;

const URLS = {
  comercial: IS_ELECTRON
    ? (IS_DEV ? 'http://localhost:5174' : 'app://comercial.local')
    : 'https://biasihub-comercial.vercel.app',
  almoxarifado: IS_ELECTRON
    ? (IS_DEV ? 'http://localhost:5173' : 'app://almoxarifado.local')
    : 'https://biasihub-almoxarifado-weld.vercel.app',
  obras: IS_ELECTRON
    ? (IS_DEV ? 'http://localhost:5175' : 'app://obras.local')
    : 'https://erp-gestaodeobras.vercel.app',
};

const MODULES: ModuleDef[] = [
  {
    titulo: 'Comercial',
    descricao: 'Gestao de orcamentos, propostas, kanban comercial e dashboard de BI.',
    icone: Briefcase,
    href: URLS.comercial,
    cor: 'text-sky-600',
    corBg: 'bg-sky-50',
    disponivel: true,
    badge: 'Ativo',
    papel: 'comercial',
  },
  {
    titulo: 'Almoxarifado',
    descricao: 'Controle de estoque, movimentacoes, requisicoes de materiais e frota.',
    icone: Package,
    href: URLS.almoxarifado,
    cor: 'text-indigo-600',
    corBg: 'bg-indigo-50',
    disponivel: true,
    badge: 'Ativo',
    papel: 'almoxarifado',
  },
  {
    titulo: 'Obras',
    descricao: 'Acompanhamento de obras, RDOs, cronograma e medicoes.',
    icone: HardHat,
    href: URLS.obras,
    cor: 'text-emerald-600',
    corBg: 'bg-emerald-50',
    disponivel: true,
    badge: 'Beta',
  },
  {
    titulo: 'Financeiro',
    descricao: 'Fluxo de caixa, controle de custos e relatorios financeiros.',
    icone: BarChart3,
    cor: 'text-purple-600',
    corBg: 'bg-purple-50',
    disponivel: false,
  },
  {
    titulo: 'Contratos',
    descricao: 'Gestao de contratos, aditivos e documentacao legal.',
    icone: FileText,
    cor: 'text-rose-600',
    corBg: 'bg-rose-50',
    disponivel: false,
  },
  {
    titulo: 'Logistica',
    descricao: 'Rastreamento de entregas, fornecedores e cadeia de suprimentos.',
    icone: Truck,
    cor: 'text-amber-600',
    corBg: 'bg-amber-50',
    disponivel: false,
  },
];

const KEY_MAP: Record<string, string> = {
  comercial: 'Comercial',
  almoxarifado: 'Almoxarifado',
  obras: 'Obras',
  financeiro: 'Financeiro',
  contratos: 'Contratos',
  logistica: 'Logistica',
};

interface ModuloAcessoDB {
  modulo_key: string;
  papeis: string[];
  disponivel: boolean;
}

export function HubPortal() {
  const { usuario } = useAuth();
  const [modulosDB, setModulosDB] = useState<ModuloAcessoDB[]>([]);
  const ativosCarouselRef = useRef<HTMLDivElement | null>(null);
  const emBreveCarouselRef = useRef<HTMLDivElement | null>(null);

  const papel = (usuario?.papel ?? '').toString().trim().toLowerCase();
  const isAdmin = papel === 'admin' || papel === 'dono';

  useEffect(() => {
    let ativo = true;

    async function carregarModulos() {
      const data = await acessoRepository.listarModulos();
      if (ativo) setModulosDB(data);
    }

    carregarModulos();

    const channel = supabase
      .channel('hub-modulo-acesso-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'modulo_acesso' }, carregarModulos)
      .subscribe();

    return () => {
      ativo = false;
      supabase.removeChannel(channel);
    };
  }, []);

  function temAcesso(mod: ModuleDef): boolean {
    if (isAdmin) return true;
    const key = Object.entries(KEY_MAP).find(([, label]) => label === mod.titulo)?.[0];
    const config = modulosDB.find((m) => m.modulo_key === key);
    if (!config) {
      if (!mod.disponivel) return false;
      if (!mod.papel) return true;
      if (papel === 'gestor') return true;
      return papel === mod.papel.toLowerCase();
    }
    if (!config.disponivel) return false;
    const papeis = (config.papeis ?? []).map((p) => p.toLowerCase());
    return papeis.includes(papel);
  }

  function estaDisponivel(mod: ModuleDef): boolean {
    if (isAdmin && mod.href) return true;
    const key = Object.entries(KEY_MAP).find(([, label]) => label === mod.titulo)?.[0];
    const config = modulosDB.find((m) => m.modulo_key === key);
    if (!config) return mod.disponivel;
    return config.disponivel;
  }

  async function abrirModulo(href: string, modulo?: ModuleDef) {
    if (modulo && !temAcesso(modulo)) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      const hash = [
        `access_token=${session.access_token}`,
        `refresh_token=${session.refresh_token}`,
        'token_type=bearer',
        `expires_in=${session.expires_in ?? 3600}`,
      ].join('&');
      window.location.href = `${href}#${hash}`;
      return;
    }

    window.location.href = href;
  }

  const saudacao = () => {
    const hora = new Date().getHours();
    if (hora < 12) return 'Bom dia';
    if (hora < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const ativos = MODULES.filter((m) => estaDisponivel(m) && temAcesso(m));
  const emBreve = MODULES.filter((m) => !estaDisponivel(m) || (estaDisponivel(m) && !temAcesso(m)));

  function scrollCarousel(ref: { current: HTMLDivElement | null }, direction: 'left' | 'right') {
    const el = ref.current;
    if (!el) return;
    const amount = Math.max(320, Math.floor(el.clientWidth * 0.72));
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 relative z-10 font-black">
      <main className="flex-1 max-w-7xl mx-auto w-full px-8 py-14 lg:py-20 space-y-20">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} className="relative">
          <div className="flex items-center gap-4 text-[#FFC82D] mb-6">
            <div className="w-10 h-0.5 bg-[#FFC82D] shadow-[0_0_12px_rgba(255,200,45,0.6)]" />
            <span className="text-[10px] uppercase tracking-[0.5em] text-[#FFD76E]">Nivel de acesso: {usuario?.papel?.toUpperCase()}</span>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
            <div className="space-y-4">
              <h1 className="text-5xl lg:text-7xl font-black text-white tracking-tighter leading-none">
                {saudacao()}, <br />
                <span className="bg-gradient-to-r from-[#FFC82D] via-[#6FA8FF] to-[#57E6A8] bg-clip-text text-transparent">
                  {usuario?.nome?.split(' ')[0]}
                </span>
              </h1>
              <p className="text-[#DEE7FF] text-lg font-semibold tracking-wide max-w-2xl leading-relaxed">
                Central de comando integrada para abrir modulos e acompanhar o ecossistema BiasiHub em tempo real.
              </p>
            </div>

            <div className="flex gap-4">
              <div className="bg-[#233772]/90 border-2 border-[#3D5EA8] p-5 rounded-[24px] flex flex-col gap-2 min-w-[160px]">
                <span className="text-[9px] text-[#FFD76E] uppercase tracking-widest">Modulos ativos</span>
                <span className="text-xl text-white font-black">{ativos.length}</span>
              </div>
              <div className="bg-[#233772]/90 border-2 border-[#3D5EA8] p-5 rounded-[24px] flex flex-col gap-2 min-w-[160px]">
                <span className="text-[9px] text-[#FFD76E] uppercase tracking-widest">Uptime</span>
                <span className="text-xl text-[#57E6A8] font-black">99.9%</span>
              </div>
            </div>
          </div>
        </motion.div>

        <section className="relative">
          <div className="flex items-center gap-6 mb-10">
            <h2 className="text-xs font-black uppercase tracking-[0.35em] text-[#E5ECFF]">Modulos de producao operacional</h2>
            <div className="flex-1 h-[2px] bg-gradient-to-r from-[#FFC82D]/50 to-transparent" />
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => scrollCarousel(ativosCarouselRef, 'left')}
                className="w-10 h-10 rounded-2xl border border-[#3D5EA8] bg-[#132249] text-[#DCE8FF] hover:border-[#FFC82D] hover:text-[#FFC82D] transition-all"
                aria-label="Voltar modulos ativos"
              >
                <ChevronLeft size={18} className="mx-auto" />
              </button>
              <button
                onClick={() => scrollCarousel(ativosCarouselRef, 'right')}
                className="w-10 h-10 rounded-2xl border border-[#3D5EA8] bg-[#132249] text-[#DCE8FF] hover:border-[#FFC82D] hover:text-[#FFC82D] transition-all"
                aria-label="Avancar modulos ativos"
              >
                <ChevronRight size={18} className="mx-auto" />
              </button>
            </div>
          </div>

          <div className="pb-2 relative">
            <motion.div
              ref={ativosCarouselRef}
              className="flex gap-8 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 pr-2"
            >
              <AnimatePresence mode="popLayout">
                {ativos.map((m, idx) => (
                  <motion.div
                    key={m.titulo}
                    initial={{ opacity: 0, scale: 0.9, x: 40 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    transition={{ delay: idx * 0.08, duration: 0.6 }}
                    className="min-w-[320px] md:min-w-[360px] xl:min-w-[390px] max-w-[420px] flex-1 snap-start"
                  >
                    <ModuleCard {...m} onClick={m.href ? () => abrirModulo(m.href!, m) : undefined} bloqueado={!temAcesso(m)} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          </div>

          {ativos.length === 0 && (
            <div className="mt-6 rounded-2xl border border-[#3D5EA8] bg-[#233772]/60 p-6">
              <p className="text-[#E5ECFF] text-sm font-semibold">
                Nenhum modulo ativo para este perfil no momento.
              </p>
            </div>
          )}
        </section>

        <section className="pb-20">
          <div className="flex items-center gap-6 mb-10">
            <h2 className="text-xs font-black uppercase tracking-[0.35em] text-[#E5ECFF]">Modulos em desenvolvimento</h2>
            <div className="flex-1 h-[2px] bg-gradient-to-r from-[#3D5EA8] to-transparent" />
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => scrollCarousel(emBreveCarouselRef, 'left')}
                className="w-10 h-10 rounded-2xl border border-[#3D5EA8] bg-[#132249] text-[#DCE8FF] hover:border-[#FFC82D] hover:text-[#FFC82D] transition-all"
                aria-label="Voltar modulos em desenvolvimento"
              >
                <ChevronLeft size={18} className="mx-auto" />
              </button>
              <button
                onClick={() => scrollCarousel(emBreveCarouselRef, 'right')}
                className="w-10 h-10 rounded-2xl border border-[#3D5EA8] bg-[#132249] text-[#DCE8FF] hover:border-[#FFC82D] hover:text-[#FFC82D] transition-all"
                aria-label="Avancar modulos em desenvolvimento"
              >
                <ChevronRight size={18} className="mx-auto" />
              </button>
            </div>
          </div>

          <div
            ref={emBreveCarouselRef}
            className="flex gap-8 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 pr-2"
          >
            {emBreve.map((m, idx) => (
              <motion.div
                key={m.titulo}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + idx * 0.08 }}
                className="min-w-[320px] md:min-w-[360px] xl:min-w-[390px] max-w-[420px] flex-1 snap-start"
              >
                <ModuleCard {...m} disponivel={false} />
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      <footer className="py-10 px-8 border-t border-[#3D5EA8]/40 bg-[#0F1A3B]/70 mt-auto relative z-20 overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col gap-2 items-center md:items-start">
            <p className="text-[10px] font-black text-white tracking-[0.35em] uppercase">© 2026 Biasi Engenharia • Nucleo de Inteligencia</p>
            <p className="text-[9px] font-semibold text-[#FFD76E] uppercase tracking-[0.2em]">Rede corporativa protegida</p>
          </div>
          <div className="flex items-center gap-8">
            {['Diretrizes', 'Suporte', 'Privacidade'].map((link) => (
              <a key={link} href="#" className="text-[10px] font-black text-[#E5ECFF] hover:text-[#FFC82D] transition-all uppercase tracking-widest">
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}


