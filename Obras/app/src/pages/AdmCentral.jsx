// ============================================================================
// pages/AdmCentral.jsx
// Calculadora de ADM Central — fórmula: AC(%) = Despesa Sede / Faturamento Total × 100
// Acesso: admin/master para gerenciar | diretor/gerente para visualizar
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react'
import {
  Calculator, Save, Info, AlertCircle, TrendingUp,
  ChevronDown, ChevronRight, Edit2, CheckCircle2, XCircle, RefreshCw
} from 'lucide-react'
import { admCentralService, faturamentoMensalService } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

// ─── Constantes ──────────────────────────────────────────────
const MESES = [
  { v: 1,  l: 'Jan' }, { v: 2,  l: 'Fev' }, { v: 3,  l: 'Mar' },
  { v: 4,  l: 'Abr' }, { v: 5,  l: 'Mai' }, { v: 6,  l: 'Jun' },
  { v: 7,  l: 'Jul' }, { v: 8,  l: 'Ago' }, { v: 9,  l: 'Set' },
  { v: 10, l: 'Out' }, { v: 11, l: 'Nov' }, { v: 12, l: 'Dez' },
]

function nomeMes(n) {
  return MESES.find(m => m.v === n)?.l ?? String(n)
}

function fmt(v) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(v || 0)
}

function pct(v) {
  return (v || 0).toFixed(2).replace('.', ',') + '%'
}

// ─── Card de mês ────────────────────────────────────────────
function CardMes({ dados, podeEditar, onEditar }) {
  const percentualEfetivo = dados.percentual_override != null
    ? dados.percentual_override
    : dados.percentual_calculado

  const temOverride = dados.percentual_override != null

  return (
    <div className="bg-white rounded-xl border overflow-hidden hover:shadow-md transition-shadow">
      <div className="px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <span className="font-bold text-slate-800">
          {nomeMes(dados.mes)} / {dados.ano}
        </span>
        {temOverride && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
            OVERRIDE
          </span>
        )}
        {podeEditar && (
          <button
            onClick={() => onEditar(dados)}
            className="p-1.5 rounded hover:bg-blue-50 text-blue-600 ml-2"
            title="Editar"
          >
            <Edit2 size={14} />
          </button>
        )}
      </div>

      <div className="p-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Despesa Sede</p>
          <p className="font-bold text-slate-800">{fmt(dados.despesa_sede)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Faturamento Total</p>
          <p className="font-bold text-slate-700">{fmt(dados.faturamento_total_sienge)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">AC% Calculado</p>
          <p className="font-semibold text-slate-600">{pct(dados.percentual_calculado)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">AC% Efetivo</p>
          <p className="text-xl font-bold" style={{ color: temOverride ? '#d97706' : '#233772' }}>
            {pct(percentualEfetivo)}
          </p>
        </div>
        {dados.nota_override && (
          <div className="col-span-2">
            <p className="text-xs text-amber-600 italic">{dados.nota_override}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Modal editar mês ────────────────────────────────────────
function ModalEditar({ dados, faturamentoSienge, onSalvar, onCancelar }) {
  const [despesaSede,   setDespesaSede]   = useState(String(dados.despesa_sede ?? ''))
  const [percentOvr,    setPercentOvr]    = useState(
    dados.percentual_override != null ? String(dados.percentual_override) : ''
  )
  const [nota,          setNota]          = useState(dados.nota_override ?? '')
  const [salvando,      setSalvando]      = useState(false)
  const [erro,          setErro]          = useState(null)
  const [carregFat,     setCarregFat]     = useState(false)
  const [fat,           setFat]           = useState(faturamentoSienge ?? dados.faturamento_total_sienge ?? 0)

  // Recalcula percentual automaticamente
  const pctCalc = useMemo(() => {
    const d = parseFloat(String(despesaSede).replace(',', '.')) || 0
    return fat > 0 ? (d / fat) * 100 : 0
  }, [despesaSede, fat])

  async function buscarFaturamento() {
    setCarregFat(true)
    try {
      const total = await faturamentoMensalService.porMes(dados.mes, dados.ano)
      setFat(total)
    } catch (e) {
      console.warn('Erro ao buscar faturamento:', e)
    } finally {
      setCarregFat(false)
    }
  }

  async function handleSalvar() {
    setSalvando(true)
    setErro(null)
    try {
      await onSalvar({
        id:                     dados.id,
        mes:                    dados.mes,
        ano:                    dados.ano,
        despesa_sede:           parseFloat(String(despesaSede).replace(',', '.')) || 0,
        faturamento_total_sienge: fat,
        percentual_calculado:   pctCalc,
        percentual_override:    percentOvr !== '' ? parseFloat(String(percentOvr).replace(',', '.')) : null,
        nota_override:          nota || null,
      })
    } catch (e) {
      setErro('Erro ao salvar: ' + e.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800">
            ADM Central — {nomeMes(dados.mes)} / {dados.ano}
          </h3>
          <button onClick={onCancelar} className="p-1 rounded hover:bg-slate-100">
            <XCircle size={18} className="text-slate-400" />
          </button>
        </div>

        {erro && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            <AlertCircle size={14} /> {erro}
          </div>
        )}

        {/* Faturamento Sienge */}
        <div className="rounded-xl bg-blue-50 border border-blue-200 p-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-blue-700 uppercase">Faturamento Total (Sienge)</p>
            <p className="text-xl font-bold text-blue-900 tabular-nums">{fmt(fat)}</p>
          </div>
          <button
            onClick={buscarFaturamento}
            disabled={carregFat}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw size={13} className={carregFat ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>

        {/* Despesa Sede */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600 uppercase">
            Despesa Mensal da Sede (R$)
          </label>
          <input
            type="number"
            min="0"
            step="100"
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Ex.: 85000"
            value={despesaSede}
            onChange={e => setDespesaSede(e.target.value)}
          />
          <p className="text-xs text-slate-400">
            Inclui: salários sede, aluguel, administrativo, TI, etc.
          </p>
        </div>

        {/* Fórmula preview */}
        <div className="rounded-xl p-3 text-sm" style={{ backgroundColor: '#f0f4ff', border: '1px solid #c7d2fe' }}>
          <p className="text-xs font-semibold text-indigo-700 uppercase mb-1">Cálculo automático</p>
          <p className="text-indigo-900 font-mono text-xs">
            AC(%) = {fmt(parseFloat(String(despesaSede).replace(',','.')) || 0)} ÷ {fmt(fat)} × 100
            <span className="ml-2 font-bold text-base"> = {pct(pctCalc)}</span>
          </p>
        </div>

        {/* Override percentual */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600 uppercase">
            Override % ADM Central
            <span className="ml-1 text-slate-400 font-normal normal-case">(opcional — sobrescreve o calculado)</span>
          </label>
          <input
            type="number"
            min="0"
            max="100"
            step="0.1"
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            placeholder="Ex.: 7.5 (%)  — deixe vazio para usar o calculado"
            value={percentOvr}
            onChange={e => setPercentOvr(e.target.value)}
          />
        </div>

        {/* Nota */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-600 uppercase">
            Justificativa do Override
          </label>
          <textarea
            rows={2}
            className="border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            placeholder="Ex.: Incorporado investimento de novo ERP no mês de março"
            value={nota}
            onChange={e => setNota(e.target.value)}
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
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: '#233772' }}
          >
            <Save size={14} />
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────
export default function AdmCentral() {
  const { usuario } = useAuth()
  const hoje = new Date()

  const podeGerenciar = ['admin', 'master'].includes(usuario?.perfil)
  const podeVer       = ['admin', 'master', 'diretor', 'gerente'].includes(usuario?.perfil)

  const [registros,   setRegistros]   = useState([])
  const [carregando,  setCarregando]  = useState(true)
  const [erro,        setErro]        = useState(null)
  const [modalDados,  setModalDados]  = useState(null)
  const [filtroAno,   setFiltroAno]   = useState(hoje.getFullYear())

  useEffect(() => { carregar() }, [filtroAno])

  async function carregar() {
    setCarregando(true)
    setErro(null)
    try {
      const data = await admCentralService.listar({ ano: filtroAno })
      setRegistros(data)
    } catch (e) {
      setErro(e.message)
    } finally {
      setCarregando(false)
    }
  }

  function abrirNovoCadastro() {
    setModalDados({
      mes: hoje.getMonth() + 1,
      ano: hoje.getFullYear(),
      despesa_sede: 0,
      faturamento_total_sienge: 0,
      percentual_calculado: 0,
      percentual_override: null,
      nota_override: null,
    })
  }

  async function handleSalvar(payload) {
    const salvo = await admCentralService.salvar(payload)
    setRegistros(prev => {
      const idx = prev.findIndex(r => r.id === salvo.id)
      return idx >= 0 ? prev.map((r, i) => i === idx ? salvo : r) : [salvo, ...prev]
    })
    setModalDados(null)
  }

  // Média de percentual do ano
  const mediaAnual = useMemo(() => {
    const ativos = registros.filter(r => r.percentual_calculado > 0)
    if (!ativos.length) return 0
    const soma = ativos.reduce((s, r) => {
      const p = r.percentual_override != null ? r.percentual_override : r.percentual_calculado
      return s + p
    }, 0)
    return soma / ativos.length
  }, [registros])

  const anos = [hoje.getFullYear() - 1, hoje.getFullYear(), hoje.getFullYear() + 1]

  if (!podeVer) {
    return (
      <div className="p-8 text-center bg-red-50 text-red-700 rounded-xl">
        <AlertCircle className="mx-auto mb-2" size={24} />
        <p className="font-semibold">Sem permissão para visualizar ADM Central.</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 flex flex-col gap-5" style={{ fontFamily: 'Montserrat, sans-serif' }}>

      {/* Cabeçalho */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: '#233772' }}>
            <Calculator size={22} /> ADM Central
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Rateio dos custos da sede entre as obras — compõe o Resultado Operacional
          </p>
        </div>
        {podeGerenciar && (
          <button
            onClick={abrirNovoCadastro}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white"
            style={{ backgroundColor: '#233772' }}
          >
            <Edit2 size={15} /> Novo Mês
          </button>
        )}
      </div>

      {/* Card da fórmula */}
      <div className="rounded-xl p-5 text-sm" style={{ background: 'linear-gradient(135deg, #233772 0%, #2d4494 100%)' }}>
        <p className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-3">Fórmula ADM Central</p>
        <div className="flex flex-wrap items-center gap-4">
          <div className="text-center">
            <p className="text-white/60 text-xs">Despesa Sede</p>
            <p className="text-white text-lg font-bold">R$ X.XXX</p>
          </div>
          <p className="text-white/60 text-xl">÷</p>
          <div className="text-center">
            <p className="text-white/60 text-xs">Fat. Total Sienge</p>
            <p className="text-white text-lg font-bold">R$ X.XXX</p>
          </div>
          <p className="text-white/60 text-xl">×</p>
          <div className="text-center">
            <p className="text-white/60 text-xs">100</p>
            <p className="text-white text-lg font-bold">100</p>
          </div>
          <p className="text-white/60 text-xl">=</p>
          <div className="text-center">
            <p className="text-white/60 text-xs">AC%</p>
            <p className="text-yellow-300 text-2xl font-bold">AC%</p>
          </div>
        </div>
        <p className="text-white/50 text-xs mt-3">
          O percentual efetivo de cada mês é aplicado ao faturamento da obra para calcular sua parcela de ADM Central.
          A diretoria pode sobrescrever o % calculado com um valor manual (override).
        </p>
      </div>

      {/* Aviso tabela */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-sm text-amber-800">
        <Info size={16} className="flex-shrink-0 mt-0.5 text-amber-600" />
        <div>
          <p className="font-semibold mb-1">Pré-requisito: tabela <code>adm_central</code></p>
          <pre className="text-xs bg-amber-100 rounded p-2 overflow-x-auto whitespace-pre-wrap">{`CREATE TABLE adm_central (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mes                      smallint NOT NULL CHECK (mes BETWEEN 1 AND 12),
  ano                      smallint NOT NULL,
  despesa_sede             numeric(14,2) NOT NULL DEFAULT 0,
  faturamento_total_sienge numeric(14,2) NOT NULL DEFAULT 0,
  percentual_calculado     numeric(6,4)  NOT NULL DEFAULT 0,
  percentual_override      numeric(6,4),
  nota_override            text,
  criado_por               uuid REFERENCES auth.users(id),
  atualizado_em            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (mes, ano)
);
ALTER TABLE adm_central ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leitura_autenticado" ON adm_central FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "escrita_admin" ON adm_central FOR ALL USING (
  EXISTS (SELECT 1 FROM perfis WHERE id = auth.uid() AND perfil IN ('admin','master'))
);`}</pre>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-4 p-4 bg-white rounded-xl border">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase">Ano</label>
          <select
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={filtroAno}
            onChange={e => setFiltroAno(Number(e.target.value))}
          >
            {anos.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        {registros.length > 0 && (
          <div className="ml-auto text-right">
            <p className="text-xs text-slate-400 uppercase">Média AC% anual</p>
            <p className="text-2xl font-bold" style={{ color: '#233772' }}>{pct(mediaAnual)}</p>
          </div>
        )}
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

      {/* Grid de meses */}
      {!carregando && (
        registros.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
            <Calculator size={40} strokeWidth={1} />
            <p className="text-sm">Nenhum mês cadastrado para {filtroAno}.</p>
            {podeGerenciar && (
              <button
                onClick={abrirNovoCadastro}
                className="mt-1 text-sm font-semibold underline"
                style={{ color: '#233772' }}
              >
                Cadastrar primeiro mês
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {registros.map(r => (
              <CardMes
                key={r.id}
                dados={r}
                podeEditar={podeGerenciar}
                onEditar={setModalDados}
              />
            ))}
          </div>
        )
      )}

      {/* Modal editar */}
      {modalDados && (
        <ModalEditar
          dados={modalDados}
          faturamentoSienge={modalDados.faturamento_total_sienge}
          onSalvar={handleSalvar}
          onCancelar={() => setModalDados(null)}
        />
      )}
    </div>
  )
}
