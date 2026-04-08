import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Search, ChevronDown, X } from 'lucide-react'

/**
 * SearchableSelect — dropdown com campo de pesquisa
 *
 * Props:
 *   value        {string|string[]}  - ID selecionado (ou array quando multi=true)
 *   onChange     {fn}               - (value) => void
 *   options      {Array}            - [{ value, label, sublabel? }]
 *                                     OU para grupos: [{ group, items: [{value, label, sublabel?}] }]
 *   grouped      {boolean}          - true se options são grupos
 *   multi        {boolean}          - true para seleção múltipla (value deve ser array)
 *   placeholder  {string}           - texto do placeholder
 *   disabled     {boolean}
 *   className    {string}           - classe extra no container
 *   size         {'sm'|'md'}        - tamanho do input (default 'md')
 *   clearable    {boolean}          - mostra botão de limpar (default false)
 */
export default function SearchableSelect({
  value = '',
  onChange,
  options = [],
  grouped = false,
  multi = false,
  placeholder = 'Selecione...',
  disabled = false,
  className = '',
  size = 'md',
  clearable = false,
}) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const containerRef = useRef(null)
  const inputRef = useRef(null)

  // Normaliza valor para multi-select (garante sempre array)
  const valores = multi ? (Array.isArray(value) ? value : []) : null

  // Fecha ao clicar fora
  useEffect(() => {
    function handler(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setAberto(false)
        setBusca('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Foca no input ao abrir
  useEffect(() => {
    if (aberto && inputRef.current) {
      inputRef.current.focus()
    }
  }, [aberto])

  // Encontrar label do valor selecionado (single mode)
  const labelSelecionado = useCallback(() => {
    if (!value) return ''
    if (grouped) {
      for (const g of options) {
        const found = g.items?.find(i => i.value === value)
        if (found) return found.label
      }
      return ''
    }
    return options.find(o => o.value === value)?.label || ''
  }, [value, options, grouped])

  // Encontrar label de uma opção pelo value (usado no multi mode)
  const getLabelByValue = useCallback((val) => {
    if (grouped) {
      for (const g of options) {
        const found = g.items?.find(i => i.value === val)
        if (found) return found.label
      }
      return val
    }
    return options.find(o => o.value === val)?.label || val
  }, [options, grouped])

  // Filtrar opções pela busca
  const opcoesFiltradas = useCallback(() => {
    const q = busca.toLowerCase().trim()
    if (!q) return options

    if (grouped) {
      return options
        .map(g => ({
          ...g,
          items: g.items?.filter(i =>
            i.label.toLowerCase().includes(q) ||
            i.sublabel?.toLowerCase().includes(q)
          ) || []
        }))
        .filter(g => g.items.length > 0)
    }

    return options.filter(o =>
      o.label.toLowerCase().includes(q) ||
      o.sublabel?.toLowerCase().includes(q)
    )
  }, [options, busca, grouped])

  // Selecionar item (single mode: fecha; multi mode: mantém aberto e alterna)
  function selecionar(val) {
    if (multi) {
      const jaTemItem = valores.includes(val)
      const novosValores = jaTemItem
        ? valores.filter(v => v !== val)
        : [...valores, val]
      onChange(novosValores)
      // mantém dropdown aberto para selecionar mais
    } else {
      onChange(val)
      setAberto(false)
      setBusca('')
    }
  }

  // Remover um chip (multi mode)
  function removerChip(e, val) {
    e.stopPropagation()
    onChange(valores.filter(v => v !== val))
  }

  function limpar(e) {
    e.stopPropagation()
    if (multi) {
      onChange([])
    } else {
      onChange('')
    }
    setBusca('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') { setAberto(false); setBusca('') }
    if (e.key === 'Enter' && !aberto) setAberto(true)
  }

  const filtradas = opcoesFiltradas()
  const label = multi ? '' : labelSelecionado()
  const temSelecao = multi ? valores.length > 0 : !!value

  // Estilos por tamanho
  const sizeClasses = size === 'sm'
    ? 'px-2.5 py-1.5 text-xs'
    : 'px-3 py-2 text-sm'

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) setAberto(v => !v) }}
        onKeyDown={handleKeyDown}
        className={`w-full flex items-center justify-between gap-2 border rounded-lg bg-white transition-colors
          ${multi ? 'px-3 py-2 min-h-[38px]' : sizeClasses}
          ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-50' : 'cursor-pointer hover:border-slate-300'}
          ${aberto
            ? 'border-orange-400 ring-2 ring-orange-100 text-slate-800'
            : 'border-slate-200 text-slate-700'
          }`}
      >
        {/* Conteúdo do trigger */}
        {multi ? (
          <div className="flex-1 flex flex-wrap gap-1 min-w-0">
            {valores.length === 0 ? (
              <span className="text-slate-400 text-sm">{placeholder}</span>
            ) : (
              valores.map(val => (
                <span
                  key={val}
                  className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-md border border-blue-200"
                >
                  <span className="max-w-[140px] truncate">{getLabelByValue(val)}</span>
                  <span
                    role="button"
                    tabIndex={-1}
                    onClick={e => removerChip(e, val)}
                    className="hover:text-blue-900 flex-shrink-0"
                  >
                    <X size={10} />
                  </span>
                </span>
              ))
            )}
          </div>
        ) : (
          <span className={`flex-1 text-left truncate ${!label ? 'text-slate-400' : ''}`}>
            {label || placeholder}
          </span>
        )}

        <div className="flex items-center gap-1 flex-shrink-0">
          {clearable && temSelecao && (
            <span
              role="button"
              tabIndex={-1}
              onClick={limpar}
              className="p-0.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
            >
              <X size={12} />
            </span>
          )}
          <ChevronDown
            size={14}
            className={`text-slate-400 transition-transform ${aberto ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown */}
      {aberto && (
        <div
          className="absolute z-50 mt-1 w-full min-w-[220px] bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
          style={{ maxHeight: '320px', display: 'flex', flexDirection: 'column' }}
        >
          {/* Campo de busca */}
          <div className="px-3 py-2 border-b border-slate-100 flex-shrink-0">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-50 rounded-lg border border-slate-200 focus-within:border-orange-400 focus-within:ring-1 focus-within:ring-orange-100">
              <Search size={13} className="text-slate-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Pesquisar..."
                className="flex-1 bg-transparent text-xs text-slate-700 outline-none placeholder-slate-400 min-w-0"
                onKeyDown={e => {
                  if (e.key === 'Escape') { setAberto(false); setBusca('') }
                  e.stopPropagation()
                }}
              />
              {busca && (
                <button onClick={() => setBusca('')} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
                  <X size={11} />
                </button>
              )}
            </div>
          </div>

          {/* Contador multi-select */}
          {multi && valores.length > 0 && (
            <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between flex-shrink-0 bg-blue-50">
              <span className="text-xs text-blue-700 font-medium">{valores.length} selecionada{valores.length !== 1 ? 's' : ''}</span>
              <button onClick={limpar} className="text-xs text-blue-500 hover:text-blue-700 font-medium">Limpar tudo</button>
            </div>
          )}

          {/* Lista de opções */}
          <div className="overflow-y-auto flex-1">
            {!multi && clearable && (
              <button
                onClick={() => selecionar('')}
                className={`w-full text-left px-3 py-2 text-xs text-slate-400 hover:bg-slate-50 italic transition-colors
                  ${!value ? 'bg-orange-50 text-orange-600 font-medium not-italic' : ''}`}
              >
                {placeholder}
              </button>
            )}

            {grouped ? (
              filtradas.length === 0 ? (
                <p className="px-3 py-4 text-xs text-slate-400 text-center">Nenhum resultado</p>
              ) : (
                filtradas.map(grupo => (
                  <div key={grupo.group}>
                    <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50 border-b border-slate-100">
                      {grupo.group}
                    </p>
                    {grupo.items.map(item => (
                      <OpcaoItem
                        key={item.value}
                        item={item}
                        selected={multi ? valores.includes(item.value) : value === item.value}
                        onSelect={selecionar}
                        multi={multi}
                      />
                    ))}
                  </div>
                ))
              )
            ) : (
              filtradas.length === 0 ? (
                <p className="px-3 py-4 text-xs text-slate-400 text-center">Nenhum resultado</p>
              ) : (
                filtradas.map(item => (
                  <OpcaoItem
                    key={item.value}
                    item={item}
                    selected={multi ? valores.includes(item.value) : value === item.value}
                    onSelect={selecionar}
                    multi={multi}
                  />
                ))
              )
            )}
          </div>

          {/* Rodapé multi-select com botão confirmar */}
          {multi && (
            <div className="px-3 py-2 border-t border-slate-100 flex-shrink-0 bg-white">
              <button
                onClick={() => { setAberto(false); setBusca('') }}
                className="w-full py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
                style={{ backgroundColor: '#233772' }}
              >
                {valores.length === 0 ? 'Fechar' : `Confirmar (${valores.length})`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function OpcaoItem({ item, selected, onSelect, multi }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.value)}
      className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-start gap-2
        ${selected
          ? 'bg-orange-50 text-orange-700 font-semibold'
          : 'text-slate-700 hover:bg-slate-50'
        }`}
    >
      {/* Checkbox visual para multi-select */}
      {multi && (
        <span className={`flex-shrink-0 mt-0.5 w-3.5 h-3.5 rounded border flex items-center justify-center
          ${selected ? 'border-orange-500 bg-orange-500' : 'border-slate-300 bg-white'}`}
        >
          {selected && <span className="text-white text-[9px] leading-none">✓</span>}
        </span>
      )}
      <span className="flex-1 min-w-0">
        <span className="block truncate">{item.label}</span>
        {item.sublabel && (
          <span className="block truncate text-[10px] text-slate-400 mt-0.5">{item.sublabel}</span>
        )}
      </span>
      {!multi && selected && (
        <span className="text-orange-500 flex-shrink-0 mt-0.5">✓</span>
      )}
    </button>
  )
}

/**
 * Converte array de obras para options do SearchableSelect
 * obras: [{id, codigo, nome, status?, cidade?}]
 */
export function obrasParaOptions(obras) {
  return obras.map(o => ({
    value: o.id,
    label: o.nome,
    sublabel: o.codigo + (o.cidade ? ` · ${o.cidade}` : ''),
  }))
}
