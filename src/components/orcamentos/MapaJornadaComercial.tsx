import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Navigation, CheckCircle2, Lock, Award, Zap } from 'lucide-react';
import { ORDEM_FUNIL, ETAPA_LABELS, EtapaFunil } from '../../domain/value-objects/EtapaFunil';

/**
 * Componente TransparentSprite: Remove fundo branco via Canvas.
 */
function TransparentSprite({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [processedSrc, setProcessedSrc] = useState<string>('');

  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = src;
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 230 && data[i + 1] > 230 && data[i + 2] > 230) {
          data[i + 3] = 0;
        }
      }
      ctx.putImageData(imageData, 0, 0);
      setProcessedSrc(canvas.toDataURL());
    };
  }, [src]);

  return (
    <>
      <canvas ref={canvasRef} className="hidden" />
      {processedSrc ? (
        <img src={processedSrc} alt={alt} className={className} />
      ) : (
        <img src={src} alt={alt} className={`${className} opacity-0`} />
      )}
    </>
  );
}

interface MapaJornadaComercialProps {
  etapaAtual: EtapaFunil;
  resultadoComercial?: string;
}

export function MapaJornadaComercial({ etapaAtual, resultadoComercial }: MapaJornadaComercialProps) {
  const currentIndex = ORDEM_FUNIL.indexOf(etapaAtual);
  const isGanho = resultadoComercial === 'ganho';
  const effectiveIndex = isGanho ? ORDEM_FUNIL.length - 1 : currentIndex;

  const nodes = useMemo(() => ORDEM_FUNIL.map((etapa, idx) => {
    const row = Math.floor(idx / 4);
    const isEvenRow = row % 2 === 0;
    const colIndex = idx % 4;
    const col = isEvenRow ? colIndex : (3 - colIndex);
    const y = 25 + (row * 28);
    const x = 12.5 + (col * 25);
    return { etapa, idx, x, y, isPassed: idx < effectiveIndex, isBoss: etapa === 'pos_venda' };
  }), [effectiveIndex]);

  const activeNode = nodes[effectiveIndex] || nodes[0];

  return (
    <div className="w-full flex flex-col gap-5 p-2 selective-font">
      {/* HUD PRINCIPAL - ESTILO NINTENDO SWITCH / MODERNO */}
      <div className="flex items-center justify-between px-6 py-3 bg-slate-900 rounded-2xl shadow-[0_10px_20px_-10px_rgba(0,0,0,0.5)] border-b-4 border-slate-950">
        <div className="flex items-center gap-4">
            <div className="p-2 bg-blue-500 rounded-lg shadow-[inset_0_2px_4px_rgba(255,255,255,0.4)]">
                <Navigation size={22} className="text-white animate-pulse" />
            </div>
            <div>
                <h3 className="text-lg font-black text-white leading-tight tracking-wider uppercase italic">Biasí Adventure</h3>
                <p className="text-[10px] text-blue-300 font-bold uppercase tracking-widest">Global World Map</p>
            </div>
        </div>
        
        <div className="flex items-center gap-6">
            <div className="hidden lg:flex flex-col items-end">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Progresso</span>
                <div className="w-32 h-2 bg-slate-800 rounded-full mt-1 border border-slate-700 overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-1000 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                        style={{ width: `${(effectiveIndex / (ORDEM_FUNIL.length - 1)) * 100}%` }}
                    />
                </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 rounded-xl border border-slate-700 shadow-inner">
                <Zap size={16} className="text-yellow-400 fill-yellow-400" />
                <span className="text-sm font-black text-white">{effectiveIndex * 100} PTS</span>
            </div>
        </div>
      </div>
      
      {/* MUNDO ADVENTURE - CAMADAS DE PARALLAX */}
      <div className="relative w-full h-[450px] rounded-[3rem] border-[12px] border-slate-900 overflow-hidden shadow-[0_30px_70px_rgba(0,0,0,0.5)] ring-4 ring-slate-800/10 active:scale-[0.99] transition-transform">
        
        {/* Camada 0: Céu */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#87CEEB] to-[#E0F6FF]" />

        {/* Camada 1: Nuvens Parallax (Movimento Lento) */}
        <div 
            className="absolute inset-0 opacity-40 animate-[parallax_120s_linear_infinite]"
            style={{ 
                backgroundImage: 'url("/mapa_clouds.png")',
                backgroundSize: 'cover',
                backgroundRepeat: 'repeat-x'
            }} 
        />

        {/* Camada 2: Colinas Parallax (Movimento Médio) */}
        <div 
            className="absolute -bottom-10 left-0 right-0 h-1/2 opacity-60 animate-[parallax_80s_linear_infinite]"
            style={{ 
                backgroundImage: 'url("/mapa_hills.png")',
                backgroundSize: 'contain',
                backgroundRepeat: 'repeat-x',
                backgroundPosition: 'bottom'
            }} 
        />

        {/* Camada 3: Textura de Grama (Base) */}
        <div 
            className="absolute inset-0 opacity-100 mix-blend-overlay"
            style={{ 
                backgroundImage: 'url("/mapa_background_pixel.png")',
                backgroundSize: '100px 100px', 
                imageRendering: 'pixelated'
            }} 
        />

        {/* Vinheta Estilizada */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_30%,rgba(0,0,0,0.4)_120%)] pointer-events-none" />
        
        {/* ESTRADAS DINÂMICAS (Curvas de Bézier) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-[5]">
          {nodes.map((node, i) => {
            if (i === nodes.length - 1) return null;
            const next = nodes[i + 1];
            const isLinePassed = node.idx < effectiveIndex;
            
            // Calculando o ponto de controle para a curva
            const midX = (node.x + next.x) / 2;
            const midY = (node.y + next.y) / 2;
            const isVerticalMove = Math.abs(node.x - next.x) < 5;
            const cpX = isVerticalMove ? midX + (i % 2 === 0 ? 5 : -5) : midX;
            const cpY = isVerticalMove ? midY : midY + (i % 2 === 0 ? 3 : -3);

            const pathData = `M ${node.x} ${node.y} Q ${cpX} ${cpY} ${next.x} ${next.y}`;

            return (
              <React.Fragment key={`path-${i}`}>
                {/* Sombra da Estrada */}
                <path d={pathData} fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="20" strokeLinecap="round" transform="translate(0, 1)" />
                {/* A Estrada em si */}
                <path 
                    d={pathData} 
                    fill="none" 
                    stroke={isLinePassed ? '#FFD700' : '#E2E8F0'} 
                    strokeWidth="12" 
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-in-out"
                    style={{ filter: isLinePassed ? 'drop-shadow(0 0 8px rgba(255,215,0,0.5))' : 'none' }}
                />
                {/* Listras da Estrada para visualizar movimento */}
                <path 
                    d={pathData} 
                    fill="none" 
                    stroke="white" 
                    strokeWidth="2" 
                    strokeDasharray="1, 8" 
                    strokeLinecap="round" 
                    className="opacity-40"
                />
              </React.Fragment>
            );
          })}
        </svg>

        {/* O AVATAR BIASÍ (O Herói) */}
        <div 
          className="absolute -translate-x-1/2 -translate-y-1/2 z-[100] transition-all duration-1000 ease-[cubic-bezier(0.34,1.56,0.64,1)] flex flex-col items-center group"
          style={{ left: `${activeNode.x}%`, top: `${activeNode.y}%` }}
        >
          {/* Aura de Poder ao redor do Herói */}
          <div className="absolute inset-0 w-32 h-32 -translate-x-1/2 -translate-y-1/2 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
          
          {/* Sombra Realista */}
          <div className="absolute top-[40px] w-12 h-4 bg-black/40 rounded-[100%] blur-[6px] animate-[bounceScale_1.2s_infinite]" />
          
          {/* Modelo 3D com animação idle premium */}
          <div className="relative w-[100px] h-[100px] -translate-y-[55px] animate-[heroFloat_2.5s_ease-in-out_infinite] cursor-pointer active:scale-90 transition-transform">
            <TransparentSprite 
                src="/vendedor_3d_clean.png" 
                alt="Biasí Hero" 
                className="w-full h-full object-contain drop-shadow-[0_20px_20px_rgba(0,0,0,0.4)]"
            />
            {/* Tag de Nome / Balão de Fala */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-blue-900 text-[10px] font-black px-4 py-1.5 rounded-2xl shadow-xl border-2 border-blue-100 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                Olá! Vamos avançar? 👋
            </div>
          </div>
        </div>

        {/* BOSS FINAL: CLIENTE FINAL */}
        <div 
          className="absolute z-[50] flex flex-col items-center"
          style={{ left: `${nodes[nodes.length - 1].x}%`, top: `${nodes[nodes.length - 1].y}%` }}
        >
           <div className={`relative w-[110px] h-[110px] -translate-x-1/2 -translate-y-[85%] transition-all duration-1000 ${isGanho ? 'scale-125 drop-shadow-[0_0_30px_rgba(255,215,0,0.6)]' : 'grayscale brightness-75 opacity-80 scale-95'}`}>
              <TransparentSprite 
                  src="/cliente_boss_clean.png" 
                  alt="Boss" 
                  className="w-full h-full object-contain"
              />
              <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap bg-gradient-to-r from-red-600 via-orange-500 to-red-600 bg-[size:200%_auto] animate-[shimmer_2s_linear_infinite] text-white font-black text-[12px] px-5 py-2 rounded-xl border-4 border-white shadow-[0_10px_25px_rgba(220,38,38,0.5)] italic uppercase tracking-tighter">
                  LEVEL BOSS
              </div>
           </div>
        </div>

        {/* NÓS DO MUNDO (Fases) */}
        {nodes.map((node) => {
          if (node.isBoss) return null;

          return (
            <div
              key={node.etapa}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-10"
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
            >
              {/* Botão SNES 3D Refinado */}
              <div
                className={`w-11 h-11 rounded-2xl border-4 flex items-center justify-center transition-all duration-700 shadow-[0_6px_0_0_rgba(0,0,0,0.3)] hover:scale-110 active:translate-y-1 active:shadow-none cursor-pointer
                ${node.idx < effectiveIndex ? 'bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600 border-yellow-100 shadow-[0_6px_0_0_#b45309]' : 
                  node.idx === effectiveIndex ? 'bg-white border-blue-500 ring-8 ring-blue-500/20' : 
                  'bg-gradient-to-br from-slate-200 to-slate-400 border-white'}`}
              >
                {node.idx < effectiveIndex ? (
                    <Award size={20} className="text-yellow-900 drop-shadow-sm" />
                ) : node.idx === effectiveIndex ? (
                    <div className="w-4 h-4 bg-blue-500 rounded-full animate-ping" />
                ) : (
                    <Lock size={16} className="text-slate-500 opacity-60" />
                )}
              </div>

              {/* Rótulo de Plataforma */}
              <div className={`mt-5 whitespace-nowrap text-[10px] font-black px-4 py-1.5 rounded-lg border-2 shadow-2xl transition-all
              ${node.idx === effectiveIndex ? 'bg-blue-600 text-white border-blue-400 -translate-y-2' : 'bg-white/95 text-slate-800 border-slate-200'}`}>
                {ETAPA_LABELS[node.etapa]}
              </div>
            </div>
          );
        })}
      </div>

      {/* FOOTER DO MAPA */}
      <div className="px-8 flex items-center justify-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest leading-none">Status: Adventure in Progress</p>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes parallax {
          from { background-position: 0px bottom; }
          to { background-position: -2000px bottom; }
        }
        @keyframes heroFloat {
          0%, 100% { transform: translateY(-55px) rotate(0deg); }
          50% { transform: translateY(-70px) rotate(2deg); }
        }
        @keyframes bounceScale {
          0%, 100% { transform: scale(1); opacity: 0.4; }
          50% { transform: scale(1.3); opacity: 0.2; }
        }
        @keyframes shimmer {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        .selective-font {
          font-family: 'Inter', system-ui, sans-serif;
        }
      `}} />
    </div>
  );
}
