import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Lock } from 'lucide-react'

/**
 * ProtectedByObra — Route guard que verifica se usuário tem acesso à obra
 *
 * Uso:
 * <ProtectedByObra obraId={obraId} minPerfil="planejamento">
 *   <SeuComponente />
 * </ProtectedByObra>
 *
 * Props:
 * - obraId: UUID da obra para verificar acesso
 * - minPerfil: (opcional) perfil mínimo requerido ('admin', 'diretor', 'gerente', 'planejamento', 'supervisor', 'visualizador')
 * - fallback: (opcional) elemento a renderizar se sem acesso (default: 403 page)
 */
export function ProtectedByObra({ obraId, minPerfil = null, children, fallback = null }) {
  const { usuario, podeVerObra, carregando } = useAuth()

  // LOG DE DEPURAÇÃO TEMPORÁRIO
  if (usuario) {
    // eslint-disable-next-line no-console
    console.log('[ProtectedByObra] usuario:', usuario.perfil, 'obraId:', obraId, 'podeVerObra:', podeVerObra(obraId))
  }

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 rounded-full animate-spin mx-auto mb-3"
            style={{ borderColor: '#e5e7eb', borderTopColor: '#233772' }} />
          <p className="text-sm font-medium" style={{ color: '#233772' }}>
            Verificando acesso...
          </p>
        </div>
      </div>
    )
  }

  if (!usuario) {
    return <Navigate to="/login" replace />
  }

  // Verifica se tem acesso à obra
  if (!podeVerObra(obraId)) {
    if (fallback) return fallback
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
          <Lock className="mx-auto mb-4 text-slate-400" size={32} />
          <h1 className="text-xl font-bold text-slate-900 mb-2">Acesso Negado</h1>
          <p className="text-sm text-slate-600 mb-6">
            Você não tem permissão para acessar esta obra.
          </p>
          <a
            href="/"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded font-semibold text-sm hover:bg-blue-700"
          >
            Voltar ao Dashboard
          </a>
        </div>
      </div>
    )
  }

  // Verifica perfil mínimo requerido
  if (minPerfil) {
    const perfisHierarquia = ['admin', 'diretor', 'gerente', 'planejamento', 'supervisor', 'visualizador']
    const indexAtual = perfisHierarquia.indexOf(usuario.perfil)
    const indexRequerido = perfisHierarquia.indexOf(minPerfil)

    if (indexAtual > indexRequerido) {
      if (fallback) return fallback
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-slate-200 p-8 text-center">
            <Lock className="mx-auto mb-4 text-slate-400" size={32} />
            <h1 className="text-xl font-bold text-slate-900 mb-2">Perfil Insuficiente</h1>
            <p className="text-sm text-slate-600 mb-6">
              Seu perfil ({usuario.perfil}) não tem permissão para este recurso. Requere: {minPerfil}
            </p>
            <a
              href="/"
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded font-semibold text-sm hover:bg-blue-700"
            >
              Voltar ao Dashboard
            </a>
          </div>
        </div>
      )
    }
  }

  return children
}
