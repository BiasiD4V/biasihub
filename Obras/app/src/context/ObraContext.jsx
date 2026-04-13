import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { obrasService, supabase } from '../lib/supabase'

const ObraContext = createContext(null)

export function ObraProvider({ children }) {
  const [obras, setObras] = useState([])
  const [obraSelecionadaId, setObraSelecionadaId] = useState('')
  const [planejamentoId, setPlanejamentoId] = useState(null)
  const [versaoPlanejamento, setVersaoPlanejamento] = useState(1)
  const [carregando, setCarregando] = useState(true)

  async function carregarObrasComMovimentos() {
    const [todasObras, contratos, medicoes, pedidos] = await Promise.all([
      obrasService.listar(),
      supabase.from('contratos').select('obra_id').not('obra_id', 'is', null).range(0, 9999),
      supabase.from('medicoes_contrato').select('obra_id').not('obra_id', 'is', null).range(0, 9999),
      supabase.from('pedidos_compra').select('obra_id').not('obra_id', 'is', null).range(0, 9999),
    ])
    const idsComMovimento = new Set([
      ...(contratos.data || []).map(r => r.obra_id),
      ...(medicoes.data || []).map(r => r.obra_id),
      ...(pedidos.data || []).map(r => r.obra_id),
    ])
    return (todasObras || []).filter(o => idsComMovimento.has(o.id))
  }

  useEffect(() => {
    carregarObrasComMovimentos()
      .then(data => setObras(data))
      .catch(err => console.error('Erro ao carregar obras:', err))
      .finally(() => setCarregando(false))
  }, [])

  // Carregar planejamento ativo quando obra muda
  useEffect(() => {
    if (!obraSelecionadaId) {
      setPlanejamentoId(null)
      setVersaoPlanejamento(1)
      return
    }

    supabase
      .from('obra_planejamentos')
      .select('id, versao')
      .eq('obra_id', obraSelecionadaId)
      .order('versao', { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data?.[0]) {
          setPlanejamentoId(data[0].id)
          setVersaoPlanejamento(data[0].versao)
        } else {
          setPlanejamentoId(null)
          setVersaoPlanejamento(1)
        }
      })
      .catch(err => console.error('Erro ao carregar planejamento:', err))
  }, [obraSelecionadaId])

  const setObraSelecionada = useCallback((id) => {
    setObraSelecionadaId(id || '')
  }, [])

  const obraAtual = obras.find(o => o.id === obraSelecionadaId) || null

  const recarregarObras = useCallback(async () => {
    const data = await carregarObrasComMovimentos()
    setObras(data)
  }, [])

  return (
    <ObraContext.Provider value={{
      obras,
      obraSelecionadaId,
      obraAtual,
      setObraSelecionada,
      carregando,
      recarregarObras,
      planejamentoId,
      versaoPlanejamento,
    }}>
      {children}
    </ObraContext.Provider>
  )
}

export function useObra() {
  const ctx = useContext(ObraContext)
  if (!ctx) throw new Error('useObra deve ser usado dentro de ObraProvider')
  return ctx
}
