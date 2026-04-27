import { useState, useEffect, useCallback, useRef } from 'react'
import { insumosRepository } from '../../infrastructure/supabase/insumosRepository'

interface Sugestao {
  descricao: string
  unidade: string
  melhor_preco: number
}

interface BuscaInsumoProps {
  value: string
  onChange: (descricao: string, unidade: string, preco: number) => void
}

export function BuscaInsumo({ value, onChange }: BuscaInsumoProps) {
  const [texto, setTexto] = useState(value)
  const [sugestoes, setSugestoes] = useState<Sugestao[]>([])
  const [aberto, setAberto] = useState(false)
  const [loading, setLoading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setTexto(value) }, [value])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const buscar = useCallback((q: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (q.length < 2) { setSugestoes([]); setAberto(false); return }
    timerRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await insumosRepository.buscarSugestoes(q)
        setSugestoes(res)
        setAberto(res.length > 0)
      } catch {
        setSugestoes([])
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [])

  const selecionar = (s: Sugestao) => {
    setTexto(s.descricao)
    setAberto(false)
    onChange(s.descricao, s.unidade, s.melhor_preco)
  }

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0">
      <input
        value={texto}
        onChange={(e) => {
          setTexto(e.target.value)
          onChange(e.target.value, '', 0)
          buscar(e.target.value)
        }}
        onFocus={() => { if (sugestoes.length > 0) setAberto(true) }}
        placeholder="Descrição do serviço ou buscar insumo..."
        className="w-full px-1 py-0.5 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-400 focus:outline-none text-slate-800 text-xs"
      />
      {loading && (
        <div className="absolute right-1 top-0.5">
          <div className="h-3 w-3 rounded-full border border-blue-400 border-t-transparent animate-spin" />
        </div>
      )}
      {aberto && sugestoes.length > 0 && (
        <div className="absolute left-0 top-full mt-0.5 z-50 bg-white border border-slate-200 rounded-lg shadow-xl w-[480px] max-h-64 overflow-y-auto">
          <div className="px-2 py-1 bg-slate-50 border-b border-slate-100 text-[10px] text-slate-400 uppercase tracking-wide">
            Insumos cadastrados — clique para puxar o preço
          </div>
          {sugestoes.map((s) => (
            <button
              key={s.descricao}
              onMouseDown={(e) => { e.preventDefault(); selecionar(s) }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-blue-50 transition-colors border-b border-slate-50 last:border-0"
            >
              <span className="flex-1 text-xs text-slate-800 truncate">{s.descricao}</span>
              <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">{s.unidade}</span>
              {s.melhor_preco > 0 ? (
                <span className="text-[10px] font-semibold text-green-700 bg-green-50 px-1.5 py-0.5 rounded flex-shrink-0">
                  {s.melhor_preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 flex-shrink-0">s/ preço</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
