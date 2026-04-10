import React, { useState, useEffect, useMemo } from 'react';
import { Navigation, ShieldCheck, Trophy, Target, Zap, Building2, Briefcase } from 'lucide-react';
import { ORDEM_FUNIL, ETAPA_LABELS, EtapaFunil } from '../../domain/value-objects/EtapaFunil';

/**
 * Personagem CSS Animado: "The Corporate Climber"
 */
function CorporateCharacter({ isMoving }: { isMoving: boolean }) {
  return (
    <div className={`relative w-12 h-16 flex flex-col items-center ${isMoving ? 'animate-walking' : 'animate-breathing'}`}>
      {/* Head */}
      <div className="w-6 h-6 bg-[#fcd34d] rounded-full border-2 border-slate-900 z-10 shadow-sm" />
      
      {/* Body / Suit */}
      <div className="w-8 h-10 bg-slate-800 rounded-t-lg border-2 border-slate-900 -mt-1 relative overflow-hidden">
        {/* Shirt */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-4 bg-white clip-path-shirt" />
        {/* Tie */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-6 bg-red-600 animate-tie" />
      </div>
      
      {/* Legs */}
      <div className="flex gap-2 -mt-1">
        <div className={`w-2 h-4 bg-slate-900 rounded-full ${isMoving ? 'animate-leg-left' : ''}`} />
        <div className={`w-2 h-4 bg-slate-900 rounded-full ${isMoving ? 'animate-leg-right' : ''}`} />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .clip-path-shirt {
          clip-path: polygon(0 0, 100% 0, 50% 100%);
        }
        @keyframes walking {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50% { transform: translateY(-3px) rotate(2deg); }
        }
        @keyframes breathing {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }
        @keyframes leg-left {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes leg-right {
          0%, 100% { transform: translateY(-4px); }
          50% { transform: translateY(0); }
        }
        @keyframes tie {
          0%, 100% { transform: translateX(-50%) rotate(-2deg); }
          50% { transform: translateX(-50%) rotate(2deg); }
        }
      `}} />
    </div>
  );
}

/**
 * Ambiente Empresarial (Skyline SVG)
 */
function CorporateSkyline() {
  return (
    <div className="absolute inset-0 pointer-events-none opacity-20">
      <svg width="100%" height="100%" viewBox="0 0 800 400" preserveAspectRatio="none">
        <defs>
          <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
        </defs>
        <rect width="800" height="400" fill="url(#skyGrad)" />
        
        {/* Prédios ao fundo */}
        <rect x="50" y="200" width="60" height="200" fill="#0f172a" />
        <rect x="150" y="100" width="80" height="300" fill="#0f172a" />
        <rect x="280" y="150" width="70" height="250" fill="#0f172a" />
        <rect x="420" y="80" width="90" height="320" fill="#0f172a" />
        <rect x="580" y="180" width="60" height="220" fill="#0f172a" />
        <rect x="700" y="120" width="70" height="280" fill="#0f172a" />

        {/* Janelas iluminadas (animadas aleatoriamente) */}
        {[...Array(40)].map((_, i) => (
          <rect 
            key={i}
            x={55 + (Math.random() * 700)} 
            y={100 + (Math.random() * 250)} 
            width="4" 
            height="4" 
            fill={Math.random() > 0.5 ? "#fbbf24" : "#38bdf8"}
            className="animate-pulse"
            style={{ animationDelay: `${Math.random() * 5}s` }}
          />
        ))}
      </svg>
    </div>
  );
}

interface MapaJornadaComercialProps {
  etapaAtual: EtapaFunil;
  resultadoComercial?: string;
  performer?: string;
}

export function MapaJornadaComercial({ etapaAtual, resultadoComercial, performer }: MapaJornadaComercialProps) {
  const [isMoving, setIsMoving] = useState(false);
  const currentIndex = ORDEM_FUNIL.indexOf(etapaAtual);
  const isGanho = resultadoComercial === 'ganho';
  const effectiveIndex = isGanho ? ORDEM_FUNIL.length - 1 : currentIndex;

  // Detectar movimento para animar o personagem
  useEffect(() => {
    setIsMoving(true);
    const timer = setTimeout(() => setIsMoving(false), 2000);
    return () => clearTimeout(timer);
  }, [etapaAtual]);

  const nodes = useMemo(() => ORDEM_FUNIL.map((etapa, idx) => {
    const row = Math.floor(idx / 4);
    const isEvenRow = row % 2 === 0;
    const colIndex = idx % 4;
    const col = isEvenRow ? colIndex : (3 - colIndex);
    const y = 20 + (row * 35); // Aumentado de 30 para 35 para mais espaço vertical
    const x = 12.5 + (col * 25);
    return { etapa, idx, x, y, isPassed: idx < effectiveIndex };
  }), [effectiveIndex]);

  const activeNode = nodes[effectiveIndex] || nodes[0];

  return (
    <div className="w-full flex flex-col gap-6 p-4 font-sans antialiased">
      {/* HUD - CORPORATE EXECUTIVE DASHBOARD */}
      <div className="flex items-center justify-between px-8 py-5 bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl shadow-xl border border-slate-700/50">
        <div className="flex items-center gap-5">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
            <Target size={24} className="text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight leading-none">BIASÍ JOURNEY</h3>
            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-[0.2em] mt-1.5 flex items-center gap-1.5">
              <Zap size={10} className="fill-blue-400" /> Executive Progress Monitor
            </p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">Conclusão do Business Plan</span>
            <div className="w-48 h-2 bg-slate-950 rounded-full border border-slate-700 overflow-hidden shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 bg-[size:200%_auto] animate-[shimmer_2s_linear_infinite] transition-all duration-1000"
                style={{ width: `${(effectiveIndex / (ORDEM_FUNIL.length - 1)) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex flex-col items-center px-6 py-2 bg-slate-950/50 rounded-2xl border border-slate-800 shadow-inner">
             <span className="text-2xl font-black text-white">{effectiveIndex * 250}</span>
             <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter">Corporate XP</span>
          </div>
        </div>
      </div>

      {/* MUNDO EMPRESARIAL */}
      <div className="relative w-full h-[600px] rounded-[3.5rem] bg-[#0f172a] border-[10px] border-slate-900 overflow-hidden shadow-2xl ring-1 ring-slate-700/30 group">
        
        <CorporateSkyline />

        {/* Chão / Escritório */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(30,58,138,0.2)_0%,transparent_60%)]" />
          <div 
            className="absolute inset-0 opacity-[0.03]"
            style={{ 
              backgroundImage: `repeating-linear-gradient(0deg, #fff 0, #fff 1px, transparent 1px, transparent 40px), repeating-linear-gradient(90deg, #fff 0, #fff 1px, transparent 1px, transparent 40px)`
            }} 
          />
        </div>

        {/* PATH / ESTRADA CORPORATIVA */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-[5]">
          {nodes.map((node, i) => {
            if (i === nodes.length - 1) return null;
            const next = nodes[i + 1];
            const isLinePassed = node.idx < effectiveIndex;
            
            const midX = (node.x + next.x) / 2;
            const midY = (node.y + next.y) / 2;
            const isVerticalMove = Math.abs(node.x - next.x) < 5;
            const cpX = isVerticalMove ? midX + (i % 2 === 0 ? 4 : -4) : midX;
            const cpY = isVerticalMove ? midY : midY + (i % 2 === 0 ? 3 : -3);

            const pathData = `M ${node.x} ${node.y} Q ${cpX} ${cpY} ${next.x} ${next.y}`;

            return (
              <React.Fragment key={`path-${i}`}>
                <path 
                  d={pathData} 
                  fill="none" 
                  stroke="rgba(30, 41, 59, 0.5)" 
                  strokeWidth="16" 
                  strokeLinecap="round" 
                />
                <path 
                  d={pathData} 
                  fill="none" 
                  stroke={isLinePassed ? '#3b82f6' : '#1e293b'} 
                  strokeWidth="8" 
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-in-out"
                  style={{ filter: isLinePassed ? 'drop-shadow(0 0 12px rgba(59,130,246,0.6))' : 'none' }}
                />
                {/* Pontos de luz correndo no path */}
                {isLinePassed && (
                  <path 
                    d={pathData} 
                    fill="none" 
                    stroke="white" 
                    strokeWidth="2" 
                    strokeDasharray="2, 20" 
                    strokeLinecap="round" 
                    className="animate-flow-dash"
                  />
                )}
              </React.Fragment>
            );
          })}
        </svg>

        {/* O PERSONAGEM (LOGGED USER) */}
        <div 
          className="absolute -translate-x-1/2 -translate-y-1/2 z-[200] transition-all duration-[2000ms] ease-[cubic-bezier(0.34,1.56,0.64,1)] flex flex-col items-center"
          style={{ left: `${activeNode.x}%`, top: `${activeNode.y}%` }}
        >
          <div className="absolute -inset-8 bg-blue-500/10 rounded-full blur-2xl animate-pulse" />
          <CorporateCharacter isMoving={isMoving} />
          
          {/* Nome do Colaborador */}
          <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-700 text-white text-[9px] font-black px-3 py-1.5 rounded-xl shadow-2xl whitespace-nowrap">
            {performer || 'EXECUTIVO EM MISSÃO'} 💼
          </div>
        </div>

        {/* SEDE DO CLIENTE (FINAL GOAL) */}
        <div 
          className="absolute z-[50] flex flex-col items-center"
          style={{ left: `${nodes[nodes.length - 1].x}%`, top: `${nodes[nodes.length - 1].y}%` }}
        >
           <div className={`relative -translate-x-1/2 -translate-y-[60%] flex flex-col items-center transition-all duration-1000 ${isGanho ? 'scale-110' : 'opacity-80'}`}>
              {/* Prédio 3D Representational */}
              <div className="relative w-28 h-40 bg-slate-900 rounded-t-xl border-t-4 border-x-4 border-slate-700 flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
                {/* Antena / Topo */}
                <div className="absolute top-0 right-4 w-1 h-8 bg-slate-700 -translate-y-full flex flex-col items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_red]" />
                </div>

                {/* Letreiro Luminoso */}
                <div className={`w-full py-2 flex items-center justify-center border-b border-slate-800 ${isGanho ? 'bg-blue-600/20' : 'bg-slate-800/40'}`}>
                  <div className={`w-16 h-1 rounded-full ${isGanho ? 'bg-blue-400 animate-pulse shadow-[0_0_10px_#3b82f6]' : 'bg-slate-700'}`} />
                </div>

                {/* Janelas Matriz */}
                <div className="flex-1 p-3 grid grid-cols-3 gap-2">
                   {[...Array(12)].map((_, i) => (
                      <div 
                        key={i} 
                        className={`rounded-sm transition-colors duration-500 ${isGanho ? (Math.random() > 0.3 ? 'bg-blue-400 shadow-[0_0_5px_#60a5fa]' : 'bg-slate-800') : (Math.random() > 0.7 ? 'bg-slate-700' : 'bg-slate-950')}`} 
                      />
                   ))}
                </div>
                
                {/* Entrada / Lobby */}
                <div className="h-8 bg-slate-800 mt-auto border-t border-slate-700 flex items-center justify-center">
                   <div className="w-10 h-full bg-slate-950/50 flex items-center justify-center border-x border-slate-600">
                      <Building2 size={16} className={isGanho ? "text-blue-400" : "text-slate-600"} />
                   </div>
                </div>
              </div>

              {/* Tag de Nome do Prédio */}
              <div className={`absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap px-4 py-2 rounded-xl border-2 font-black text-[10px] tracking-widest shadow-2xl transition-all
                ${isGanho ? 'bg-blue-600 text-white border-white animate-bounce' : 'bg-slate-900 text-slate-500 border-slate-700'}`}>
                  CLIENT HEADQUARTERS 🏢
              </div>

              {/* Brilho de baixo */}
              {isGanho && <div className="absolute bottom-0 w-32 h-8 bg-blue-500/20 blur-2xl rounded-full" />}
           </div>
        </div>

        {/* NÓS DE PROGRESSO */}
        {nodes.map((node) => {
          if (node.idx === nodes.length - 1) return null;

          return (
            <div
              key={node.etapa}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              {/* Terminal de Acesso */}
              <div
                className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center transition-all duration-700 shadow-lg 
                ${node.idx < effectiveIndex ? 'bg-blue-600 border-blue-400 rotate-45 shadow-blue-500/30' : 
                  node.idx === effectiveIndex ? 'bg-white border-blue-500 shadow-white/20 animate-pulse' : 
                  'bg-slate-900 border-slate-800'}`}
              >
                <div className={`${node.idx < effectiveIndex ? '-rotate-45' : ''}`}>
                  {node.idx < effectiveIndex ? (
                      <ShieldCheck size={18} className="text-white" />
                  ) : node.idx === effectiveIndex ? (
                      <Zap size={16} className="text-blue-600 fill-blue-600" />
                  ) : (
                      <Briefcase size={14} className="text-slate-700" />
                  )}
                </div>
              </div>

              {/* Rótulo Corporativo */}
              <div className={`mt-6 whitespace-nowrap text-[9px] font-black px-3 py-1.5 rounded-lg border transition-all tracking-tighter
              ${node.idx === effectiveIndex ? 'bg-blue-600 text-white border-blue-400 -translate-y-1 shadow-lg' : 'bg-slate-900/90 text-slate-400 border-slate-800'}`}>
                {ETAPA_LABELS[node.etapa]}
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER - STATUS LOG */}
      <div className="flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Sincronizado: Business Intelligence Core</p>
          </div>
          <p className="text-[10px] font-medium text-slate-400 italic">"A jornada para o fechamento é construída etapa por etapa."</p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes flow-dash {
          to { stroke-dashoffset: -200; }
        }
        .animate-flow-dash {
          animation: flow-dash 10s linear infinite;
        }
      `}} />
    </div>
  );
}
