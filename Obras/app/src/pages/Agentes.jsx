import { ExternalLink } from 'lucide-react';

const IS_ELECTRON = navigator.userAgent.includes('Electron');
const HUB_AGENTES_URL = IS_ELECTRON
  ? (import.meta.env.DEV ? 'http://localhost:5176/#/agentes' : 'app://hub.local/#/agentes')
  : 'https://biasihub-hub.vercel.app/#/agentes';

export default function Agentes() {
  return (
    <div className="p-4 lg:p-6 h-full min-h-[calc(100vh-88px)] space-y-4">
      <div className="rounded-2xl border border-[#3D5EA8]/60 bg-[#12285A]/65 p-4">
        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#FFD76E]">Central de agentes</p>
        <p className="mt-2 text-sm font-semibold text-[#DCE8FF]">
          Tela dedicada para grupos, agentes e fila de validações.
        </p>
        <button
          type="button"
          onClick={() => {
            window.open(HUB_AGENTES_URL, '_blank');
          }}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-[#5C73A8]/60 bg-white/5 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#DCE8FF] transition hover:border-[#FFD76E] hover:text-[#FFD76E]"
        >
          <ExternalLink size={14} />
          Abrir em nova aba
        </button>
      </div>

      <div className="h-[calc(100vh-260px)] min-h-[460px] overflow-hidden rounded-2xl border border-[#3D5EA8]/60 bg-[#08142F]/70">
        <iframe
          src={HUB_AGENTES_URL}
          title="Central de Agentes"
          className="h-full w-full border-0"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
}

