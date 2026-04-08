import React, { useState } from 'react'
import { Search, BookOpen } from 'lucide-react'

const termos = [
  { sigla: 'EVM',  nome: 'Earned Value Management',          categoria: 'EVM', definicao: 'Metodologia de gerenciamento que integra escopo, prazo e custo para medir o desempenho do projeto de forma objetiva.', formula: null },
  { sigla: 'IDC',  nome: 'Índice de Desempenho de Custo',    categoria: 'EVM', definicao: 'Mede a eficiência do custo: quanto de valor está sendo gerado por real gasto. Igual ao CPI (Cost Performance Index).', formula: 'IDC = VA / CR', semaforo: { verde: '≥ 1,00', amarelo: '0,85 – 1,00', vermelho: '< 0,85' } },
  { sigla: 'IDP',  nome: 'Índice de Desempenho de Prazo',    categoria: 'EVM', definicao: 'Mede a eficiência do cronograma: quanto do trabalho planejado está sendo concluído. Igual ao SPI (Schedule Performance Index).', formula: 'IDP = VA / VP', semaforo: { verde: '≥ 0,95', amarelo: '0,80 – 0,95', vermelho: '< 0,80' } },
  { sigla: 'VA',   nome: 'Valor Agregado (BCWP)',             categoria: 'EVM', definicao: 'Valor do trabalho efetivamente realizado, medido pelo orçamento aprovado para esse trabalho.', formula: 'VA = BAC × % Realizado' },
  { sigla: 'VP',   nome: 'Valor Planejado (BCWS)',            categoria: 'EVM', definicao: 'Valor do trabalho que deveria ter sido realizado até a data de status, conforme o planejamento.', formula: 'VP = BAC × % Previsto' },
  { sigla: 'CR',   nome: 'Custo Real (ACWP)',                 categoria: 'EVM', definicao: 'Custo total real incorrido para realizar o trabalho até a data de status.', formula: null },
  { sigla: 'BAC',  nome: 'Budget at Completion',             categoria: 'EVM', definicao: 'Orçamento total aprovado para o projeto ou atividade (Orçamento na Conclusão).', formula: null },
  { sigla: 'EAC',  nome: 'Estimate at Completion',           categoria: 'EVM', definicao: 'Estimativa do custo total do projeto ao final, baseada no desempenho atual.', formula: 'EAC = BAC / IDC' },
  { sigla: 'VAC',  nome: 'Variance at Completion',           categoria: 'EVM', definicao: 'Variação de custo prevista ao final do projeto. Positivo = abaixo do orçamento.', formula: 'VAC = BAC – EAC' },
  { sigla: 'VPR',  nome: 'Variação de Prazo',                categoria: 'EVM', definicao: 'Diferença entre o valor agregado e o valor planejado na data de status.', formula: 'VPR = VA – VP' },
  { sigla: 'VC',   nome: 'Variação de Custo',                categoria: 'EVM', definicao: 'Diferença entre o valor agregado e o custo real na data de status.', formula: 'VC = VA – CR' },
  { sigla: 'EAP',  nome: 'Estrutura Analítica do Projeto',   categoria: 'PCO', definicao: 'Decomposição hierárquica do escopo total do projeto em componentes menores e gerenciáveis. Equivalente ao WBS (Work Breakdown Structure).', formula: null },
  { sigla: 'PPC',  nome: 'Percentual de Planejamento Concluído', categoria: 'PCO', definicao: 'Indicador do Last Planner System que mede a confiabilidade do planejamento semanal. Razão entre tarefas concluídas e tarefas planejadas.', formula: 'PPC = Tarefas Concluídas / Tarefas Planejadas × 100', semaforo: { verde: '≥ 80%', amarelo: '60 – 80%', vermelho: '< 60%' } },
  { sigla: 'FT',   nome: 'Folga Total',                      categoria: 'PCO', definicao: 'Quantidade de tempo que uma atividade pode ser atrasada sem impactar a data de conclusão do projeto. FT = 0 significa caminho crítico.', formula: 'FT = Início Tarde – Início Cedo' },
  { sigla: 'CPM',  nome: 'Critical Path Method',             categoria: 'PCO', definicao: 'Método do Caminho Crítico. Técnica de rede para determinar a sequência de atividades que define a duração mínima do projeto.', formula: null },
  { sigla: 'CCPM', nome: 'Critical Chain Project Management', categoria: 'PCO', definicao: 'Gerenciamento pela Corrente Crítica. Abordagem baseada na Teoria das Restrições que considera a disponibilidade dos recursos na identificação do caminho crítico.', formula: null },
  { sigla: 'PCO',  nome: 'Planejamento e Controle de Obras', categoria: 'PCO', definicao: 'Conjunto de processos para planejar, monitorar e controlar o desempenho físico e financeiro de obras de engenharia.', formula: null },
  { sigla: 'WBS',  nome: 'Work Breakdown Structure',         categoria: 'PCO', definicao: 'Versão em inglês da EAP. Decomposição hierárquica orientada à entrega do trabalho a ser executado pela equipe do projeto.', formula: null },
  { sigla: 'CPI',  nome: 'Cost Performance Index',           categoria: 'EVM', definicao: 'Versão em inglês do IDC. Índice de eficiência de custo utilizado no padrão PMI/PMBOK.', formula: 'CPI = EV / AC' },
  { sigla: 'SPI',  nome: 'Schedule Performance Index',       categoria: 'EVM', definicao: 'Versão em inglês do IDP. Índice de eficiência de prazo utilizado no padrão PMI/PMBOK.', formula: 'SPI = EV / PV' },
  { sigla: 'BCWP', nome: 'Budgeted Cost of Work Performed',  categoria: 'EVM', definicao: 'Terminologia ANSI/EIA-748 para Valor Agregado (VA).', formula: null },
  { sigla: 'BCWS', nome: 'Budgeted Cost of Work Scheduled',  categoria: 'EVM', definicao: 'Terminologia ANSI/EIA-748 para Valor Planejado (VP).', formula: null },
  { sigla: 'ACWP', nome: 'Actual Cost of Work Performed',    categoria: 'EVM', definicao: 'Terminologia ANSI/EIA-748 para Custo Real (CR).', formula: null },
  { sigla: 'NR-10',nome: 'Norma Regulamentadora 10',         categoria: 'Segurança', definicao: 'Norma de segurança em instalações e serviços em eletricidade. Obrigatória para todos os trabalhadores que atuam direta ou indiretamente em instalações elétricas.', formula: null },
  { sigla: 'NR-35',nome: 'Norma Regulamentadora 35',         categoria: 'Segurança', definicao: 'Norma de segurança e saúde no trabalho em altura. Obrigatória para atividades realizadas acima de 2 metros.', formula: null },
  { sigla: 'AT',   nome: 'Alta Tensão',                      categoria: 'Técnico', definicao: 'Classificação de sistemas elétricos com tensão nominal acima de 1.000 V em corrente alternada.', formula: null },
  { sigla: 'SE',   nome: 'Subestação Elétrica',              categoria: 'Técnico', definicao: 'Instalação elétrica que transforma tensão de transmissão para tensão de distribuição ou vice-versa.', formula: null },
  { sigla: 'LT',   nome: 'Linha de Transmissão',             categoria: 'Técnico', definicao: 'Conjunto de instalações destinadas ao transporte de energia elétrica em alta ou extra-alta tensão.', formula: null },
]

const categorias = ['Todos', ...new Set(termos.map(t => t.categoria))]

const catCores = {
  EVM:       { bg: '#eef1f8', text: '#233772', border: '#dde3f0' },
  PCO:       { bg: '#FFF3CC', text: '#e6b000', border: '#FFE066' },
  Segurança: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
  Técnico:   { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
}

export default function Glossario() {
  const [busca, setBusca] = useState('')
  const [catAtiva, setCatAtiva] = useState('Todos')

  const filtrados = termos.filter(t => {
    const matchBusca = !busca ||
      t.sigla.toLowerCase().includes(busca.toLowerCase()) ||
      t.nome.toLowerCase().includes(busca.toLowerCase()) ||
      t.definicao.toLowerCase().includes(busca.toLowerCase())
    const matchCat = catAtiva === 'Todos' || t.categoria === catAtiva
    return matchBusca && matchCat
  })

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold" style={{ color: '#233772' }}>Glossário de Abreviações</h2>
          <p className="text-xs mt-0.5" style={{ color: '#B3B3B3' }}>{termos.length} termos · EVM, PCO, Engenharia Elétrica e Segurança</p>
        </div>
        <BookOpen size={28} style={{ color: '#FFC82D' }} />
      </div>

      {/* Busca */}
      <div className="flex items-center gap-2 rounded-xl px-4 py-3 mb-4 shadow-sm"
        style={{ backgroundColor: '#fff', border: '1.5px solid #e5e7eb' }}>
        <Search size={16} style={{ color: '#B3B3B3' }} />
        <input type="text" value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar sigla, nome ou definição..."
          className="flex-1 text-sm outline-none bg-transparent"
          style={{ fontFamily: 'Montserrat, sans-serif', color: '#333' }}
        />
        {busca && <button onClick={() => setBusca('')} className="text-xs px-2 py-1 rounded" style={{ color: '#B3B3B3' }}>limpar</button>}
      </div>

      {/* Filtros de categoria */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categorias.map(cat => (
          <button key={cat} onClick={() => setCatAtiva(cat)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold transition-colors"
            style={catAtiva === cat
              ? { backgroundColor: '#233772', color: '#fff' }
              : { backgroundColor: '#f1f5f9', color: '#B3B3B3' }
            }>{cat}</button>
        ))}
      </div>

      {/* Lista de termos */}
      <div className="grid gap-3 md:grid-cols-2">
        {filtrados.map(t => {
          const c = catCores[t.categoria] || catCores.EVM
          return (
            <div key={t.sigla} className="bg-white rounded-xl p-4 shadow-sm"
              style={{ border: `1px solid ${c.border}` }}>
              <div className="flex items-start gap-3 mb-2">
                <div className="px-3 py-1.5 rounded-lg font-black text-sm flex-shrink-0"
                  style={{ backgroundColor: c.bg, color: c.text }}>{t.sigla}</div>
                <div>
                  <p className="text-sm font-semibold" style={{ color: '#233772' }}>{t.nome}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ backgroundColor: c.bg, color: c.text }}>{t.categoria}</span>
                </div>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: '#666' }}>{t.definicao}</p>
              {t.formula && (
                <div className="mt-2 px-3 py-2 rounded-lg text-xs font-mono font-semibold"
                  style={{ backgroundColor: '#eef1f8', color: '#233772' }}>{t.formula}</div>
              )}
              {t.semaforo && (
                <div className="mt-2 flex gap-2 text-[10px] flex-wrap">
                  <span className="px-2 py-1 rounded-full font-semibold" style={{ backgroundColor: '#f0fdf4', color: '#16a34a' }}>Verde: {t.semaforo.verde}</span>
                  <span className="px-2 py-1 rounded-full font-semibold" style={{ backgroundColor: '#fefce8', color: '#ca8a04' }}>Amarelo: {t.semaforo.amarelo}</span>
                  <span className="px-2 py-1 rounded-full font-semibold" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>Vermelho: {t.semaforo.vermelho}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {filtrados.length === 0 && (
        <div className="text-center py-16">
          <p className="font-semibold" style={{ color: '#B3B3B3' }}>Nenhum termo encontrado para "{busca}"</p>
        </div>
      )}
    </div>
  )
}
