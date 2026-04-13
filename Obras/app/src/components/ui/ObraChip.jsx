import { useState, useRef, useEffect } from 'react'
import { Building2, ChevronDown, Search, Check, Layers } from 'lucide-react'
import { obrasService } from '../../lib/supabase'
import { useObra } from '../../context/ObraContext'
import useObrasAcessiveis from '../../hooks/useObrasAcessiveis'

/**
 * ObraChip — seletor compacto de obra para uso no Header.
 * '' (vazio) = "Todas as obras que tenho acesso"
 * uuid       = obra específica selecionada
 */
export default function ObraChip() {
  const { obraSelecionadaId, obraAtual, setObraSelecionada } = useObra()
  const [todasObras, setTodasObras] = useState([])
  const obras = useObrasAcessiveis(todasObras)
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState(false)
  const ref = useRef(null)

  // Carrega lista completa de obras ao montar
  useEffect(() => {
    obrasService.listar().then(data => setTodasObras(data || []))
  }, [])

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setAberto(false)
        setBusca('')
      }
    }
    if (aberto) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [aberto])

  // Filtra obras pelo texto de busca (não afeta a opção "Todas")
  const obrasFiltradas = busca
    ? obras.filter(o =>
        o.nome?.toLowerCase().includes(busca.toLowerCase()) ||
        o.codigo?.toLowerCase().includes(busca.toLowerCase())
      )
    : obras

  // Opção "Todas" visível quando não há busca ou busca corresponde
  const mostrarTodas = !busca || 'todas as obras'.includes(busca.toLowerCase())

  // Estado atual do chip
  const isTodas = !obraSelecionadaId
  const labelExibir = isTodas
    ? 'Todas as obras'
    : (obraAtual?.codigo ? `${obraAtual.codigo} — ${obraAtual.nome}` : (obraAtual?.nome ?? 'Selecionar obra'))

  return (
    <div ref={ref} className="relative hidden md:flex items-center">
      {/* ─── Botão principal ─── */}
      <button
        onClick={() => setAberto(v => !v)}
        className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 transition-all duration-200 max-w-[240px]"
        style={{
          backgroundColor: '#eef2ff',
          color: '#233772',
          border: '1px solid #c7d2fe',
        }}
        title={labelExibir}
      >
        {isTodas
          ? <Layers size={13} className="flex-shrink-0" />
          : <Building2 size={13} className="flex-shrink-0" />
        }
        <span
          className="text-xs font-semibold truncate"
          style={{ maxWidth: 170, fontFamily: 'Montserrat, sans-serif' }}
        >
          {labelExibir}
        </span>
        <ChevronDown
          size={12}
          className="flex-shrink-0 transition-transform duration-200"
          style={{ transform: aberto ? 'rotate(180deg)' : 'none' }}
        />
      </button>

      {/* ─── Dropdown ─── */}
      {aberto && (
        <div
          className="absolute top-full mt-1.5 right-0 bg-white rounded-xl shadow-2xl z-50"
          style={{ width: 380, border: '1px solid #e2e8f0' }}
        >
          {/* Cabeçalho com busca */}
          <div className="px-3 pt-3 pb-2" style={{ borderBottom: '1px solid #f1f5f9' }}>
            <p
              className="text-[10px] font-bold uppercase tracking-wider mb-2"
              style={{ color: '#94a3b8', fontFamily: 'Montserrat, sans-serif' }}
            >
              Selecionar obra
            </p>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou código..."
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs border outline-none focus:ring-2"
                style={{
                  borderColor: '#e2e8f0',
                  fontFamily: 'Montserrat, sans-serif',
                  color: '#233772',
                }}
                autoFocus
              />
            </div>
          </div>

          {/* Lista */}
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {/* Opção "Todas as obras que tenho acesso" */}
            {mostrarTodas && (
              <div
                onClick={() => { setObraSelecionada(''); setAberto(false); setBusca('') }}
                className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors hover:bg-blue-50"
                style={{ backgroundColor: isTodas ? '#eef2ff' : undefined }}
              >
                <div
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: isTodas ? '#233772' : '#f1f5f9',
                    color: isTodas ? '#fff' : '#94a3b8',
                  }}
                >
                  {isTodas ? <Check size={11} /> : <Layers size={11} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs font-semibold"
                    style={{ color: '#233772', fontFamily: 'Montserrat, sans-serif' }}
                  >
                    Todas as obras que tenho acesso
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {obras.length} obra{obras.length !== 1 ? 's' : ''} disponível{obras.length !== 1 ? 'eis' : ''}
                  </p>
                </div>
              </div>
            )}

            {/* Separador entre "Todas" e obras individuais */}
            {mostrarTodas && obrasFiltradas.length > 0 && (
              <div className="mx-3 my-0.5" style={{ borderTop: '1px solid #f1f5f9' }} />
            )}

            {/* Obras individuais */}
            {obrasFiltradas.length === 0 && !mostrarTodas ? (
              <div className="py-8 text-center text-sm text-slate-400">
                Nenhuma obra encontrada
              </div>
            ) : (
              obrasFiltradas.map(obra => {
                const ativa = obraSelecionadaId === obra.id
                return (
                  <div
                    key={obra.id}
                    onClick={() => { setObraSelecionada(obra.id); setAberto(false); setBusca('') }}
                    className="flex items-center gap-2.5 px-3 py-2.5 cursor-pointer transition-colors hover:bg-blue-50"
                    style={{ backgroundColor: ativa ? '#eef2ff' : undefined }}
                  >
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: ativa ? '#233772' : '#f1f5f9',
                        color: ativa ? '#fff' : '#94a3b8',
                      }}
                    >
                      {ativa ? <Check size={11} /> : <Building2 size={11} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-xs font-semibold truncate"
                        style={{ color: '#233772', fontFamily: 'Montserrat, sans-serif' }}
                      >
                        {obra.nome}
                      </p>
                      {obra.codigo && (
                        <p className="text-[10px] text-slate-400">{obra.codigo}</p>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
