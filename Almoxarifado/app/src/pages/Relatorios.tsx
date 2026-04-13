import { useState } from 'react';
import { FileSpreadsheet, FileText, Download, Calendar, Filter, Package, ArrowLeftRight, ClipboardList, Truck } from 'lucide-react';
import { supabase } from '../infrastructure/supabase/client';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type TipoRelatorio = 'estoque' | 'movimentacoes' | 'requisicoes' | 'frota';

const RELATORIOS = [
  { id: 'estoque' as TipoRelatorio, label: 'Estoque Atual', icon: Package, desc: 'Lista completa de itens com status de estoque' },
  { id: 'movimentacoes' as TipoRelatorio, label: 'Movimentações', icon: ArrowLeftRight, desc: 'Entradas e saídas filtradas por período e obra' },
  { id: 'requisicoes' as TipoRelatorio, label: 'Requisições', icon: ClipboardList, desc: 'Requisições de materiais por status e período' },
  { id: 'frota' as TipoRelatorio, label: 'Frota & Manutenções', icon: Truck, desc: 'Veículos e custos de manutenção no período' },
];

function formatData(d: string) {
  return new Date(d).toLocaleDateString('pt-BR');
}
function formatMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function Relatorios() {
  const [tipo, setTipo] = useState<TipoRelatorio>('estoque');
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0];
  });
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().split('T')[0]);
  const [filtroObra, setFiltroObra] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<Record<string, unknown>[]>([]);
  const [colunas, setColunas] = useState<string[]>([]);
  const [gerado, setGerado] = useState(false);

  async function buscarDados(): Promise<Record<string, unknown>[]> {
    if (tipo === 'estoque') {
      const { data } = await supabase
        .from('itens_almoxarifado')
        .select('codigo, descricao, unidade, estoque_atual, estoque_minimo, localizacao')
        .eq('ativo', true)
        .order('descricao');
      return (data || []).map(i => ({
        'Código': i.codigo,
        'Descrição': i.descricao,
        'Unidade': i.unidade,
        'Estoque Atual': i.estoque_atual,
        'Estoque Mínimo': i.estoque_minimo,
        'Status': Number(i.estoque_atual) < Number(i.estoque_minimo) ? 'BAIXO' : 'OK',
        'Localização': i.localizacao || '-',
      }));
    }

    if (tipo === 'movimentacoes') {
      let q = supabase
        .from('movimentacoes_almoxarifado')
        .select('data, tipo, quantidade, obra, observacao, itens_almoxarifado(descricao, unidade), usuarios(nome)')
        .gte('data', dataInicio)
        .lte('data', dataFim)
        .order('data', { ascending: false });
      if (filtroObra) q = q.ilike('obra', `%${filtroObra}%`);
      const { data } = await q;
      return (data || []).map((m: any) => ({
        'Data': formatData(m.data),
        'Tipo': m.tipo === 'entrada' ? 'Entrada' : 'Saída',
        'Item': m.itens_almoxarifado?.descricao || '-',
        'Unidade': m.itens_almoxarifado?.unidade || '-',
        'Quantidade': m.quantidade,
        'Obra': m.obra || '-',
        'Responsável': m.usuarios?.nome || '-',
        'Observação': m.observacao || '-',
      }));
    }

    if (tipo === 'requisicoes') {
      let q = supabase
        .from('requisicoes_almoxarifado')
        .select('data_solicitacao, status, obra, observacao, usuarios!solicitante_id(nome)')
        .gte('data_solicitacao', dataInicio)
        .lte('data_solicitacao', dataFim)
        .order('data_solicitacao', { ascending: false });
      if (filtroStatus) q = q.eq('status', filtroStatus);
      const { data } = await q;
      return (data || []).map((r: any) => ({
        'Data': formatData(r.data_solicitacao),
        'Status': r.status.charAt(0).toUpperCase() + r.status.slice(1),
        'Obra': r.obra || '-',
        'Solicitante': r.usuarios?.nome || '-',
        'Observação': r.observacao || '-',
      }));
    }

    if (tipo === 'frota') {
      const { data: veiculos } = await supabase
        .from('veiculos')
        .select('placa, modelo, marca, ano, status, obra_atual')
        .eq('ativo', true)
        .order('placa');
      const { data: manut } = await supabase
        .from('manutencoes_veiculo')
        .select('veiculo_id, tipo, data, km, custo, oficina, veiculos(placa, modelo)')
        .gte('data', dataInicio)
        .lte('data', dataFim)
        .order('data', { ascending: false });

      const custosPorVeiculo: Record<string, number> = {};
      (manut || []).forEach((m: any) => {
        if (m.veiculo_id) custosPorVeiculo[m.veiculo_id] = (custosPorVeiculo[m.veiculo_id] || 0) + Number(m.custo || 0);
      });

      const statusMap: Record<string, string> = { disponivel: 'Disponível', em_uso: 'Em Uso', manutencao: 'Manutenção' };
      return (veiculos || []).map((v: any) => ({
        'Placa': v.placa,
        'Modelo': `${v.marca} ${v.modelo}`,
        'Ano': v.ano,
        'Status': statusMap[v.status] || v.status,
        'Obra Atual': v.obra_atual || '-',
        [`Custo Manutenção (${dataInicio} a ${dataFim})`]: formatMoeda(custosPorVeiculo[v.id] || 0),
      }));
    }

    return [];
  }

  async function gerar() {
    setLoading(true);
    setGerado(false);
    try {
      const dados = await buscarDados();
      setPreview(dados.slice(0, 10));
      setColunas(dados.length > 0 ? Object.keys(dados[0]) : []);
      setGerado(true);
      // Salva dados para download
      (window as any).__relatorioCache = dados;
    } finally {
      setLoading(false);
    }
  }

  function baixarExcel() {
    const dados: Record<string, unknown>[] = (window as any).__relatorioCache || preview;
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
    const relLabel = RELATORIOS.find(r => r.id === tipo)?.label || 'Relatorio';
    XLSX.writeFile(wb, `${relLabel} - ${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`);
  }

  function baixarPDF() {
    const dados: Record<string, unknown>[] = (window as any).__relatorioCache || preview;
    const doc = new jsPDF({ orientation: dados[0] && Object.keys(dados[0]).length > 5 ? 'landscape' : 'portrait' });
    const relLabel = RELATORIOS.find(r => r.id === tipo)?.label || 'Relatório';

    // Cabeçalho
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text(`Biasi Engenharia — ${relLabel}`, 14, 18);
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, 14, 26);
    if (tipo !== 'estoque') {
      doc.text(`Período: ${formatData(dataInicio)} a ${formatData(dataFim)}`, 14, 32);
    }

    const cols = Object.keys(dados[0] || {});
    autoTable(doc, {
      startY: tipo !== 'estoque' ? 38 : 32,
      head: [cols],
      body: dados.map(row => cols.map(c => String(row[c] ?? '-'))),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 250, 252] },
    });

    doc.save(`${relLabel} - ${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
  }

  const relAtual = RELATORIOS.find(r => r.id === tipo)!;
  const mostraFiltroData = tipo !== 'estoque';
  const mostraFiltroObra = tipo === 'movimentacoes';
  const mostraFiltroStatus = tipo === 'requisicoes';

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FileSpreadsheet className="text-emerald-600" size={26} />
          Relatórios
        </h1>
        <p className="text-sm text-slate-500 mt-1">Exporte dados do almoxarifado em Excel ou PDF</p>
      </div>

      {/* Seletor de tipo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {RELATORIOS.map(rel => {
          const Icon = rel.icon;
          const ativo = tipo === rel.id;
          return (
            <button
              key={rel.id}
              onClick={() => { setTipo(rel.id); setGerado(false); (window as any).__relatorioCache = null; }}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                ativo
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <Icon size={20} className={ativo ? 'text-blue-600 mb-2' : 'text-slate-400 mb-2'} />
              <p className={`text-sm font-semibold ${ativo ? 'text-blue-700' : 'text-slate-700'}`}>{rel.label}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-snug">{rel.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-1.5">
          <Filter size={12} /> Filtros
        </p>
        <div className="flex flex-wrap gap-4 items-end">
          {mostraFiltroData && (
            <>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Data início</label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={e => setDataInicio(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Data fim</label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={e => setDataFim(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          )}
          {mostraFiltroObra && (
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Obra</label>
              <input
                type="text"
                placeholder="Filtrar por obra..."
                value={filtroObra}
                onChange={e => setFiltroObra(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          {mostraFiltroStatus && (
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Status</label>
              <select
                value={filtroStatus}
                onChange={e => setFiltroStatus(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                <option value="pendente">Pendente</option>
                <option value="aprovada">Aprovada</option>
                <option value="entregue">Entregue</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
          )}
          <button
            onClick={gerar}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            <Calendar size={16} />
            {loading ? 'Gerando...' : 'Gerar relatório'}
          </button>
        </div>
      </div>

      {/* Preview + Download */}
      {gerado && (
        <div className="bg-white rounded-xl border border-slate-200">
          {/* Barra de download */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div>
              <p className="text-sm font-semibold text-slate-700">{relAtual.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {((window as any).__relatorioCache || preview).length} registro(s)
                {mostraFiltroData ? ` · ${formatData(dataInicio)} a ${formatData(dataFim)}` : ''}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={baixarExcel}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
              >
                <Download size={15} />
                Excel
              </button>
              <button
                onClick={baixarPDF}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white text-sm font-medium rounded-lg hover:bg-rose-700 transition-colors"
              >
                <FileText size={15} />
                PDF
              </button>
            </div>
          </div>

          {/* Tabela preview (primeiros 10 registros) */}
          {preview.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    {colunas.map(col => (
                      <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      {colunas.map(col => (
                        <td key={col} className={`px-4 py-3 text-slate-700 whitespace-nowrap ${
                          String(row[col]) === 'BAIXO' ? 'text-amber-600 font-medium' : ''
                        }`}>
                          {String(row[col] ?? '-')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {((window as any).__relatorioCache || []).length > 10 && (
                <p className="px-5 py-3 text-xs text-slate-400 border-t border-slate-100">
                  Mostrando primeiros 10 registros. O arquivo exportado contém todos os {((window as any).__relatorioCache || []).length} registros.
                </p>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">
              <FileSpreadsheet size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum dado encontrado para os filtros selecionados.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
