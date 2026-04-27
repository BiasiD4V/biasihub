import { useState, useEffect } from 'react'
import { Layers } from 'lucide-react'
import { LinhaItem } from './LinhaItem'
import {
  catalogoRepository,
  type SubcategoriaCatalogo,
  type ItemCatalogo,
} from '../../infrastructure/supabase/catalogoRepository'

interface NivelSubcategoriaProps {
  categoria: string
}

export function NivelSubcategoria({ categoria }: NivelSubcategoriaProps) {
  const [subcategorias, setSubcategorias] = useState<SubcategoriaCatalogo[]>([])
  const [subcatSel, setSubcatSel] = useState<string | null>(null)
  const [itens, setItens] = useState<ItemCatalogo[]>([])
  const [loadingSub, setLoadingSub] = useState(true)
  const [loadingItens, setLoadingItens] = useState(false)
  const [erroSub, setErroSub] = useState<string | null>(null)

  // Carregar subcategorias quando categoria mudar
  useEffect(() => {
    let mounted = true
    setLoadingSub(true)
    setErroSub(null)
    setSubcatSel(null)
    setItens([])
    catalogoRepository
      .listarSubcategorias(categoria)
      .then((data) => {
        if (mounted) setSubcategorias(data)
      })
      .catch((e: Error) => {
        if (mounted) setErroSub(e.message)
      })
      .finally(() => {
        if (mounted) setLoadingSub(false)
      })
    return () => { mounted = false }
  }, [categoria])

  // Carregar itens quando subcategoria selecionada mudar
  useEffect(() => {
    if (!subcatSel) { setItens([]); return }
    let mounted = true
    setLoadingItens(true)
    catalogoRepository
      .listarItens(categoria, subcatSel)
      .then((data) => {
        if (mounted) setItens(data)
      })
      .catch(() => {
        if (mounted) setItens([])
      })
      .finally(() => {
        if (mounted) setLoadingItens(false)
      })
    return () => { mounted = false }
  }, [categoria, subcatSel])

  if (loadingSub) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-gray-400">
        <div className="h-4 w-4 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
        Carregando subcategorias...
      </div>
    )
  }

  if (erroSub) {
    return <p className="p-4 text-sm text-red-500">Erro: {erroSub}</p>
  }

  return (
    <div className="flex-1 min-w-0">
      {/* Grid de subcategorias */}
      <div className="p-4 border-b border-gray-100">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Subcategorias em {categoria}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {subcategorias.map((sub) => (
            <button
              key={sub.subcategoria}
              onClick={() =>
                setSubcatSel(sub.subcategoria === subcatSel ? null : sub.subcategoria)
              }
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all ${
                subcatSel === sub.subcategoria
                  ? 'bg-blue-50 border-blue-400 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Layers
                size={13}
                className={subcatSel === sub.subcategoria ? 'text-blue-500' : 'text-gray-300'}
              />
              <div className="min-w-0">
                <div className="text-xs font-medium truncate">{sub.subcategoria}</div>
                <div className="text-[10px] text-gray-400">{sub.total} {sub.total === 1 ? 'item' : 'itens'}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Lista de itens da subcategoria selecionada */}
      {subcatSel && (
        <div>
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">{subcatSel}</span>
            {!loadingItens && (
              <span className="text-xs text-gray-400">{itens.length} {itens.length === 1 ? 'item' : 'itens'}</span>
            )}
          </div>

          {loadingItens ? (
            <div className="flex items-center gap-2 p-4 text-sm text-gray-400">
              <div className="h-3 w-3 rounded-full border-2 border-gray-300 border-t-transparent animate-spin" />
              Carregando itens...
            </div>
          ) : itens.length === 0 ? (
            <p className="p-4 text-sm text-gray-400 italic">Nenhum item nesta subcategoria.</p>
          ) : (
            <div>
              {/* Cabeçalho da tabela de itens */}
              <div className="flex items-center gap-3 px-4 py-1.5 bg-gray-50 border-b border-gray-100 text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
                <span className="w-4" />
                <span className="w-4" />
                <span className="flex-1">Descrição</span>
                <span className="w-12 text-center">Unid.</span>
                <span className="min-w-[80px] text-right">Fornecedores</span>
                <span className="min-w-[160px] text-right">Faixa de Preço</span>
              </div>
              {itens.map((item) => (
                <LinhaItem key={item.descricao} item={item} />
              ))}
            </div>
          )}
        </div>
      )}

      {!subcatSel && (
        <div className="p-6 text-sm text-gray-400 italic">
          Selecione uma subcategoria acima para ver os itens.
        </div>
      )}
    </div>
  )
}
