import { useEffect, useRef, useState } from 'react';
import {
  Plus, Truck, Wrench, MapPin, Calendar, DollarSign, X,
  ChevronDown, ChevronRight, Building2, HardHat, User,
  AlertTriangle, Camera, ImageIcon, CheckCircle, Droplets,
} from 'lucide-react';
import { supabase } from '../infrastructure/supabase/client';
import type { Veiculo, StatusVeiculo } from '../domain/entities/Veiculo';
import type { Manutencao } from '../domain/entities/Manutencao';
import { useAuth } from '../context/AuthContext';

interface Acidente {
  id: string;
  veiculo_id: string;
  data: string;
  local: string | null;
  descricao: string | null;
  custo_reparo: number;
  fotos: string[];
  criado_em: string;
}

interface Abastecimento {
  id: string;
  veiculo_id: string;
  data: string;
  km_atual: number;
  litros: number;
  valor_total: number;
  responsavel_nome: string | null;
  obra_atual: string | null;
  data_retorno: string | null;
  observacao: string | null;
  criado_em: string;
}

const STATUS_CONFIG: Record<StatusVeiculo, { label: string; cor: string; corBg: string }> = {
  disponivel: { label: 'Disponível',  cor: 'text-green-700',  corBg: 'bg-green-100' },
  em_uso:     { label: 'Em Uso',      cor: 'text-blue-700',   corBg: 'bg-blue-100' },
  manutencao: { label: 'Manutenção',  cor: 'text-amber-700',  corBg: 'bg-amber-100' },
};

const TIPOS_MANUT = ['Preventiva', 'Corretiva', 'Revisão', 'Pneus', 'Óleo', 'Elétrica', 'Funilaria', 'Outro'];

function fmtBRL(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function Frota() {
  const { usuario } = useAuth();
  const [veiculos, setVeiculos] = useState<Veiculo[]>([]);
  const [manutencoes, setManutencoes] = useState<Record<string, Manutencao[]>>({});
  const [acidentes, setAcidentes] = useState<Record<string, Acidente[]>>({});
  const [abastecimentos, setAbastecimentos] = useState<Record<string, Abastecimento[]>>({});
  const [expandidos, setExpandidos] = useState<Record<string, boolean>>({});
  const [abaExpandida, setAbaExpandida] = useState<Record<string, 'manutencao' | 'acidente' | 'abastecimento'>>({});
  const [loading, setLoading] = useState(true);

  // Modais
  const [modalVeiculo, setModalVeiculo] = useState(false);
  const [editandoVeiculo, setEditandoVeiculo] = useState<Veiculo | null>(null);
  const [modalManutencao, setModalManutencao] = useState<string | null>(null);
  const [modalAcidente, setModalAcidente] = useState<string | null>(null);
  const [modalAbastecimento, setModalAbastecimento] = useState<string | null>(null);
  const [fotoAmpliada, setFotoAmpliada] = useState<string | null>(null);

  // Forms
  const [formVeiculo, setFormVeiculo] = useState({
    placa: '', modelo: '', marca: '', ano: '', cor: '',
    status: 'disponivel' as StatusVeiculo,
    localizacao: 'biasi' as 'biasi' | 'obra',
    obra_atual: '', responsavel_atual: '',
  });
  const [formManut, setFormManut] = useState({
    tipo: 'Preventiva', data: new Date().toISOString().split('T')[0],
    data_saida: '', km: '', custo: '', oficina: '', descricao: '',
  });
  const [formAcidente, setFormAcidente] = useState({
    data: new Date().toISOString().split('T')[0],
    local: '', descricao: '', custo_reparo: '',
    fotos: [] as File[],
  });
  const [formAbast, setFormAbast] = useState({
    data: new Date().toISOString().split('T')[0],
    km_atual: '', litros: '', valor_total: '',
    responsavel_nome: '', obra_atual: '', data_retorno: '', observacao: '',
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [uploadando, setUploadando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isGestor = ['gestor', 'admin', 'dono'].includes(usuario?.papel ?? '');

  async function carregar() {
    setLoading(true);
    try {
      const { data, error } = await supabase.from('veiculos').select('*').eq('ativo', true).order('modelo');
      if (error) throw error;
      setVeiculos(data || []);
    } catch (err) {
      console.error('[Frota] erro ao carregar veiculos:', err);
      setVeiculos([]);
    } finally {
      setLoading(false);
    }
  }

  async function carregarDetalhes(veiculoId: string) {
    try {
      const [{ data: m, error: mErr }, { data: a, error: aErr }, { data: ab, error: abErr }] = await Promise.all([
        supabase.from('manutencoes_veiculo').select('*').eq('veiculo_id', veiculoId).order('data', { ascending: false }),
        supabase.from('acidentes_veiculo').select('*').eq('veiculo_id', veiculoId).order('data', { ascending: false }),
        supabase.from('abastecimentos_veiculo').select('*').eq('veiculo_id', veiculoId).order('data', { ascending: false }),
      ]);

      if (mErr) throw mErr;
      if (aErr) throw aErr;
      if (abErr) throw abErr;

      setManutencoes(prev => ({ ...prev, [veiculoId]: m || [] }));
      setAcidentes(prev => ({ ...prev, [veiculoId]: a || [] }));
      setAbastecimentos(prev => ({ ...prev, [veiculoId]: ab || [] }));
    } catch (err) {
      console.error('[Frota] erro ao carregar detalhes do veiculo:', err);
      setManutencoes(prev => ({ ...prev, [veiculoId]: [] }));
      setAcidentes(prev => ({ ...prev, [veiculoId]: [] }));
      setAbastecimentos(prev => ({ ...prev, [veiculoId]: [] }));
    }
  }

  useEffect(() => { carregar(); }, []);

  function toggleExpand(id: string, aba: 'manutencao' | 'acidente' | 'abastecimento' = 'manutencao') {
    const jaAberto = expandidos[id];
    const mesmaAba = abaExpandida[id] === aba;
    if (!manutencoes[id]) carregarDetalhes(id);
    if (jaAberto && mesmaAba) {
      setExpandidos(prev => ({ ...prev, [id]: false }));
    } else {
      setExpandidos(prev => ({ ...prev, [id]: true }));
      setAbaExpandida(prev => ({ ...prev, [id]: aba }));
    }
  }

  async function acharItemAlmoxDoVeiculo(veiculoId: string): Promise<string | null> {
    const veiculo = veiculos.find((v) => v.id === veiculoId);
    if (!veiculo) return null;
    const placa = String(veiculo.placa || '').trim();
    const modelo = String(veiculo.modelo || '').trim();
    try {
      let query = supabase
        .from('itens_almoxarifado')
        .select('id')
        .eq('ativo', true)
        .eq('tipo', 'carro')
        .limit(1);

      if (placa) {
        query = query.ilike('descricao', `%${placa}%`);
      } else if (modelo) {
        query = query.ilike('descricao', `%${modelo}%`);
      } else {
        return null;
      }

      const { data, error } = await query.maybeSingle();
      if (error) return null;
      return data?.id ?? null;
    } catch {
      return null;
    }
  }

  async function registrarMovimentacaoFrota(veiculoId: string, tipo: 'manutencao_inicio' | 'manutencao_fim', observacao: string) {
    if (!usuario) return;
    const itemId = await acharItemAlmoxDoVeiculo(veiculoId);
    if (!itemId) return;
    try {
      await supabase.from('movimentacoes_almoxarifado').insert({
        item_id: itemId,
        tipo,
        quantidade: 1,
        obra: null,
        observacao,
        data: new Date().toISOString().slice(0, 10),
        responsavel_id: usuario.id,
      });
    } catch (err) {
      console.warn('[Frota] falha ao registrar movimentacao de manutencao:', err);
    }
  }

  // -- Salvar veiculo ---------------------------------------------------------
  async function salvarVeiculo() {
    if (!formVeiculo.placa.trim() || !formVeiculo.modelo.trim()) { setErro('Placa e modelo são obrigatórios'); return; }
    setSalvando(true); setErro('');
    const payload = {
      placa: formVeiculo.placa.trim().toUpperCase(),
      modelo: formVeiculo.modelo.trim(),
      marca: formVeiculo.marca.trim() || null,
      ano: formVeiculo.ano ? parseInt(formVeiculo.ano) : null,
      cor: formVeiculo.cor.trim() || null,
      status: formVeiculo.status,
      localizacao: formVeiculo.localizacao,
      obra_atual: formVeiculo.localizacao === 'obra' ? (formVeiculo.obra_atual.trim() || null) : null,
      responsavel_atual: formVeiculo.localizacao === 'obra' ? (formVeiculo.responsavel_atual.trim() || null) : null,
      data_saiu_manutencao: formVeiculo.status === 'disponivel' && editandoVeiculo?.status === 'manutencao'
        ? new Date().toISOString() : undefined,
    };
    const fn = editandoVeiculo
      ? supabase.from('veiculos').update(payload).eq('id', editandoVeiculo.id)
      : supabase.from('veiculos').insert(payload);
    const { error } = await fn;
    if (error) { setErro(error.message); setSalvando(false); return; }
    if (editandoVeiculo?.status === 'manutencao' && payload.status === 'disponivel') {
      await registrarMovimentacaoFrota(
        editandoVeiculo.id,
        'manutencao_fim',
        `Veículo ${editandoVeiculo.placa} saiu de manutenção`
      );
    }
    await carregar();
    setModalVeiculo(false);
    setSalvando(false);
  }

  // -- Salvar manutencao ------------------------------------------------------
  async function salvarManutencao() {
    if (!formManut.tipo || !formManut.data) { setErro('Tipo e data são obrigatórios'); return; }
    setSalvando(true); setErro('');
    const { error } = await supabase.from('manutencoes_veiculo').insert({
      veiculo_id: modalManutencao,
      tipo: formManut.tipo,
      data: formManut.data,
      data_saida: formManut.data_saida || null,
      km: formManut.km ? parseInt(formManut.km) : null,
      custo: parseFloat(formManut.custo) || 0,
      oficina: formManut.oficina.trim() || null,
      descricao: formManut.descricao.trim() || null,
      criado_por: usuario!.id,
    });
    if (error) { setErro(error.message); setSalvando(false); return; }
    await registrarMovimentacaoFrota(
      modalManutencao!,
      'manutencao_inicio',
      `Manutenção ${formManut.tipo} iniciada${formManut.oficina.trim() ? ` - ${formManut.oficina.trim()}` : ''}`
    );
    if (formManut.data_saida) {
      await registrarMovimentacaoFrota(
        modalManutencao!,
        'manutencao_fim',
        `Manutenção ${formManut.tipo} finalizada em ${formManut.data_saida}`
      );
    }
    await carregarDetalhes(modalManutencao!);
    setModalManutencao(null);
    setSalvando(false);
    setFormManut({ tipo: 'Preventiva', data: new Date().toISOString().split('T')[0], data_saida: '', km: '', custo: '', oficina: '', descricao: '' });
  }

  // -- Salvar acidente com fotos ----------------------------------------------
  async function salvarAcidente() {
    if (!formAcidente.data) { setErro('Data é obrigatória'); return; }
    setSalvando(true); setErro('');

    // Upload das fotos
    const fotosUrls: string[] = [];
    if (formAcidente.fotos.length > 0) {
      setUploadando(true);
      for (const file of formAcidente.fotos) {
        const ext = file.name.split('.').pop();
        const path = `${modalAcidente}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from('frota-fotos').upload(path, file);
        if (!upErr) {
          const { data: urlData } = supabase.storage.from('frota-fotos').getPublicUrl(path);
          fotosUrls.push(urlData.publicUrl);
        }
      }
      setUploadando(false);
    }

    const { error } = await supabase.from('acidentes_veiculo').insert({
      veiculo_id: modalAcidente,
      data: formAcidente.data,
      local: formAcidente.local.trim() || null,
      descricao: formAcidente.descricao.trim() || null,
      custo_reparo: parseFloat(formAcidente.custo_reparo) || 0,
      fotos: fotosUrls,
      criado_por: usuario!.id,
    });
    if (error) { setErro(error.message); setSalvando(false); return; }
    await carregarDetalhes(modalAcidente!);
    setModalAcidente(null);
    setSalvando(false);
    setFormAcidente({ data: new Date().toISOString().split('T')[0], local: '', descricao: '', custo_reparo: '', fotos: [] });
  }

  // -- Salvar abastecimento ---------------------------------------------------
  async function salvarAbastecimento() {
    if (!formAbast.data || !formAbast.litros || !formAbast.valor_total) { setErro('Data, litros e valor são obrigatórios'); return; }
    setSalvando(true); setErro('');
    const { error } = await supabase.from('abastecimentos_veiculo').insert({
      veiculo_id: modalAbastecimento,
      data: formAbast.data,
      km_atual: parseFloat(formAbast.km_atual) || 0,
      litros: parseFloat(formAbast.litros),
      valor_total: parseFloat(formAbast.valor_total),
      responsavel_nome: formAbast.responsavel_nome.trim() || null,
      obra_atual: formAbast.obra_atual.trim() || null,
      data_retorno: formAbast.data_retorno || null,
      observacao: formAbast.observacao.trim() || null,
      criado_por: usuario!.id,
    });
    if (error) { setErro(error.message); setSalvando(false); return; }
    await carregarDetalhes(modalAbastecimento!);
    setModalAbastecimento(null);
    setSalvando(false);
    setFormAbast({ data: new Date().toISOString().split('T')[0], km_atual: '', litros: '', valor_total: '', responsavel_nome: '', obra_atual: '', data_retorno: '', observacao: '' });
  }

  function abrirEditar(v: Veiculo) {
    setEditandoVeiculo(v);
    setFormVeiculo({
      placa: v.placa, modelo: v.modelo, marca: v.marca || '',
      ano: v.ano?.toString() || '', cor: v.cor || '',
      status: v.status, localizacao: (v as any).localizacao || 'biasi',
      obra_atual: (v as any).obra_atual || '',
      responsavel_atual: (v as any).responsavel_atual || '',
    });
    setErro('');
    setModalVeiculo(true);
  }

  // KPIs
  const custoTotalGeral = Object.values(manutencoes).flat().reduce((a, m) => a + Number(m.custo), 0)
    + Object.values(acidentes).flat().reduce((a, ac) => a + Number(ac.custo_reparo), 0);

  const kpis = [
    { label: 'Total', value: veiculos.length, cor: 'text-slate-800' },
    { label: 'Disponíveis', value: veiculos.filter(v => v.status === 'disponivel').length, cor: 'text-green-600' },
    { label: 'Em Uso', value: veiculos.filter(v => v.status === 'em_uso').length, cor: 'text-blue-600' },
    { label: 'Manutenção', value: veiculos.filter(v => v.status === 'manutencao').length, cor: 'text-amber-600' },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Frota</h1>
          <p className="text-sm text-slate-500 mt-1">Controle de veículos, manutenções e ocorrências</p>
        </div>
        {isGestor && (
          <button onClick={() => { setEditandoVeiculo(null); setFormVeiculo({ placa: '', modelo: '', marca: '', ano: '', cor: '', status: 'disponivel', localizacao: 'biasi', obra_atual: '', responsavel_atual: '' }); setErro(''); setModalVeiculo(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors">
            <Plus size={16} />Novo Veículo
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpis.map(({ label, value, cor }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 text-center">
            <p className={`text-2xl font-bold ${cor}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Custo total geral */}
      {custoTotalGeral > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 flex items-center gap-3">
          <DollarSign size={18} className="text-amber-600 flex-shrink-0" />
          <span className="text-sm text-amber-800">Custo total registrado (manutenções + acidentes):</span>
          <span className="font-bold text-amber-900">{fmtBRL(custoTotalGeral)}</span>
        </div>
      )}

      {/* Lista de veiculos */}
      {loading ? (
        <div className="text-center text-slate-400 text-sm py-12">Carregando...</div>
      ) : veiculos.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <Truck size={32} className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Nenhum veículo cadastrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {veiculos.map(v => {
            const cfg = STATUS_CONFIG[v.status];
            const expanded = expandidos[v.id];
            const aba = abaExpandida[v.id] || 'manutencao';
            const manutV = manutencoes[v.id] || [];
            const acidentesV = acidentes[v.id] || [];
            const abastV = abastecimentos[v.id] || [];
            const custoManut = manutV.reduce((a, m) => a + Number(m.custo), 0);
            const custoAcid = acidentesV.reduce((a, ac) => a + Number(ac.custo_reparo), 0);
            const custoTotal = custoManut + custoAcid;
            const totalLitros = abastV.reduce((a, ab) => a + Number(ab.litros), 0);
            const loc = (v as any).localizacao || 'biasi';
            const obraAtual = (v as any).obra_atual;
            const responsavel = (v as any).responsavel_atual;

            return (
              <div key={v.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Linha principal do veiculo */}
                <div className="flex items-start gap-4 px-5 py-4">
                  <div className={`rounded-xl p-2.5 flex-shrink-0 mt-0.5 ${v.status === 'manutencao' ? 'bg-amber-100' : v.status === 'em_uso' ? 'bg-blue-100' : 'bg-green-100'}`}>
                    <Truck size={20} className={v.status === 'manutencao' ? 'text-amber-600' : v.status === 'em_uso' ? 'text-blue-600' : 'text-green-600'} />
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Nome e placa */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-800">{v.modelo}</p>
                      <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{v.placa}</span>
                      {v.marca && <span className="text-xs text-slate-400">{v.marca}</span>}
                      {v.ano && <span className="text-xs text-slate-400">{v.ano}</span>}
                    </div>

                    {/* Status + localizacao */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${cfg.corBg} ${cfg.cor}`}>
                        {cfg.label}
                      </span>
                      {loc === 'obra' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                          <HardHat size={10} />{obraAtual || 'Em obra'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          <Building2 size={10} />Na Biasi
                        </span>
                      )}
                      {responsavel && loc === 'obra' && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-500">
                          <User size={10} />{responsavel}
                        </span>
                      )}
                    </div>

                    {/* Custos + ocorrencias */}
                    {(manutV.length > 0 || acidentesV.length > 0) && (
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        {manutV.length > 0 && (
                          <span className="flex items-center gap-1 text-[11px] text-slate-400">
                            <Wrench size={10} />{manutV.length} manutenção(ões)  -  {fmtBRL(custoManut)}
                          </span>
                        )}
                        {acidentesV.length > 0 && (
                          <span className="flex items-center gap-1 text-[11px] text-red-400">
                            <AlertTriangle size={10} />{acidentesV.length} acidente(s)  -  {fmtBRL(custoAcid)}
                          </span>
                        )}
                        {abastV.length > 0 && (
                          <span className="flex items-center gap-1 text-[11px] text-blue-400">
                            <Droplets size={10} />{abastV.length} abast.  -  {totalLitros.toFixed(1)}L
                          </span>
                        )}
                        {custoTotal > 0 && (manutV.length > 0 || acidentesV.length > 0) && (
                          <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-600">
                            <DollarSign size={10} />Total: {fmtBRL(custoTotal)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Botoes */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isGestor && (
                      <>
                        <button onClick={() => abrirEditar(v)}
                          className="p-1.5 text-xs text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors" title="Editar veículo">
                          ✏️
                        </button>
                        <button onClick={() => { setModalManutencao(v.id); setErro(''); }}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors">
                          <Wrench size={11} />Manutenção
                        </button>
                        <button onClick={() => { setModalAcidente(v.id); setErro(''); }}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors">
                          <AlertTriangle size={11} />Acidente
                        </button>
                        <button onClick={() => { setModalAbastecimento(v.id); setErro(''); }}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors">
                          <Droplets size={11} />Abastecimento
                        </button>
                      </>
                    )}
                    <button onClick={() => toggleExpand(v.id, aba)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                      {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                  </div>
                </div>

                {/* Painel expandido */}
                {expanded && (
                  <div className="border-t border-slate-100">
                    {/* Abas */}
                    <div className="flex border-b border-slate-100">
                      {(['manutencao', 'acidente', 'abastecimento'] as const).map(a => (
                        <button key={a} onClick={() => setAbaExpandida(prev => ({ ...prev, [v.id]: a }))}
                          className={`px-4 py-2.5 text-xs font-medium transition-colors ${aba === a ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>
                          {a === 'manutencao' ? `[FERR] Manutenções (${manutV.length})` : a === 'acidente' ? `! Acidentes (${acidentesV.length})` : `⛽ Abastecimentos (${abastV.length})`}
                        </button>
                      ))}
                    </div>

                    {/* Tab manutencao */}
                    {aba === 'manutencao' && (
                      manutV.length === 0 ? (
                        <p className="px-5 py-4 text-sm text-slate-400">Nenhuma manutenção registrada</p>
                      ) : (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-slate-50">
                              <th className="text-left px-4 py-2 text-[10px] font-semibold text-slate-400 uppercase">Entrada</th>
                              <th className="text-left px-4 py-2 text-[10px] font-semibold text-slate-400 uppercase hidden sm:table-cell">Saída</th>
                              <th className="text-left px-4 py-2 text-[10px] font-semibold text-slate-400 uppercase">Tipo</th>
                              <th className="text-left px-4 py-2 text-[10px] font-semibold text-slate-400 uppercase hidden md:table-cell">Oficina</th>
                              <th className="text-right px-4 py-2 text-[10px] font-semibold text-slate-400 uppercase">Custo</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {manutV.map(m => (
                              <tr key={m.id} className="hover:bg-slate-50/50">
                                <td className="px-4 py-2.5 text-xs text-slate-500">{new Date(m.data).toLocaleDateString('pt-BR')}</td>
                                <td className="px-4 py-2.5 text-xs text-slate-500 hidden sm:table-cell">
                                  {(m as any).data_saida
                                    ? <span className="flex items-center gap-1 text-green-600"><CheckCircle size={10} />{new Date((m as any).data_saida).toLocaleDateString('pt-BR')}</span>
                                    : <span className="text-amber-500">Em andamento</span>}
                                </td>
                                <td className="px-4 py-2.5 text-xs font-medium text-slate-700">{m.tipo}</td>
                                <td className="px-4 py-2.5 text-xs text-slate-500 hidden md:table-cell">{m.oficina || ' - '}</td>
                                <td className="px-4 py-2.5 text-xs font-semibold text-slate-700 text-right">{fmtBRL(Number(m.custo))}</td>
                              </tr>
                            ))}
                            <tr className="bg-slate-50 font-semibold">
                              <td colSpan={3} className="px-4 py-2 text-xs text-slate-600">Total de manutenções</td>
                              <td className="hidden md:table-cell" />
                              <td className="px-4 py-2 text-xs text-right text-slate-800">{fmtBRL(custoManut)}</td>
                            </tr>
                          </tbody>
                        </table>
                      )
                    )}

                    {/* Tab acidentes */}
                    {aba === 'acidente' && (
                      acidentesV.length === 0 ? (
                        <p className="px-5 py-4 text-sm text-slate-400">Nenhum acidente registrado</p>
                      ) : (
                        <div className="divide-y divide-slate-100">
                          {acidentesV.map(ac => (
                            <div key={ac.id} className="px-5 py-3 space-y-2">
                              <div className="flex items-start justify-between gap-4">
                                <div>
                                  <div className="flex items-center gap-2 text-xs">
                                    <Calendar size={11} className="text-slate-400" />
                                    <span className="text-slate-500">{new Date(ac.data).toLocaleDateString('pt-BR')}</span>
                                    {ac.local && <><MapPin size={11} className="text-slate-400" /><span className="text-slate-500">{ac.local}</span></>}
                                  </div>
                                  {ac.descricao && <p className="text-sm text-slate-700 mt-1">{ac.descricao}</p>}
                                </div>
                                <span className="text-sm font-semibold text-red-600 whitespace-nowrap">{fmtBRL(Number(ac.custo_reparo))}</span>
                              </div>
                              {ac.fotos.length > 0 && (
                                <div className="flex gap-2 flex-wrap">
                                  {ac.fotos.map((url, i) => (
                                    <button key={i} onClick={() => setFotoAmpliada(url)}>
                                      <img src={url} alt={`Foto ${i + 1}`} className="w-16 h-16 object-cover rounded-lg border border-slate-200 hover:opacity-80 transition-opacity" />
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                          <div className="px-5 py-2 bg-slate-50 flex justify-between text-xs font-semibold text-slate-700">
                            <span>Total acidentes</span><span>{fmtBRL(custoAcid)}</span>
                          </div>
                        </div>
                      )
                    )}

                    {/* Tab abastecimentos */}
                    {aba === 'abastecimento' && (
                      abastV.length === 0 ? (
                        <p className="px-5 py-4 text-sm text-slate-400">Nenhum abastecimento registrado</p>
                      ) : (() => {
                        const kmOrdenado = [...abastV].sort((a, b) => Number(a.km_atual) - Number(b.km_atual));
                        const consumoMedio = kmOrdenado.length >= 2
                          ? (Number(kmOrdenado[kmOrdenado.length - 1].km_atual) - Number(kmOrdenado[0].km_atual)) / abastV.reduce((s, a) => s + Number(a.litros), 0)
                          : null;
                        return (
                          <div>
                            {consumoMedio !== null && (
                              <div className="px-5 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-2 text-xs text-blue-700">
                                <Droplets size={12} />
                                <span>Consumo médio estimado: <strong>{consumoMedio.toFixed(2)} km/L</strong></span>
                              </div>
                            )}
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-slate-50">
                                  <th className="text-left px-4 py-2 text-[10px] font-semibold text-slate-400 uppercase">Data</th>
                                  <th className="text-left px-4 py-2 text-[10px] font-semibold text-slate-400 uppercase hidden sm:table-cell">KM</th>
                                  <th className="text-left px-4 py-2 text-[10px] font-semibold text-slate-400 uppercase">Litros</th>
                                  <th className="text-left px-4 py-2 text-[10px] font-semibold text-slate-400 uppercase hidden md:table-cell">R$/L</th>
                                  <th className="text-left px-4 py-2 text-[10px] font-semibold text-slate-400 uppercase hidden lg:table-cell">Responsável</th>
                                  <th className="text-left px-4 py-2 text-[10px] font-semibold text-slate-400 uppercase hidden lg:table-cell">Retorno</th>
                                  <th className="text-right px-4 py-2 text-[10px] font-semibold text-slate-400 uppercase">Total</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {abastV.map(ab => (
                                  <tr key={ab.id} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-2.5 text-xs text-slate-500">{new Date(ab.data).toLocaleDateString('pt-BR')}</td>
                                    <td className="px-4 py-2.5 text-xs text-slate-500 hidden sm:table-cell">{Number(ab.km_atual) > 0 ? `${Number(ab.km_atual).toLocaleString('pt-BR')} km` : ' - '}</td>
                                    <td className="px-4 py-2.5 text-xs font-medium text-slate-700">{Number(ab.litros).toFixed(2)}L</td>
                                    <td className="px-4 py-2.5 text-xs text-slate-500 hidden md:table-cell">{fmtBRL(Number(ab.valor_total) / Number(ab.litros))}</td>
                                    <td className="px-4 py-2.5 text-xs text-slate-500 hidden lg:table-cell">{ab.responsavel_nome || ' - '}{ab.obra_atual ? `  -  ${ab.obra_atual}` : ''}</td>
                                    <td className="px-4 py-2.5 text-xs text-slate-500 hidden lg:table-cell">{ab.data_retorno ? new Date(ab.data_retorno).toLocaleDateString('pt-BR') : ' - '}</td>
                                    <td className="px-4 py-2.5 text-xs font-semibold text-slate-700 text-right">{fmtBRL(Number(ab.valor_total))}</td>
                                  </tr>
                                ))}
                                <tr className="bg-slate-50 font-semibold">
                                  <td colSpan={2} className="px-4 py-2 text-xs text-slate-600">Total abastecimentos</td>
                                  <td className="px-4 py-2 text-xs text-slate-700">{totalLitros.toFixed(2)}L</td>
                                  <td colSpan={3} className="hidden md:table-cell" />
                                  <td className="px-4 py-2 text-xs text-right text-slate-800">{fmtBRL(abastV.reduce((s, ab) => s + Number(ab.valor_total), 0))}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        );
                      })()
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* -- Modal Veiculo -- */}
      {modalVeiculo && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModalVeiculo(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h3 className="font-semibold text-slate-800">{editandoVeiculo ? 'Editar Veículo' : 'Novo Veículo'}</h3>
              <button onClick={() => setModalVeiculo(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Placa *</label>
                  <input value={formVeiculo.placa} onChange={e => setFormVeiculo(f => ({ ...f, placa: e.target.value }))} placeholder="ABC-1234"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Status</label>
                  <select value={formVeiculo.status} onChange={e => setFormVeiculo(f => ({ ...f, status: e.target.value as StatusVeiculo }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="disponivel">Disponível</option>
                    <option value="em_uso">Em Uso</option>
                    <option value="manutencao">Manutenção</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Modelo *</label>
                  <input value={formVeiculo.modelo} onChange={e => setFormVeiculo(f => ({ ...f, modelo: e.target.value }))} placeholder="Hilux, Sprinter..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Marca</label>
                  <input value={formVeiculo.marca} onChange={e => setFormVeiculo(f => ({ ...f, marca: e.target.value }))} placeholder="Toyota..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Ano</label>
                  <input type="number" min="1990" max="2030" value={formVeiculo.ano} onChange={e => setFormVeiculo(f => ({ ...f, ano: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Cor</label>
                  <input value={formVeiculo.cor} onChange={e => setFormVeiculo(f => ({ ...f, cor: e.target.value }))} placeholder="Branco..."
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              {/* Localizacao */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Localização atual</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setFormVeiculo(f => ({ ...f, localizacao: 'biasi' }))}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${formVeiculo.localizacao === 'biasi' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                    <Building2 size={15} />Na Biasi
                  </button>
                  <button onClick={() => setFormVeiculo(f => ({ ...f, localizacao: 'obra' }))}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition-colors ${formVeiculo.localizacao === 'obra' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                    <HardHat size={15} />Em Obra
                  </button>
                </div>
              </div>

              {formVeiculo.localizacao === 'obra' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Qual obra?</label>
                    <input value={formVeiculo.obra_atual} onChange={e => setFormVeiculo(f => ({ ...f, obra_atual: e.target.value }))} placeholder="Nome da obra"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">Com quem está?</label>
                    <input value={formVeiculo.responsavel_atual} onChange={e => setFormVeiculo(f => ({ ...f, responsavel_atual: e.target.value }))} placeholder="Nome do responsável"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </>
              )}

              {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setModalVeiculo(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl">Cancelar</button>
              <button onClick={salvarVeiculo} disabled={salvando} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl">
                {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -- Modal Manutencao -- */}
      {modalManutencao && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModalManutencao(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Registrar Manutenção</h3>
              <button onClick={() => setModalManutencao(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Tipo *</label>
                  <select value={formManut.tipo} onChange={e => setFormManut(f => ({ ...f, tipo: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {TIPOS_MANUT.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Entrada na oficina *</label>
                  <input type="date" value={formManut.data} onChange={e => setFormManut(f => ({ ...f, data: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Saiu da oficina</label>
                <input type="date" value={formManut.data_saida} onChange={e => setFormManut(f => ({ ...f, data_saida: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <p className="text-[11px] text-slate-400 mt-1">Deixe em branco se ainda está na oficina</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">KM</label>
                  <input type="number" min="0" value={formManut.km} onChange={e => setFormManut(f => ({ ...f, km: e.target.value }))} placeholder="Ex: 45000"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Custo (R$)</label>
                  <input type="number" min="0" step="0.01" value={formManut.custo} onChange={e => setFormManut(f => ({ ...f, custo: e.target.value }))} placeholder="0,00"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Oficina</label>
                <input value={formManut.oficina} onChange={e => setFormManut(f => ({ ...f, oficina: e.target.value }))} placeholder="Nome da oficina"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Descrição do serviço</label>
                <textarea value={formManut.descricao} onChange={e => setFormManut(f => ({ ...f, descricao: e.target.value }))} rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setModalManutencao(null)} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl">Cancelar</button>
              <button onClick={salvarManutencao} disabled={salvando} className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl">
                {salvando ? 'Salvando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -- Modal Acidente -- */}
      {modalAcidente && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModalAcidente(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <AlertTriangle size={16} className="text-red-500" />Registrar Acidente
              </h3>
              <button onClick={() => setModalAcidente(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Data *</label>
                  <input type="date" value={formAcidente.data} onChange={e => setFormAcidente(f => ({ ...f, data: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Custo do reparo (R$)</label>
                  <input type="number" min="0" step="0.01" value={formAcidente.custo_reparo} onChange={e => setFormAcidente(f => ({ ...f, custo_reparo: e.target.value }))} placeholder="0,00"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Local</label>
                <input value={formAcidente.local} onChange={e => setFormAcidente(f => ({ ...f, local: e.target.value }))} placeholder="Onde aconteceu?"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Descrição</label>
                <textarea value={formAcidente.descricao} onChange={e => setFormAcidente(f => ({ ...f, descricao: e.target.value }))} rows={3}
                  placeholder="O que aconteceu?"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
              </div>

              {/* Upload de fotos */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Fotos do acidente</label>
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
                  onChange={e => {
                    const files = Array.from(e.target.files || []);
                    setFormAcidente(f => ({ ...f, fotos: [...f.fotos, ...files] }));
                  }} />
                <button onClick={() => fileRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-blue-400 hover:text-blue-500 transition-colors">
                  <Camera size={16} />Adicionar fotos
                </button>
                {formAcidente.fotos.length > 0 && (
                  <div className="flex gap-2 flex-wrap mt-2">
                    {formAcidente.fotos.map((f, i) => (
                      <div key={i} className="relative">
                        <img src={URL.createObjectURL(f)} alt="" className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                        <button onClick={() => setFormAcidente(prev => ({ ...prev, fotos: prev.fotos.filter((_, j) => j !== i) }))}
                          className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px]">
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {formAcidente.fotos.length === 0 && (
                  <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1"><ImageIcon size={10} />Aceita JPG, PNG, WEBP</p>
                )}
              </div>

              {uploadando && <p className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">Enviando fotos...</p>}
              {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setModalAcidente(null)} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl">Cancelar</button>
              <button onClick={salvarAcidente} disabled={salvando || uploadando}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl">
                {salvando ? 'Salvando...' : 'Registrar acidente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -- Modal Abastecimento -- */}
      {modalAbastecimento && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setModalAbastecimento(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <Droplets size={16} className="text-blue-500" />Registrar Abastecimento
              </h3>
              <button onClick={() => setModalAbastecimento(null)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Data *</label>
                  <input type="date" value={formAbast.data} onChange={e => setFormAbast(f => ({ ...f, data: e.target.value }))}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">KM atual</label>
                  <input type="number" min="0" value={formAbast.km_atual} onChange={e => setFormAbast(f => ({ ...f, km_atual: e.target.value }))} placeholder="Ex: 45000"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Litros *</label>
                  <input type="number" min="0" step="0.01" value={formAbast.litros} onChange={e => setFormAbast(f => ({ ...f, litros: e.target.value }))} placeholder="Ex: 50.00"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Valor total (R$) *</label>
                  <input type="number" min="0" step="0.01" value={formAbast.valor_total} onChange={e => setFormAbast(f => ({ ...f, valor_total: e.target.value }))} placeholder="0,00"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Responsável</label>
                  <input value={formAbast.responsavel_nome} onChange={e => setFormAbast(f => ({ ...f, responsavel_nome: e.target.value }))} placeholder="Nome do condutor"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1.5">Obra atual</label>
                  <input value={formAbast.obra_atual} onChange={e => setFormAbast(f => ({ ...f, obra_atual: e.target.value }))} placeholder="Onde está o veiculo"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Previsão de retorno</label>
                <input type="date" value={formAbast.data_retorno} onChange={e => setFormAbast(f => ({ ...f, data_retorno: e.target.value }))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1.5">Observação</label>
                <textarea value={formAbast.observacao} onChange={e => setFormAbast(f => ({ ...f, observacao: e.target.value }))} rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setModalAbastecimento(null)} className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl">Cancelar</button>
              <button onClick={salvarAbastecimento} disabled={salvando}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl">
                {salvando ? 'Salvando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -- Foto ampliada -- */}
      {fotoAmpliada && (
        <div className="fixed inset-0 bg-black/90 z-[60] flex items-center justify-center p-4" onClick={() => setFotoAmpliada(null)}>
          <button className="absolute top-4 right-4 text-white p-2 hover:bg-white/10 rounded-lg"><X size={24} /></button>
          <img src={fotoAmpliada} alt="Foto do acidente" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}

