// ============================================================================
// pages/DespesasIndiretas.jsx
// Despesas Indiretas (DI) por obra e mês
// Acesso: admin / master somente (gerenciar_di)
// Diretor/Gerente podem visualizar (ver_di)
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react'
import {
  Layers, Plus, Trash2, Edit2, X, AlertCircle,
  ChevronDown, ChevronRight, Download, Info
} from 'lucide-react'
import { supabase, despesasIndiretasService } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import SearchableSelect, { obrasParaOptions } from '../components/ui/SearchableSelect'

// ─── Constantes ──────────────────────────────────────────────
const CATEGORIAS_DI = [
  'Equipamentos e Ferramentas',
  'Transporte e Logística',
  'EPI / EPC',
  'Comunicação e TI',
  'Alimentação e Hospedagem',
  'Exames e Treinamentos',
  'Manutenção',
  'Taxas e Licenças',
  'Outros',
]

const MESES = [
  { v: 1,  l: 'Janeiro'   }, { v: 2,  l: 'Fevereiro' }, { v: 3,  l: 'Março'    },
  { v: 4,  l: 'Abril'     }, { v: 5,  l: 'Maio'      }, { v: 6,  l: 'Junho'    },
  { v: 7,  l: 'Julho'     }, { v: 8,  l: 'Agosto'    }, { v: 9,  l: 'Setembro' },
  { v: 10, l: 'Outubro'   }, { v: 11, l: 'Novembro'  }, { v: 12, l: 'Dezembro' },
]

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(v || 0)
}

function nomeMes(n) {
  return MESES.find(m => m.v === n)?.l ?? String(n)
}

// ─── Modal adicionar / editar ────────────────────────────────
function ModalDI({ item, obras, onSalvar, onCancelar }) {
  const hoje = new Date()
  const isEdicao = !!item?.id

  const [obraId,     setObraId]     = useState(item?.obra_id     ?? '')
  const [mes,        setMes]        = useState(item?.mes         ?? hoje.getMonth() + 1)
  const [ano,        setAno]        = useState(item?.ano         ?? hoje.getFullYear())
  const [categoria,  setCategoria]  = useState(item?.categoria   ?? CATEGORIAS_DI[0])
  const [descricao,  setDescricao]  = useState(item?.descricao   ?? '')
  const [valor,      setValor]      = useState(item?.valor       ?? '')
  const [salvando,   setSalvando]   = useState(false)
  const [erro,       setErro]       = useState(null)

  const anos = useMemo(() => {
    const y = hoje.getFullYear()
    return [y - 1, y, y + 1]
  }, [])

  async function handleSalvar() {
    if (!obraId || !valor || isNaN(parseFloat(valor))) {
      setErro('Preencha obra e valor corretamente.')
      return
    }
    setSalvando(true)
    setErro(null)
    try {
      await onSalvar({
        id:        item?.id,
        obra_id:   obraId,
        mes:       Number(mes),
        ano:       Number(ano),
        categoria,
        descricao,
        valor:     parseFloat(String(valor).replace(',', '.')),
      })
    } catch (e) {
      setErro('Erro ao salvar: ' + e.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800">
            {isEdicao ? 'Editar Despesa Indireta' : 'Nova Despesa Indireta'}
          </h3>
          <button onClick={onCancelar} className="p-1 rounded hover:bg-slate-100">
            <X size={18} />
          </button>
        </div>

        {erro && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle size={14} /> {erro}
          </div>
        )}

        {/* Obra */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600 uppercase">Obra</label>
          <SearchableSelect
            value={obraId}
            onChange={setObraId}
            options={obrasParaOptions(obras)}
            placeholder="Selecione uma obra..."
            clearable
          />
        </div>

        {/* Mês / Ano */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 uppercase">Mês</label>
            <select
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={mes}
              onChange={e => setMes(Number(e.target.value))}
            >
              {MESES.map(m => (
                <option key={m.v} value={m.v}>{m.l}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-slate-600 uppercase">Ano</label>
            <select
              className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={ano}
              onChange={e => setAno(Number(e.target.value))}
            >
              {anos.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Categoria */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600 uppercase">Categoria</label>
          <select
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={categoria}
            onChange={e => setCategoria(e.target.value)}
          >
            {CATEGORIAS_DI.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Descrição */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600 uppercase">Descrição</label>
          <input
            type="text"
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Ex.: Aluguel de andaime — frente norte"
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
          />
        </div>

        {/* Valor */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600 uppercase">Valor (R$)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="0,00"
            value={valor}
            onChange={e => setValor(e.target.value)}
          />
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onCancelar}
            className="px-4 py-2 rounded-lg border text-sm text-slate-600 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSalvar}
            disabled={salvando}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: '#233772' }}
          >
            {salvando ? 'Salvando…' : isEdicao ? 'Salvar alterações' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────
export default function DespesasIndiretas() {
  const { usuario } = useAuth()
  const hoje = new Date()

  const podeGerenciar = ['admin', 'master'].includes(usuario?.perfil)
  const podeVer       = ['admin', 'master', 'diretor', 'gerente'].includes(usuario?.perfil)

  const [despesas,       setDespesas]       = useState([])
  const [obras,          setObras]          = useState([])
  const [carregando,     setCarregando]     = useState(true)
  const [erro,           setErro]           = useState(null)
  const [modalAberto,    setModalAberto]    = useState(false)
  const [itemEdicao,     setItemEdicao]     = useState(null)
  const [confirmExcluir, setConfirmExcluir] = useState(null)

  // Filtros
  const [filtroObra, setFiltroObra] = useState('')
  const [filtroMes,  setFiltroMes]  = useState('')
  const [filtroAno,  setFiltroAno]  = useState(hoje.getFullYear())

  // Grupos expandidos
  const [expandidos, setExpandidos] = useState({})

  useEffect(() => { carregar() }, [filtroAno])

  async function carregar() {
    setCarregando(true)
    setErro(null)
    try {
      const [despData, obrasData] = await Promise.all([
        despesasIndiretasService.listar({ ano: filtroAno }),
        supabase.from('obras').select('id, nome').order('nome').then(r => r.data || []),
      ])
      setDespesas(despData)
      setObras(obrasData)
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }

  // Aplica filtros locais (mes, obra)
  const despesasFiltradas = useMemo(() => {
    return despesas.filter(d => {
      if (filtroObra && d.obra_id !== filtroObra) return false
      if (filtroMes  && d.mes    !== Number(filtroMes))  return false
      return true
    })
  }, [despesas, filtroObra, filtroMes])

  // Agrupa por mês para exibição
  const porMes = useMemo(() => {
    const grupos = {}
    despesasFiltradas.forEach(d => {
      const k = `${d.ano}-${String(d.mes).padStart(2,'0')}`
      if (!grupos[k]) grupos[k] = { mes: d.mes, ano: d.ano, itens: [] }
      grupos[k].itens.push(d)
    })
    return Object.entries(grupos)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([k, v]) => ({ k, ...v }))
  }, [despesasFiltradas])

  const totalGeral = useMemo(
    () => despesasFiltradas.reduce((s, d) => s + (parseFloat(d.valor) || 0), 0),
    [despesasFiltradas]
  )

  async function handleSalvar(payload) {
    const salvo = await despesasIndiretasService.salvar(payload)
    setDespesas(prev => {
      const idx = prev.findIndex(d => d.id === salvo.id)
      return idx >= 0 ? prev.map((d, i) => i === idx ? salvo : d) : [...prev, salvo]
    })
    setModalAberto(false)
    setItemEdicao(null)
  }

  async function handleExcluir(id) {
    await despesasIndiretasService.excluir(id)
    setDespesas(prev => prev.filter(d => d.id !== id))
    setConfirmExcluir(null)
  }

  function toggleExpanDir(k) {
    setExpandidos(prev => ({ ...prev, [k]: !prev[k] }))
  }

  function exportarCsv() {
    const linhas = [
      ['Mês', 'Ano', 'Obra', 'Categoria', 'Descrição', 'Valor (R$)'],
      ...despesasFiltradas.map(d => [
        nomeMes(d.mes), d.ano,
        d.obra?.nome ?? d.obra_id,
        d.categoria, d.descricao ?? '',
        String(d.valor).replace('.', ','),
      ]),
    ]
    const csv = linhas.map(l => l.join(';')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `despesas_indiretas_${filtroAno}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!podeVer) {
    return (
      <div className="p-8 text-center bg-red-50 text-red-700 rounded-xl">
        <AlertCircle className="mx-auto mb-2" size={24} />
        <p className="font-semibold">Sem permissão para visualizar Despesas Indiretas.</p>
      </div>
    )
  }

  const anos = [hoje.getFullYear() - 1, hoje.getFullYear(), hoje.getFullYear() + 1]

  return (
    <div className="p-4 md:p-6 flex flex-col gap-5" style={{ fontFamily: 'Montserrat, sans-serif' }}>

      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: '#233772' }}>
            <Layers size={22} /> Despesas Indiretas (DI)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Custos indiretos alocados por obra e mês — compõem o Resultado Operacional
          </p>
        </div>
        <div className="flex gap-2">
          {despesasFiltradas.length > 0 && (
            <button
              onClick={exportarCsv}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm text-slate-600 hover:bg-slate-50"
            >
              <Download size={15} /> CSV
            </button>
          )}
          {podeGerenciar && (
            <button
              onClick={() => { setItemEdicao(null); setModalAberto(true) }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: '#233772' }}
            >
              <Plus size={15} /> Nova Despesa
            </button>
          )}
        </div>
      </div>

      {/* Aviso se tabela não existe */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-sm text-amber-800">
        <Info size={16} className="flex-shrink-0 mt-0.5 text-amber-600" />
        <div>
          <p className="font-semibold mb-1">Pré-requisito: tabela <code>despesas_indiretas</code></p>
          <p className="text-xs">Execute no Supabase SQL Editor:</p>
          <pre className="mt-1 text-xs bg-amber-100 rounded p-2 overflow-x-auto whitespace-pre-wrap">{`CREATE TABLE despesas_indiretas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obra_id     uuid REFERENCES obras(id) ON DELETE CASCADE,
  mes         smallint NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano         smallint NOT NULL,
  categoria   text NOT NULL,
  descricao   text,
  valor       numeric(14,2) NOT NULL DEFAULT 0,
  criado_por  uuid REFERENCES auth.users(id),
  criado_em   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE despesas_indiretas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leitura_autenticado" ON despesas_indiretas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "escrita_admin" ON despesas_indiretas FOR ALL USING (
  EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil IN ('admin','master'))
);`}</pre>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 p-4 bg-white rounded-xl border">
        <div className="flex flex-col gap-1 min-w-[200px]">
          <label className="text-xs font-semibold text-slate-500 uppercase">Ano</label>
          <select
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={filtroAno}
            onChange={e => setFiltroAno(Number(e.target.value))}
          >
            {anos.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1 min-w-[160px]">
          <label className="text-xs font-semibold text-slate-500 uppercase">Mês</label>
          <select
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={filtroMes}
            onChange={e => setFiltroMes(e.target.value)}
          >
            <option value="">Todos</option>
            {MESES.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1 flex-1 min-w-[240px]">
          <label className="text-xs font-semibold text-slate-500 uppercase">Obra</label>
          <SearchableSelect
            value={filtroObra}
            onChange={setFiltroObra}
            options={obrasParaOptions(obras)}
            placeholder="Todas as obras"
            clearable
          />
        </div>
      </div>

      {/* Erro */}
      {erro && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle size={16} /> {erro}
        </div>
      )}

      {/* Carregando */}
      {carregando && (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mr-2" />
          Carregando…
        </div>
      )}

      {/* KPI total */}
      {!carregando && despesasFiltradas.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total DI</p>
            <p className="text-2xl font-bold mt-1" style={{ color: '#233772' }}>{fmt(totalGeral)}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Registros</p>
            <p className="text-2xl font-bold mt-1 text-slate-700">{despesasFiltradas.length}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Obras com DI</p>
            <p className="text-2xl font-bold mt-1 text-slate-700">
              {new Set(despesasFiltradas.map(d => d.obra_id)).size}
            </p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Média / Obra</p>
            <p className="text-2xl font-bold mt-1 text-slate-700">
              {fmt(totalGeral / Math.max(1, new Set(despesasFiltradas.map(d => d.obra_id)).size))}
            </p>
          </div>
        </div>
      )}

      {/* Lista agrupada por mês */}
      {!carregando && (
        porMes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
            <Layers size={40} strokeWidth={1} />
            <p className="text-sm">Nenhuma despesa indireta registrada para o período.</p>
            {podeGerenciar && (
              <button
                onClick={() => { setItemEdicao(null); setModalAberto(true) }}
                className="mt-1 text-sm font-semibold underline"
                style={{ color: '#233772' }}
              >
                Registrar primeira despesa
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {porMes.map(({ k, mes, ano, itens }) => {
              const totalMes = itens.reduce((s, d) => s + (parseFloat(d.valor) || 0), 0)
              const isOpen = expandidos[k] !== false // aberto por padrão

              return (
                <div key={k} className="bg-white rounded-xl border overflow-hidden">
                  <button
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50"
                    onClick={() => toggleExpanDir(k)}
                  >
                    <div className="flex items-center gap-3">
                      {isOpen ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                      <span className="font-bold text-slate-800">{nomeMes(mes)} / {ano}</span>
                      <span className="text-xs text-slate-400">{itens.length} registro(s)</span>
                    </div>
                    <span className="font-bold text-slate-700">{fmt(totalMes)}</span>
                  </button>

                  {isOpen && (
                    <div className="overflow-x-auto border-t">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="bg-slate-50 border-b text-[11px] uppercase text-slate-500 tracking-wide">
                            <th className="px-4 py-2">Obra</th>
                            <th className="px-4 py-2">Categoria</th>
                            <th className="px-4 py-2">Descrição</th>
                            <th className="px-4 py-2 text-right">Valor</th>
                            {podeGerenciar && <th className="px-4 py-2 w-20" />}
                          </tr>
                        </thead>
                        <tbody>
                          {itens.map(d => (
                            <tr key={d.id} className="border-b hover:bg-slate-50 text-sm">
                              <td className="px-4 py-2.5 font-medium text-slate-800 max-w-[180px] truncate">
                                {d.obra?.nome ?? '—'}
                              </td>
                              <td className="px-4 py-2.5">
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200">
                                  {d.categoria}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 text-slate-500 text-xs max-w-[220px] truncate">
                                {d.descricao || '—'}
                              </td>
                              <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-slate-800">
                                {fmt(d.valor)}
                              </td>
                              {podeGerenciar && (
                                <td className="px-4 py-2.5">
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => { setItemEdicao(d); setModalAberto(true) }}
                                      className="p-1 rounded hover:bg-blue-50 text-blue-600"
                                      title="Editar"
                                    >
                                      <Edit2 size={13} />
                                    </button>
                                    <button
                                      onClick={() => setConfirmExcluir(d.id)}
                                      className="p-1 rounded hover:bg-red-50 text-red-500"
                                      title="Excluir"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                          {/* Subtotal mês */}
                          <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                            <td colSpan={3} className="px-4 py-2 text-sm text-slate-600">
                              Total {nomeMes(mes)}
                            </td>
                            <td className="px-4 py-2 text-right tabular-nums text-slate-800">
                              {fmt(totalMes)}
                            </td>
                            {podeGerenciar && <td />}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Modal formulário */}
      {modalAberto && (
        <ModalDI
          item={itemEdicao}
          obras={obras}
          onSalvar={handleSalvar}
          onCancelar={() => { setModalAberto(false); setItemEdicao(null) }}
        />
      )}

      {/* Modal confirmar exclusão */}
      {confirmExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
            <div className="flex items-center gap-3 text-red-600">
              <AlertCircle size={22} />
              <h3 className="text-base font-bold">Excluir despesa?</h3>
            </div>
            <p className="text-sm text-slate-500">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmExcluir(null)}
                className="px-4 py-2 rounded-lg border text-sm text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleExcluir(confirmExcluir)}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
