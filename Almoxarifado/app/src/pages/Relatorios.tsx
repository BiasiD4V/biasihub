import { useState, useMemo, useCallback } from 'react';
import {
  FileSpreadsheet, FileText, Download, Calendar, Filter,
  Package, ArrowLeftRight, ClipboardList, Truck, CheckSquare,
  Square, Minus,
} from 'lucide-react';
import { supabase } from '../infrastructure/supabase/client';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { isCapacitorRuntime } from '../utils/runtime';

type TipoRelatorio = 'estoque' | 'movimentacoes' | 'requisicoes' | 'frota';

const RELATORIOS = [
  { id: 'estoque' as TipoRelatorio, label: 'Estoque Atual', icon: Package, desc: 'Lista completa de itens com status de estoque' },
  { id: 'movimentacoes' as TipoRelatorio, label: 'Movimentações', icon: ArrowLeftRight, desc: 'Entradas e saídas filtradas por período e obra' },
  { id: 'requisicoes' as TipoRelatorio, label: 'Requisições', icon: ClipboardList, desc: 'Requisições de materiais por status e período' },
  { id: 'frota' as TipoRelatorio, label: 'Frota & Manutenções', icon: Truck, desc: 'Veículos e custos de manutenção no período' },
];

const EMPRESA = 'Biasi Engenharia';

function formatData(d: string) {
  return new Date(d).toLocaleDateString('pt-BR');
}
function formatMoeda(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/** Baixa um Blob — usa Web Share API no Capacitor (APK), link no browser */
async function downloadBlob(blob: Blob, filename: string) {
  if (isCapacitorRuntime() && navigator.canShare?.({ files: [new File([blob], filename, { type: blob.type })] })) {
    try {
      await navigator.share({ files: [new File([blob], filename, { type: blob.type })], title: filename });
      return;
    } catch {
      // usuário cancelou ou sem suporte — fallback abaixo
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
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
  const [todosRegistros, setTodosRegistros] = useState<Record<string, unknown>[]>([]);
  const [colunas, setColunas] = useState<string[]>([]);
  const [gerado, setGerado] = useState(false);
  // Checkboxes: Set de índices selecionados
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());

  const totalRegistros = todosRegistros.length;
  const totalSelecionados = selecionados.size;
  const todosSelecionados = totalSelecionados === totalRegistros && totalRegistros > 0;
  const algunsSelecionados = totalSelecionados > 0 && !todosSelecionados;

  const dadosExportar = useMemo(
    () => totalSelecionados > 0
      ? todosRegistros.filter((_, i) => selecionados.has(i))
      : todosRegistros,
    [todosRegistros, selecionados, totalSelecionados]
  );

  function toggleTodos() {
    if (todosSelecionados) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(todosRegistros.map((_, i) => i)));
    }
  }

  function toggleLinha(i: number) {
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

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
        .gte('data', dataInicio).lte('data', dataFim)
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
        .gte('data_solicitacao', dataInicio).lte('data_solicitacao', dataFim)
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
        .from('veiculos').select('id, placa, modelo, marca, ano, status, obra_atual')
        .eq('ativo', true).order('placa');
      const { data: manut } = await supabase
        .from('manutencoes_veiculo')
        .select('veiculo_id, tipo, data, km, custo, oficina, veiculos(placa, modelo)')
        .gte('data', dataInicio).lte('data', dataFim)
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
    setSelecionados(new Set());
    try {
      const dados = await buscarDados();
      setTodosRegistros(dados);
      setColunas(dados.length > 0 ? Object.keys(dados[0]) : []);
      setGerado(true);
    } finally {
      setLoading(false);
    }
  }

  // ── Excel Profissional ─────────────────────────────────────────────────────
  const baixarExcel = useCallback(async () => {
    const dados = dadosExportar;
    if (!dados.length) return;
    const relLabel = RELATORIOS.find(r => r.id === tipo)?.label || 'Relatório';
    const agora = new Date().toLocaleString('pt-BR');
    const cols = Object.keys(dados[0]);

    // Cabeçalho: empresa, relatório, data, período
    const linhasInfo: string[][] = [
      [EMPRESA],
      [`Relatório: ${relLabel}`],
      [`Gerado em: ${agora}`],
    ];
    if (tipo !== 'estoque') {
      linhasInfo.push([`Período: ${formatData(dataInicio)} a ${formatData(dataFim)}`]);
      if (filtroObra) linhasInfo.push([`Obra: ${filtroObra}`]);
      if (filtroStatus) linhasInfo.push([`Status: ${filtroStatus}`]);
    }
    if (totalSelecionados > 0) linhasInfo.push([`Registros exportados: ${dados.length} de ${totalRegistros}`]);
    linhasInfo.push([]); // linha em branco

    const aoa: unknown[][] = [
      ...linhasInfo,
      cols, // cabeçalho das colunas
      ...dados.map(row => cols.map(c => row[c] ?? '-')),
    ];

    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Larguras automáticas (mínimo 10, máximo 50 chars)
    const colWidths = cols.map(col => {
      const maxLen = Math.max(
        col.length,
        ...dados.map(row => String(row[col] ?? '').length)
      );
      return { wch: Math.min(Math.max(maxLen + 2, 10), 50) };
    });
    ws['!cols'] = colWidths;

    // Mescla da célula de empresa (linha 0, todas as colunas)
    ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: cols.length - 1 } }];

    // Congela após as linhas de info + cabeçalho das colunas
    const freezeRow = linhasInfo.length + 1;
    ws['!freeze'] = { xSplit: 0, ySplit: freezeRow };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, relLabel.slice(0, 31));

    const wbArray = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbArray], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const filename = `${EMPRESA} - ${relLabel} - ${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.xlsx`;
    await downloadBlob(blob, filename);
  }, [dadosExportar, tipo, dataInicio, dataFim, filtroObra, filtroStatus, totalSelecionados, totalRegistros]);

  // ── PDF Profissional ───────────────────────────────────────────────────────
  const baixarPDF = useCallback(async () => {
    const dados = dadosExportar;
    if (!dados.length) return;
    const relLabel = RELATORIOS.find(r => r.id === tipo)?.label || 'Relatório';
    const cols = Object.keys(dados[0]);
    const landscape = cols.length > 5;
    const doc = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const azulBiasi: [number, number, number] = [15, 52, 140];
    const azulClaro: [number, number, number] = [235, 241, 255];
    const cinza: [number, number, number] = [100, 116, 139];

    // ── Cabeçalho ─────────────────────────────────────────────────────────
    doc.setFillColor(...azulBiasi);
    doc.rect(0, 0, pageW, 22, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont('helvetica', 'bold');
    doc.text(EMPRESA, 12, 10);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Almoxarifado  ·  ${relLabel}`, 12, 17);

    // Data alinhada à direita
    doc.setFontSize(8);
    doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, pageW - 12, 17, { align: 'right' });

    // ── Sub-cabeçalho info ────────────────────────────────────────────────
    doc.setFillColor(...azulClaro);
    doc.rect(0, 22, pageW, 10, 'F');
    doc.setTextColor(...cinza);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    const infoItems: string[] = [];
    if (tipo !== 'estoque') infoItems.push(`Período: ${formatData(dataInicio)} a ${formatData(dataFim)}`);
    if (filtroObra) infoItems.push(`Obra: ${filtroObra}`);
    if (filtroStatus) infoItems.push(`Status: ${filtroStatus}`);
    infoItems.push(`Total: ${dados.length} registro(s)${totalSelecionados > 0 ? ` (selecionados de ${totalRegistros})` : ''}`);
    doc.text(infoItems.join('    ·    '), 12, 28);

    // ── Tabela ────────────────────────────────────────────────────────────
    let startY = 35;

    autoTable(doc, {
      startY,
      head: [cols],
      body: dados.map(row => cols.map(c => String(row[c] ?? '-'))),
      styles: {
        fontSize: 8,
        cellPadding: { top: 3, bottom: 3, left: 4, right: 4 },
        lineColor: [220, 226, 240],
        lineWidth: 0.2,
        textColor: [30, 41, 59],
      },
      headStyles: {
        fillColor: azulBiasi,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'left',
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: cols.reduce((acc, _, i) => {
        acc[i] = { cellWidth: 'auto' as const };
        return acc;
      }, {} as Record<number, object>),
      // Destaque de status BAIXO
      didParseCell(data) {
        if (data.section === 'body' && String(data.cell.raw) === 'BAIXO') {
          data.cell.styles.textColor = [217, 119, 6];
          data.cell.styles.fontStyle = 'bold';
        }
        if (data.section === 'body' && String(data.cell.raw) === 'OK') {
          data.cell.styles.textColor = [5, 150, 105];
        }
      },
      // Rodapé com número de página em cada página
      didDrawPage(data) {
        const pg = (doc as any).internal.getNumberOfPages();
        const pgAtual = (doc as any).internal.getCurrentPageInfo().pageNumber;
        doc.setFontSize(7);
        doc.setTextColor(...cinza);
        doc.setFont('helvetica', 'normal');
        // Linha separadora do rodapé
        doc.setDrawColor(...cinza);
        doc.setLineWidth(0.2);
        doc.line(12, pageH - 10, pageW - 12, pageH - 10);
        doc.text(EMPRESA, 12, pageH - 5);
        doc.text(`Página ${pgAtual} de ${pg}`, pageW - 12, pageH - 5, { align: 'right' });
      },
      margin: { top: 35, bottom: 15, left: 12, right: 12 },
    });

    const blob = doc.output('blob');
    const filename = `${EMPRESA} - ${relLabel} - ${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`;
    await downloadBlob(blob, filename);
  }, [dadosExportar, tipo, dataInicio, dataFim, filtroObra, filtroStatus, totalSelecionados, totalRegistros]);

  const relAtual = RELATORIOS.find(r => r.id === tipo)!;
  const mostraFiltroData = tipo !== 'estoque';
  const mostraFiltroObra = tipo === 'movimentacoes';
  const mostraFiltroStatus = tipo === 'requisicoes';

  // ícone do checkbox "todos"
  const CheckboxTodos = todosSelecionados ? CheckSquare : algunsSelecionados ? Minus : Square;

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
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
              onClick={() => { setTipo(rel.id); setGerado(false); setSelecionados(new Set()); setTodosRegistros([]); }}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                ativo ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-slate-300'
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
                <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1.5">Data fim</label>
                <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </>
          )}
          {mostraFiltroObra && (
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Obra</label>
              <input type="text" placeholder="Filtrar por obra..." value={filtroObra} onChange={e => setFiltroObra(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          )}
          {mostraFiltroStatus && (
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">Status</label>
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Todos</option>
                <option value="pendente">Pendente</option>
                <option value="aprovada">Aprovada</option>
                <option value="entregue">Entregue</option>
                <option value="cancelada">Cancelada</option>
              </select>
            </div>
          )}
          <button onClick={gerar} disabled={loading}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors">
            <Calendar size={16} />
            {loading ? 'Gerando...' : 'Gerar relatório'}
          </button>
        </div>
      </div>

      {/* Tabela com checkboxes + Download */}
      {gerado && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">

          {/* Barra superior */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-3">
              {/* Checkbox todos */}
              <button
                onClick={toggleTodos}
                className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors"
              >
                <CheckboxTodos
                  size={18}
                  className={todosSelecionados ? 'text-blue-600' : algunsSelecionados ? 'text-blue-400' : 'text-slate-400'}
                />
                {todosSelecionados ? 'Desmarcar todos' : 'Selecionar todos'}
              </button>
              <span className="text-xs text-slate-400">|</span>
              <span className="text-xs text-slate-500">
                {totalSelecionados > 0
                  ? <><span className="font-bold text-blue-600">{totalSelecionados}</span> de {totalRegistros} selecionados</>
                  : <>{totalRegistros} registro(s) — exporta todos se nada selecionado</>}
              </span>
            </div>

            <div className="flex gap-2">
              <button onClick={baixarExcel}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 transition-colors shadow-sm">
                <Download size={15} />
                Excel{totalSelecionados > 0 ? ` (${totalSelecionados})` : ''}
              </button>
              <button onClick={baixarPDF}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white text-sm font-semibold rounded-lg hover:bg-rose-700 transition-colors shadow-sm">
                <FileText size={15} />
                PDF{totalSelecionados > 0 ? ` (${totalSelecionados})` : ''}
              </button>
            </div>
          </div>

          {/* Tabela scrollável */}
          {todosRegistros.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="max-h-[60vh] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 z-10">
                    <tr className="bg-slate-100 border-b border-slate-200">
                      {/* Coluna de checkbox */}
                      <th className="px-3 py-3 w-10">
                        <button onClick={toggleTodos} className="flex items-center justify-center w-full">
                          <CheckboxTodos
                            size={16}
                            className={todosSelecionados ? 'text-blue-600' : algunsSelecionados ? 'text-blue-400' : 'text-slate-400'}
                          />
                        </button>
                      </th>
                      {colunas.map(col => (
                        <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {todosRegistros.map((row, i) => {
                      const sel = selecionados.has(i);
                      return (
                        <tr
                          key={i}
                          onClick={() => toggleLinha(i)}
                          className={`cursor-pointer transition-colors ${
                            sel ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="px-3 py-2.5 text-center">
                            {sel
                              ? <CheckSquare size={16} className="text-blue-600 mx-auto" />
                              : <Square size={16} className="text-slate-300 mx-auto" />}
                          </td>
                          {colunas.map(col => (
                            <td key={col} className={`px-4 py-2.5 whitespace-nowrap ${
                              String(row[col]) === 'BAIXO'
                                ? 'text-amber-600 font-semibold'
                                : String(row[col]) === 'OK'
                                ? 'text-emerald-600'
                                : 'text-slate-700'
                            }`}>
                              {String(row[col] ?? '-')}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">
              <FileSpreadsheet size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum dado encontrado para os filtros selecionados.</p>
            </div>
          )}

          {/* Rodapé info */}
          {totalSelecionados > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 bg-blue-50 text-xs text-blue-700 font-medium">
              {totalSelecionados} de {totalRegistros} linhas selecionadas — os arquivos exportados conterão apenas as linhas marcadas.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
