import { Fragment, useEffect, useMemo, useState } from 'react';
import { Eye, Pencil, PlusCircle, Power, Search, Users } from 'lucide-react';
import { useClientes } from '../context/ClientesContext';
import { ModalCliente } from '../components/clientes/ModalCliente';
import type { Cliente } from '../domain/entities/Cliente';
import { SEGMENTOS_CLIENTE } from '../domain/value-objects/SegmentoCliente';
import { propostasRepository, type PropostaSupabase } from '../infrastructure/supabase/propostasRepository';
import { supabase } from '../infrastructure/supabase/client';
import {
  criarWorkspacePadrao,
  orcamentoWorkspaceRepository,
  type DisciplinaWorkspace,
  type OrcamentoWorkspaceDados,
} from '../infrastructure/supabase/orcamentoWorkspaceRepository';
import './Clientes.css';

type PainelAberto = 'historico' | 'relatorio' | 'editarPdf' | 'previewPdf' | null;
type PerfilCliente = 'Administradora' | 'Construtora' | 'Cliente Final';
type StatusHistorico = 'FECHADO' | 'ENVIADO' | 'PERDIDO';
type PropostaClienteBase = Pick<
  PropostaSupabase,
  | 'id'
  | 'numero_composto'
  | 'cliente'
  | 'obra'
  | 'disciplina'
  | 'valor_orcado'
  | 'status'
  | 'resultado_comercial'
  | 'data_entrada'
  | 'ano'
  | 'responsavel'
  | 'responsavel_comercial'
  | 'etapa_funil'
  | 'chance_fechamento'
  | 'urgencia'
  | 'proxima_acao'
  | 'data_proxima_acao'
  | 'ultima_interacao'
  | 'link_arquivo'
  | 'data_limite'
  | 'observacao_comercial'
>;

interface PropostaCliente extends PropostaClienteBase {
  workspace: OrcamentoWorkspaceDados;
  followUps: number;
  mudancasEtapa: number;
  pendenciasAbertas: number;
}

interface HistoricoCliente {
  numero: string;
  data: string;
  obra: string;
  disciplina: string;
  valor: number;
  status: StatusHistorico;
}

interface OrcamentoClienteResumo {
  id: string;
  numero: string;
  obra: string;
  etapa: string;
  estrategia: string;
  valor: number;
  documentos: number;
  escopo: number;
  cotacoes: number;
  pendencias: number;
  ultimaAtividade: string;
}

interface CentroInformacaoCliente {
  orcamentosAtivos: number;
  propostaPrincipal: OrcamentoClienteResumo | null;
  totalAreas: number;
  totalM2: number;
  totalEscopo: number;
  totalCotacoes: number;
  totalDocumentos: number;
  totalHistorico: number;
  totalPendencias: number;
  totalFollowUps: number;
  valorEmAndamento: number;
  disciplinas: string[];
  responsaveis: string[];
  ultimaAtividade: string | null;
}

interface ClienteAnalitico {
  cliente: Cliente;
  perfil: PerfilCliente;
  nivel: string;
  preferencia: string;
  recorrencia: string;
  tempoRelacao: string;
  prioridade: string;
  classificacao: string;
  score: number;
  obrasOrcadas: number;
  obrasFechadas: number;
  taxaFechamento: string;
  valorTotalOrcado: number;
  valorTotalFechado: number;
  valorPerdido: number;
  mediaOrcada: number;
  mediaFechada: number;
  ticketRelevante: number;
  maiorObra: number;
  nivelObra: string;
  taxaAdm: string;
  variacao: string;
  historico: HistoricoCliente[];
  centro: CentroInformacaoCliente;
}

interface PdfEdits {
  ticket: string;
  perfil: string;
  totalFechado: string;
  obraDestaque: string;
}

function moeda(valor: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valor || 0);
}

function moedaCurta(valor: number) {
  if (!valor) return 'R$ 0';
  if (valor >= 1_000_000) return `R$ ${(valor / 1_000_000).toFixed(2).replace('.', ',')} mi`;
  if (valor >= 1_000) return `R$ ${Math.round(valor / 1000).toLocaleString('pt-BR')} mil`;
  return moeda(valor);
}

function normalizarTexto(texto?: string | null) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

const ETAPA_LABEL: Record<string, string> = {
  entrada_oportunidade: 'Entrada',
  aguardando_documentos: 'Documentos',
  analise_inicial: 'Análise',
  levantamento: 'Levantamento',
  cotacao: 'Cotação',
  montagem_orcamento: 'Montagem',
  revisao_interna: 'Revisão',
  proposta_enviada: 'Enviada',
  followup: 'Follow-up',
  negociacao: 'Negociação',
  pos_venda: 'Pós-venda',
};

const DISCIPLINA_LABEL: Record<DisciplinaWorkspace, string> = {
  eletrica: 'Elétrica',
  hidraulica: 'Hidráulica',
  incendio: 'Incêndio',
  gas: 'Gás',
  spda: 'SPDA',
  dados: 'Dados',
  outros: 'Outros',
};

const ESTRATEGIA_LABEL: Record<string, string> = {
  economica: 'Econômica',
  recomendada: 'Recomendada',
  premium: 'Premium',
  marca_exigida: 'Marca exigida',
};

function workspaceDaProposta(proposta: PropostaCliente) {
  return proposta.workspace || criarWorkspacePadrao();
}

function valorCotacoesConsideradas(workspace: OrcamentoWorkspaceDados) {
  const consideradas = workspace.cotacoes.filter((cotacao) => cotacao.considerada);
  const base = consideradas.length ? consideradas : workspace.cotacoes;
  return base.reduce((sum, cotacao) => sum + Number(cotacao.valor || 0), 0);
}

function valorDinamicoProposta(proposta: PropostaCliente) {
  const workspace = workspaceDaProposta(proposta);
  const valorWorkspace = Number(workspace.estrategia?.valorSugerido || 0);
  if (valorWorkspace > 0) return valorWorkspace;
  const valorProposta = Number(proposta.valor_orcado || 0);
  if (valorProposta > 0) return valorProposta;
  return valorCotacoesConsideradas(workspace);
}

function disciplinasDaProposta(proposta: PropostaCliente) {
  const workspace = workspaceDaProposta(proposta);
  const valores = new Set<string>();
  if (proposta.disciplina) valores.add(proposta.disciplina);
  workspace.areas.flatMap((area) => area.disciplinas || []).forEach((disciplina) => valores.add(DISCIPLINA_LABEL[disciplina] || disciplina));
  workspace.escopo.map((item) => item.disciplina).forEach((disciplina) => valores.add(DISCIPLINA_LABEL[disciplina] || disciplina));
  return [...valores].filter(Boolean);
}

function dataValida(valor?: string | null) {
  if (!valor) return null;
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

function dataMaisRecenteProposta(proposta: PropostaCliente) {
  const workspace = workspaceDaProposta(proposta);
  const datas = [
    proposta.ultima_interacao,
    proposta.data_proxima_acao,
    proposta.data_entrada,
    ...workspace.areas.map((item) => item.criadoEm),
    ...workspace.escopo.map((item) => item.criadoEm),
    ...workspace.cotacoes.map((item) => item.criadoEm),
    ...workspace.documentos.map((item) => item.criadoEm),
    ...workspace.historico.map((item) => item.criadoEm),
  ]
    .map(dataValida)
    .filter(Boolean) as Date[];

  if (!datas.length) return null;
  return datas.sort((a, b) => b.getTime() - a.getTime())[0].toISOString();
}

function textoAtividade(dataIso?: string | null) {
  const data = dataValida(dataIso);
  if (!data) return 'Sem atividade';
  const dias = Math.max(0, Math.floor((Date.now() - data.getTime()) / 86400000));
  if (dias === 0) return 'Hoje';
  if (dias === 1) return 'Ontem';
  if (dias < 30) return `${dias}d`;
  if (dias < 365) return `${Math.floor(dias / 30)}m`;
  return 'Mais de 12m';
}

function etapaDaProposta(proposta: PropostaCliente) {
  const etapa = proposta.etapa_funil || 'entrada_oportunidade';
  return ETAPA_LABEL[etapa] || etapa.replace(/_/g, ' ');
}

function estrategiaDaProposta(proposta: PropostaCliente) {
  const tipo = workspaceDaProposta(proposta).estrategia?.tipo || 'recomendada';
  return ESTRATEGIA_LABEL[tipo] || tipo.replace(/_/g, ' ');
}

function montarCentroInformacao(propostasCliente: PropostaCliente[]): CentroInformacaoCliente {
  const ordenadas = [...propostasCliente].sort((a, b) =>
    String(dataMaisRecenteProposta(b) || '').localeCompare(String(dataMaisRecenteProposta(a) || ''))
  );
  const ativas = propostasCliente.filter((proposta) => !propostaFechada(proposta) && !propostaPerdida(proposta));
  const propostaPrincipal = ordenadas[0] || null;
  const workspaces = propostasCliente.map(workspaceDaProposta);
  const totalAreas = workspaces.reduce((sum, workspace) => sum + workspace.areas.length, 0);
  const totalM2 = workspaces.reduce((sum, workspace) => sum + workspace.areas.reduce((areaSum, area) => areaSum + Number(area.metragem || 0), 0), 0);
  const totalEscopo = workspaces.reduce((sum, workspace) => sum + workspace.escopo.length, 0);
  const totalCotacoes = workspaces.reduce((sum, workspace) => sum + workspace.cotacoes.length, 0);
  const totalDocumentos = workspaces.reduce((sum, workspace) => sum + workspace.documentos.length, 0) + propostasCliente.filter((proposta) => proposta.link_arquivo).length;
  const totalHistoricoWorkspace = workspaces.reduce((sum, workspace) => sum + workspace.historico.length, 0);
  const totalFollowUps = propostasCliente.reduce((sum, proposta) => sum + proposta.followUps, 0);
  const totalMudancas = propostasCliente.reduce((sum, proposta) => sum + proposta.mudancasEtapa, 0);
  const totalPendencias = propostasCliente.reduce((sum, proposta) => sum + proposta.pendenciasAbertas, 0);
  const disciplinas = [...new Set(propostasCliente.flatMap(disciplinasDaProposta))];
  const responsaveis = [...new Set(propostasCliente.map((proposta) => proposta.responsavel_comercial || proposta.responsavel).filter(Boolean) as string[])];
  const valorEmAndamento = ativas.reduce((sum, proposta) => sum + valorDinamicoProposta(proposta), 0);
  const ultimaAtividade = propostaPrincipal ? dataMaisRecenteProposta(propostaPrincipal) : null;

  return {
    orcamentosAtivos: ativas.length,
    propostaPrincipal: propostaPrincipal
      ? {
          id: propostaPrincipal.id,
          numero: propostaPrincipal.numero_composto || propostaPrincipal.id,
          obra: propostaPrincipal.obra || propostaPrincipal.cliente || 'Orçamento sem obra',
          etapa: etapaDaProposta(propostaPrincipal),
          estrategia: estrategiaDaProposta(propostaPrincipal),
          valor: valorDinamicoProposta(propostaPrincipal),
          documentos: workspaceDaProposta(propostaPrincipal).documentos.length + (propostaPrincipal.link_arquivo ? 1 : 0),
          escopo: workspaceDaProposta(propostaPrincipal).escopo.length,
          cotacoes: workspaceDaProposta(propostaPrincipal).cotacoes.length,
          pendencias: propostaPrincipal.pendenciasAbertas,
          ultimaAtividade: textoAtividade(dataMaisRecenteProposta(propostaPrincipal)),
        }
      : null,
    totalAreas,
    totalM2,
    totalEscopo,
    totalCotacoes,
    totalDocumentos,
    totalHistorico: totalHistoricoWorkspace + totalFollowUps + totalMudancas,
    totalPendencias,
    totalFollowUps,
    valorEmAndamento,
    disciplinas,
    responsaveis,
    ultimaAtividade,
  };
}

function perfilDoCliente(cliente: Cliente): PerfilCliente {
  const texto = `${cliente.segmento} ${cliente.tipo} ${cliente.razaoSocial}`.toLowerCase();
  if (texto.includes('constru') || texto.includes('obra')) return 'Construtora';
  if (texto.includes('condom') || texto.includes('admin')) return 'Administradora';
  return 'Cliente Final';
}

function propostaDoCliente(cliente: Cliente, proposta: PropostaCliente) {
  const nomeProposta = normalizarTexto(proposta.cliente);
  if (!nomeProposta) return false;

  const nomesCliente = [
    cliente.razaoSocial,
    cliente.nomeFantasia,
    cliente.nomeInterno,
  ].map(normalizarTexto).filter(Boolean);

  return nomesCliente.some((nome) => nomeProposta === nome || nomeProposta.includes(nome) || nome.includes(nomeProposta));
}

function statusComercial(proposta: PropostaCliente) {
  return normalizarTexto(`${proposta.status || ''} ${proposta.resultado_comercial || ''}`);
}

function propostaFechada(proposta: PropostaCliente) {
  const status = statusComercial(proposta);
  return status.includes('fechad') || status.includes('ganh') || status.includes('aprov') || status.includes('contrat');
}

function propostaPerdida(proposta: PropostaCliente) {
  const status = statusComercial(proposta);
  return status.includes('perdid') || status.includes('reprov') || status.includes('cancel');
}

function statusHistoricoDaProposta(proposta: PropostaCliente): StatusHistorico {
  if (propostaFechada(proposta)) return 'FECHADO';
  if (propostaPerdida(proposta)) return 'PERDIDO';
  return 'ENVIADO';
}

function dataProposta(proposta: PropostaCliente) {
  if (!proposta.data_entrada) return '—';
  const data = new Date(proposta.data_entrada);
  if (Number.isNaN(data.getTime())) return '—';
  return data.toLocaleDateString('pt-BR');
}

function montarAnalitico(cliente: Cliente, propostas: PropostaCliente[]): ClienteAnalitico {
  const propostasCliente = propostas
    .filter((proposta) => propostaDoCliente(cliente, proposta))
    .sort((a, b) => String(dataMaisRecenteProposta(b) || '').localeCompare(String(dataMaisRecenteProposta(a) || '')));

  const centro = montarCentroInformacao(propostasCliente);

  const historico = propostasCliente.map((proposta) => ({
    numero: proposta.numero_composto || proposta.id,
    data: dataProposta(proposta),
    obra: proposta.obra || proposta.cliente || cliente.razaoSocial,
    disciplina: disciplinasDaProposta(proposta)[0] || 'Sem disciplina',
    valor: valorDinamicoProposta(proposta),
    status: statusHistoricoDaProposta(proposta),
  }));

  const obrasOrcadas = propostasCliente.length;
  const obrasFechadas = propostasCliente.filter(propostaFechada).length;
  const obrasPerdidas = propostasCliente.filter(propostaPerdida).length;
  const valores = propostasCliente.map(valorDinamicoProposta).filter((valor) => valor > 0);
  const valorTotalOrcado = valores.reduce((sum, value) => sum + value, 0);
  const valorTotalFechado = propostasCliente.filter(propostaFechada).reduce((sum, proposta) => sum + valorDinamicoProposta(proposta), 0);
  const valorPerdido = propostasCliente.filter(propostaPerdida).reduce((sum, proposta) => sum + valorDinamicoProposta(proposta), 0);
  const taxa = obrasOrcadas ? (obrasFechadas / obrasOrcadas) * 100 : 0;
  const disciplinasUnicas = centro.disciplinas.length;
  const maturidadeOrcamento = Math.min(20, centro.totalAreas * 2 + centro.totalDocumentos * 2 + centro.totalEscopo + centro.totalCotacoes + centro.totalHistorico);
  const score = obrasOrcadas
    ? Math.min(100, Math.round(taxa * 0.45 + Math.min(20, obrasOrcadas * 2) + Math.min(12, disciplinasUnicas * 3) + maturidadeOrcamento + (cliente.ativo ? 8 : 0) - Math.min(10, centro.totalPendencias * 2)))
    : 0;
  const classificacao = score >= 88 ? 'A+' : score >= 76 ? 'A' : score >= 62 ? 'B' : 'C';
  const maiorObra = Math.max(...valores, 0);
  const mediaOrcada = valores.length ? Math.round(valorTotalOrcado / valores.length) : 0;
  const mediaFechada = obrasFechadas ? Math.round(valorTotalFechado / obrasFechadas) : 0;
  const anos = propostasCliente.map((proposta) => proposta.data_entrada?.slice(0, 4)).filter(Boolean) as string[];
  const anoMaisAntigo = anos.length ? Math.min(...anos.map(Number)) : null;

  return {
    cliente,
    perfil: perfilDoCliente(cliente),
    nivel: classificacao,
    preferencia: taxa >= 50 ? 'Serviço' : 'Valor',
    recorrencia: obrasOrcadas >= 12 ? 'Alta' : obrasOrcadas >= 7 ? 'Média' : obrasOrcadas > 0 ? 'Baixa' : 'Sem histórico',
    tempoRelacao: anoMaisAntigo && anoMaisAntigo <= 2024 ? 'Antigo' : 'Novo',
    prioridade: score >= 86 ? 'Máxima' : score >= 70 ? 'Alta' : 'Média',
    classificacao,
    score,
    obrasOrcadas,
    obrasFechadas,
    taxaFechamento: `${taxa.toFixed(1).replace('.', ',')}%`,
    valorTotalOrcado,
    valorTotalFechado,
    valorPerdido: valorPerdido || Math.max(valorTotalOrcado - valorTotalFechado, 0),
    mediaOrcada,
    mediaFechada,
    ticketRelevante: mediaFechada || mediaOrcada,
    maiorObra,
    nivelObra: maiorObra >= 1_000_000 ? 'Acima de R$ 1 milhão' : maiorObra >= 500_000 ? 'Até R$ 1 milhão' : 'Até R$ 500 mil',
    taxaAdm: '—',
    variacao: obrasPerdidas > obrasFechadas ? '-0,0%' : '+0,0%',
    historico,
    centro,
  };
}

function resumoCliente(item: ClienteAnalitico) {
  const centro = item.centro;
  return `Cliente com perfil ${item.recorrencia.toLowerCase()} e atuação predominante como ${item.perfil.toLowerCase()}, apresentando taxa de fechamento de ${item.taxaFechamento}. A central dinâmica aponta ${centro.orcamentosAtivos} orçamento(s) ativo(s), ${centro.totalEscopo} item(ns) de escopo, ${centro.totalCotacoes} cotação(ões), ${centro.totalDocumentos} documento(s) e ${centro.totalPendencias} pendência(s) aberta(s). Já realizou obras de até ${moedaCurta(item.maiorObra)}, está classificado como cliente ${item.classificacao} e mantém prioridade comercial ${item.prioridade.toLowerCase()}.`;
}

function cidadeUf(cliente: Cliente) {
  if (cliente.cidade && cliente.uf) return `${cliente.cidade} / ${cliente.uf}`;
  return cliente.cidade || cliente.uf || '—';
}

function statusPill(status: string) {
  const statusClass = status === 'FECHADO' ? 'ok' : status === 'PERDIDO' ? 'danger' : 'warn';
  return <span className={`clientes-status-table ${statusClass}`}>{status}</span>;
}

function anoDoHistorico(row: HistoricoCliente) {
  const match = row.data.match(/(\d{4})$/);
  return match ? Number(match[1]) : new Date().getFullYear();
}

function barrasAno(item: ClienteAnalitico) {
  const mapa = new Map<number, { ano: string; orcadas: number; fechadas: number }>();
  item.historico.forEach((row) => {
    const ano = anoDoHistorico(row);
    const atual = mapa.get(ano) || { ano: String(ano), orcadas: 0, fechadas: 0 };
    atual.orcadas += 1;
    if (row.status === 'FECHADO') atual.fechadas += 1;
    mapa.set(ano, atual);
  });
  return [...mapa.values()].sort((a, b) => Number(a.ano) - Number(b.ano)).slice(-4);
}

function valoresAno(item: ClienteAnalitico) {
  const mapa = new Map<number, { ano: string; valor: number }>();
  item.historico.forEach((row) => {
    const ano = anoDoHistorico(row);
    const atual = mapa.get(ano) || { ano: String(ano), valor: 0 };
    atual.valor += row.valor;
    mapa.set(ano, atual);
  });
  return [...mapa.values()].sort((a, b) => Number(a.ano) - Number(b.ano)).slice(-4);
}

function LineChart({ item, pdf = false }: { item: ClienteAnalitico; pdf?: boolean }) {
  const rows = barrasAno(item);
  const chartRows = rows.length ? rows : [{ ano: '—', orcadas: 0, fechadas: 0 }];
  const max = Math.max(...chartRows.flatMap((row) => [row.orcadas, row.fechadas]), 1);
  const w = 560;
  const h = 220;
  const pl = 44;
  const pr = 18;
  const pt = 18;
  const pb = 34;
  const innerW = w - pl - pr;
  const innerH = h - pt - pb;
  const step = innerW / Math.max(chartRows.length - 1, 1);
  const x = (index: number) => pl + index * step;
  const y = (value: number) => pt + innerH - (value / max) * (innerH - 10);
  const line = (values: number[]) => values.map((value, index) => `${x(index)},${y(value)}`).join(' ');
  const prefix = pdf ? 'clientes-pdf-svg' : 'clientes-svg';

  return (
    <svg className={pdf ? 'clientes-pdf-svg' : 'clientes-svg-chart'} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <line className={`${prefix}-axis`} x1={pl} y1={pt} x2={pl} y2={pt + innerH} />
      <line className={`${prefix}-axis`} x1={pl} y1={pt + innerH} x2={w - pr} y2={pt + innerH} />
      {[0, 0.33, 0.66, 1].map((tick) => (
        <line key={tick} className={`${prefix}-grid`} x1={pl} y1={pt + innerH * tick} x2={w - pr} y2={pt + innerH * tick} />
      ))}
      <polyline className={`${prefix}-line-blue`} points={line(chartRows.map((row) => row.orcadas))} />
      <polyline className={`${prefix}-line-green`} points={line(chartRows.map((row) => row.fechadas))} />
      {chartRows.map((row, index) => (
        <g key={row.ano}>
          <circle className={`${prefix}-point-blue`} cx={x(index)} cy={y(row.orcadas)} r="4" />
          <text className={`${prefix}-label`} x={x(index)} y={y(row.orcadas) - 10} textAnchor="middle">{row.orcadas}</text>
          <circle className={`${prefix}-point-green`} cx={x(index)} cy={y(row.fechadas)} r="4" />
          <text className={`${prefix}-label`} x={x(index)} y={y(row.fechadas) - 10} textAnchor="middle">{row.fechadas}</text>
          <text className={`${prefix}-text`} x={x(index)} y={h - 10} textAnchor="middle">{row.ano}</text>
        </g>
      ))}
    </svg>
  );
}

function BarChart({ item, pdf = false }: { item: ClienteAnalitico; pdf?: boolean }) {
  const rows = valoresAno(item);
  const chartRows = rows.length ? rows : [{ ano: '—', valor: 0 }];
  const max = Math.max(...chartRows.map((row) => row.valor), 1);
  const prefix = pdf ? 'clientes-pdf-svg' : 'clientes-svg';

  return (
    <svg className={pdf ? 'clientes-pdf-svg' : 'clientes-svg-chart'} viewBox="0 0 560 220" preserveAspectRatio="none">
      <defs>
        <linearGradient id={pdf ? 'clientesPdfBarGrad' : 'clientesBarGrad'} x1="0" x2="1">
          <stop offset="0%" stopColor="#6ea8ff" />
          <stop offset="100%" stopColor="#2f72f6" />
        </linearGradient>
      </defs>
      {chartRows.map((row, index) => {
        const y = 22 + index * 44;
        const width = 390 * (row.valor / max);
        return (
          <g key={row.ano}>
            <text className={`${prefix}-label`} x="10" y={y + 16}>{row.ano}</text>
            <rect x="70" y={y} width={width} height="26" rx="8" fill={`url(#${pdf ? 'clientesPdfBarGrad' : 'clientesBarGrad'})`} />
            <text className={`${prefix}-label`} x={70 + width + 10} y={y + 18}>{moedaCurta(row.valor)}</text>
          </g>
        );
      })}
      <line className={`${prefix}-grid`} x1="70" y1="200" x2="530" y2="200" />
    </svg>
  );
}

function PdfSheet({ item, resumo, edits }: { item: ClienteAnalitico; resumo: string; edits: PdfEdits }) {
  const cliente = item.cliente;
  const perdidas = item.historico.filter((row) => row.status === 'PERDIDO').length;
  const aguardando = Math.max(item.obrasOrcadas - item.obrasFechadas - perdidas, 0);

  return (
    <div className="clientes-pdf-sheet">
      <div className="clientes-pdf-head">
        <div className="clientes-pdf-logo">BIASI</div>
        <div className="clientes-pdf-company">
          <div><strong>Dono</strong></div><div>Heber Alessandro Biasi</div>
          <div><strong>CNPJ</strong></div><div>04.493.381/0001-49</div>
          <div><strong>E-mail</strong></div><div>paulo@biasiengenharia.com.br</div>
          <div><strong>Site</strong></div><div>biasiengenharia.com.br</div>
        </div>
      </div>

      <div className="clientes-pdf-title">RELATÓRIO SOBRE O CLIENTE</div>
      <p className="clientes-pdf-subtitle">Leitura executiva do relacionamento e do desempenho comercial do cliente.</p>

      <div className="clientes-pdf-hero-kpis">
        <div className="clientes-pdf-hero-card"><div className="clientes-pdf-icon blue">%</div><div><span>Taxa de fechamento</span><strong>{item.taxaFechamento}</strong><small>{item.obrasFechadas} de {item.obrasOrcadas} propostas</small></div></div>
        <div className="clientes-pdf-hero-card"><div className="clientes-pdf-icon green">$</div><div><span>Ticket médio</span><strong>{edits.ticket || moedaCurta(item.mediaFechada || item.mediaOrcada)}</strong><small>Valor médio das obras</small></div></div>
        <div className="clientes-pdf-hero-card"><div className="clientes-pdf-icon yellow">★</div><div><span>Maior obra</span><strong>{moedaCurta(item.maiorObra)}</strong><small>{edits.obraDestaque || item.historico[0]?.obra || 'Obra destaque'}</small></div></div>
        <div className="clientes-pdf-hero-card"><div className="clientes-pdf-icon purple">Σ</div><div><span>Total fechado</span><strong>{edits.totalFechado || moedaCurta(item.valorTotalFechado)}</strong><small>Valor total das obras</small></div></div>
      </div>

      <section className="clientes-pdf-section">
        <h3>INFORMAÇÕES DO CLIENTE</h3>
        <div className="clientes-pdf-grid">
          {[
            ['Nome', cliente.razaoSocial],
            ['Apelido Comercial', cliente.nomeFantasia || cliente.nomeInterno || '—'],
            ['CNPJ / CPF', cliente.cnpjCpf || '—'],
            ['Tempo de Relação', item.tempoRelacao],
            ['Perfil do Cliente', edits.perfil || item.perfil],
            ['Nível de Cliente', item.nivel],
            ['Preferência', item.preferencia],
            ['Recorrência', item.recorrencia],
          ].map(([key, value]) => (
            <div className="clientes-pdf-item" key={key}><span>{key}</span><strong>{value}</strong></div>
          ))}
        </div>
      </section>

      <div className="clientes-pdf-visual-grid">
        <div className="clientes-pdf-visual-card"><h3>Obras por ano</h3><LineChart item={item} pdf /></div>
        <div className="clientes-pdf-visual-card"><h3>Evolução de valores (R$)</h3><BarChart item={item} pdf /></div>
      </div>

      <div className="clientes-pdf-visual-grid">
        <div className="clientes-pdf-visual-card">
          <h3>Status das obras</h3>
          <div className="clientes-pdf-status-layout">
            <div className="clientes-pdf-donut"><strong>Total</strong><span>{item.obrasOrcadas}</span><strong>obras</strong></div>
            <div className="clientes-pdf-status-list">
              <div><span><i className="green" />Obras fechadas</span><strong>{item.obrasFechadas}</strong></div>
              <div><span><i className="yellow" />Aguardando</span><strong>{aguardando}</strong></div>
              <div><span><i className="red" />Obras perdidas</span><strong>{perdidas}</strong></div>
            </div>
          </div>
        </div>
        <div className="clientes-pdf-visual-card">
          <h3>Perfil e disciplinas</h3>
          <div className="clientes-pdf-profile-list">
            <div><span>Perfil do cliente</span><strong>{edits.perfil || item.perfil}</strong></div>
            <div><span>Recorrência</span><strong>{item.recorrencia}</strong></div>
            <div><span>Preferência</span><strong>{item.preferencia}</strong></div>
            <div><span>Nível de relacionamento</span><strong>{item.classificacao}</strong></div>
          </div>
        </div>
      </div>

      <section className="clientes-pdf-section">
        <h3>DADOS DAS OBRAS DO CLIENTE</h3>
        <div className="clientes-pdf-kpis">
          {[
            ['Obras Orçadas', item.obrasOrcadas],
            ['Obras Fechadas', item.obrasFechadas],
            ['Valor Total Orçado', moedaCurta(item.valorTotalOrcado)],
            ['Valor Total Fechado', moedaCurta(item.valorTotalFechado)],
            ['Taxa de Fechamento', item.taxaFechamento],
            ['Média de Obra Fechada', moedaCurta(item.mediaFechada)],
            ['Ticket Relevante', moedaCurta(item.ticketRelevante)],
            ['Maior Obra Fechada', moedaCurta(item.maiorObra)],
          ].map(([key, value]) => (
            <div key={key}><span>{key}</span><strong>{value}</strong></div>
          ))}
        </div>
      </section>

      <section className="clientes-pdf-section">
        <h3>RESUMO DO CLIENTE</h3>
        <p className="clientes-pdf-summary">{resumo}</p>
      </section>
    </div>
  );
}

export function Clientes() {
  const { clientes, carregando, erro, toggleAtivoCliente } = useClientes();
  const [busca, setBusca] = useState('');
  const [filtroPerfil, setFiltroPerfil] = useState('todos');
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [filtroSegmento, setFiltroSegmento] = useState('todos');
  const [modalAberto, setModalAberto] = useState(false);
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [modoVisualizacao, setModoVisualizacao] = useState(false);
  const [clienteAbertoId, setClienteAbertoId] = useState<string | null>(null);
  const [painelAberto, setPainelAberto] = useState<PainelAberto>(null);
  const [buscaHistorico, setBuscaHistorico] = useState('');
  const [resumosEditados, setResumosEditados] = useState<Record<string, string>>({});
  const [pdfEdits, setPdfEdits] = useState<Record<string, PdfEdits>>({});
  const [propostasClientes, setPropostasClientes] = useState<PropostaCliente[]>([]);
  const [carregandoPropostas, setCarregandoPropostas] = useState(true);
  const [erroPropostas, setErroPropostas] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    let reloadTimer: number | undefined;

    async function carregarPropostas() {
      try {
        setCarregandoPropostas(true);
        setErroPropostas(null);
        const dados = await propostasRepository.buscarTodosParaClientes();
        const ids = dados.map((proposta) => proposta.id);
        const [workspaces, resumoOperacional] = await Promise.all([
          orcamentoWorkspaceRepository.listarPorPropostas(ids),
          propostasRepository.buscarResumoOperacionalParaClientes(ids),
        ]);
        const enriquecidas = dados.map((proposta) => {
          const resumo = resumoOperacional[proposta.id] || { followUps: 0, mudancasEtapa: 0, pendenciasAbertas: 0 };
          return {
            ...proposta,
            workspace: workspaces[proposta.id] || criarWorkspacePadrao(),
            followUps: resumo.followUps,
            mudancasEtapa: resumo.mudancasEtapa,
            pendenciasAbertas: resumo.pendenciasAbertas,
          };
        });
        if (!cancelado) setPropostasClientes(enriquecidas);
      } catch (error) {
        console.error('Erro ao carregar histórico comercial dos clientes:', error);
        if (!cancelado) setErroPropostas('Não foi possível carregar os números comerciais.');
      } finally {
        if (!cancelado) setCarregandoPropostas(false);
      }
    }

    function reagendarCarga() {
      window.clearTimeout(reloadTimer);
      reloadTimer = window.setTimeout(() => {
        void carregarPropostas();
      }, 250);
    }

    void carregarPropostas();
    const channel = supabase
      .channel('clientes-centro-orcamentos')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'propostas' }, reagendarCarga)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orcamento_workspace' }, reagendarCarga)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'follow_ups' }, reagendarCarga)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mudancas_etapa' }, reagendarCarga)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pendencias' }, reagendarCarga)
      .subscribe();

    return () => {
      cancelado = true;
      window.clearTimeout(reloadTimer);
      supabase.removeChannel(channel);
    };
  }, []);

  const analiticos = useMemo(
    () => clientes.map((cliente) => montarAnalitico(cliente, propostasClientes)),
    [clientes, propostasClientes]
  );

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return analiticos.filter((item) => {
      const cliente = item.cliente;
      const matchBusca = !termo || [
        cliente.razaoSocial,
        cliente.nomeFantasia,
        cliente.nomeInterno,
        cliente.cnpjCpf,
        cliente.contatoPrincipal,
      ].filter(Boolean).join(' ').toLowerCase().includes(termo);
      const matchPerfil = filtroPerfil === 'todos' || item.perfil === filtroPerfil;
      const matchStatus = filtroStatus === 'todos' || (filtroStatus === 'ativo' ? cliente.ativo : !cliente.ativo);
      const matchSegmento = filtroSegmento === 'todos' || cliente.segmento === filtroSegmento;
      return matchBusca && matchPerfil && matchStatus && matchSegmento;
    });
  }, [analiticos, busca, filtroPerfil, filtroStatus, filtroSegmento]);

  const itemAberto = filtrados.find((item) => item.cliente.id === clienteAbertoId) || null;
  const resumoAtual = itemAberto ? resumosEditados[itemAberto.cliente.id] || resumoCliente(itemAberto) : '';
  const editsAtual = itemAberto
    ? pdfEdits[itemAberto.cliente.id] || {
        ticket: moedaCurta(itemAberto.mediaFechada || itemAberto.mediaOrcada),
        perfil: itemAberto.perfil,
        totalFechado: moedaCurta(itemAberto.valorTotalFechado),
        obraDestaque: itemAberto.historico[0]?.obra || '',
      }
    : { ticket: '', perfil: '', totalFechado: '', obraDestaque: '' };

  function abrirNovoCliente() {
    setClienteEditando(null);
    setModoVisualizacao(false);
    setModalAberto(true);
  }

  function abrirVisualizacaoCliente(cliente: Cliente) {
    setClienteEditando(cliente);
    setModoVisualizacao(true);
    setModalAberto(true);
  }

  function abrirEdicaoCliente(cliente: Cliente) {
    setClienteEditando(cliente);
    setModoVisualizacao(false);
    setModalAberto(true);
  }

  function abrirCliente(id: string) {
    const mesmoCliente = clienteAbertoId === id;
    setClienteAbertoId(mesmoCliente ? null : id);
    setPainelAberto(null);
    setBuscaHistorico('');
  }

  function abrirPainel(painel: PainelAberto) {
    setPainelAberto((atual) => (atual === painel ? null : painel));
  }

  function atualizarPdfEdit(campo: keyof PdfEdits, valor: string) {
    if (!itemAberto) return;
    setPdfEdits((prev) => ({
      ...prev,
      [itemAberto.cliente.id]: { ...editsAtual, [campo]: valor },
    }));
  }

  function imprimirPdf() {
    window.setTimeout(() => window.print(), 100);
  }

  const historicoFiltrado = itemAberto
    ? itemAberto.historico.filter((row) =>
        [row.numero, row.data, row.obra, row.disciplina, moeda(row.valor), row.status].join(' ').toLowerCase().includes(buscaHistorico.toLowerCase())
      )
    : [];

  return (
    <div className="clientes-page">
      <ModalCliente
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        clienteEditando={clienteEditando ?? undefined}
        modoVisualizacao={modoVisualizacao}
      />

      <div className="clientes-topbar">
        <div>
          <h1>Clientes</h1>
          <p>Cadastro, gestão e leitura comercial dos clientes do sistema.</p>
        </div>
        <button type="button" className="clientes-top-btn" onClick={abrirNovoCliente}>
          <PlusCircle size={17} /> Novo Cliente
        </button>
      </div>

      <div className="clientes-content">
        <div className="clientes-filters">
          <label className="clientes-search">
            <Search size={16} />
            <input value={busca} onChange={(event) => setBusca(event.target.value)} placeholder="Buscar por razão social, fantasia ou CNPJ..." />
          </label>
          <select value={filtroPerfil} onChange={(event) => setFiltroPerfil(event.target.value)}>
            <option value="todos">Todos os tipos</option>
            <option>Administradora</option>
            <option>Construtora</option>
            <option>Cliente Final</option>
          </select>
          <select value={filtroStatus} onChange={(event) => setFiltroStatus(event.target.value)}>
            <option value="todos">Todos os status</option>
            <option value="ativo">ATIVO</option>
            <option value="inativo">INATIVO</option>
          </select>
          <select value={filtroSegmento} onChange={(event) => setFiltroSegmento(event.target.value)}>
            <option value="todos">Todos os segmentos</option>
            {SEGMENTOS_CLIENTE.map((segmento) => <option key={segmento}>{segmento}</option>)}
          </select>
          <span>{carregandoPropostas ? 'Atualizando números...' : `${filtrados.length} cliente${filtrados.length === 1 ? '' : 's'}`}</span>
        </div>

        {carregando && <div className="clientes-empty">Carregando clientes...</div>}
        {erro && !carregando && <div className="clientes-empty danger">Não foi possível carregar clientes: {erro}</div>}

        {!carregando && !erro && filtrados.length === 0 && (
          <div className="clientes-empty">
            <Users size={32} />
            <strong>Nenhum cliente encontrado</strong>
            <p>Ajuste os filtros ou cadastre um novo cliente.</p>
          </div>
        )}

        {!carregando && !erro && filtrados.length > 0 && (
          <div className="clientes-table-shell">
            <table>
              <thead>
                <tr>
                  <th>STATUS</th>
                  <th>RAZÃO SOCIAL</th>
                  <th>NOME FANTASIA</th>
                  <th>CNPJ / CPF</th>
                  <th>SEGMENTO</th>
                  <th>CONTATO</th>
                  <th>TELEFONE</th>
                  <th>CIDADE / UF</th>
                  <th>AÇÕES</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((item) => {
                  const cliente = item.cliente;
                  const aberto = clienteAbertoId === cliente.id;
                  const centro = item.centro;
                  const principal = centro.propostaPrincipal;
                  return (
                    <Fragment key={cliente.id}>
                      <tr className={`clientes-row ${aberto ? 'open' : ''}`} onClick={() => abrirCliente(cliente.id)}>
                        <td><span className={`clientes-status-pill ${cliente.ativo ? 'active' : 'inactive'}`}>{cliente.ativo ? 'Ativo' : 'Inativo'}</span></td>
                        <td><strong>{cliente.razaoSocial}</strong><small>{cliente.contatoPrincipal || item.perfil}<br />{cliente.tipo}</small></td>
                        <td><strong>{cliente.nomeFantasia || cliente.nomeInterno || '—'}</strong></td>
                        <td className="mono">{cliente.cnpjCpf || '—'}</td>
                        <td><span className="clientes-segment-pill">{cliente.segmento}</span></td>
                        <td>{cliente.contatoPrincipal || '—'}</td>
                        <td>{cliente.telefone || '—'}</td>
                        <td>{cidadeUf(cliente)}</td>
                        <td>
                          <div className="clientes-actions" onClick={(event) => event.stopPropagation()}>
                            <button type="button" title="Visualizar" onClick={() => abrirVisualizacaoCliente(cliente)}><Eye size={15} /></button>
                            <button type="button" title="Editar" onClick={() => abrirEdicaoCliente(cliente)}><Pencil size={15} /></button>
                            <button type="button" title={cliente.ativo ? 'Inativar' : 'Ativar'} onClick={() => void toggleAtivoCliente(cliente.id)}><Power size={15} /></button>
                          </div>
                        </td>
                      </tr>
                      {aberto && (
                        <tr className="clientes-expand-row">
                          <td colSpan={9}>
                            <div className="clientes-expand-wrap">
                              <div className="clientes-compact-panel">
                                <section className="clientes-compact-box">
                                  <h4>Resumo rápido</h4>
                                  <div className="clientes-mini-grid">
                                    <div><span>Nome</span><strong>{cliente.razaoSocial}</strong></div>
                                    <div><span>Apelido</span><strong>{cliente.nomeFantasia || cliente.nomeInterno || '—'}</strong></div>
                                    <div><span>CNPJ</span><strong>{cliente.cnpjCpf || '—'}</strong></div>
                                    <div><span>Perfil</span><strong>{item.perfil}</strong></div>
                                    <div><span>Recorrência</span><strong>{item.recorrencia}</strong></div>
                                    <div><span>Nível</span><strong>{item.nivel}</strong></div>
                                  </div>
                                </section>

                                <section className="clientes-compact-box">
                                  <h4>Números principais</h4>
                                  <div className="clientes-mini-kpis">
                                    <div className="good"><span>Score</span><strong>{item.classificacao} / {item.score}</strong></div>
                                    <div className="good"><span>Conversão</span><strong>{item.obrasFechadas}/{item.obrasOrcadas} fechadas</strong></div>
                                    <div><span>Recorrência</span><strong>{item.obrasOrcadas} props</strong></div>
                                    <div><span>Vol. histórico</span><strong>{moedaCurta(item.valorTotalOrcado)}</strong></div>
                                    <div className="warn"><span>Ativ. recente</span><strong>{textoAtividade(centro.ultimaAtividade)}</strong></div>
                                    <div className="warn"><span>Escopo</span><strong>{centro.totalEscopo} itens</strong></div>
                                    <div><span>Maior obra orçada</span><strong>{moedaCurta(item.maiorObra)}</strong></div>
                                    <div><span>Ticket médio orçado</span><strong>{moedaCurta(item.mediaOrcada)}</strong></div>
                                  </div>
                                </section>

                                <div className="clientes-side-actions">
                                  <button type="button" onClick={() => abrirPainel('previewPdf')}>Relatório</button>
                                  <button type="button" onClick={() => abrirPainel('historico')}>Histórico</button>
                                  <button type="button" onClick={() => abrirPainel('editarPdf')}>Editar PDF</button>
                                </div>
                              </div>

                              <section className="clientes-orcamento-center">
                                <div className="clientes-center-head">
                                  <div>
                                    <span>Centro de informação do orçamento</span>
                                    <strong>{principal?.obra || 'Nenhum orçamento vinculado'}</strong>
                                    <p>
                                      {principal
                                        ? `${principal.numero} · ${principal.etapa} · ${principal.estrategia}`
                                        : 'Assim que houver orçamento para este cliente, os dados aparecem aqui automaticamente.'}
                                    </p>
                                  </div>
                                  {principal && <a href={`#/orcamentos/${principal.id}`}>Abrir orçamento</a>}
                                </div>
                                <div className="clientes-center-grid">
                                  <div><span>Ativos</span><strong>{centro.orcamentosAtivos}</strong></div>
                                  <div><span>Valor em andamento</span><strong>{moedaCurta(centro.valorEmAndamento || principal?.valor || 0)}</strong></div>
                                  <div><span>Áreas</span><strong>{centro.totalAreas} / {centro.totalM2.toLocaleString('pt-BR')} m²</strong></div>
                                  <div><span>Escopo</span><strong>{centro.totalEscopo} itens</strong></div>
                                  <div><span>Cotações</span><strong>{centro.totalCotacoes}</strong></div>
                                  <div><span>Documentos</span><strong>{centro.totalDocumentos}</strong></div>
                                  <div><span>Pendências</span><strong>{centro.totalPendencias}</strong></div>
                                  <div><span>Histórico</span><strong>{centro.totalHistorico}</strong></div>
                                </div>
                                <div className="clientes-center-foot">
                                  <span>Responsáveis: {centro.responsaveis.length ? centro.responsaveis.join(', ') : 'A definir'}</span>
                                  <span>Disciplinas: {centro.disciplinas.length ? centro.disciplinas.slice(0, 5).join(', ') : 'Sem escopo lançado'}</span>
                                  {principal && <span>Última movimentação: {principal.ultimaAtividade}</span>}
                                </div>
                              </section>

                              {painelAberto === 'historico' && (
                                <section className="clientes-toggle-card">
                                  <header><strong>Histórico completo das obras</strong><span>▼</span></header>
                                  <div className="clientes-toggle-body">
                                    <div className="clientes-toolbar">
                                      <span>Todas as obras e propostas vinculadas ao cliente selecionado.</span>
                                      <input value={buscaHistorico} onChange={(event) => setBuscaHistorico(event.target.value)} placeholder="Buscar obra, disciplina ou status..." />
                                    </div>
                                    <div className="clientes-history-scroll">
                                      <table className="clientes-history-table">
                                        <thead><tr><th>Número do orçamento</th><th>Data</th><th>Obra</th><th>Disciplina</th><th>Valor</th><th>Status</th></tr></thead>
                                        <tbody>
                                          {historicoFiltrado.map((row) => (
                                            <tr key={row.numero}><td>{row.numero}</td><td>{row.data}</td><td>{row.obra}</td><td>{row.disciplina}</td><td>{moeda(row.valor)}</td><td>{statusPill(row.status)}</td></tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </section>
                              )}

                              {painelAberto === 'relatorio' && (
                                <section className="clientes-toggle-card">
                                  <header><strong>Relatório visual</strong><button type="button" onClick={() => abrirPainel('previewPdf')}>Download PDF</button></header>
                                  <div className="clientes-toggle-body">
                                    <div className="clientes-hero-kpis">
                                      <div><i className="blue">%</i><span>Taxa de fechamento</span><strong>{item.taxaFechamento}</strong><small>{item.obrasFechadas} de {item.obrasOrcadas} propostas</small></div>
                                      <div><i className="green">$</i><span>Ticket médio</span><strong>{moedaCurta(item.mediaFechada || item.mediaOrcada)}</strong><small>Valor médio das obras</small></div>
                                      <div><i className="yellow">★</i><span>Maior obra</span><strong>{moedaCurta(item.maiorObra)}</strong><small>{item.historico[0]?.obra}</small></div>
                                      <div><i className="purple">Σ</i><span>Total fechado</span><strong>{moedaCurta(item.valorTotalFechado)}</strong><small>Valor total das obras</small></div>
                                    </div>
                                    <div className="clientes-report-grid">
                                      <div><h4>Obras por ano</h4><LineChart item={item} /></div>
                                      <div><h4>Evolução de valores</h4><BarChart item={item} /></div>
                                      <div><h4>Status das obras</h4><div className="clientes-status-total"><strong>{item.obrasOrcadas}</strong><span>obras</span></div></div>
                                      <div><h4>Perfil e disciplinas</h4><div className="clientes-report-legend"><p><span />Perfil do cliente <strong>{item.perfil}</strong></p><p><span />Recorrência <strong>{item.recorrencia}</strong></p><p><span />Preferência <strong>{item.preferencia}</strong></p></div></div>
                                    </div>
                                  </div>
                                </section>
                              )}

                              {painelAberto === 'editarPdf' && (
                                <>
                                  <section className="clientes-toggle-card">
                                    <header><strong>Editar PDF</strong><button type="button" onClick={() => abrirPainel('previewPdf')}>Prévia A4</button></header>
                                    <div className="clientes-toggle-body">
                                      <div className="clientes-edit-grid">
                                        <label>Ticket médio<input value={editsAtual.ticket} onChange={(event) => atualizarPdfEdit('ticket', event.target.value)} /></label>
                                        <label>Perfil do cliente<input value={editsAtual.perfil} onChange={(event) => atualizarPdfEdit('perfil', event.target.value)} /></label>
                                        <label>Total fechado<input value={editsAtual.totalFechado} onChange={(event) => atualizarPdfEdit('totalFechado', event.target.value)} /></label>
                                        <label>Obra destaque<select value={editsAtual.obraDestaque} onChange={(event) => atualizarPdfEdit('obraDestaque', event.target.value)}>{item.historico.map((row) => <option key={row.numero}>{row.obra}</option>)}</select></label>
                                      </div>
                                      {erroPropostas && <div className="clientes-sync-alert">{erroPropostas}</div>}
                                    </div>
                                  </section>
                                  <section className="clientes-toggle-card">
                                    <header><strong>Resumo editável</strong></header>
                                    <div className="clientes-toggle-body">
                                      <textarea value={resumoAtual} onChange={(event) => setResumosEditados((prev) => ({ ...prev, [cliente.id]: event.target.value }))} />
                                    </div>
                                  </section>
                                </>
                              )}

                              {painelAberto === 'previewPdf' && (
                                <section className="clientes-toggle-card clientes-preview-card">
                                  <header><strong>Relatório em A4 para Download</strong><button type="button" onClick={imprimirPdf}>Imprimir / Salvar PDF</button></header>
                                  <div className="clientes-toggle-body">
                                    <PdfSheet item={item} resumo={resumoAtual} edits={editsAtual} />
                                  </div>
                                </section>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {itemAberto && (
        <div className="clientes-print-area">
          <PdfSheet item={itemAberto} resumo={resumoAtual} edits={editsAtual} />
        </div>
      )}
    </div>
  );
}
