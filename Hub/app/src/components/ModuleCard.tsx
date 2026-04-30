import { motion } from 'framer-motion';
import { Lock, ChevronRight } from 'lucide-react';

interface ModuleCardProps {
  titulo: string;
  descricao: string;
  icone: any;
  cor: string;
  corBg: string;
  disponivel: boolean;
  bloqueado?: boolean;
  badge?: string;
  onClick?: () => void;
}

export function ModuleCard({
  titulo,
  descricao,
  icone: Icon,
  disponivel,
  bloqueado,
  badge,
  onClick,
}: ModuleCardProps) {
  const isAvailable = disponivel && !bloqueado;

  return (
    <motion.div
      whileHover={isAvailable ? { y: -10, scale: 1.01 } : {}}
      whileTap={isAvailable ? { scale: 0.99 } : {}}
      onClick={isAvailable ? onClick : undefined}
      className={`relative group h-full flex flex-col p-10 rounded-[40px] transition-all duration-500 ${
        isAvailable
          ? 'cursor-pointer bg-[#233772]/95 border-2 border-[#3D5EA8] hover:border-[#FFC82D] hover:shadow-[0_30px_80px_rgba(0,0,0,0.35)]'
          : 'bg-[#1F2A44]/70 border-2 border-[#3D4A70] cursor-not-allowed opacity-80'
      }`}
    >
      <div className="absolute inset-0 opacity-[0.06] pointer-events-none rounded-[40px]" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #ffffff 1px, transparent 0)', backgroundSize: '22px 22px' }} />

      <div className="relative mb-8">
        <div
          className={`w-20 h-20 rounded-[24px] flex items-center justify-center transition-all duration-500 bg-[#132249] border-2 border-[#3D5EA8] shadow-2xl ${
            isAvailable ? 'group-hover:border-[#FFC82D] group-hover:shadow-[0_0_30px_rgba(255,200,45,0.3)]' : ''
          }`}
        >
          <Icon size={32} className={`${isAvailable ? 'text-[#FFC82D]' : 'text-[#AAB7DA]'}`} />
        </div>

        {badge && (
          <div className="absolute -top-3 -right-3 px-4 py-1.5 rounded-full bg-[#FFC82D] text-[10px] font-black text-[#233772] uppercase tracking-[0.2em] shadow-2xl border border-[#FFD76E] z-20">
            {badge}
          </div>
        )}
      </div>

      <div className="flex-1 relative z-10">
        <h3 className="text-[38px] sm:text-3xl font-black text-white mb-3 leading-tight tracking-tight uppercase">{titulo}</h3>
        <p className="text-[#E5ECFF] text-[14px] font-semibold leading-relaxed tracking-wide">
          {descricao}
        </p>
      </div>

      <div className="mt-10 flex items-center justify-between relative z-10">
        {!isAvailable ? (
          <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-[#132249] border border-[#3D4A70]">
            <Lock size={14} className="text-[#FFC82D]" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#E5ECFF]">Acesso restrito</span>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-[#FFC82D] font-black text-[11px] uppercase tracking-[0.2em] group-hover:translate-x-2 transition-all duration-300">
            {'Iniciar m\u00f3dulo'} <ChevronRight size={18} />
          </div>
        )}
      </div>

      {bloqueado && isAvailable && (
        <div className="absolute inset-0 bg-[#0D1633]/75 rounded-[40px] flex items-center justify-center z-30">
          <div className="bg-[#233772] px-8 py-4 rounded-[20px] shadow-2xl border-2 border-[#FFC82D] animate-in zoom-in-95 duration-500">
            <span className="text-[12px] font-black text-[#FFC82D] uppercase tracking-widest">Solicitar acesso</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
