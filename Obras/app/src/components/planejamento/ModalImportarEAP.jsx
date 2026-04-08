import React, { useState } from 'react'
import { X, Eye, Save, FileSpreadsheet, AlertCircle } from 'lucide-react'
import ArvorePreview from './ArvorePreview'
import {
  parseEAP, validarHierarquia, construirArvore,
  contarPorTipo, COR_TIPO, EXEMPLO_EAP
} from '../../lib/planejamento/parseEAP'

/**
 * ModalImportarEAP
 * Modal para importação de EAP a partir de Excel ou texto TAB-separado.
 * Permite visualizar a estrutura antes de confirmar.
 *
 * @param {function} onFechar - Callback para fechar o modal
 * @param {function} onConfirmar - Callback quando importação é confirmada (itens, modo, planejamentoId)
 * @param {string} planejamentoId - ID do planejamento (opcional, para distinguir substituir/adicionar)
 */
export default function ModalImportarEAP({ onFechar, onConfirmar, planejamentoId }) {
  const [texto, setTexto] = useState('')
  const [resultado, setResultado] = useState(null)
  const [modo, setModo] = useState('substituir')
  const [salvando, setSalvando] = useState(false)
  const [etapa, setEtapa] = useState('entrada')
  const [carregandoXlsx, setCarregandoXlsx] = useState(false)

  /**
   * Importar .xlsx: converte planilha para texto TAB-separado
   */
  async function handleArquivo(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setCarregandoXlsx(true)
    try {
      const XLSX = await import('xlsx')
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

      // Ignorar linha de cabeçalho se primeira célula não parecer um tipo EAP
      const TIPOS = ['CC', 'E', 'SE', 'S']
      const linhas = rows
        .filter(r => TIPOS.includes(String(r[0] || '').trim().toUpperCase()))
        .map(r => r.slice(0, 6).join('\t').trimEnd())
        .join('\n')

      setTexto(linhas)
    } catch (err) {
      alert('Erro ao ler o arquivo: ' + err.message)
    } finally {
      setCarregandoXlsx(false)
      e.target.value = ''
    }
  }

  /**
   * Validar e visualizar a EAP
   */
  function handleVisualizar() {
    const { itens, erros: errosParse } = parseEAP(texto)
    const errosHierarquia = errosParse.length === 0 ? validarHierarquia(itens) : []
    const todosErros = [...errosParse, ...errosHierarquia]

    setResultado({
      itens,
      erros: todosErros,
      arvore: todosErros.length === 0 ? construirArvore(itens) : [],
      contagem: contarPorTipo(itens),
    })
    setEtapa('preview')
  }

  /**
   * Confirmar importação
   */
  async function handleConfirmar() {
    if (!resultado || resultado.erros.length > 0) return
    setSalvando(true)
    try {
      await onConfirmar(resultado.itens, modo, planejamentoId)
      onFechar()
    } catch (err) {
      console.error('[ModalImportarEAP]', err)
      alert('Erro ao importar EAP: ' + err.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
              Importar EAP
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Cole a lista do Excel no formato CC / E / SE / S</p>
          </div>
          <button onClick={onFechar} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={18} />
          </button>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {etapa === 'entrada' ? (
            <>
              {/* Upload Excel */}
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <FileSpreadsheet size={18} className="text-green-700 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-green-800">Importar de arquivo Excel</p>
                  <p className="text-xs text-green-700">Colunas: Tipo | Código | Nome (+ Duração, Unid, Qtd para tipo S)</p>
                </div>
                <label className="cursor-pointer px-3 py-1.5 bg-green-700 hover:bg-green-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5">
                  {carregandoXlsx ? 'Lendo…' : <><FileSpreadsheet size={13} /> Escolher .xlsx</>}
                  <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleArquivo} disabled={carregandoXlsx} />
                </label>
              </div>

              {/* Instrução */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 space-y-1">
                <p className="font-semibold">Formato (separador: TAB) — colunas D/E/F opcionais para tipo S:</p>
                <code className="block font-mono bg-blue-100 rounded p-2 whitespace-pre text-[11px]">
{`CC  1         INSTALAÇÕES ELÉTRICAS — VESTIÁRIOS
E   1.1       INFRAESTRUTURA
SE  1.1.1     ELETROCALHA
S   1.1.1.1   ELETROCALHA LISA - 100X100    150   M   5`}
                </code>
                <p>Linhas em branco e iniciadas por <code>#</code> são ignoradas. Cabeçalho Excel é ignorado automaticamente.</p>
              </div>

              {/* Textarea */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Lista EAP</label>
                  <div className="flex items-center gap-3">
                    <a
                      href="/downloads/modelo-eap-biasi.xlsx"
                      download="Modelo_EAP_Biasi.xlsx"
                      className="text-xs text-green-700 hover:underline flex items-center gap-1 font-medium"
                    >
                      ↓ Baixar modelo Excel
                    </a>
                    <button
                      onClick={() => setTexto(EXEMPLO_EAP)}
                      className="text-xs text-blue-600 hover:underline">
                      Carregar exemplo
                    </button>
                  </div>
                </div>
                <textarea
                  value={texto}
                  onChange={e => setTexto(e.target.value)}
                  rows={14}
                  placeholder="Cole aqui a lista do Excel..."
                  className="w-full border border-slate-200 rounded-lg p-3 font-mono text-xs resize-none focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-200"
                  style={{ fontFamily: 'monospace' }}
                />
              </div>

              {/* Modo */}
              {planejamentoId && (
                <div className="flex gap-3">
                  {['substituir', 'adicionar'].map(m => (
                    <label key={m} className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" value={m} checked={modo === m}
                        onChange={() => setModo(m)} className="accent-blue-600" />
                      <span className="text-sm text-slate-700 capitalize">
                        {m === 'substituir' ? 'Substituir EAP existente' : 'Adicionar à EAP existente'}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Preview */}
              {resultado?.erros.length > 0 ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-1">
                  <p className="text-sm font-semibold text-red-700 flex items-center gap-2">
                    <AlertCircle size={16} /> {resultado.erros.length} erro(s) encontrado(s)
                  </p>
                  <ul className="text-xs text-red-700 list-disc list-inside space-y-0.5 mt-2">
                    {resultado.erros.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              ) : (
                <>
                  {/* Contagem por tipo */}
                  <div className="flex gap-3">
                    {Object.entries(resultado.contagem).map(([tipo, n]) => (
                      <div key={tipo} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                        style={{ backgroundColor: COR_TIPO[tipo] + '18', color: COR_TIPO[tipo] }}>
                        {tipo}: {n}
                      </div>
                    ))}
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600">
                      Total: {resultado.itens.length}
                    </div>
                  </div>

                  {/* Árvore preview */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
                        Estrutura da EAP
                      </p>
                    </div>
                    <div className="p-3 max-h-64 overflow-y-auto">
                      <ArvorePreview nos={resultado.arvore} nivel={0} />
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl">
          <button onClick={etapa === 'preview' ? () => setEtapa('entrada') : onFechar}
            className="px-4 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-200 transition-colors">
            {etapa === 'preview' ? '← Voltar' : 'Cancelar'}
          </button>

          {etapa === 'entrada' ? (
            <button
              onClick={handleVisualizar}
              disabled={!texto.trim()}
              className="px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors disabled:opacity-40"
              style={{ backgroundColor: '#233772', color: '#fff' }}>
              <Eye size={15} /> Visualizar estrutura
            </button>
          ) : resultado?.erros.length === 0 ? (
            <button
              onClick={handleConfirmar}
              disabled={salvando}
              className="px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
              style={{ backgroundColor: '#16a34a', color: '#fff' }}>
              {salvando ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save size={15} />}
              Confirmar importação
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
