import { useEffect, useRef, useState } from 'react';
import { X, Check, ClipboardList, Package, Wrench, Car, LayoutDashboard, FilePlus } from 'lucide-react';
import { supabase } from '../infrastructure/supabase/client';
import type { Requisicao, StatusRequisicao } from '../domain/entities/Requisicao';
import { useAuth } from '../context/AuthContext';

/* ─── Constantes ─────────────────────────────────────────────────── */

const FERRAMENTAS = [
  'AFIADOR DE BROCAS 3-10MM 95W ABV095 VONDER',
  'ALAVANCA TIPO PONTEIRO',
  'ALICATE AMPERIMETRO ICEL AW4700',
  'ALICATE CRIMPADOR ELETRO HIDRAULICO A BATERIA EZ-300 SIBRATEC',
  'ALICATE HIDRAMAC CH6 / CH6 - B',
  'ALICATE HIDRAULICO LK-300',
  'ALICATE HIDRAULICO MALETA GRANDE AZUL',
  'ALICATE HIDRAULICO PRENSA TERMINAL COMPRESSAO 16-300MM',
  'ALICATE MANUAL LK-H150',
  'ALICATE PERFURADOR DE CHAPAS FURADOR HIDRAULICO 6 MATRIZES',
  'ALICATE PRENSA MANUAL AZUL',
  'ALICATE PRENSA PARA MONTAGEM DE TUBOS PEX DN16 A 32MM',
  'ALICATE PRENSA TUBO PEX 16,20E26MM',
  'ALICATE PRENSA TUBO PEX 16A 25MM',
  'ALICATE PRENSA TUBO PEX MULTICAMADA C/ MATRIZES 16 A 32MM',
  'ALICATE REBITADOR DE ROSCA',
  'ASPIRADOR AGUA PO ELECTROLUX 1300W 20L GT30N 220V',
  'ASPIRADOR DE PO E LIQUIDO 15L 1250W 220V',
  'ASPIRADOR DE PO POTENTE KARCHER',
  'ATORNILLADOR DE IMPACTO DEWALT 20V MAX COM BATERIA E CARREGADOR',
  'BALANCA DIGITAL FILIZOLA BP15',
  'BAMBA DE ENCHER PNEU',
  'BATEDOR DE HASTE GRANDE',
  'BETONEIRA MAX 1 TRACAO 400L 2CV MONOFASICO',
  'BOMBA PARA TESTE HIDROSTATICO RP50S SUPER EGO',
  'BOSCH PARAFUSADEIRA E FURADEIRA GSR 7-14 E 400W 220V',
  'CAIXA COM JOGO DE FERRAMENTAS ELETRICAS E MANUAL',
  'CAIXA TELEFONIA',
  'CAMISA DE PUXAMENTO DE CABOS',
  'CARRINHO DE CARGA COM ESTRUTURA ABERTA',
  'CARRIOLA METALICA',
  'CAVADEIRA ARTICULADA',
  'CAVALETE DE FERRO',
  'CHAVE DE IMPACTO 1/2 DCF922 DEWALT BRUSHLESS ATOMIC 20V',
  'CHAVE DE IMPACTO BLACK DECKER',
  'CHAVE DE IMPACTO DEWALT 3/4',
  'CHAVE DE IMPACTO ELETRICA',
  'CHAVE GRIFO 14"',
  'CHAVE GRIFO 18"',
  'CHAVE GRIFO 24',
  'CHAVE GRIFO 36"',
  'CHAVE GRIFO GRANDE',
  'COMPRESSOR DE AR ELETRICO PORTATIL TEKNA CP8525 24L 2,5HP',
  'CONJUNTO SOLDA',
  'CURVADOR DE TUBO HIDRAULICO DE 1/2 ATE 3 CB 18000',
  'CURVADOR DE TUBOS TIPO ALAVANCA 3 EM 1',
  'DETECTOR DE ALTA TENSAO POR APROXIMACAO',
  'DEWALT DW257 PARAFUSADEIRA ELETRICA DRYWALL 650W 220V',
  'DEWALT ESMERILHADEIRA ANGULAR 4 1/2 POL. 900W DWE4120B',
  'DEWALT MARTELETE SDS PLUS 800W 2KG D25133K',
  'DEWALT SERRA CIRCULAR 7.1/4 POL. 1400W DWE560',
  'DEWALT SOPRADOR TERMICO 450 LPM 1550W 220V',
  'ENXADA LARGA CABO DE MADEIRA',
  'ENXADAO ESTREITA',
  'ESCADA DE FIBRA 5 DEGRAUS', 'ESCADA DE FIBRA 6 DEGRAUS', 'ESCADA DE FIBRA 7 DEGRAUS',
  'ESCADA DE FIBRA 9 DEGRAUS', 'ESCADA DE FIBRA 11 DEGRAUS', 'ESCADA DE FIBRA 12 DEGRAUS',
  'ESCADA DE MADEIRA 5 DEGRAUS', 'ESCADA DE MADEIRA 6 DEGRAUS', 'ESCADA DE MADEIRA 7 DEGRAUS', 'ESCADA DE MADEIRA 8 DEGRAUS',
  'ESCADA EXTENSIVA 11 DEGRAUS', 'ESCADA EXTENSIVA 14 DEGRAUS', 'ESCADA EXTENSIVA 18 DEGRAUS',
  'ESCADA EXTENSIVA DE ALUMINIO 10 DEGRAUS',
  'ESCADA EXTENSIVA DE FIBRA 12 DEGRAUS', 'ESCADA EXTENSIVA DE FIBRA 13 DEGRAUS',
  'ESCADA EXTENSIVA DE FIBRA 14 DEGRAUS', 'ESCADA EXTENSIVA DE FIBRA 16 DEGRAUS', 'ESCADA EXTENSIVA DE FIBRA 18 DEGRAUS',
  'ESMERILHADEIRA ANGULAR 4 1/2 DEWALT 900W',
  'ESMERILHADEIRA ANGULAR 7 POL. 2200W DEWALT DWE491',
  'ESMERILHADEIRA ANGULAR DE 4-1/2 POL. 900W DEWALT DWE4120',
  'ESTICADOR TENSIONADOR DE CINTA',
  'ETIQUETADORA ELETRONICA',
  'FASIMETRO / SEQUENCIMETRO COM BOLSA',
  'FERRAMENTA DE FIXACAO BATERIA HILTI BX 3-L A22MA',
  'FERRO DE SOLDA DE 25W 220V',
  'FERRO DE SOLDAR MACHADINHA PRO FAME',
  'FOICE ROCADEIRA',
  'FURADEIRA DE BANCADA 1/2 POL FERRARI-FG13',
  'FURADEIRA DE IMPACTO 1/2 POL. 710W DEWALT-DWD502',
  'FURADEIRA DE IMPACTO 1/2 POL. 760W MAKITA-HP1640',
  'FURADEIRA E PARAFUSADEIRA DE IMPACTO DEWALT DCD7781D2',
  'FURADEIRA L MARTELETE E PERFURADOR 720W',
  'FURADEIRA PARAFUSADEIRA 18V DHP453 MAKITA COM BATERIA',
  'FURADEIRA PARAFUSADEIRA A BATERIA 12V DCD710D2',
  'FURADOR DE CHAPAS HIDRAULICO PUMP',
  'GARFO FORCADO',
  'GERADOR DE ENERGIA A GASOLINA',
  'GERADOR DE ENERGIA A GASOLINA 10KVA MONOFASICO 220V',
  'GERADOR DE ENERGIA A GASOLINA 4T 389CC 6KVA BIVOLT',
  'INSUFLADOR EXAUSTOR DE AR 400MM COM DUTO 220V',
  'JOGO CHAVE CATRACA',
  'JOGO DE SOQUETES ESTRIADOS 1/2 POL VONDER',
  'JOGO KIT DE FERRAMENTAS MANUAIS CHAVE CATRACA 1/2 8 A 32MM',
  'KARCHER K5 LAVADORA DE ALTA PRESSAO 127V',
  'KIT DESCASCADOR DE CABOS SEM FIO DEWALT',
  'KIT ESTANQUEIDADE PARA ESGOTO',
  'KIT JOGO DE MOLAS PARA CURVAR TUBO',
  'KIT ROSQUEADEIRA MANUAL PARA CANO METALICO',
  'KIT TESTE DE ESTANQUE SALCAS MCU 200',
  'LAVADORA DE ALTA PRESSAO',
  'LUXOMETRO DIGITAL MINIPA MLM-1011',
  'MACACO HIDRAULICO TIPO GARRAFA',
  'MACHADO LENHADOR',
  'MAKITA SERRA MARMORE 125MM 1450W',
  'MALETA DE CABEAMENTO ESTRUTURADO',
  'MAQUINA AUTOMATICA PARA DESCASCAR CABOS',
  'MAQUINA DE RANHURA DE TUBOS',
  'MAQUINA DE SOLDA INVERSORA INDUSTRIAL BAMBOZZI',
  'MARTELETE HILTI TE 500',
  'MARTELETE PERFURADOR BOSCH GBH 2-24 D 820W 220V',
  'MARTELETE SDS PLUS 800W HR2470 220V MAKITA',
  'MARTELETE SDS PLUS ELETROPNEU 800W DEWALT D25133K',
  'MARTELO DEMOLIDOR 1750W 220V GSH 16-28 BOSCH',
  'MEDIDOR DE DISTANCIA DIGITAL',
  'MEDIDOR DE ESPESSURA ULTRASSOM METROTOKYO',
  'MEGOHMETRO DIGITAL 5KV',
  'MESA BANCADA',
  'MODULO ANDAIME 100X120', 'MODULO ANDAIME 100X150',
  'MORSA DE BANCADA 70MM FERRO FUNDIDO NODULAR',
  'MOTO ESMERIL DE BANCADA',
  'MOTOCOMPRESSOR DE AR PORTATIL 1,5HP 20 LITROS',
  'NIVEL A LASER 12 LINHAS VERDE RECARREGAVEL COM TRIPE',
  'NIVEL A LASER AUTO NIVELAMENTO 10 METROS MTX-350339',
  'NIVEL A LASER DE LINHAS VERDES AUTONIVELANTE',
  'NIVEL A LASER VERDE 30M DEWALT',
  'PA DE BICO',
  'PARAFUSADEIRA DEWALT',
  'PARAFUSADEIRA FURADEIRA DE IMPACTO BRUSHLESS 1/2 DEWALT DCD7781D2',
  'PARAFUSADEIRA MAKITA',
  'PERFURADOR DE SOLO A GASOLINA',
  'PERFURATRIZ MANUAL 2000W THAF CONCRETO / LAJE 220V',
  'PERFURATRIZ WEKA TYROLIT',
  'PICARETA CHIBANCA',
  'PISO METALICO P/ANDAIME',
  'PISTOLA FINCAPINO CALIBRE 27 WALSYWA PRA 10',
  'PISTOLA FIXACAO A POLVORA WALSYWA PRA 10',
  'PLAINA ELETRICA 1MM DEWALT',
  'PLAINA MANUAL',
  'PRENSA DE MONTAGEM GRANDE 16-32MM ASTRA',
  'PRENSA DE MONTAGEM MEDIA 16-25MM ASTRA',
  'REBITADEIRA MANUAL VERTICAL',
  'RODIZIO ANDAIME',
  'ROSQUEADEIRA ELETRICA 1/2 A 4" BSP 220V FERRARI',
  'SERRA CIRCULAR DE 7.1/4 POL. 1.400W DEWALT-DWE560BR',
  'SERRA DE CORTE RAPIDO POLICORTE 14 POL. 355MM 2300W DEWALT',
  'SERRA MARMORE 125MM 1400W DEWALT-DW862',
  'SERRA MARMORE 4.3/8 1450W MAKITA 4100NH2Z',
  'SERRA TICO TICO DEWALT MODELO DWE300',
  'SOCADOR DE TERRA',
  'SONDA PASSA FIO 9MM 100 METROS COM GIRANDA',
  'SONDA PASSA FIO DE FIBRA GRANDE',
  'SONDA PASSA FIO DE FIBRA PEQUENO',
  'SOPRADOR TERMICO DEWALT MODELO D26411',
  'SOPRADOR TERMICO GAMMA AZUL',
  'TALHA MANUAL 500KG COM CORRENTE',
  'TERMO ANEMOMETRO DIGITAL MINIPA',
  'TERMOFUSOR 800W COM BOCAIS DE 20 A 63MM TOP FUSION',
  'TERMOFUSORA 0800W 75/110MM PPR VICOL',
  'TERMOFUSORA SUPER EGO 20 A 60MM 800W 230V',
  'TERROMETRO DIGITAL PORTATIL MINIPA',
  'TESOURA CORTA VERGALHAO',
  'TESSOURA CORTA CABOS',
  'TESTADOR DE REATOR',
  'TORQUIMETRO DE ESTALO GEDORE',
  'TRAVA DE SEGURANCA DIAGONAL ANDAIME',
  'TRENA DE RODA DIGITAL 100KM C/ SUPORTE',
  'TRENA MEDIDOR A LASER BOSCH',
  'VANGA QUADRADA',
  'VENTILADOR INDUSTRIAL BRISAS',
];

const VEICULOS = [
  { value: 'BCE', label: 'BCE — camionete' },
  { value: 'BKU', label: 'BKU — caminhão' },
  { value: 'COV', label: 'COV — caminhão cesto aéreo' },
  { value: 'CYC', label: 'CYC — kombi' },
  { value: 'DIE', label: 'DIE — camionete' },
  { value: 'ENE', label: 'ENE — camionete' },
  { value: 'EZM', label: 'EZM — kombi' },
  { value: 'FDC', label: 'FDC — caminhão cesto aéreo' },
  { value: 'FEB', label: 'FEB — kombi' },
  { value: 'FJC', label: 'FJC — gol utilitário' },
  { value: 'FKZ', label: 'FKZ — kombi' },
  { value: 'FPI', label: 'FPI — gol utilitário' },
  { value: 'FPU', label: 'FPU — caminhão' },
  { value: 'FRX', label: 'FRX — ducato' },
  { value: 'GHV', label: 'GHV — gol utilitário' },
  { value: 'OQL', label: 'OQL — kombi' },
  { value: 'OWO', label: 'OWO — kombi' },
  { value: 'QUY', label: 'QUY — onix' },
  { value: 'QXC', label: 'QXC — argo' },
  { value: 'RUF', label: 'RUF — camionete' },
  { value: 'SIO', label: 'SIO — camionete' },
  { value: 'TIX', label: 'TIX — caminhão' },
];

const OBRAS_PADRAO = [
  'Gehaka', 'Della Bruna', 'Sinergy', 'Rodoanel',
  'Granel - Santa Helena', 'Granel Química - Santos', 'Cassuarina',
];

const STATUS_CONFIG: Record<StatusRequisicao, { label: string; cor: string; corBg: string }> = {
  pendente:  { label: 'Pendente',  cor: 'text-amber-400',  corBg: 'bg-amber-500/20 border border-amber-500/30' },
  aprovada:  { label: 'Aprovada',  cor: 'text-blue-400',   corBg: 'bg-blue-500/20 border border-blue-500/30'  },
  entregue:  { label: 'Entregue',  cor: 'text-emerald-400',corBg: 'bg-emerald-500/20 border border-emerald-500/30' },
  cancelada: { label: 'Cancelada', cor: 'text-red-400',    corBg: 'bg-red-500/20 border border-red-500/30'   },
};

const COLUNAS: StatusRequisicao[] = ['pendente', 'aprovada', 'entregue'];

type Categoria = 'material' | 'ferramenta' | 'carro';

/* ─── Estilos reutilizáveis (tema escuro) ─────────────────────────── */
const inputCls =
  'w-full px-4 py-2.5 mt-1.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-[#2E63D5]/60 focus:ring-2 focus:ring-[#2E63D5]/20 transition-all';
const labelCls = 'block mt-4 text-xs font-semibold text-slate-400 uppercase tracking-wide';

/* ─── Fieldset ────────────────────────────────────────────────────── */
function Fieldset({ legend, children }: { legend: string; children: React.ReactNode }) {
  return (
    <div className="border border-white/8 rounded-2xl p-5 mb-4 bg-white/3">
      <p className="text-xs font-bold text-[#2E63D5] uppercase tracking-widest mb-1">{legend}</p>
      <div className="border-t border-white/8 pt-2">{children}</div>
    </div>
  );
}

/* ─── FerramentaSelect ────────────────────────────────────────────── */
function FerramentaSelect({ value, onChange, ferramentas }: { value: string; onChange: (v: string) => void; ferramentas: string[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const wrapRef = useRef<HTMLDivElement>(null);

  const filtered = ferramentas.filter(f => f.toLowerCase().includes(query.toLowerCase()));

  // keep query in sync when value is reset externally
  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={wrapRef} className="relative mt-1.5">
      <input
        type="text"
        value={query}
        placeholder="Selecione ou digite a ferramenta"
        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-[#2E63D5]/60 focus:ring-2 focus:ring-[#2E63D5]/20 transition-all"
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && filtered.length > 0 && (
        <ul className="absolute left-0 right-0 mt-1 bg-slate-800 border border-white/10 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
          {filtered.map(f => (
            <li
              key={f}
              className="px-3 py-2 text-sm text-slate-200 hover:bg-white/10 cursor-pointer"
              onMouseDown={() => { onChange(f); setQuery(f); setOpen(false); }}
            >
              {f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ─── Componente Principal ────────────────────────────────────────── */
export function Requisicoes() {
  const { usuario } = useAuth();
  const isGestor = usuario?.papel === 'gestor' || usuario?.papel === 'admin' || usuario?.papel === 'dono';

  const [view, setView] = useState<'form' | 'kanban'>('form');
  const [obras, setObras] = useState<string[]>(OBRAS_PADRAO);
  const [categoria, setCategoria] = useState<Categoria | null>(null);

  /* campos comuns */
  const [obra, setObra] = useState('');
  const [cargo, setCargo] = useState('');
  const [dataReq, setDataReq] = useState('');
  const [prazo, setPrazo] = useState('');

  /* material */
  const [descMaterial, setDescMaterial] = useState('');
  const [urgenteMat, setUrgenteMat] = useState('');
  const [justMat, setJustMat] = useState('');
  const [obsMat, setObsMat] = useState('');

  /* ferramenta */
  const [nomeFerr, setNomeFerr] = useState('');
  const [qtdFerr, setQtdFerr] = useState('1');
  const [urgenteFerr, setUrgenteFerr] = useState('');
  const [justFerr, setJustFerr] = useState('');
  const [obsFerr, setObsFerr] = useState('');

  /* carro */
  const [numCarros, setNumCarros] = useState(1);
  const [veiculosSel, setVeiculosSel] = useState(['', '', '', '', '']);
  const [veiculosDB, setVeiculosDB] = useState<{ value: string; label: string }[]>([]);
  const [horarioCarro, setHorarioCarro] = useState('');
  const [urgenteCarro, setUrgenteCarro] = useState('');
  const [justCarro, setJustCarro] = useState('');
  const [obsCarro, setObsCarro] = useState('');

  /* kanban */
  const [reqs, setReqs] = useState<Requisicao[]>([]);
  const [loadingReqs, setLoadingReqs] = useState(false);

  /* envio */
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    supabase.from('obras').select('nome').order('nome').then(({ data }) => {
      if (data && data.length > 0) setObras(data.map((o: { nome: string }) => o.nome));
    });
    supabase.from('veiculos').select('id, modelo, placa').eq('ativo', true).order('modelo').then(({ data }) => {
      if (data && data.length > 0) {
        setVeiculosDB(data.map((v: any) => ({ value: v.placa || v.id, label: `${v.placa ? v.placa + ' — ' : ''}${v.modelo}` })));
      }
    });
    setDataReq(new Date().toISOString().slice(0, 10));
  }, []);

  async function carregarReqs() {
    setLoadingReqs(true);
    const { data } = await supabase
      .from('requisicoes_almoxarifado')
      .select('*, solicitante:usuarios!requisicoes_almoxarifado_solicitante_id_fkey(nome)')
      .order('criado_em', { ascending: false });
    setReqs((data || []) as unknown as Requisicao[]);
    setLoadingReqs(false);
  }

  useEffect(() => { if (view === 'kanban') carregarReqs(); }, [view]);

  function setVeiculo(idx: number, val: string) {
    setVeiculosSel(prev => prev.map((v, i) => i === idx ? val : v));
  }

  async function enviar() {
    setErro('');
    if (!obra) { setErro('Selecione a obra.'); return; }
    if (!cargo) { setErro('Selecione o cargo.'); return; }
    if (!categoria) { setErro('Selecione o tipo de requisição.'); return; }
    if (categoria === 'material' && !descMaterial.trim()) { setErro('Descreva o material necessário.'); return; }
    if (categoria === 'ferramenta' && !nomeFerr.trim()) { setErro('Informe a ferramenta/equipamento.'); return; }
    if (categoria === 'carro' && !veiculosSel[0]) { setErro('Selecione pelo menos um veículo.'); return; }

    setSalvando(true);
    let itens: Record<string, unknown> = { tipo: categoria };
    if (categoria === 'material') {
      itens = { tipo: 'material', descricao: descMaterial, urgente: urgenteMat, justificativa_urgencia: justMat, observacao: obsMat };
    } else if (categoria === 'ferramenta') {
      itens = { tipo: 'ferramenta', nome: nomeFerr, quantidade: Number(qtdFerr), urgente: urgenteFerr, justificativa_urgencia: justFerr, observacao: obsFerr };
    } else if (categoria === 'carro') {
      itens = { tipo: 'carro', veiculos: veiculosSel.filter(Boolean), horario: horarioCarro, urgente: urgenteCarro, justificativa_urgencia: justCarro, observacao: obsCarro };
    }

    const { error } = await supabase.from('requisicoes_almoxarifado').insert({
      solicitante_id: usuario!.id,
      obra,
      observacao: `cargo:${cargo}${prazo ? ` | prazo:${prazo}` : ''}`,
      itens: [itens],
    });

    setSalvando(false);
    if (error) { setErro(error.message); return; }

    setSucesso(true);
    setCategoria(null); setObra(''); setCargo(''); setPrazo('');
    setDescMaterial(''); setUrgenteMat(''); setJustMat(''); setObsMat('');
    setNomeFerr(''); setQtdFerr('1'); setUrgenteFerr(''); setJustFerr(''); setObsFerr('');
    setNumCarros(1); setVeiculosSel(['', '', '', '', '']); setHorarioCarro(''); setUrgenteCarro(''); setJustCarro(''); setObsCarro('');
    setTimeout(() => setSucesso(false), 5000);
  }

  async function atualizarStatus(id: string, status: StatusRequisicao) {
    const updates: Record<string, unknown> = { status };
    if (status === 'aprovada') { updates.data_aprovacao = new Date().toISOString(); updates.aprovado_por_id = usuario!.id; }
    await supabase.from('requisicoes_almoxarifado').update(updates).eq('id', id);
    setReqs(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r));
  }

  const formatData = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-5">

      {/* ── Header ───────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Requisições</h1>
          <p className="text-sm text-slate-400 mt-0.5">Solicite materiais, ferramentas ou veículos da frota</p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setView('form')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${view === 'form' ? 'bg-[#2E63D5] text-white shadow-lg shadow-[#2E63D5]/30' : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white'}`}
          >
            <FilePlus size={14} />Nova Requisição
          </button>
          <button
            onClick={() => setView('kanban')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${view === 'kanban' ? 'bg-[#2E63D5] text-white shadow-lg shadow-[#2E63D5]/30' : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10 hover:text-white'}`}
          >
            <LayoutDashboard size={14} />Gerenciar
          </button>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          VIEW: FORMULÁRIO
      ══════════════════════════════════════════ */}
      {view === 'form' && (
        <div className="space-y-4">

          {/* Hero */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a3a6e] to-[#0f2248] border border-white/10 p-6">
            <div className="absolute -right-10 -top-10 w-48 h-48 bg-[#2E63D5]/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-[#FFC82D]/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold text-white/80 uppercase tracking-widest mb-3">
                <ClipboardList size={11} /> Almoxarifado · Biasi Engenharia
              </span>
              <h2 className="text-2xl font-black text-white mb-1">Ficha de Requisição</h2>
              <p className="text-slate-300 text-sm max-w-lg">
                Solicite materiais, ferramentas ou veículos da frota. Escolha a categoria abaixo e preencha os campos correspondentes.
              </p>
            </div>
          </div>

          {/* Cards de categoria */}
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Tipo de Requisição</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {([
                { id: 'material', icon: Package, label: 'Material', chip: 'Insumos', desc: 'Solicite materiais para obras ou uso interno.' },
                { id: 'ferramenta', icon: Wrench, label: 'Ferramenta / Equipamento', chip: 'Ferramentas', desc: 'Retirada ou reserva de ferramentas e equipamentos.' },
                { id: 'carro', icon: Car, label: 'Carro / Frota', chip: 'Uso de frota', desc: 'Solicite veículo da frota para operações em obra.' },
              ] as const).map(({ id, icon: Icon, label, chip, desc }) => (
                <button
                  key={id}
                  onClick={() => setCategoria(id)}
                  className={`relative text-left p-5 rounded-2xl border transition-all overflow-hidden group ${
                    categoria === id
                      ? 'border-[#2E63D5] bg-[#2E63D5]/15 shadow-lg shadow-[#2E63D5]/20'
                      : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10'
                  }`}
                >
                  <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-[#FFC82D]/8 pointer-events-none" />
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3 ${
                    categoria === id ? 'bg-[#2E63D5]/30 text-[#7aafff]' : 'bg-white/8 text-slate-400'
                  }`}>
                    {chip}
                  </span>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 border ${
                    categoria === id ? 'bg-[#2E63D5]/20 border-[#2E63D5]/40 text-[#7aafff]' : 'bg-white/5 border-white/10 text-slate-400'
                  }`}>
                    <Icon size={22} />
                  </div>
                  <p className={`font-bold text-sm mb-1 ${categoria === id ? 'text-white' : 'text-slate-200'}`}>{label}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                  {categoria === id && (
                    <div className="mt-2 flex items-center gap-1 text-[#7aafff] text-[11px] font-bold">
                      <Check size={12} /> Selecionado
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Formulário aparece após selecionar categoria */}
          {categoria && (
            <div className="border border-white/8 rounded-2xl bg-white/3 p-5 space-y-1">

              {/* Dados da Solicitação */}
              <Fieldset legend="Dados da Solicitação">
                <label className={labelCls}>Obra *
                  <select value={obra} onChange={e => setObra(e.target.value)} className={inputCls} required>
                    <option value="">Selecione a obra</option>
                    {obras.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </label>

                <label className={labelCls}>Solicitante
                  <input type="text" value={usuario?.nome || usuario?.email || ''} readOnly
                    className={inputCls + ' opacity-60 cursor-not-allowed'} />
                </label>

                <label className={labelCls}>Cargo do Solicitante *
                  <select value={cargo} onChange={e => setCargo(e.target.value)} className={inputCls} required>
                    <option value="">Selecione o cargo</option>
                    <option value="engenheiro">Engenheiro</option>
                    <option value="encarregado">Encarregado (com validação)</option>
                    <option value="tecnico">Técnico</option>
                    <option value="outro">Outro</option>
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className={labelCls}>Data da Solicitação *
                    <input type="date" value={dataReq} onChange={e => setDataReq(e.target.value)} className={inputCls} required />
                  </label>
                  <label className={labelCls}>Prazo desejado
                    <input type="date" value={prazo} onChange={e => setPrazo(e.target.value)} className={inputCls} />
                  </label>
                </div>
              </Fieldset>

              {/* Material */}
              {categoria === 'material' && (
                <Fieldset legend="Detalhes do Material">
                  <label className={labelCls}>Descrição do material *
                    <textarea value={descMaterial} onChange={e => setDescMaterial(e.target.value)}
                      placeholder="Descreva o material ou tipo de item necessário"
                      rows={3} className={inputCls + ' resize-y min-h-[80px]'} required />
                  </label>
                  <label className={labelCls}>Urgente?
                    <select value={urgenteMat} onChange={e => setUrgenteMat(e.target.value)} className={inputCls}>
                      <option value="">Selecione</option>
                      <option value="nao">Não</option>
                      <option value="sim">Sim</option>
                    </select>
                  </label>
                  {urgenteMat === 'sim' && (
                    <label className={labelCls}>Justificativa da urgência *
                      <textarea value={justMat} onChange={e => setJustMat(e.target.value)}
                        placeholder="Explique por que é urgente" rows={2} className={inputCls + ' resize-y'} />
                    </label>
                  )}
                  <label className={labelCls}>Observação
                    <textarea value={obsMat} onChange={e => setObsMat(e.target.value)}
                      placeholder="Observação (opcional)" rows={2} className={inputCls + ' resize-y'} />
                  </label>
                </Fieldset>
              )}

              {/* Ferramenta */}
              {categoria === 'ferramenta' && (
                <Fieldset legend="Detalhes da Ferramenta / Equipamento">
                  <label className={labelCls}>Nome da ferramenta / equipamento *</label>
                  <FerramentaSelect value={nomeFerr} onChange={setNomeFerr} ferramentas={FERRAMENTAS} />
                  <label className={labelCls}>Quantidade *
                    <input type="number" min="1" value={qtdFerr} onChange={e => setQtdFerr(e.target.value)} className={inputCls} required />
                  </label>
                  <label className={labelCls}>Urgente?
                    <select value={urgenteFerr} onChange={e => setUrgenteFerr(e.target.value)} className={inputCls}>
                      <option value="">Selecione</option>
                      <option value="nao">Não</option>
                      <option value="sim">Sim</option>
                    </select>
                  </label>
                  {urgenteFerr === 'sim' && (
                    <label className={labelCls}>Justificativa da urgência *
                      <textarea value={justFerr} onChange={e => setJustFerr(e.target.value)}
                        placeholder="Explique por que é urgente" rows={2} className={inputCls + ' resize-y'} />
                    </label>
                  )}
                  <label className={labelCls}>Observação
                    <textarea value={obsFerr} onChange={e => setObsFerr(e.target.value)}
                      placeholder="Observação (opcional)" rows={2} className={inputCls + ' resize-y'} />
                  </label>
                </Fieldset>
              )}

              {/* Carro */}
              {categoria === 'carro' && (
                <Fieldset legend="Detalhes do Carro / Frota">
                  <label className={labelCls}>Veículo 1 *
                    <select value={veiculosSel[0]} onChange={e => setVeiculo(0, e.target.value)} className={inputCls} required>
                      <option value="">Selecione o veículo</option>
                      {(veiculosDB.length > 0 ? veiculosDB : VEICULOS).map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                    </select>
                  </label>
                  {Array.from({ length: numCarros - 1 }, (_, i) => i + 1).map(idx => (
                    <div key={idx} className="flex items-end gap-2">
                      <label className={labelCls + ' flex-1'}>Veículo {idx + 1}
                        <select value={veiculosSel[idx]} onChange={e => setVeiculo(idx, e.target.value)} className={inputCls}>
                          <option value="">Selecione o veículo</option>
                          {(veiculosDB.length > 0 ? veiculosDB : VEICULOS).map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
                        </select>
                      </label>
                      <button
                        type="button"
                        onClick={() => { setVeiculo(idx, ''); setNumCarros(n => n - 1); }}
                        className="mb-1 p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-white/10 transition-colors"
                        title="Remover veículo"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {numCarros < 5 && (
                    <button
                      type="button"
                      onClick={() => setNumCarros(n => n + 1)}
                      className="mt-2 text-xs font-semibold text-[#7aafff] hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-2 transition-colors"
                    >
                      + Adicionar veículo
                    </button>
                  )}
                  <label className={labelCls}>Data e horário de utilização
                    <input type="datetime-local" value={horarioCarro} onChange={e => setHorarioCarro(e.target.value)} className={inputCls} />
                  </label>
                  <label className={labelCls}>Urgente?
                    <select value={urgenteCarro} onChange={e => setUrgenteCarro(e.target.value)} className={inputCls}>
                      <option value="">Selecione</option>
                      <option value="nao">Não</option>
                      <option value="sim">Sim</option>
                    </select>
                  </label>
                  {urgenteCarro === 'sim' && (
                    <label className={labelCls}>Justificativa da urgência *
                      <textarea value={justCarro} onChange={e => setJustCarro(e.target.value)}
                        placeholder="Explique por que é urgente" rows={2} className={inputCls + ' resize-y'} />
                    </label>
                  )}
                  <label className={labelCls}>Observação
                    <textarea value={obsCarro} onChange={e => setObsCarro(e.target.value)}
                      placeholder="Observação (opcional)" rows={2} className={inputCls + ' resize-y'} />
                  </label>
                </Fieldset>
              )}

              {/* Aviso de validação para não-engenheiros */}
              {cargo && cargo !== 'engenheiro' && (
                <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                  <span className="mt-0.5">⚠️</span>
                  <span>Esta solicitação será encaminhada para aprovação do responsável antes do atendimento.</span>
                </div>
              )}

              {/* Erro / Sucesso */}
              {erro && (
                <div className="px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">{erro}</div>
              )}
              {sucesso && (
                <div className="px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm text-emerald-400 flex items-center gap-2">
                  <Check size={16} /> Requisição enviada com sucesso! O almoxarifado foi notificado.
                </div>
              )}

              {/* Botão */}
              <button
                onClick={enviar}
                disabled={salvando}
                className="w-full mt-2 py-3 rounded-xl bg-[#2E63D5] hover:bg-[#2558c4] text-white font-bold text-sm shadow-lg shadow-[#2E63D5]/30 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
              >
                {salvando ? 'Enviando...' : 'Enviar Solicitação'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════
          VIEW: KANBAN
      ══════════════════════════════════════════ */}
      {view === 'kanban' && (
        loadingReqs ? (
          <div className="text-center text-slate-400 text-sm py-12">Carregando requisições...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {COLUNAS.map(status => {
              const cfg = STATUS_CONFIG[status];
              const col = reqs.filter(r => r.status === status);
              return (
                <div key={status} className="bg-white/3 border border-white/8 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.corBg} ${cfg.cor}`}>{cfg.label}</span>
                    <span className="text-xs text-slate-500">{col.length}</span>
                  </div>
                  <div className="space-y-3">
                    {col.length === 0 ? (
                      <div className="border border-dashed border-white/10 rounded-xl p-6 text-center">
                        <ClipboardList size={20} className="text-slate-600 mx-auto mb-1" />
                        <p className="text-xs text-slate-500">Sem requisições</p>
                      </div>
                    ) : col.map(r => {
                      const solicitante = r.solicitante as unknown as { nome: string };
                      const itensRaw = Array.isArray(r.itens) ? r.itens : [];
                      const primeiro = itensRaw[0] as unknown as Record<string, unknown> | undefined;
                      const tipo = primeiro?.tipo as string | undefined;
                      const urgente = primeiro?.urgente === 'sim';

                      let emoji = '📦'; let resumo = '';
                      if (tipo === 'material') { emoji = '📦'; resumo = String(primeiro?.descricao || '').substring(0, 80); }
                      else if (tipo === 'ferramenta') { emoji = '🔧'; resumo = `${primeiro?.nome} — ${primeiro?.quantidade} un`; }
                      else if (tipo === 'carro') { emoji = '🚗'; resumo = ((primeiro?.veiculos as string[]) || []).join(', '); }
                      else {
                        const old = itensRaw as Array<{ descricao: string; quantidade: number; unidade: string }>;
                        resumo = old.slice(0, 2).map(it => `${it.descricao} — ${it.quantidade} ${it.unidade}`).join('\n');
                      }

                      return (
                        <div key={r.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                          <div className="mb-2">
                            <p className="font-semibold text-white text-sm flex items-center gap-1.5 flex-wrap">
                              <span>{emoji}</span>{r.obra}
                              {urgente && <span className="px-1.5 py-0.5 text-[10px] font-bold bg-red-500/20 text-red-400 rounded-full border border-red-500/30">URGENTE</span>}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">{solicitante?.nome} · {formatData(r.data_solicitacao)}</p>
                          </div>
                          <p className="text-xs text-slate-400 mb-3 whitespace-pre-line line-clamp-3">{resumo}</p>
                          {isGestor && status === 'pendente' && (
                            <div className="flex gap-2">
                              <button onClick={() => atualizarStatus(r.id, 'aprovada')}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg border border-emerald-500/20 transition-colors">
                                <Check size={12} />Aprovar
                              </button>
                              <button onClick={() => atualizarStatus(r.id, 'cancelada')}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/20 transition-colors">
                                <X size={12} />Cancelar
                              </button>
                            </div>
                          )}
                          {isGestor && status === 'aprovada' && (
                            <button onClick={() => atualizarStatus(r.id, 'entregue')}
                              className="w-full flex items-center justify-center gap-1 py-1.5 text-xs font-semibold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg border border-blue-500/20 transition-colors">
                              <Check size={12} />Marcar como Entregue
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
