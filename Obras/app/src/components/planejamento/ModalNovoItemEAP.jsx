import React, { useState, useMemo } from 'react'
import { X, Plus } from 'lucide-react'
import { COR_TIPO, LABEL_TIPO, TIPO_NIVEL } from '../../lib/planejamento/parseEAP'

// Qual tipo de pai é obrigatório para cada tipo
const PAI_OBRIGATORIO = { CC: null, E: 'CC', SE: 'E', S: 'SE' }
const TIPOS_ORDENADOS = ['CC', 'E', 'SE', 'S']

/**
 * Gera o próximo código disponível para um filho de parentId.
 * Ex: se o pai é "1.1" e já existe "1.1.1" e "1.1.2", retorna "1.1.3"
 */
function gerarProximoCodigo(parentId, eap) {
  const irmaos = eap.filter(i => (i.parent_id || null) === (parentId || null))
  const parent  = eap.find(i => i.id === parentId)

  if (!irmaos.length) {
    if (!parent) return '1'
    return `${parent.codigo}.1`
  }

  // Maior número sequencial entre irmãos
  let maxSeq = 0
  for (const irmao of irmaos) {
    const partes = irmao.codigo.split('.')
    const seq = parseInt(partes[partes.length - 1], 10)
    if (!isNaN(seq) && seq > maxSeq) maxSeq = seq
  }

  if (!parent) return String(maxSeq + 1)
  return `${parent.codigo}.${maxSeq + 1}`
}

/**
 * ModalNovoItemEAP
 *
 * Modal para criar um novo item da EAP manualmente (sem importar Excel).
 *
 * Props:
 *   eap           - array de itens EAP já existentes (para sugerir código e listar pais)
 *   planejamentoId- id do planejamento ativo (pode ser null, a criação cuida disso)
 *   onConfirmar   - callback({ tipo, codigo, nome, nivel, parentId, duracao_dias,
 *                              data_inicio_prevista, peso_percentual, valor_orcado, ordem })
 *   onFechar      - callback para fechar o modal
 */
export default function ModalNovoItemEAP({ eap, planejamentoId, onConfirmar, onFechar, tipoInicial }) {
  const [tipo,       setTipo]       = useState(tipoInicial || 'S')
  const [parentId,   setParentId]   = useState('')
  const [nome,       setNome]       = useState('')
  const [duracao,    setDuracao]    = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [peso,       setPeso]       = useState('')
  const [valor,      setValor]      = useState('')
  const [salvando,   setSalvando]   = useState(false)
  const [erro,       setErro]       = useState('')

  const paiObrigatorio = PAI_OBRIGATORIO[tipo]

  // Itens que podem ser pai do tipo selecionado
  const paisDisponiveis = useMemo(() => {
    if (!paiObrigatorio) return []
    return eap.filter(i => i.tipo === paiObrigatorio)
  }, [tipo, eap])

  // Código gerado automaticamente a partir do pai selecionado
  const codigoPreview = useMemo(() => {
    if (tipo === 'CC') return gerarProximoCodigo(null, eap)
    if (!parentId) return '—'
    return gerarProximoCodigo(parentId, eap)
  }, [tipo, parentId, eap])

  function handleTrocarTipo(novoTipo) {
    setTipo(novoTipo)
    setParentId('')
    setErro('')
  }

  async function handleConfirmar() {
    setErro('')
    if (!nome.trim()) { setErro('Nome é obrigatório.'); return }
    if (tipo !== 'CC' && !parentId) {
      setErro(`Selecione a ${LABEL_TIPO[paiObrigatorio]} pai.`); return
    }
    if (codigoPreview === '—') {
      setErro('Não foi possível gerar o código. Verifique o pai selecionado.'); return
    }

    // Calcula próxima ordem sequencial entre os irmãos
    const irmaos   = eap.filter(i => (i.parent_id || null) === (parentId || null))
    const maxOrdem = irmaos.reduce((max, i) => Math.max(max, i.ordem ?? 0), 0)

    setSalvando(true)
    try {
      await onConfirmar({
        tipo,
        codigo:               codigoPreview,
        nome:                 nome.trim(),
        nivel:                TIPO_NIVEL[tipo],
        parentId:             parentId || null,
        duracao_dias:         duracao    ? Number(duracao)    : null,
        data_inicio_prevista: dataInicio || null,
        peso_percentual:      peso       ? Number(peso)       : null,
        valor_orcado:         valor      ? Number(valor)      : null,
        ordem:                maxOrdem + 1,
      })
    } catch (err) {
      setErro(err.message || 'Erro ao criar item.')
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Novo Item da EAP
          </h2>
          <button onClick={onFechar} className="p-1 rounded hover:bg-slate-100 text-slate-400">
            <X size={16} />
          </button>
        </div>

        {/* Corpo */}
        <div className="p-5 space-y-4">

          {/* Seleção de tipo */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Tipo de Item
            </label>
            <div className="grid grid-cols-4 gap-2">
              {TIPOS_ORDENADOS.map(t => (
                <button key={t} onClick={() => handleTrocarTipo(t)}
                  className="py-2 rounded-lg border-2 transition-all text-center"
                  style={tipo === t
                    ? { backgroundColor: COR_TIPO[t] + '18', borderColor: COR_TIPO[t], color: COR_TIPO[t] }
                    : { borderColor: '#e2e8f0', color: '#94a3b8' }}>
                  <div className="text-sm font-bold">{t}</div>
                  <div className="text-[9px] font-normal mt-0.5 leading-tight"
                    style={{ color: tipo === t ? COR_TIPO[t] : '#cbd5e1' }}>
                    {LABEL_TIPO[t]}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Seleção do pai */}
          {tipo !== 'CC' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                {LABEL_TIPO[paiObrigatorio]} Pai *
              </label>
              {paisDisponiveis.length === 0 ? (
                <p className="text-xs text-amber-600 bg-amber-50 rounded px-3 py-2">
                  Nenhum(a) {LABEL_TIPO[paiObrigatorio]} encontrado(a). Crie um(a) primeiro.
                </p>
              ) : (
                <select value={parentId} onChange={e => setParentId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
                  <option value="">Selecione...</option>
                  {paisDisponiveis.map(p => (
                    <option key={p.id} value={p.id}>{p.codigo} — {p.nome}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Preview do código */}
          <div className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Código:</span>
            <span className="font-mono text-sm font-bold" style={{ color: COR_TIPO[tipo] }}>
              {codigoPreview}
            </span>
          </div>

          {/* Nome */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Nome *
            </label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)}
              placeholder="Descrição do item"
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleConfirmar()}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
          </div>

          {/* Campos extras — somente tipo S */}
          {tipo === 'S' && (
            <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Duração (dias úteis)
                </label>
                <input type="number" min="1" value={duracao} onChange={e => setDuracao(e.target.value)}
                  placeholder="Ex: 5"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Início Previsto
                </label>
                <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Peso %
                </label>
                <input type="number" min="0" max="100" step="0.01" value={peso}
                  onChange={e => setPeso(e.target.value)}
                  placeholder="0,00"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  Valor Orçado (R$)
                </label>
                <input type="number" min="0" value={valor} onChange={e => setValor(e.target.value)}
                  placeholder="0,00"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400" />
              </div>
            </div>
          )}

          {/* Mensagem de erro */}
          {erro && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{erro}</p>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100">
          <button onClick={onFechar}
            className="px-4 py-2 rounded-lg text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button onClick={handleConfirmar} disabled={salvando || (tipo !== 'CC' && paisDisponiveis.length === 0)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-colors"
            style={{ backgroundColor: '#233772' }}>
            {salvando
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <Plus size={14} />}
            Adicionar
          </button>
        </div>
      </div>
    </div>
  )
}
