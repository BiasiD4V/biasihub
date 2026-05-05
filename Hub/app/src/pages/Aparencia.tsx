import { Check, Palette, Sparkles, RotateCcw } from 'lucide-react';
import { useTheme, PALETAS, type PaletaId } from '../context/ThemeContext';

export function Aparencia() {
  const { paleta, paletaAtual, minimalista, setPaleta, setMinimalista, resetar } = useTheme();

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl lg:text-3xl font-black text-white flex items-center gap-3 tracking-tight">
          <Palette className="text-[var(--biasi-accent)]" size={28} />
          Aparência
        </h1>
        <p className="text-sm text-[#9DB2E7] mt-1.5">
          Personalize as cores e o estilo do aplicativo.
        </p>
      </div>

      {/* Paletas */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xs font-black uppercase tracking-[0.3em] text-[#8EA2D4]">
              Paleta de cores
            </h2>
            <p className="text-xs text-[#9DB2E7] mt-1">Escolha o tema visual do aplicativo</p>
          </div>
          <button
            onClick={resetar}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-[#9DB2E7] hover:text-white transition"
          >
            <RotateCcw size={12} />
            Restaurar padrão
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {PALETAS.map((p) => (
            <PaletaCard
              key={p.id}
              paletaId={p.id}
              nome={p.nome}
              descricao={p.descricao}
              amostras={p.amostras}
              ativo={paleta === p.id}
              onSelect={() => setPaleta(p.id)}
            />
          ))}
        </div>
      </section>

      {/* Modo Minimalista */}
      <section className="mb-8">
        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-[#8EA2D4] mb-4">
          Modo Minimalista
        </h2>

        <div className="biasi-card flex items-start gap-4 p-5 rounded-2xl border border-white/10 bg-white/5">
          <div className="w-10 h-10 rounded-xl bg-[var(--biasi-accent)]/15 border border-[var(--biasi-accent)]/30 flex items-center justify-center flex-shrink-0">
            <Sparkles className="text-[var(--biasi-accent)]" size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Interface limpa e premium</p>
            <p className="text-xs text-[#9DB2E7] mt-1 leading-relaxed">
              Reduz sombras, bordas e ruído visual. Mais espaçamento, cores suaves e
              componentes discretos para uma experiência mais sóbria.
            </p>
          </div>
          <Switch ativo={minimalista} onChange={setMinimalista} />
        </div>
      </section>

      {/* Pré-visualização */}
      <section>
        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-[#8EA2D4] mb-4">
          Pré-visualização
        </h2>

        <div className="biasi-card rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-slate-900 font-black text-xl"
              style={{ background: paletaAtual.accent }}
            >
              B
            </div>
            <div>
              <p className="text-base font-black text-white tracking-tight">{paletaAtual.nome}</p>
              <p className="text-xs text-[#9DB2E7]">{paletaAtual.descricao}</p>
            </div>
          </div>

          <p className="text-sm text-[#DCE8FF] leading-relaxed">
            Este é um exemplo de como o aplicativo ficará com a paleta escolhida.
            {minimalista && <span className="text-[#9DB2E7]"> Modo minimalista ativo.</span>}
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-[0.16em] text-slate-900 transition-all hover:opacity-90"
              style={{ background: paletaAtual.accent }}
            >
              Ação primária
            </button>
            <button className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-[0.16em] text-white border border-white/15 hover:bg-white/10 transition">
              Ação secundária
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-2">
            {['Portal', 'Membros', 'Acessos'].map((label) => (
              <div
                key={label}
                className="biasi-card rounded-xl border border-white/10 bg-white/5 p-3 text-center"
              >
                <p className="text-[9px] uppercase font-black tracking-[0.2em] text-[#9DB2E7]">
                  {label}
                </p>
                <p className="text-lg font-black text-white mt-1">128</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

interface PaletaCardProps {
  paletaId: PaletaId;
  nome: string;
  descricao: string;
  amostras: string[];
  ativo: boolean;
  onSelect: () => void;
}

function PaletaCard({ nome, descricao, amostras, ativo, onSelect }: PaletaCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`group relative biasi-card text-left rounded-2xl border-2 p-3 transition-all ${
        ativo
          ? 'border-[var(--biasi-accent)] bg-white/10 shadow-[0_0_24px_-8px_var(--biasi-accent)]'
          : 'border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10'
      }`}
    >
      <div className="flex h-16 w-full overflow-hidden rounded-xl mb-3">
        {amostras.map((cor, i) => (
          <div key={i} className="flex-1" style={{ background: cor }} />
        ))}
      </div>

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-black text-white uppercase tracking-wider truncate">{nome}</p>
          <p className="text-[10px] text-[#9DB2E7] mt-0.5 leading-tight line-clamp-2">{descricao}</p>
        </div>
        {ativo && (
          <div className="w-5 h-5 rounded-full bg-[var(--biasi-accent)] flex items-center justify-center flex-shrink-0">
            <Check size={12} className="text-slate-900" strokeWidth={3} />
          </div>
        )}
      </div>
    </button>
  );
}

interface SwitchProps {
  ativo: boolean;
  onChange: (v: boolean) => void;
}

function Switch({ ativo, onChange }: SwitchProps) {
  return (
    <button
      onClick={() => onChange(!ativo)}
      role="switch"
      aria-checked={ativo}
      className={`relative h-7 w-12 rounded-full transition-colors flex-shrink-0 ${
        ativo ? 'bg-[var(--biasi-accent)]' : 'bg-white/15'
      }`}
    >
      <span
        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
          ativo ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}
