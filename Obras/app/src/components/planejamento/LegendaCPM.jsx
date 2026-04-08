import React, { useState } from 'react'
import { HelpCircle, ChevronDown } from 'lucide-react'

/**
 * LegendaCPM
 * Componente expansível que exibe legenda educativa sobre:
 * - Tipos de itens EAP (CC, E, SE, S)
 * - Tipos de predecessoras (FS, SS, FF, SF)
 * - Conceitos de peso% e caminho crítico
 */
export default function LegendaCPM() {
  const [aberta, setAberta] = useState(false)

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <button
        onClick={() => setAberta(a => !a)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-slate-50 transition-colors"
      >
        <HelpCircle size={15} className="text-blue-500 flex-shrink-0" />
        <span className="text-xs font-semibold text-slate-600">Legenda — Como funciona o cronograma?</span>
        <ChevronDown size={14} className={`ml-auto text-slate-400 transition-transform ${aberta ? 'rotate-180' : ''}`} />
      </button>

      {aberta && (
        <div className="px-4 pb-4 border-t border-slate-100 space-y-4">

          {/* Tipos de EAP */}
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mt-3 mb-2">Tipos de item (WBS)</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { tipo: 'CC', cor: '#7c3aed', desc: 'Célula Construtiva — raiz do projeto' },
                { tipo: 'E', cor: '#2563eb', desc: 'Etapa — agrupador principal' },
                { tipo: 'SE', cor: '#059669', desc: 'Sub-Etapa — agrupador secundário' },
                { tipo: 'S', cor: '#334155', desc: 'Serviço — atividade executável (editável)' },
              ].map(({ tipo, cor, desc }) => (
                <div key={tipo} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50">
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: cor + '20', color: cor }}>{tipo}</span>
                  <span className="text-[11px] text-slate-600">{desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Predecessoras */}
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2">Tipos de precedência (coluna PRED.)</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {[
                { tipo: 'FS', titulo: 'Fim → Início (padrão)', desc: 'B só começa depois que A terminar. Ex: "escovar antes de pintar".' },
                { tipo: 'SS', titulo: 'Início → Início', desc: 'B começa junto com A (ou com lag de espera). Ex: "armação e concretagem iniciam juntas".' },
                { tipo: 'FF', titulo: 'Fim → Fim', desc: 'B termina quando A terminar. Ex: "testes terminam com a instalação".' },
                { tipo: 'SF', titulo: 'Início → Fim (raro)', desc: 'B termina quando A começa. Usado em situações de turno/substituição.' },
              ].map(({ tipo, titulo, desc }) => (
                <div key={tipo} className="flex items-start gap-2 p-2.5 rounded-lg border border-slate-100">
                  <span className="font-mono font-bold text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 flex-shrink-0">{tipo}</span>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-700">{titulo}</p>
                    <p className="text-[11px] text-slate-500">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              <strong>Lag:</strong> dias úteis de espera (<code className="bg-slate-100 px-1 rounded">+3</code> = esperar 3 dias) ou sobreposição (<code className="bg-slate-100 px-1 rounded">-2</code> = antecipar 2 dias).
              Notação: <code className="bg-slate-100 px-1 rounded font-mono text-blue-700">1.1.1.1FS+2</code>
            </p>
          </div>

          {/* Peso% e CPM */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
              <p className="text-[11px] font-bold text-amber-800 mb-1">⚖️ Peso% — Para que serve?</p>
              <p className="text-[11px] text-amber-700">
                Representa quanto esta atividade vale no progresso total da obra (Curva S).
                Se um serviço vale <strong>5%</strong> e está 50% concluído, contribui com <strong>2,5%</strong> no avanço global.
                A soma de todos os pesos deve ser <strong>100%</strong>.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-red-50 border border-red-100">
              <p className="text-[11px] font-bold text-red-800 mb-1">🔴 Caminho Crítico (CRÍTICO)</p>
              <p className="text-[11px] text-red-700">
                Atividades com <strong>folga total = 0</strong>. Qualquer atraso nelas atrasa o prazo final da obra.
                A última atividade de uma cadeia sempre é crítica. Quando houver múltiplos caminhos,
                apenas o caminho <strong>mais longo</strong> ficará vermelho.
              </p>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
