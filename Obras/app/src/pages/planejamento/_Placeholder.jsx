// Componente placeholder reutilizável para páginas em construção
import React from 'react'
import { Construction } from 'lucide-react'

export default function Placeholder({ titulo, descricao, icone: Icone = Construction }) {
  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ backgroundColor: '#EEF2FF' }}>
        <Icone size={28} style={{ color: '#233772' }} />
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ color: '#233772', fontFamily: 'Montserrat, sans-serif' }}>
        {titulo}
      </h2>
      <p className="text-sm text-slate-500 max-w-sm">{descricao}</p>
      <div className="mt-4 px-3 py-1 rounded-full text-xs font-semibold"
        style={{ backgroundColor: '#FFF3CD', color: '#856404' }}>
        Em desenvolvimento
      </div>
    </div>
  )
}
