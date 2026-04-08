import React, { useState, useMemo, useCallback } from 'react'
import {
  Users, Download, Info, ChevronDown, ChevronRight,
  X, AlertCircle, ChevronUp, Zap
} from 'lucide-react'
import {
  FUNCOES_BIASI,
  ENCARGOS_PADRAO,
  BENEFICIOS_FIXOS_PADRAO,
  calcularCustoMensal,
  calcularTotalBeneficios,
  RATEIO_CONFIG,
} from '../lib/custosMO'

// ─── CONSTANTES ──────────────────────────────────────────────
const RATEIO_ORDEM = ['ELÉTRICA', 'HIDRÁULICA', 'CIVIL', 'INDIRETA', 'FLEXÍVEL']
const TOTAL_BENEFICIOS = calcularTotalBeneficios(BENEFICIOS_FIXOS_PADRAO)

// ─── FORMATAÇÃO ──────────────────────────────────────────────
function fmt(v) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(v || 0)
}

// ─── COMPONENTES AUXILIARES ──────────────────────────────────

function Secao({ titulo, children }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
        {titulo}
      </p>
      <div className="space-y-1">{children}</div>
    </div>
  )
}

function Row({ label, value, bold, big }) {
  return (
    <div className="flex justify-between items-center">
      <span className={`${bold ? 'text-slate-700 font-semibold' : 'text-slate-500'} ${big ? 'text-sm' : 'text-xs'}`}>
        {label}
      </span>
      <span className={`tabular-nums ${bold ? 'font-bold text-slate-800' : 'font-medium text-slate-600'} ${big ? 'text-base' : 'text-xs'}`}>
        {fmt(value)}
      </span>
    </div>
  )
}

// ─── MODAL DETALHES ──────────────────────────────────────────
function DetalheEncargos({ cargo, stepNum, mensal, onClose }) {
  const { encargos, salarioBruto, beneficios } = mensal
  const stepData = cargo.steps.find(s => s.step === stepNum) ?? cargo.steps[0]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h3 className="font-bold text-slate-800 text-sm leading-tight">{cargo.cargo}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                {cargo.nivel}
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: RATEIO_CONFIG[cargo.rateio]?.bg,
                  color: RATEIO_CONFIG[cargo.rateio]?.cor,
                  border: `1px solid ${RATEIO_CONFIG[cargo.rateio]?.border}`,
                }}>
                {RATEIO_CONFIG[cargo.rateio]?.label}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">
                Step {stepNum}
              </span>
              {cargo.temPericulosidade && (
                <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-0.5">
                  <Zap size={10} />+30% peri
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 mt-0.5">
            <X size={16} />
          </button>
        </div>

        {/* Conteúdo */}
        <div className="px-5 py-4 space-y-4 text-sm">
          <Secao titulo="Salário">
            <Row label={`Salário Step ${stepNum} (sem peri)`} value={stepData.salario} />
            {cargo.temPericulosidade && (
              <Row label="Adicional de Periculosidade (30%)" value={stepData.salario * 0.30} />
            )}
            <Row label="Salário Bruto Mensal" value={salarioBruto} bold />
          </Secao>

          <Secao titulo="Encargos sobre Salário">
            <Row label="13º Salário (8,33%)"             value={encargos.decimoTerceiro} />
            <Row label="Férias (11,11%)"                 value={encargos.ferias} />
            <Row label="Aviso Prévio Indenizado (3,64%)" value={encargos.avisoPrevio} />
            <Row label="FGTS (8,00%)"                    value={encargos.fgts} />
            <Row label="FGTS Aviso Prévio (0,2912%)"     value={encargos.fgtsAP} />
            <Row label="FGTS Rescisão (4,00%)"           value={encargos.fgtsResc} />
            <Row label="SAT — Ac. de Trabalho (3,00%)"   value={encargos.sat} />
            <Row label="Salário Educação (2,50%)"        value={encargos.salEduc} />
            <Row label="Sistema S (3,30%)"               value={encargos.sistS} />
            <Row label="Reincidência Previd. s/ 13º"     value={encargos.reincidencia13} />
            <Row label="Reincidência Previd. s/ Férias"  value={encargos.reincidenciaFer} />
            <Row label="Total Encargos"                  value={encargos.total} bold />
          </Secao>

          <Secao titulo="Benefícios Fixos / Funcionário / Mês">
            <Row label="PLR"                 value={BENEFICIOS_FIXOS_PADRAO.plr} />
            <Row label="Exames Médicos"      value={BENEFICIOS_FIXOS_PADRAO.exames} />
            <Row label="Café"                value={BENEFICIOS_FIXOS_PADRAO.cafe} />
            <Row label="Ajuda de Custo"      value={BENEFICIOS_FIXOS_PADRAO.ajudaCusto} />
            <Row label="Plano de Saúde"      value={BENEFICIOS_FIXOS_PADRAO.planoSaude} />
            <Row label="Seguro de Vida"      value={BENEFICIOS_FIXOS_PADRAO.seguroVida} />
            <Row label="Cartão Alimentação"  value={BENEFICIOS_FIXOS_PADRAO.cartaoAlimentacao} />
            <Row label="Ferramentas"         value={BENEFICIOS_FIXOS_PADRAO.ferramentas} />
            <Row label="EPI"                 value={BENEFICIOS_FIXOS_PADRAO.epi} />
            <Row label="Total Benefícios"    value={beneficios} bold />
          </Secao>

          <div className="pt-2 border-t border-slate-200 space-y-1.5">
            <Row label="Custo Folha (Sal + Encargos)"        value={mensal.custoFolha} />
            <Row label="Total Despesas / Funcionário / Mês"  value={mensal.totalMensal} bold big />
            <Row label={`Custo por Dia Útil (÷${ENCARGOS_PADRAO.diasUteisMensais} dias)`} value={mensal.custoDiario} />
          </div>

          {/* Comparativo de steps */}
          {cargo.steps.length > 1 && (
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Comparativo de Steps — Total Mensal
              </p>
              <div className="space-y-1">
                {cargo.steps.map(s => {
                  const m = calcularCustoMensal(cargo, s.step)
                  const isAtual = s.step === stepNum
                  return (
                    <div key={s.step}
                      className={`flex justify-between items-center px-2.5 py-1.5 rounded-lg text-xs
                        ${isAtual ? 'bg-blue-50 border border-blue-200' : 'bg-slate-50'}`}>
                      <span className={`font-medium ${isAtual ? 'text-blue-700' : 'text-slate-500'}`}>
                        Step {s.step} {isAtual && '← atual'}
                      </span>
                      <div className="flex gap-3 tabular-nums">
                        <span className="text-slate-400">{fmt(s.salario)}</span>
                        <span className={`font-bold ${isAtual ? 'text-blue-700' : 'text-slate-700'}`}>
                          {fmt(m.totalMensal)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── SELETOR DE STEP INLINE ──────────────────────────────────
function StepSelector({ cargo, stepAtual, onChange }) {
  if (cargo.steps.length <= 1) return null
  return (
    <div className="flex items-center gap-0.5">
      {cargo.steps.map(s => (
        <button
          key={s.step}
          onClick={e => { e.stopPropagation(); onChange(s.step) }}
          className={`w-5 h-5 text-[9px] font-bold rounded transition-all
            ${stepAtual === s.step
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-400 hover:bg-blue-100 hover:text-blue-600'}`}
          title={`Step ${s.step}: ${fmt(s.salario)}`}
        >
          {s.step}
        </button>
      ))}
    </div>
  )
}

// ─── LINHA DE CARGO ──────────────────────────────────────────
function LinhaCargo({ cargo, stepAtual, onStepChange, onDetalhe }) {
  const mensal = useMemo(
    () => calcularCustoMensal(cargo, stepAtual),
    [cargo, stepAtual]
  )
  const cfg = RATEIO_CONFIG[cargo.rateio]

  return (
    <tr className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors group">
      {/* Nível */}
      <td className="pl-10 pr-2 py-2.5">
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-400">
          {cargo.nivel}
        </span>
      </td>

      {/* Nome + peri */}
      <td className="px-2 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-700">{cargo.cargo}</span>
          {cargo.temPericulosidade && (
            <span className="text-[10px] text-amber-500 font-semibold flex items-center gap-0.5">
              <Zap size={9} />peri
            </span>
          )}
        </div>
      </td>

      {/* Rateio */}
      <td className="px-2 py-2.5 text-center">
        {cargo.rateio === 'FLEXÍVEL' ? (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-0.5"
            style={{ backgroundColor: RATEIO_CONFIG['FLEXÍVEL'].bg, color: RATEIO_CONFIG['FLEXÍVEL'].cor, border: `1px solid ${RATEIO_CONFIG['FLEXÍVEL'].border}` }}
            title="Rateio definido na alocação da obra: Elétrica, Hidráulica ou Civil">
            ⇄ Flexível
          </span>
        ) : (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: cfg.bg, color: cfg.cor, border: `1px solid ${cfg.border}` }}>
            {cfg.label}
          </span>
        )}
      </td>

      {/* Seletor de step */}
      <td className="px-2 py-2.5">
        <StepSelector cargo={cargo} stepAtual={stepAtual} onChange={onStepChange} />
      </td>

      {/* Sal. base do step selecionado */}
      <td className="px-2 py-2.5 text-right">
        <span className="text-xs text-slate-400 tabular-nums">
          {fmt((cargo.steps.find(s => s.step === stepAtual) ?? cargo.steps[0]).salario)}
        </span>
      </td>

      {/* Sal. bruto (com peri) */}
      <td className="px-2 py-2.5 text-right">
        <span className="text-xs font-medium text-slate-700 tabular-nums">
          {fmt(mensal.salarioBruto)}
        </span>
      </td>

      {/* Encargos */}
      <td className="px-2 py-2.5 text-right">
        <span className="text-xs text-slate-400 tabular-nums">{fmt(mensal.encargos.total)}</span>
      </td>

      {/* Benefícios */}
      <td className="px-2 py-2.5 text-right">
        <span className="text-xs text-slate-400 tabular-nums">{fmt(mensal.beneficios)}</span>
      </td>

      {/* Custo Folha/mês */}
      <td className="px-2 py-2.5 text-right">
        <span className="text-xs font-semibold text-blue-700 tabular-nums">{fmt(mensal.custoFolha)}</span>
      </td>

      {/* Total/mês */}
      <td className="px-2 py-2.5 text-right">
        <span className="text-sm font-bold text-slate-800 tabular-nums">{fmt(mensal.totalMensal)}</span>
      </td>

      {/* Custo/dia */}
      <td className="px-2 py-2.5 text-right">
        <span className="text-xs text-slate-400 tabular-nums">{fmt(mensal.custoDiario)}</span>
      </td>

      {/* Detalhe */}
      <td className="px-2 py-2.5 text-center">
        <button
          onClick={() => onDetalhe(cargo, stepAtual, mensal)}
          className="p-1.5 rounded hover:bg-orange-50 text-slate-300 hover:text-orange-500 transition-colors opacity-0 group-hover:opacity-100"
          title="Ver detalhamento"
        >
          <Info size={13} />
        </button>
      </td>
    </tr>
  )
}

// ─── GRUPO POR FAMÍLIA ────────────────────────────────────────
function GrupoFamilia({ familia, cargos, stepsState, onStepChange, onDetalhe }) {
  const [aberto, setAberto] = useState(true)

  // Pega o rateio do primeiro cargo (todos da mesma família têm o mesmo)
  const rateio = cargos[0]?.rateio ?? 'INDIRETA'
  const cfg = RATEIO_CONFIG[rateio]

  // Faixa de custo total (Step 1 de todos os cargos)
  const { totalMin, totalMax } = useMemo(() => {
    const totais = cargos.map(c => calcularCustoMensal(c, 1).totalMensal)
    return { totalMin: Math.min(...totais), totalMax: Math.max(...totais) }
  }, [cargos])

  return (
    <>
      {/* Cabeçalho da família */}
      <tr
        className="border-b border-slate-200 cursor-pointer select-none transition-colors"
        style={{ backgroundColor: cfg.bg + 'cc' }}
        onClick={() => setAberto(v => !v)}
      >
        <td className="px-4 py-2.5" colSpan={3}>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 flex-shrink-0">
              {aberto ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
            <span className="text-sm font-bold" style={{ color: cfg.cor }}>
              {familia.toUpperCase()}
            </span>
            <span className="text-[10px] text-slate-400">
              {cargos.length} cargo{cargos.length !== 1 ? 's' : ''}
            </span>
          </div>
        </td>

        {/* Steps — em branco no header da família */}
        <td />

        {/* Faixa de custo Step 1 */}
        <td colSpan={6} />
        <td className="px-2 py-2.5 text-right whitespace-nowrap">
          <span className="text-xs text-slate-400 tabular-nums">
            {totalMin === totalMax
              ? fmt(totalMin)
              : <>{fmt(totalMin)}<span className="mx-1 text-slate-300">–</span>{fmt(totalMax)}</>
            }
            <span className="text-[10px] text-slate-400 ml-1">/mês s1</span>
          </span>
        </td>
        <td colSpan={2} />
      </tr>

      {/* Linhas dos cargos */}
      {aberto && cargos.map(cargo => (
        <LinhaCargo
          key={cargo.id}
          cargo={cargo}
          stepAtual={stepsState[cargo.id] ?? 1}
          onStepChange={step => onStepChange(cargo.id, step)}
          onDetalhe={onDetalhe}
        />
      ))}
    </>
  )
}

// ─── SEPARADOR DE RATEIO ──────────────────────────────────────
function SeparadorRateio({ rateio }) {
  const cfg = RATEIO_CONFIG[rateio]
  return (
    <tr>
      <td colSpan={12} className="px-5 py-2 border-y border-slate-200"
        style={{ backgroundColor: cfg.bg }}>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-extrabold uppercase tracking-widest" style={{ color: cfg.cor }}>
            ── {cfg.label}
          </span>
          {rateio === 'FLEXÍVEL' && (
            <span className="text-[10px] font-medium" style={{ color: cfg.cor }}>
              · rateio definido na alocação da obra (Elétrica / Hidráulica / Civil)
            </span>
          )}
        </div>
      </td>
    </tr>
  )
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────
export default function CustosMaoObra() {
  // Modal
  const [detalhe, setDetalhe] = useState(null) // { cargo, stepNum, mensal }

  // Filtros
  const [busca, setBusca]           = useState('')
  const [filtroRateio, setFiltroRateio] = useState('')

  // Steps selecionados por cargo: { [cargoId]: stepNum }
  // Padrão: Step 1 para todos (não precisa inicializar, usa ?? 1)
  const [stepsState, setStepsState] = useState({})

  const handleStepChange = useCallback((cargoId, step) => {
    setStepsState(prev => ({ ...prev, [cargoId]: step }))
  }, [])

  // Agrupa FUNCOES_BIASI por família e aplica filtros
  const familiasPorRateio = useMemo(() => {
    const q = busca.toLowerCase().trim()

    // Filtra cargos
    const cargosFiltrados = FUNCOES_BIASI.filter(c => {
      if (filtroRateio && c.rateio !== filtroRateio) return false
      if (q && !c.cargo.toLowerCase().includes(q) && !c.familia.toLowerCase().includes(q)) return false
      return true
    })

    // Agrupa por rateio → família
    const resultado = {}
    for (const r of RATEIO_ORDEM) {
      const cargosDessaRateio = cargosFiltrados.filter(c => c.rateio === r)
      if (!cargosDessaRateio.length) continue

      // Agrupa por família dentro da rateio
      const porFamilia = {}
      for (const c of cargosDessaRateio) {
        if (!porFamilia[c.familia]) porFamilia[c.familia] = []
        porFamilia[c.familia].push(c)
      }
      resultado[r] = porFamilia
    }
    return resultado
  }, [busca, filtroRateio])

  // KPIs por rateio (sempre sobre FUNCOES_BIASI completa, sem filtro)
  const kpis = useMemo(() => {
    const result = {}
    for (const r of RATEIO_ORDEM) {
      const cargos = FUNCOES_BIASI.filter(c => c.rateio === r)
      const mensais = cargos.map(c => calcularCustoMensal(c, 1))
      result[r] = {
        qtdFamilias: [...new Set(cargos.map(c => c.familia))].length,
        qtdCargos:   cargos.length,
        custoMedio:  mensais.length ? mensais.reduce((s, m) => s + m.totalMensal, 0) / mensais.length : 0,
        custoMax:    mensais.length ? Math.max(...mensais.map(m => m.totalMensal)) : 0,
      }
    }
    return result
  }, [])

  // Total de cargos exibidos
  const totalExibido = useMemo(() =>
    Object.values(familiasPorRateio).reduce((s, fams) =>
      s + Object.values(fams).reduce((s2, arr) => s2 + arr.length, 0), 0),
    [familiasPorRateio]
  )

  // Exportar CSV (step selecionado por cargo)
  function exportarCSV() {
    const rows = [['Família', 'Nível', 'Cargo', 'Rateio', 'Peri', 'Step',
      'Sal. Step', 'Sal. Bruto', 'Encargos', 'Benefícios', 'Custo Folha/Mês', 'Total/Mês', 'Custo/Dia']]

    for (const cargo of FUNCOES_BIASI) {
      const step = stepsState[cargo.id] ?? 1
      const m    = calcularCustoMensal(cargo, step)
      const stepSal = (cargo.steps.find(s => s.step === step) ?? cargo.steps[0]).salario
      rows.push([
        cargo.familia, cargo.nivel, cargo.cargo, cargo.rateio,
        cargo.temPericulosidade ? 'SIM' : 'NÃO',
        step, stepSal.toFixed(2),
        m.salarioBruto.toFixed(2), m.encargos.total.toFixed(2),
        m.beneficios.toFixed(2), m.custoFolha.toFixed(2),
        m.totalMensal.toFixed(2), m.custoDiario.toFixed(2),
      ])
    }

    const csv  = rows.map(r => r.join(';')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'custos-mo-biasi.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  // Quantos steps foram alterados do padrão?
  const stepsAlterados = Object.keys(stepsState).filter(id => stepsState[id] !== 1).length

  return (
    <div className="space-y-5 p-5 max-w-screen-xl mx-auto">

      {/* ── Cabeçalho ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Users size={20} style={{ color: '#233772' }} />
            Tabela de Custos de Mão de Obra
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Base salarial Biasi 2026 · Projeto Energizar PCS REG-001/2026 ·
            Encargos CLT · Benefícios fixos · Step 1 = piso padrão
          </p>
        </div>
        <div className="flex items-center gap-2">
          {stepsAlterados > 0 && (
            <button
              onClick={() => setStepsState({})}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
            >
              Resetar steps ({stepsAlterados})
            </button>
          )}
          <button
            onClick={exportarCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 transition-colors"
          >
            <Download size={13} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* ── Aviso ── */}
      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
        <AlertCircle size={14} className="mt-0.5 flex-shrink-0 text-amber-500" />
        <span>
          Salários baseados em <strong>ANX001-2026 · Escada Salarial · REV03</strong>.
          Step 1 = piso de ingresso. Clique nos botões numerados para visualizar outros steps.
          Confirme com o arquivo oficial antes de usar em orçamentos.
        </span>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {RATEIO_ORDEM.map(r => {
          const cfg = RATEIO_CONFIG[r]
          const k   = kpis[r]
          const ativo = filtroRateio === r
          return (
            <div
              key={r}
              className="rounded-xl border p-4 cursor-pointer transition-all hover:shadow-sm"
              style={{
                backgroundColor: cfg.bg,
                borderColor: ativo ? cfg.cor : cfg.border,
                boxShadow: ativo ? `0 0 0 2px ${cfg.cor}33` : undefined,
              }}
              onClick={() => setFiltroRateio(ativo ? '' : r)}
            >
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: cfg.cor }}>
                {cfg.label}
              </p>
              <p className="text-lg font-bold text-slate-800 mt-1 tabular-nums">{fmt(k.custoMedio)}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {r === 'FLEXÍVEL'
                  ? 'rateio definido na alocação da obra'
                  : 'custo médio/func/mês (Step 1)'
                }
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {k.qtdFamilias} famílias · {k.qtdCargos} cargos
              </p>
              {ativo && (
                <p className="text-[10px] mt-1.5 font-semibold" style={{ color: cfg.cor }}>
                  ● filtro ativo — clique para limpar
                </p>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Filtros ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Pesquisar cargo ou família..."
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-400 w-64"
        />
        {(busca || filtroRateio) && (
          <button
            onClick={() => { setBusca(''); setFiltroRateio('') }}
            className="text-xs text-slate-400 hover:text-slate-600 underline"
          >
            Limpar filtros
          </button>
        )}
        <span className="text-xs text-slate-400 ml-auto">
          {totalExibido} cargos exibidos
        </span>
      </div>

      {/* ── Tabela principal ── */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[1100px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-20">Nível</th>
                <th className="text-left px-2 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Cargo</th>
                <th className="text-center px-2 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider w-28">Rateio</th>
                <th className="text-left px-2 py-3 text-[10px] font-semibold text-blue-400 uppercase tracking-wider w-28">Steps</th>
                <th className="text-right px-2 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Sal. Step</th>
                <th className="text-right px-2 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Sal. Bruto</th>
                <th className="text-right px-2 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Encargos</th>
                <th className="text-right px-2 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Benefícios</th>
                <th className="text-right px-2 py-3 text-[10px] font-semibold text-blue-500 uppercase tracking-wider">Custo Folha/Mês</th>
                <th className="text-right px-2 py-3 text-[10px] font-semibold text-slate-700 uppercase tracking-wider">Total/Mês</th>
                <th className="text-right px-2 py-3 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Custo/Dia</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {RATEIO_ORDEM.map(r => {
                const familias = familiasPorRateio[r]
                if (!familias) return null
                return (
                  <React.Fragment key={r}>
                    <SeparadorRateio rateio={r} />
                    {Object.entries(familias).map(([familia, cargos]) => (
                      <GrupoFamilia
                        key={familia}
                        familia={familia}
                        cargos={cargos}
                        stepsState={stepsState}
                        onStepChange={handleStepChange}
                        onDetalhe={(cargo, stepNum, mensal) => setDetalhe({ cargo, stepNum, mensal })}
                      />
                    ))}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>

          {totalExibido === 0 && (
            <div className="py-14 text-center text-sm text-slate-400">
              Nenhum cargo encontrado para os filtros aplicados.
            </div>
          )}
        </div>
      </div>

      {/* ── Rodapé ── */}
      <p className="text-[10px] text-slate-400 text-center">
        {ENCARGOS_PADRAO.diasUteisMensais} dias úteis/mês ·
        Periculosidade +{ENCARGOS_PADRAO.adicionalPericulosidade * 100}% ·
        Benefícios fixos {fmt(TOTAL_BENEFICIOS)}/func/mês ·
        Encargos ~{(
          (ENCARGOS_PADRAO.decimoTerceiro + ENCARGOS_PADRAO.ferias +
           ENCARGOS_PADRAO.avisoPrevioIndenizado + ENCARGOS_PADRAO.fgts +
           ENCARGOS_PADRAO.fgtsAvisoPrevio + ENCARGOS_PADRAO.fgtsRescisao +
           ENCARGOS_PADRAO.sat + ENCARGOS_PADRAO.salEducacao + ENCARGOS_PADRAO.sistemaS) * 100
        ).toFixed(1)}% sobre salário bruto
      </p>

      {/* ── Modal de detalhes ── */}
      {detalhe && (
        <DetalheEncargos
          cargo={detalhe.cargo}
          stepNum={detalhe.stepNum}
          mensal={detalhe.mensal}
          onClose={() => setDetalhe(null)}
        />
      )}
    </div>
  )
}