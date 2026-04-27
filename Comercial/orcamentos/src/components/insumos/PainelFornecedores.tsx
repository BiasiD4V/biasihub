import { useState, useEffect } from 'react'
import { BadgeABC } from './BadgeABC'
import { catalogoRepository, type FornecedorDoItem } from '../../infrastructure/supabase/catalogoRepository'

interface PainelFornecedoresProps {
  descricao: string
  unidade: string
}

const CLASSIFICACOES: Array<'A' | 'B' | 'C'> = ['A', 'B', 'C']

const LABEL_ABC: Record<'A' | 'B' | 'C', string> = {
  A: 'Melhor qualidade/prazo',
  B: 'Boa relação custo-benefício',
  C: 'Usar apenas se necessário',
}

export function PainelFornecedores({ descricao, unidade }: PainelFornecedoresProps) {
  const [fornecedores, setFornecedores] = useState<FornecedorDoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  // Estado do mini-modal de classificação
  const [classificandoNome, setClassificandoNome] = useState<string | null>(null)
  const [novaClassif, setNovaClassif] = useState<'A' | 'B' | 'C'>('A')
  const [novoCriterio, setNovoCriterio] = useState('')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setErro(null)
    catalogoRepository
      .listarFornecedoresDoItem(descricao)
      .then((data) => {
        if (mounted) setFornecedores(data)
      })
      .catch((e: Error) => {
        if (mounted) setErro(e.message)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => { mounted = false }
  }, [descricao])

  const formatCusto = (v: number) =>
    v > 0
      ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
      : '—'

  const formatData = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('pt-BR') : '—'

  const menorCusto = fornecedores.length
    ? Math.min(...fornecedores.filter((f) => f.custo_atual > 0).map((f) => f.custo_atual))
    : null

  async function salvarClassificacao() {
    if (!classificandoNome) return
    setSalvando(true)
    try {
      await catalogoRepository.salvarClassificacaoABC(
        classificandoNome,
        novaClassif,
        novoCriterio || undefined
      )
      // Atualizar localmente
      setFornecedores((prev) =>
        prev.map((f) =>
          f.fornecedor === classificandoNome
            ? { ...f, fornecedor_abc: novaClassif }
            : f
        )
      )
      setClassificandoNome(null)
      setNovoCriterio('')
    } catch (e) {
      alert('Erro ao salvar classificação.')
    } finally {
      setSalvando(false)
    }
  }

  if (loading) {
    return (
      <div className="px-4 py-3 bg-blue-50 border-t border-blue-100">
        <div className="flex items-center gap-2 text-sm text-blue-500">
          <div className="h-3 w-3 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
          Carregando fornecedores...
        </div>
      </div>
    )
  }

  if (erro) {
    return (
      <div className="px-4 py-2 bg-red-50 border-t border-red-100 text-xs text-red-600">
        Erro: {erro}
      </div>
    )
  }

  if (fornecedores.length === 0) {
    return (
      <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-400 italic">
        Nenhum fornecedor cadastrado para este item.
      </div>
    )
  }

  return (
    <div className="bg-blue-50 border-t border-blue-100">
      {/* Cabeçalho */}
      <div className="px-4 pt-2 pb-1 flex items-center gap-2">
        <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">
          Fornecedores — {descricao}
        </span>
        <span className="text-xs text-blue-400">({unidade})</span>
        <span className="ml-auto text-xs text-gray-400">{fornecedores.length} fornecedor{fornecedores.length !== 1 ? 'es' : ''}</span>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto pb-2">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-blue-200 text-blue-600">
              <th className="px-4 py-1.5 text-left font-medium">Fornecedor</th>
              <th className="px-3 py-1.5 text-right font-medium">Custo Atual</th>
              <th className="px-3 py-1.5 text-center font-medium">Última Atualização</th>
              <th className="px-3 py-1.5 text-center font-medium">Dias</th>
              <th className="px-3 py-1.5 text-center font-medium">ABC</th>
              <th className="px-3 py-1.5 text-center font-medium">Ação</th>
            </tr>
          </thead>
          <tbody>
            {fornecedores.map((f, i) => {
              const isMelhor = menorCusto !== null && f.custo_atual === menorCusto && f.custo_atual > 0
              return (
                <tr
                  key={f.id}
                  className={`border-b border-blue-100 transition-colors ${
                    isMelhor
                      ? 'bg-green-50 ring-1 ring-green-300 ring-inset'
                      : i % 2 === 0
                      ? 'bg-white/60'
                      : 'bg-blue-50/40'
                  }`}
                >
                  <td className="px-4 py-1.5 font-medium text-gray-800">
                    <div className="flex items-center gap-1.5">
                      {isMelhor && (
                        <span className="text-green-600 text-[10px] font-bold bg-green-100 px-1 rounded">
                          ↓ Menor
                        </span>
                      )}
                      {f.fornecedor ?? <span className="text-gray-400 italic">Sem fornecedor</span>}
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-right font-semibold text-gray-700">
                    {formatCusto(f.custo_atual)}
                  </td>
                  <td className="px-3 py-1.5 text-center text-gray-500">
                    {formatData(f.data_ultimo_preco)}
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    {f.dias_sem_atualizar !== null ? (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          f.dias_sem_atualizar > 180
                            ? 'bg-red-100 text-red-600'
                            : f.dias_sem_atualizar > 90
                            ? 'bg-yellow-100 text-yellow-600'
                            : 'bg-green-100 text-green-600'
                        }`}
                      >
                        {f.dias_sem_atualizar}d
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <BadgeABC classificacao={f.fornecedor_abc} />
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    <button
                      onClick={() => {
                        setClassificandoNome(f.fornecedor ?? '')
                        setNovaClassif(f.fornecedor_abc ?? 'A')
                        setNovoCriterio('')
                      }}
                      className="text-[10px] text-blue-600 hover:text-blue-800 underline"
                    >
                      Classificar
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mini-modal de classificação */}
      {classificandoNome !== null && (
        <div className="mx-4 mb-3 p-3 bg-white border border-blue-200 rounded-lg shadow-sm">
          <p className="text-xs font-semibold text-gray-700 mb-2">
            Classificar: <span className="text-blue-600">{classificandoNome}</span>
          </p>
          <div className="flex gap-2 mb-2">
            {CLASSIFICACOES.map((c) => (
              <button
                key={c}
                onClick={() => setNovaClassif(c)}
                className={`flex-1 py-1 rounded border text-xs font-bold transition-all ${
                  novaClassif === c
                    ? c === 'A'
                      ? 'bg-green-500 text-white border-green-500'
                      : c === 'B'
                      ? 'bg-yellow-400 text-white border-yellow-400'
                      : 'bg-red-500 text-white border-red-500'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
                }`}
              >
                {c} — {LABEL_ABC[c]}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Critério (opcional) — ex: melhor preço + prazo"
            value={novoCriterio}
            onChange={(e) => setNovoCriterio(e.target.value)}
            className="w-full text-xs border border-gray-200 rounded px-2 py-1 mb-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setClassificandoNome(null)}
              className="text-xs px-3 py-1 text-gray-500 hover:text-gray-700"
            >
              Cancelar
            </button>
            <button
              onClick={salvarClassificacao}
              disabled={salvando}
              className="text-xs px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
