import React from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react'

export default function KpiCard({ titulo, valor, subtitulo, icone: Icone, cor = 'blue', variacao, variacaoTexto, href }) {
  const estilos = {
    blue:   { bg: '#eef1f8', iconColor: '#233772', border: '#dde3f0' },
    yellow: { bg: '#FFF3CC', iconColor: '#e6b000', border: '#FFE066' },
    green:  { bg: '#f0fdf4', iconColor: '#16a34a', border: '#bbf7d0' },
    red:    { bg: '#fef2f2', iconColor: '#dc2626', border: '#fecaca' },
    gray:   { bg: '#f8fafc', iconColor: '#B3B3B3', border: '#e5e7eb' },
    // compatibilidade com cor 'orange' legada
    orange: { bg: '#eef1f8', iconColor: '#233772', border: '#dde3f0' },
  }
  const s = estilos[cor] || estilos.blue

  const conteudo = (
    <>
      <div className="flex items-start justify-between mb-2">
        <p className="text-[10px] font-bold uppercase tracking-wider leading-tight pr-2" style={{ color: '#64748b' }}>{titulo}</p>
        {Icone && (
          <div className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center transition-all duration-200 group-hover:scale-110" style={{ backgroundColor: s.bg, boxShadow: `0 2px 8px ${s.iconColor}15` }}>
            <Icone size={18} style={{ color: s.iconColor }} />
          </div>
        )}
      </div>
      <p className="text-2xl font-bold mb-1 leading-tight" style={{ color: '#233772' }}>{valor}</p>
      {subtitulo && <p className="text-[11px] font-medium leading-tight" style={{ color: '#64748b' }}>{subtitulo}</p>}
      {variacao !== undefined && (
        <div className="flex items-center gap-1 mt-2 text-xs font-bold px-2 py-0.5 rounded-lg w-fit"
          style={{
            color: variacao > 0 ? '#16a34a' : variacao < 0 ? '#dc2626' : '#64748b',
            backgroundColor: variacao > 0 ? '#f0fdf4' : variacao < 0 ? '#fef2f2' : '#f8fafc'
          }}>
          {variacao > 0 ? <TrendingUp size={12} /> : variacao < 0 ? <TrendingDown size={12} /> : <Minus size={12} />}
          <span>{variacaoTexto || `${variacao > 0 ? '+' : ''} ${Math.abs(variacao)}%`}</span>
        </div>
      )}
      {href && (
        <div className="flex items-center gap-1 mt-2 text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-all duration-200" style={{ color: s.iconColor }}>
          <span>Ver detalhes</span>
          <ArrowRight size={11} />
        </div>
      )}
    </>
  )

  if (href) {
    return (
      <Link to={href} className="group block bg-white rounded-xl p-4 transition-all duration-300"
        style={{
          border: `1px solid ${s.border}`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.boxShadow = '0 8px 16px rgba(35,55,114,0.12)'
          e.currentTarget.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'
          e.currentTarget.style.transform = 'translateY(0)'
        }}>
        {conteudo}
      </Link>
    )
  }

  return (
    <div className="bg-white rounded-xl p-4 transition-all duration-200"
      style={{
        border: `1px solid ${s.border}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
      {conteudo}
    </div>
  )
}
