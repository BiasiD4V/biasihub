import { COR_TIPO } from '../../lib/planejamento/parseEAP.js'

/**
 * ArvorePreview
 * Componente recursivo para renderizar a visualização de árvore da EAP
 * durante o preview de importação.
 *
 * @param {Array} nos - Array de nós da árvore (com filhos recursivos)
 * @param {number} nivel - Nível atual de profundidade (para indentação)
 */
export default function ArvorePreview({ nos, nivel }) {
  return (
    <div>
      {nos.map(no => (
        <div key={no.codigo}>
          <div
            className="flex items-center gap-2 py-0.5 hover:bg-slate-50 rounded px-1"
            style={{ paddingLeft: `${nivel * 16 + 4}px` }}
          >
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
              style={{ backgroundColor: COR_TIPO[no.tipo] + '20', color: COR_TIPO[no.tipo] }}
            >
              {no.tipo}
            </span>
            <span className="text-xs font-mono text-slate-500 flex-shrink-0">{no.codigo}</span>
            <span className="text-xs text-slate-700 truncate">{no.nome}</span>
            {no.tipo === 'S' && (no.quantidade || no.duracao_dias) && (
              <span className="text-[10px] text-slate-400 flex-shrink-0 ml-auto pr-1">
                {no.quantidade ? `${no.quantidade}${no.unidade ? ' ' + no.unidade : ''}` : ''}
                {no.quantidade && no.duracao_dias ? ' · ' : ''}
                {no.duracao_dias ? `${no.duracao_dias}d` : ''}
              </span>
            )}
          </div>
          {no.filhos.length > 0 && <ArvorePreview nos={no.filhos} nivel={nivel + 1} />}
        </div>
      ))}
    </div>
  )
}
