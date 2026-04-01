import { useState, useEffect } from 'react'
import { ChevronRight, FolderOpen, Folder } from 'lucide-react'
import { NivelSubcategoria } from './NivelSubcategoria'
import {
  catalogoRepository,
  type CategoriaCatalogo,
} from '../../infrastructure/supabase/catalogoRepository'

export function CatalogoArvore() {
  const [categorias, setCategorias] = useState<CategoriaCatalogo[]>([])
  const [categoriaSel, setCategoriaSel] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    catalogoRepository
      .listarCategorias()
      .then(setCategorias)
      .catch((e: Error) => setErro(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 gap-3 text-gray-400">
        <div className="h-5 w-5 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
        <span className="text-sm">Carregando catálogo...</span>
      </div>
    )
  }

  if (erro) {
    return (
      <div className="p-6 text-sm text-red-500">
        <p className="font-medium">Erro ao carregar catálogo</p>
        <p className="text-xs mt-1 text-red-400">{erro}</p>
        <p className="text-xs mt-2 text-gray-400">
          Verifique se o migration <code>10-catalogo.sql</code> foi executado no Supabase.
        </p>
      </div>
    )
  }

  if (categorias.length === 0) {
    return (
      <div className="p-6 text-sm text-gray-400 text-center">
        <p className="font-medium text-gray-500 mb-1">Nenhuma categoria encontrada</p>
        <p className="text-xs">
          Execute o script <code className="bg-gray-100 px-1 rounded">scripts/categorizar-insumos.ts</code> para categorizar os insumos.
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-[500px] border border-gray-200 rounded-lg overflow-hidden bg-white">
      {/* Sidebar — Categorias */}
      <div className="w-56 flex-shrink-0 border-r border-gray-100 bg-gray-50 overflow-y-auto">
        <div className="px-3 py-2.5 border-b border-gray-100">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
            Categorias
          </p>
        </div>
        <nav className="py-1">
          {categorias.map((cat) => {
            const ativo = categoriaSel === cat.categoria
            return (
              <button
                key={cat.categoria}
                onClick={() =>
                  setCategoriaSel(ativo ? null : cat.categoria)
                }
                className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                  ativo
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {ativo ? (
                  <FolderOpen size={14} className="flex-shrink-0 text-blue-200" />
                ) : (
                  <Folder size={14} className="flex-shrink-0 text-gray-300" />
                )}
                <span className="flex-1 text-xs font-medium truncate">
                  {cat.categoria}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${
                    ativo
                      ? 'bg-blue-500 text-blue-100'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {cat.total}
                </span>
                {!ativo && (
                  <ChevronRight size={11} className="text-gray-300 flex-shrink-0" />
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Área principal */}
      <div className="flex-1 min-w-0 overflow-y-auto">
        {/* Breadcrumb */}
        {categoriaSel && (
          <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-100 bg-white text-xs text-gray-500">
            <button
              onClick={() => setCategoriaSel(null)}
              className="hover:text-blue-600 transition-colors"
            >
              Catálogo
            </button>
            <ChevronRight size={12} className="text-gray-300" />
            <span className="text-gray-700 font-medium">{categoriaSel}</span>
          </div>
        )}

        {categoriaSel ? (
          <NivelSubcategoria categoria={categoriaSel} />
        ) : (
          <div className="p-6 text-sm text-gray-400 italic">
            Selecione uma categoria na barra lateral para navegar pelos itens.
          </div>
        )}
      </div>
    </div>
  )
}
