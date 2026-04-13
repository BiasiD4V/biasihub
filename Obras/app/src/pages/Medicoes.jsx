import React, { useState, useMemo } from 'react'
import { CheckCircle2, Clock, AlertTriangle, Send, Save, ClipboardCheck } from 'lucide-react'
import {
  obras, getEapFolhas, getCronogramaItem, getMedicaoItem,
  calcularResumoObra, periodos, PERIODO_ATUAL
} from '../lib/mockData'
import useObrasAcessiveis from '../hooks/useObrasAcessiveis';
import { formatarMoeda } from '../lib/calculos'
import { BadgeAprovacao } from '../components/ui/Badge'
import { useAuth } from '../context/AuthContext'
import SearchableSelect, { obrasParaOptions } from '../components/ui/SearchableSelect'

export default function Medicoes() {
  const { usuario } = useAuth()
  const obrasAcessiveis = useObrasAcessiveis(obras)

  const [obraId, setObraId] = useState(obrasAcessiveis[0]?.id || '')
  const [valores, setValores] = useState({})
  const [salvo, setSalvo] = useState(false)
  const [enviado, setEnviado] = useState(false)

  const obra = obrasAcessiveis.find(o => o.id === obraId)
  const folhas = useMemo(() => getEapFolhas(obraId), [obraId])

  // Inicializa valores do formulário ao trocar de obra
  const valoresForm = useMemo(() => {
    const init = {}
    folhas.forEach(item => {
      const med = getMedicaoItem(item.id)
      init[item.id] = {
        realizado: valores[item.id]?.realizado ?? (med.realizado || 0),
        obs: valores[item.id]?.obs ?? (med.obs || ''),
        status: med.aprovado ? 'aprovado' : (med.status_aprovacao || 'rascunho'),
      }
    })
    return init
  }, [folhas, obraId])

  const handleChange = (itemId, campo, valor) => {
    setValores(v => ({
      ...v,
      [itemId]: { ...valoresForm[itemId], ...v[itemId], [campo]: valor }
    }))
    setSalvo(false)
    setEnviado(false)
  }

  const getValor = (itemId, campo) => {
    return valores[itemId]?.[campo] ?? valoresForm[itemId]?.[campo]
  }

  const handleSalvar = () => {
    setSalvo(true)
    setEnviado(false)
    setTimeout(() => setSalvo(false), 2500)
  }

  const handleEnviar = () => {
    setSalvo(false)
    setEnviado(true)
    setTimeout(() => setEnviado(false), 3000)
  }

  // Estatísticas da medição
  const stats = useMemo(() => {
    let aprovados = 0, pendentes = 0, rascunhos = 0
    folhas.forEach(item => {
      const s = getValor(item.id, 'status')
      if (s === 'aprovado') aprovados++
      else if (s === 'pendente') pendentes++
      else rascunhos++
    })
    return { aprovados, pendentes, rascunhos, total: folhas.length }
  }, [folhas, valoresForm, valores])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Medições</h1>
          <p className="text-sm text-slate-500 mt-0.5">Lançamento e aprovação de % realizado por item</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSalvar} className="btn-secondary text-xs flex items-center gap-1.5">
            <Save size={14} /> Salvar
          </button>
          <button onClick={handleEnviar} className="btn-primary text-xs flex items-center gap-1.5">
            <Send size={14} /> Enviar para Aprovação
          </button>
        </div>
      </div>

      {/* Feedback */}
      {salvo && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-green-700 text-sm flex items-center gap-2">
          <CheckCircle2 size={16} /> Rascunho salvo com sucesso!
        </div>
      )}
      {enviado && (
        <div className="bg-orange-50 border border-blue-200 rounded-lg px-4 py-3 text-orange-600 text-sm flex items-center gap-2">
          <Send size={16} /> Medição enviada para aprovação do gerente!
        </div>
      )}

      {/* Seleção de obra + período */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Obra</label>
            <SearchableSelect
              value={obraId}
              onChange={v => { setObraId(v); setValores({}) }}
              options={obrasParaOptions(obrasAcessiveis)}
              placeholder="Todas as obras"
              clearable
              className="min-w-[280px]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Período de Referência</label>
            <div className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 bg-slate-50">
              {periodos[PERIODO_ATUAL]?.label} — <span className="text-orange-500 font-medium">Atual</span>
            </div>
          </div>
        </div>

        {/* Stats rápidos */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 text-green-600">
            <CheckCircle2 size={13} />
            <span>{stats.aprovados} aprovados</span>
          </div>
          <div className="flex items-center gap-1.5 text-yellow-600">
            <Clock size={13} />
            <span>{stats.pendentes} pendentes</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-400">
            <ClipboardCheck size={13} />
            <span>{stats.rascunhos} rascunhos</span>
          </div>
        </div>
      </div>

      {/* Formulário de medição */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50">
          <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <div className="col-span-1">Código</div>
            <div className="col-span-3">Descrição</div>
            <div className="col-span-1 text-center">Valor (R$)</div>
            <div className="col-span-1 text-center">% Prev.</div>
            <div className="col-span-1 text-center">% Ant.</div>
            <div className="col-span-1 text-center">% Atual</div>
            <div className="col-span-1 text-center">Desvio</div>
            <div className="col-span-2">Observação</div>
            <div className="col-span-1 text-center">Status</div>
          </div>
        </div>

        <div className="divide-y divide-slate-50">
          {folhas.map(item => {
            const crono = getCronogramaItem(item.id)
            const med = getMedicaoItem(item.id)
            const previsto = crono[PERIODO_ATUAL] || 0
            const anterior = med.realizado || 0
            const realizado = Number(getValor(item.id, 'realizado') || 0)
            const obs = getValor(item.id, 'obs') || ''
            const status = getValor(item.id, 'status') || 'rascunho'
            const desvio = realizado - previsto
            const aprovado = status === 'aprovado'

            return (
              <div key={item.id} className={`px-5 py-3 hover:bg-slate-50/30 transition-colors ${aprovado ? 'opacity-75' : ''}`}>
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-1">
                    <span className="font-mono text-xs text-slate-400">{item.codigo}</span>
                  </div>
                  <div className="col-span-3">
                    <p className="text-xs text-slate-700 leading-tight">{item.descricao}</p>
                  </div>
                  <div className="col-span-1 text-center">
                    <span className="text-xs text-slate-500">{formatarMoeda(item.valor_orcado)}</span>
                  </div>
                  <div className="col-span-1 text-center">
                    <span className="text-xs font-medium text-orange-500">{previsto.toFixed(1)}%</span>
                  </div>
                  <div className="col-span-1 text-center">
                    <span className="text-xs text-slate-400">{anterior.toFixed(1)}%</span>
                  </div>
                  <div className="col-span-1 text-center">
                    {aprovado ? (
                      <span className="text-xs font-bold text-slate-700">{realizado.toFixed(1)}%</span>
                    ) : (
                      <div className="flex items-center justify-center gap-0.5">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          value={realizado}
                          onChange={e => handleChange(item.id, 'realizado', parseFloat(e.target.value) || 0)}
                          className="w-14 text-center border border-slate-200 rounded-md px-1 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                        />
                        <span className="text-xs text-slate-400">%</span>
                      </div>
                    )}
                  </div>
                  <div className="col-span-1 text-center">
                    <span className={`text-xs font-semibold ${desvio >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {desvio > 0 ? '+' : ''}{desvio.toFixed(1)}pp
                    </span>
                  </div>
                  <div className="col-span-2">
                    {aprovado ? (
                      <span className="text-xs text-slate-400 italic truncate block">{obs || '—'}</span>
                    ) : (
                      <input
                        type="text"
                        placeholder="Observação..."
                        value={obs}
                        onChange={e => handleChange(item.id, 'obs', e.target.value)}
                        className="w-full border border-slate-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    )}
                  </div>
                  <div className="col-span-1 flex justify-center">
                    <BadgeAprovacao aprovado={aprovado} statusAprovacao={status} />
                  </div>
                </div>
                {obs && aprovado && (
                  <p className="text-xs text-slate-400 mt-1 pl-6 italic">{obs}</p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Rodapé com botões */}
      <div className="flex justify-end gap-3">
        <button onClick={handleSalvar} className="btn-secondary flex items-center gap-2">
          <Save size={15} /> Salvar Rascunho
        </button>
        <button onClick={handleEnviar} className="btn-primary flex items-center gap-2">
          <Send size={15} /> Enviar para Aprovação
        </button>
      </div>
    </div>
  )
}
