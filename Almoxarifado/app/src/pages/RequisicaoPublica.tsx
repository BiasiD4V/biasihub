import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../infrastructure/supabase/client';
import { Camera, CheckCircle2, Mic, Package, Paperclip, Plus, StopCircle, Truck, Video, Wrench, X } from 'lucide-react';
import { CameraModal } from '../components/CameraModal';

/* ======================================================================
   TIPOS / CONSTANTES
   ====================================================================== */

type CategoriaType = 'insumos' | 'ferramentas' | 'frota';

type InsumoOpt = {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string | null;
  grupo: string | null;
};

type FerramentaOpt = {
  id: string;
  codigo: string;
  descricao: string;
  unidade: string | null;
  marca: string | null;
  categoria: string | null;
  estoque_atual: number | null;
};

type VeiculoOpt = {
  id: string;
  placa: string | null;
  modelo: string;
  marca: string | null;
};

type ItemLinha = {
  uid: string;
  itemId: string | null;
  codigo: string | null;
  descricao: string;
  quantidade: string;
  unidade: string;
  observacao: string;
  fotos: File[];
  fotosUrls: string[];
  marca?: string | null;
  categoria?: string | null;
  grupo?: string | null;
  placa?: string | null;
  modelo?: string | null;
  usoFrota?: string | null;
};

const STORAGE_BUCKET = 'requisicoes';

const OBRAS_PADRAO: string[] = [];

const UNIDADES = ['un', 'pç', 'cx', 'm', 'm²', 'm³', 'kg', 'L', 'mL', 'rolo', 'par', 'saco', 'barra', 'jogo'];
const CARGOS = ['Almoxarifado', 'Engenheiro', 'Encarregado', 'Técnico', 'Administrativo', 'Compras'];
const IDENT_KEY = 'biasi_public_ident_v1';

/* ======================================================================
   UTIL
   ====================================================================== */

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function normalizeDisplayText(value: string | null | undefined): string {
  const raw = (value ?? '').trim();
  if (!raw) return '';
  const hasMojibake = /(?:[\u00C2\u00C3][\u0080-\u00BF]|\uFFFD)/.test(raw);
  if (!hasMojibake) return raw;
  const bytes = Uint8Array.from(raw, (ch) => ch.charCodeAt(0) & 0xff);
  const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes).trim();
  if (decoded && !decoded.includes('\uFFFD')) return decoded;
  return raw.replace(/\uFFFD/g, '').trim();
}

function datetimeLocalNow(): string {
  const now = new Date();
  now.setSeconds(0, 0);
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

/* ======================================================================
   ESTILOS
   ====================================================================== */

const styles = {
  page: 'min-h-screen w-full bg-gradient-to-b from-[#071b49] to-[#0b2260] text-[#f4f7ff] font-[Inter,Segoe_UI,Arial,sans-serif]',
  container: 'w-full max-w-[800px] mx-auto px-3 sm:px-4 pt-5 sm:pt-6 pb-10',
  card: 'rounded-[28px] border border-[rgba(113,154,255,0.28)] bg-[linear-gradient(180deg,rgba(24,55,120,0.92),rgba(20,48,111,0.95))] shadow-[0_22px_45px_rgba(0,0,0,0.28)]',
  section: 'rounded-[24px] sm:rounded-[28px] border border-[rgba(113,154,255,0.28)] bg-[linear-gradient(180deg,rgba(24,55,120,0.92),rgba(20,48,111,0.95))] shadow-[0_22px_45px_rgba(0,0,0,0.28)] p-4 sm:p-6 mb-5',
  input: 'w-full rounded-[18px] border border-[#3560b8] bg-[rgba(10,30,77,0.32)] text-[#f4f7ff] px-4 py-4 outline-none placeholder:text-[#b8c5eb] min-h-[54px] focus:border-[#5c89ff] transition-colors',
  inputCompact: 'w-full rounded-[14px] border border-[#3560b8] bg-[rgba(10,30,77,0.32)] text-[#f4f7ff] px-3 py-3 outline-none placeholder:text-[#b8c5eb] min-h-[48px] focus:border-[#5c89ff] transition-colors',
  label: 'font-extrabold uppercase text-[0.9rem] text-[#f4f7ff] tracking-wide',
  btn: 'inline-flex items-center justify-center gap-2 font-extrabold py-3 px-5 rounded-[18px] border border-[rgba(113,154,255,0.28)] bg-white/[0.03] text-[#f4f7ff] cursor-pointer transition-all hover:-translate-y-[1px] hover:bg-white/[0.06]',
  btnPrimary: 'inline-flex items-center justify-center gap-2 font-extrabold py-3 px-5 rounded-[18px] border-transparent bg-[linear-gradient(180deg,#4b7bf0,#3d6fe0)] text-white shadow-[0_10px_24px_rgba(52,104,223,0.35)] cursor-pointer transition-all hover:-translate-y-[1px]',
  btnSmall: 'inline-flex items-center justify-center gap-2 font-extrabold py-2.5 px-4 rounded-[14px] border border-[rgba(113,154,255,0.28)] bg-white/[0.03] text-[#f4f7ff] text-[0.9rem] cursor-pointer transition-all hover:bg-white/[0.06]',
  btnDanger: 'inline-flex items-center justify-center gap-2 font-extrabold py-2.5 px-4 rounded-[14px] border border-[rgba(255,107,107,0.4)] bg-[rgba(255,107,107,0.08)] text-[#ff9797] text-[0.9rem] cursor-pointer transition-all hover:bg-[rgba(255,107,107,0.15)]',
  h4: 'text-[#4f80f5] font-extrabold uppercase tracking-[0.1em] text-[1.15rem] m-0 mb-5 pb-3 border-b border-white/50',
  pill: 'inline-flex items-center px-3.5 py-2 rounded-full bg-[rgba(10,30,77,0.45)] font-extrabold text-[0.9rem] uppercase',
};

const selectOptionStyle = { color: '#f4f7ff', backgroundColor: '#102a67' };
const selectFieldStyle = { colorScheme: 'dark' } as const;

/* ======================================================================
   AUTOCOMPLETE GENÉRICO
   ====================================================================== */

type AutocompleteItem = { id: string; titulo: string; sub?: string; disabled?: boolean };

function Autocomplete<T extends AutocompleteItem>({
  items,
  placeholder,
  loading,
  valueId,
  onSelect,
}: {
  items: T[];
  placeholder: string;
  loading: boolean;
  valueId: string | null;
  onSelect: (item: T | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!valueId) { setQuery(''); return; }
    const sel = items.find((i) => i.id === valueId);
    if (sel) setQuery(sel.titulo);
  }, [valueId, items]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return items.slice(0, 15);
    return items
      .filter((i) => i.titulo.toLowerCase().includes(q) || (i.sub || '').toLowerCase().includes(q))
      .slice(0, 15);
  }, [query, items]);

  return (
    <div ref={wrapRef} className="relative">
      <input
        type="text"
        className={styles.inputCompact}
        placeholder={loading ? 'Carregando...' : placeholder}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); if (valueId) onSelect(null); }}
        onFocus={() => setOpen(true)}
      />
      {open && !loading && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-[14px] overflow-hidden border border-[rgba(113,154,255,0.45)] bg-[#0d2258] shadow-xl">
          <ul className="max-h-64 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-[0.85rem] text-[#b8c5eb]">Nenhum resultado</li>
            ) : (
              filtered.map((it) => (
                <li
                  key={it.id}
                  className={`px-3 py-2.5 text-[0.9rem] border-b border-white/5 last:border-b-0 ${
                    it.disabled
                      ? 'opacity-50 cursor-not-allowed text-[#b8c5eb]'
                      : 'text-[#f4f7ff] hover:bg-white/10 cursor-pointer'
                  }`}
                  onMouseDown={() => {
                    if (it.disabled) return;
                    onSelect(it);
                    setQuery(it.titulo);
                    setOpen(false);
                  }}
                >
                  <p className="font-bold leading-tight">{it.titulo}</p>
                  {it.sub && (
                    <p className={`text-[0.78rem] mt-0.5 ${it.disabled ? 'text-[#ff9a8b]' : 'text-[#b8c5eb]'}`}>{it.sub}</p>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ======================================================================
   LINHA DE ITEM
   ====================================================================== */

function ItemRow({
  linha,
  categoria,
  insumos,
  ferramentas,
  veiculos,
  veiculosOcupados,
  loading,
  onChange,
  onRemove,
}: {
  linha: ItemLinha;
  categoria: CategoriaType;
  insumos: InsumoOpt[];
  ferramentas: FerramentaOpt[];
  veiculos: VeiculoOpt[];
  veiculosOcupados: Set<string>;
  loading: boolean;
  onChange: (patch: Partial<ItemLinha>) => void;
  onRemove: () => void;
}) {
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [camOpen, setCamOpen] = useState(false);

  // Item especial pra "não sei o nome" — só pra ferramentas e insumos.
  // Quando o solicitante seleciona, descrição fica em branco e a FOTO é
  // o que identifica o item (almoxarifado vê e separa pela imagem).
  const optOutro: AutocompleteItem = {
    id: '__OUTRO__',
    titulo: '➕ Outro / não sei o nome',
    sub: 'Tire uma foto e o almoxarifado identifica',
  };

  const autoItems = useMemo<AutocompleteItem[]>(() => {
    if (categoria === 'insumos') {
      const arr: AutocompleteItem[] = insumos.map((i) => ({
        id: i.id,
        titulo: `${i.codigo} - ${normalizeDisplayText(i.descricao)}`,
        sub: `${i.unidade || 'un'}${i.grupo ? ` • ${i.grupo}` : ''}`,
      }));
      arr.push(optOutro);
      return arr;
    }
    if (categoria === 'ferramentas') {
      const arr: AutocompleteItem[] = ferramentas.map((f) => ({
        id: f.id,
        titulo: `${f.codigo} - ${normalizeDisplayText(f.descricao)}`,
        sub: `${f.marca || ''}${f.marca ? ' • ' : ''}${f.unidade || 'un'}${f.estoque_atual != null ? ` • estoque ${f.estoque_atual}` : ''}`,
      }));
      arr.push(optOutro);
      return arr;
    }
    return veiculos.map((v) => {
      const ocupado = veiculosOcupados.has(v.id);
      return {
        id: v.id,
        titulo: `${v.placa ? v.placa + ' - ' : ''}${v.modelo}`,
        sub: ocupado
          ? 'Indisponível neste período'
          : (v.marca || ''),
        disabled: ocupado,
      };
    });
  }, [categoria, insumos, ferramentas, veiculos, veiculosOcupados]);

  function handleSelect(item: AutocompleteItem | null) {
    if (!item) {
      onChange({ itemId: null, codigo: null, descricao: '', unidade: linha.unidade });
      return;
    }
    // Item especial "Outro": deixa descrição em branco; foto é o que identifica
    if (item.id === '__OUTRO__') {
      onChange({ itemId: '__OUTRO__', codigo: null, descricao: '', unidade: linha.unidade || 'un' });
      return;
    }
    if (categoria === 'insumos') {
      const raw = insumos.find((i) => i.id === item.id);
      if (!raw) return;
      onChange({ itemId: raw.id, codigo: raw.codigo, descricao: normalizeDisplayText(raw.descricao), unidade: raw.unidade || linha.unidade || 'un', grupo: raw.grupo });
    } else if (categoria === 'ferramentas') {
      const raw = ferramentas.find((f) => f.id === item.id);
      if (!raw) return;
      onChange({ itemId: raw.id, codigo: raw.codigo, descricao: normalizeDisplayText(raw.descricao), unidade: raw.unidade || linha.unidade || 'un', marca: raw.marca, categoria: raw.categoria });
    } else {
      const raw = veiculos.find((v) => v.id === item.id);
      if (!raw) return;
      if (veiculosOcupados.has(raw.id)) return;
      onChange({ itemId: raw.id, codigo: raw.placa, descricao: `${raw.placa ? raw.placa + ' - ' : ''}${raw.modelo}`, unidade: 'uso', placa: raw.placa, modelo: raw.modelo, marca: raw.marca });
    }
  }

  const mostrarUnidade = categoria === 'insumos';
  const isFrota = categoria === 'frota';
  const gridClass = isFrota
    ? 'grid gap-3 items-start grid-cols-1 sm:grid-cols-[minmax(0,2.2fr)_52px]'
    : mostrarUnidade
    ? 'grid gap-3 items-start grid-cols-1 sm:grid-cols-[minmax(0,2.2fr)_120px_180px_52px]'
    : 'grid gap-3 items-start grid-cols-1 sm:grid-cols-[minmax(0,2.2fr)_120px_52px]';

  return (
    <div className="p-3.5 rounded-[18px] border border-[rgba(113,154,255,0.28)] bg-[rgba(8,24,64,0.24)]">
      {camOpen && (
        <CameraModal
          mode="photo"
          onCapture={(file) => {
            const url = URL.createObjectURL(file);
            onChange({
              fotos: [...linha.fotos, file],
              fotosUrls: [...linha.fotosUrls, url],
            });
          }}
          onClose={() => setCamOpen(false)}
        />
      )}
      <div className={gridClass}>
        <div>
          <Autocomplete
            items={autoItems}
            placeholder={
              categoria === 'insumos'
                ? 'Buscar insumo por código ou descrição...'
                : categoria === 'ferramentas'
                ? 'Buscar ferramenta por código, descrição ou marca...'
                : 'Buscar veículo por placa ou modelo...'
            }
            loading={loading}
            valueId={linha.itemId}
            onSelect={handleSelect}
          />
        </div>
        {!isFrota && (
          <input
            type="number"
            min="1"
            step="any"
            className={styles.inputCompact}
            placeholder="Qtd"
            value={linha.quantidade}
            onChange={(e) => onChange({ quantidade: e.target.value })}
          />
        )}
        {mostrarUnidade && (
          <div>
            <select className={styles.inputCompact} value={linha.unidade} onChange={(e) => onChange({ unidade: e.target.value })} style={selectFieldStyle}>
              {UNIDADES.map((u) => <option key={u} value={u} style={selectOptionStyle}>{u}</option>)}
              {linha.unidade && !UNIDADES.includes(linha.unidade) && (
                <option value={linha.unidade} style={selectOptionStyle}>{linha.unidade}</option>
              )}
            </select>
          </div>
        )}
        <button
          type="button"
          onClick={() => { if (deleteArmed) onRemove(); else { setDeleteArmed(true); setTimeout(() => setDeleteArmed(false), 2500); } }}
          className={`w-[52px] h-[52px] rounded-[14px] border cursor-pointer font-extrabold text-xl transition ${deleteArmed ? 'border-[rgba(255,107,107,0.6)] bg-[rgba(255,107,107,0.12)] text-[#ff6b6b]' : 'border-[rgba(113,154,255,0.28)] bg-white/[0.03] text-[#f4f7ff]'}`}
          title={deleteArmed ? 'Clique de novo para confirmar' : 'Remover item'}
        >
          <X size={18} className="mx-auto" />
        </button>
      </div>
      <div className="mt-3">
        {isFrota ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              className={styles.inputCompact}
              value={linha.usoFrota || ''}
              onChange={(e) => {
                const uso = e.target.value;
                onChange({
                  usoFrota: uso,
                  observacao: uso === 'visitar_obra' ? 'Visitar obra' : '',
                });
              }}
              style={selectFieldStyle}
              required
            >
              <option value="" style={selectOptionStyle}>Para que vai usar? *</option>
              <option value="visitar_obra" style={selectOptionStyle}>Visitar obra</option>
              <option value="outros" style={selectOptionStyle}>Outros</option>
            </select>
            {linha.usoFrota === 'outros' && (
              <input
                type="text"
                className={styles.inputCompact}
                placeholder="Descreva o uso *"
                value={linha.observacao}
                onChange={(e) => onChange({ observacao: e.target.value })}
                required
              />
            )}
          </div>
        ) : (
          <input
            type="text"
            className={styles.inputCompact}
            placeholder="Observação do item (opcional)"
            value={linha.observacao}
            onChange={(e) => onChange({ observacao: e.target.value })}
          />
        )}
      </div>
      {!isFrota && (
        <div className="mt-2 flex items-start gap-3 flex-wrap">
          <button type="button" className={styles.btnSmall + ' text-[0.8rem] py-1.5'} onClick={() => setCamOpen(true)}>
            <Camera size={13} />
            {linha.fotosUrls.length > 0 ? `Adicionar foto (${linha.fotosUrls.length})` : 'Foto do item'}
          </button>
          {linha.fotosUrls.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {linha.fotosUrls.map((url, idx) => (
                <div key={idx} className="relative">
                  <img src={url} alt={`foto-${idx}`} className="w-12 h-12 object-cover rounded-[10px] border border-[rgba(113,154,255,0.4)]" />
                  <button
                    type="button"
                    onClick={() =>
                      onChange({
                        fotos: linha.fotos.filter((_, i) => i !== idx),
                        fotosUrls: linha.fotosUrls.filter((_, i) => i !== idx),
                      })
                    }
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#ff6b6b] text-white text-[0.7rem] grid place-items-center border border-white/30 leading-none"
                    title="Remover foto"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ======================================================================
   TIPO-CARD
   ====================================================================== */

function TipoCard({ active, onClick, pill, icon, titulo, descricao }: {
  active: boolean;
  onClick: () => void;
  pill: string;
  icon: JSX.Element;
  titulo: string;
  descricao: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left relative p-7 min-h-[210px] rounded-[24px] cursor-pointer transition-all border ${
        active
          ? 'border-[rgba(92,137,255,0.65)] bg-[linear-gradient(180deg,rgba(25,57,130,0.98),rgba(20,47,110,0.92))] shadow-[0_0_0_2px_rgba(92,137,255,0.35)]'
          : 'border-[rgba(113,154,255,0.28)] bg-[linear-gradient(180deg,rgba(18,45,109,0.94),rgba(20,47,110,0.84))] hover:-translate-y-[2px] hover:border-[#3560b8]'
      }`}
    >
      <div className={styles.pill + ' mb-5 text-white'}>{pill}</div>
      <div className="w-[62px] h-[62px] rounded-2xl grid place-items-center border border-[#3560b8] bg-[rgba(12,29,77,0.35)] mb-4 text-[1.9rem]">
        {icon}
      </div>
      <h3 className="m-0 mb-2 text-[1.2rem] font-extrabold text-white">{titulo}</h3>
      <p className="m-0 text-white/90 leading-[1.5]">{descricao}</p>
    </button>
  );
}

/* ======================================================================
   PÁGINA PRINCIPAL
   ====================================================================== */

export function RequisicaoPublica() {
  const [params] = useSearchParams();
  const obraParam = params.get('obra') || '';
  const telParam = params.get('tel') || '';
  const nomeParam = params.get('nome') || '';

  const [categoria, setCategoria] = useState<CategoriaType>('insumos');

  /* dados da solicitação */
  const [obras, setObras] = useState<string[]>(OBRAS_PADRAO);
  const [obra, setObra] = useState(obraParam);
  const [obraOutro, setObraOutro] = useState('');
  const [nome, setNome] = useState(nomeParam);
  const [telefone, setTelefone] = useState(telParam);
  const [cargo, setCargo] = useState('');
  const [dataSolicitacao, setDataSolicitacao] = useState(() =>
    new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  );
  // Atualiza o horário exibido a cada minuto enquanto o formulário está aberto
  useEffect(() => {
    const id = setInterval(() => {
      setDataSolicitacao(
        new Date().toLocaleString('pt-BR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    }, 60_000);
    return () => clearInterval(id);
  }, []);
  const [prazo, setPrazo] = useState('');
  // Valor mínimo para o campo "Prazo Desejado" (impede datas passadas)
  const minPrazo = useMemo(() => {
    const d = new Date();
    d.setSeconds(0, 0);
    const off = d.getTimezoneOffset();
    const local = new Date(d.getTime() - off * 60_000);
    return local.toISOString().slice(0, 16);
  }, [dataSolicitacao]);
  const [devolucaoFrota, setDevolucaoFrota] = useState('');
  const [prioridade, setPrioridade] = useState<'normal' | 'urgente' | 'baixo'>('normal');
  const [entregaSolicitada, setEntregaSolicitada] = useState(false);
  const [observacao, setObservacao] = useState('');
  const [justificativaUrgencia, setJustificativaUrgencia] = useState('');

  /* itens */
  const [itens, setItens] = useState<ItemLinha[]>([
    { uid: uid(), itemId: null, codigo: null, descricao: '', quantidade: '1', unidade: 'un', observacao: '', fotos: [], fotosUrls: [] },
  ]);

  /* catálogos */
  const [insumos, setInsumos] = useState<InsumoOpt[]>([]);
  const [ferramentas, setFerramentas] = useState<FerramentaOpt[]>([]);
  const [veiculos, setVeiculos] = useState<VeiculoOpt[]>([]);
  const [veiculosOcupados, setVeiculosOcupados] = useState<Set<string>>(() => new Set());
  const [loadingCatalogos, setLoadingCatalogos] = useState(false);

  /* anexos */
  const [anexos, setAnexos] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* áudio */
  const [gravando, setGravando] = useState(false);
  const [audioUrl, setAudioUrl] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [camMode, setCamMode] = useState<'photo' | 'video' | null>(null);

  /* envio */
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const [linkFila, setLinkFila] = useState('');
  const [posicaoFila, setPosicaoFila] = useState<number | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(IDENT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { nome?: string; tel?: string };
      if (!nomeParam && parsed?.nome && !nome) setNome(parsed.nome);
      if (!telParam && parsed?.tel && !telefone) setTelefone(parsed.tel.replace(/\D/g, '').slice(0, 11));
    } catch {
      // ignore parse errors
    }
  }, []);

  /* ---------- Repetir pedido (vindo de /fila) ----------
       FilaPublica grava { obra, observacao, itens } no localStorage e
       redireciona pra /req?repetir=1. Aqui populamos o form. Fotos NÃO
       são reaproveitadas (precisam ser tiradas de novo) — alerta o user. */
  useEffect(() => {
    if (params.get('repetir') !== '1') return;
    try {
      const raw = localStorage.getItem('biasi_repetir_v1');
      if (!raw) return;
      const dados = JSON.parse(raw) as {
        origem_id?: string;
        obra?: string;
        observacao?: string | null;
        itens?: Array<{ tipo?: string; descricao?: string; nome?: string; quantidade?: number; unidade?: string; observacao?: string | null; placa?: string | null; modelo?: string | null }>;
      };
      // Detecta categoria pelo primeiro item
      const primeiroTipo = dados.itens?.[0]?.tipo;
      let cat: CategoriaType = 'insumos';
      if (primeiroTipo === 'ferramenta') cat = 'ferramentas';
      else if (primeiroTipo === 'carro') cat = 'frota';
      setCategoria(cat);

      if (dados.obra) setObra(dados.obra);
      // Tira metas técnicas da observação antiga e mantém só o "obs:" humano
      if (dados.observacao) {
        const obsLimpo = String(dados.observacao)
          .split('|')
          .map(p => p.trim())
          .filter(p => p.startsWith('obs:'))
          .map(p => p.slice(4).trim())
          .join(' ');
        if (obsLimpo) setObservacao(obsLimpo);
      }

      // Hidrata itens — sem fotos, user precisa tirar de novo
      const itensIniciais = (dados.itens || []).map(it => ({
        uid: uid(),
        itemId: null as string | null, // não tenta resolver pelo nome — user reseleciona
        codigo: null,
        descricao: it.descricao || it.nome || '',
        quantidade: String(it.quantidade ?? 1),
        unidade: it.unidade || (cat === 'frota' ? 'uso' : 'un'),
        observacao: it.observacao || '',
        fotos: [] as File[],
        fotosUrls: [] as string[],
        usoFrota: null as string | null,
      }));
      if (itensIniciais.length > 0) setItens(itensIniciais);

      // Limpa o localStorage e a query string pra não repetir em refresh
      localStorage.removeItem('biasi_repetir_v1');
      const novosParams = new URLSearchParams(params);
      novosParams.delete('repetir');
      const novaUrl = `${window.location.pathname}${novosParams.toString() ? '?' + novosParams.toString() : ''}`;
      window.history.replaceState({}, '', novaUrl);

      // Avisa o solicitante que precisa reanexar fotos
      setErro('Pedido repetido — você precisa selecionar os itens no catálogo e tirar fotos novamente.');
      setTimeout(() => setErro(''), 6000);
    } catch (err) {
      console.warn('[RequisicaoPublica] erro ao hidratar pedido repetido:', err);
    }
  }, []);

  /* ---------- Carrega catálogos ---------- */
  useEffect(() => {
    async function carregar() {
      setLoadingCatalogos(true);
      try {
        const [obrasRes, insumosRes, ferrRes, veicRes] = await Promise.all([
          supabase.from('obras').select('nome').order('nome'),
          supabase.from('itens_almoxarifado').select('id,codigo,descricao,unidade,grupo').eq('ativo', true).eq('tipo', 'material').order('descricao').limit(5000),
          supabase.from('itens_almoxarifado').select('id,codigo,descricao,unidade,marca,categoria,estoque_atual').eq('ativo', true).eq('tipo', 'ferramenta').order('descricao'),
          supabase.from('veiculos').select('id,placa,modelo,marca').eq('ativo', true).order('modelo'),
        ]);
        if (obrasRes.data && obrasRes.data.length > 0) setObras(obrasRes.data.map((o: { nome: string }) => o.nome));
        setInsumos((insumosRes.data || []) as InsumoOpt[]);
        setFerramentas((ferrRes.data || []) as FerramentaOpt[]);
        setVeiculos((veicRes.data || []) as VeiculoOpt[]);
      } catch (err) {
        console.error('[RequisicaoPublica] erro ao carregar catálogos:', err);
      } finally {
        setLoadingCatalogos(false);
      }
    }
    void carregar();
  }, []);

  /* ---------- Carros ocupados no período (frota) ----------
     Inclui:
       - agendamentos ATIVOS sobrepostos no período
       - manutenções com data_saida >= inicio (ou sem data_saida = sem previsão)
       - acidentes sem data_resolucao (veículo indisponível por tempo indeterminado)
  ---------------------------------------------------------- */
  useEffect(() => {
    if (categoria !== 'frota' || !prazo || !devolucaoFrota) {
      setVeiculosOcupados(new Set());
      return;
    }
    let cancelado = false;
    async function carregarOcupados() {
      try {
        const inicio = new Date(prazo).toISOString();
        const fim = new Date(devolucaoFrota).toISOString();
        if (Number.isNaN(new Date(inicio).getTime()) || Number.isNaN(new Date(fim).getTime())) {
          setVeiculosOcupados(new Set());
          return;
        }

        const [agsRes, manutRes, acidRes] = await Promise.all([
          supabase
            .from('agendamentos_almoxarifado')
            .select('item_id')
            .eq('tipo', 'veiculo')
            .eq('status', 'ativo')
            .lte('data_inicio', fim)
            .gte('data_fim', inicio),
          // Manutenção: bloqueia se entrou antes do fim do meu pedido E
          // (data_saida >= meu inicio) OU (sem data_saida = bloqueio infinito).
          supabase
            .from('manutencoes_veiculo')
            .select('veiculo_id, data, data_saida')
            .lte('data', fim),
          // Acidente: bloqueia se data <= fim e não tem data_resolucao
          supabase
            .from('acidentes_veiculo')
            .select('veiculo_id, data, data_resolucao')
            .lte('data', fim)
            .is('data_resolucao', null),
        ]);

        if (cancelado) return;
        const ids = new Set<string>();
        for (const row of agsRes.data || []) {
          if (row?.item_id) ids.add(String(row.item_id));
        }
        for (const row of manutRes.data || []) {
          // Sem data_saida = bloqueio. Com data_saida >= inicio = bloqueio.
          if (!row.data_saida || row.data_saida >= inicio) {
            if (row?.veiculo_id) ids.add(String(row.veiculo_id));
          }
        }
        for (const row of acidRes.data || []) {
          if (row?.veiculo_id) ids.add(String(row.veiculo_id));
        }
        setVeiculosOcupados(ids);
      } catch (err) {
        console.warn('[RequisicaoPublica] exceção em ocupados', err);
      }
    }
    void carregarOcupados();
    return () => {
      cancelado = true;
    };
  }, [categoria, prazo, devolucaoFrota]);

  /* ---------- Troca de categoria reseta itens ---------- */
  function handleSetCategoria(c: CategoriaType) {
    if (c === categoria) return;
    setCategoria(c);
    setEntregaSolicitada(false);
    setDevolucaoFrota('');
    const unidadeDefault = c === 'frota' ? 'uso' : 'un';
    setItens([{ uid: uid(), itemId: null, codigo: null, descricao: '', quantidade: '1', unidade: unidadeDefault, observacao: '', fotos: [], fotosUrls: [], usoFrota: null }]);
  }

  function addLinha() {
    setItens((prev) => [...prev, { uid: uid(), itemId: null, codigo: null, descricao: '', quantidade: '1', unidade: categoria === 'frota' ? 'uso' : 'un', observacao: '', fotos: [], fotosUrls: [], usoFrota: null }]);
  }

  function updateLinha(u: string, patch: Partial<ItemLinha>) {
    setItens((prev) => prev.map((l) => (l.uid === u ? { ...l, ...patch } : l)));
  }

  function removeLinha(u: string) {
    setItens((prev) => (prev.length > 1 ? prev.filter((l) => l.uid !== u) : prev));
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;
    setAnexos((prev) => [...prev, ...Array.from(files)]);
  }

  function removeAnexo(i: number) {
    setAnexos((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function iniciarGravacao() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioUrl(URL.createObjectURL(blob));
        setAnexos((prev) => [...prev, new File([blob], `audio-${Date.now()}.webm`, { type: 'audio/webm' })]);
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setGravando(true);
    } catch { setErro('Não foi possível acessar o microfone.'); }
  }

  function pararGravacao() { mediaRecorderRef.current?.stop(); setGravando(false); }

  /* ---------- Enviar ---------- */
  async function enviar(e?: React.FormEvent) {
    e?.preventDefault();
    setErro('');

    const obraFinal = obra === 'Outro' ? obraOutro.trim() : obra;
    if (!obraFinal) return setErro('Selecione a obra.');
    if (!nome.trim()) return setErro('Informe seu nome.');
    if (!telefone.trim()) return setErro('Informe seu WhatsApp.');
    if (!cargo) return setErro('Selecione o cargo.');

    // Item válido: tem itemId E quantidade > 0.
    // Descrição é exigida só pra itens do catálogo — o "__OUTRO__" entra sem
    // nome (a foto é o que identifica). Foto continua obrigatória abaixo.
    const itensValidos = itens.filter((l) => {
      if (!l.itemId || Number(l.quantidade) <= 0) return false;
      if (l.itemId === '__OUTRO__') return true;
      return l.descricao.trim().length > 0;
    });
    if (itensValidos.length === 0) {
      return setErro(
        categoria === 'insumos'
          ? 'Selecione ao menos um item do estoque com quantidade válida.'
          : categoria === 'ferramentas'
          ? 'Selecione ao menos uma ferramenta do cadastro com quantidade válida.'
          : 'Selecione ao menos um veículo da frota.'
      );
    }
    if (prioridade === 'urgente' && !justificativaUrgencia.trim()) return setErro('Justifique a urgência.');

    const itensSemFoto = categoria === 'frota' ? [] : itensValidos.filter((l) => (l.fotos?.length ?? 0) === 0);
    if (itensSemFoto.length > 0) return setErro('Foto do item é obrigatória em todos os itens da requisição.');
    if (categoria === 'frota') {
      if (!prazo) return setErro('Informe a data de uso/retirada do veículo.');
      if (!devolucaoFrota) return setErro('Informe a data de devolução do veículo.');
      if (devolucaoFrota < minPrazo) return setErro('Data de devolução não pode ser no passado.');
      if (prazo && devolucaoFrota < prazo) return setErro('Data de devolução não pode ser antes do prazo desejado.');
      const semUso = itensValidos.some((l) => !l.usoFrota);
      if (semUso) return setErro('Informe para que vai usar cada veículo.');
      const outrosSemDescricao = itensValidos.some((l) => l.usoFrota === 'outros' && !l.observacao.trim());
      if (outrosSemDescricao) return setErro('Descreva o uso do veículo quando selecionar Outros.');
    }

    // Ferramenta: data de devolução é OPCIONAL — mas se preencher, valida o intervalo
    if (categoria === 'ferramentas' && devolucaoFrota) {
      if (devolucaoFrota < minPrazo) return setErro('Data de devolução não pode ser no passado.');
      if (prazo && devolucaoFrota < prazo) return setErro('Data de devolução não pode ser antes do prazo desejado.');
    }

    if (prazo && new Date(prazo).getTime() < Date.now() - 60_000) {
      return setErro('Prazo desejado não pode ser no passado.');
    }

    setSalvando(true);
    try {
      const tipoJson = categoria === 'insumos' ? 'material' : categoria === 'ferramentas' ? 'ferramenta' : 'carro';
      const tel = telefone.replace(/\D/g, '');

      // ---------- Upload de fotos por item e anexos gerais para o Storage ----------
      async function tryUpload(file: File, prefix: string): Promise<string | null> {
        try {
          const safeName = file.name.replace(/[^\w.\-]+/g, '_');
          const path = `public/${tel || 'anon'}/${Date.now()}_${prefix}_${safeName}`;
          const { error: upErr } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(path, file, { upsert: false, contentType: file.type || undefined });
          if (upErr) {
            console.warn('[RequisicaoPublica] upload falhou', upErr);
            return null;
          }
          const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
          return data.publicUrl || null;
        } catch (err) {
          console.warn('[RequisicaoPublica] upload exception', err);
          return null;
        }
      }

      const itensPayload = await Promise.all(
        itensValidos.map(async (l, idx) => {
          const urls = (
            await Promise.all((l.fotos || []).map((f, i) => tryUpload(f, `item${idx}_${i}`)))
          ).filter((u): u is string => !!u);
          if (categoria !== 'frota' && (l.fotos || []).length > 0 && urls.length !== (l.fotos || []).length) {
            throw new Error('Não foi possível enviar todas as fotos do item. Confira a conexão e tente novamente.');
          }
          const usoFrotaLabel =
            l.usoFrota === 'visitar_obra' ? 'Visitar obra' : l.usoFrota === 'outros' ? 'Outros' : null;
          const observacaoItem =
            categoria === 'frota'
              ? l.usoFrota === 'visitar_obra'
                ? 'Visitar obra'
                : l.observacao || null
              : l.observacao || null;
          // Para item livre ("Outro / não sei o nome"), salva descrição
          // amigável que indica ao almoxarifado que precisa identificar
          // pela foto. Mantém item_id null no payload pra não confundir
          // com item do catálogo.
          const ehItemLivre = l.itemId === '__OUTRO__';
          const descrFinal = ehItemLivre
            ? (l.descricao.trim() || '(sem nome — identificar pela foto)')
            : l.descricao;
          const itemIdFinal = ehItemLivre ? null : l.itemId;

          return {
            tipo: tipoJson,
            item_id: itemIdFinal,
            codigo: l.codigo,
            descricao: descrFinal,
            nome: descrFinal,
            quantidade: categoria === 'frota' ? 1 : Number(l.quantidade),
            unidade: l.unidade,
            observacao: observacaoItem,
            marca: l.marca ?? null,
            categoria_ferramenta: l.categoria ?? null,
            grupo: l.grupo ?? null,
            placa: l.placa ?? null,
            modelo: l.modelo ?? null,
            uso_frota: l.usoFrota ?? null,
            uso_frota_label: usoFrotaLabel,
            uso_frota_outro: l.usoFrota === 'outros' ? l.observacao || null : null,
            urgente: prioridade === 'urgente' ? 'sim' : 'não',
            justificativa_urgencia: prioridade === 'urgente' ? justificativaUrgencia : '',
            choice_estoque: 'ok',
            foto_material: urls[0] || null,
            fotos_urls: urls,
            fase_rastreio: 0,
          };
        })
      );

      // Upload dos anexos gerais (documentos, áudios, fotos/vídeos gerais)
      const anexosUrls = (
        await Promise.all(anexos.map((f, i) => tryUpload(f, `anexo${i}`)))
      ).filter((u): u is string => !!u);
      if (anexos.length > 0 && anexosUrls.length !== anexos.length) {
        throw new Error('Não foi possível enviar todos os anexos. Confira a conexão e tente novamente.');
      }

      const obsFinal = [
        `cargo:${cargo}`,
        prazo ? `prazo:${prazo}` : '',
        (categoria === 'frota' || categoria === 'ferramentas') && devolucaoFrota ? `devolucao:${devolucaoFrota}` : '',
        `prioridade:${prioridade}`,
        `entrega:${categoria === 'frota' ? 'nao' : entregaSolicitada ? 'sim' : 'nao'}`,
        observacao ? `obs:${observacao}` : '',
        anexosUrls.length ? `anexos_urls:${anexosUrls.join(',')}` : '',
      ].filter(Boolean).join(' | ');
      localStorage.setItem(IDENT_KEY, JSON.stringify({ nome: nome.trim(), tel }));
      const { data: inserted, error } = await supabase
        .from('requisicoes_almoxarifado')
        .insert({
          solicitante_id: null,
          solicitante_nome: nome.trim(),
          telefone: tel,
          obra: obraFinal,
          observacao: obsFinal,
          itens: itensPayload,
        })
        .select('id, criado_em')
        .single();

      if (error) throw error;

      try {
        if (inserted?.criado_em) {
          const { count } = await supabase
            .from('requisicoes_almoxarifado')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'pendente')
            .lt('criado_em', inserted.criado_em);
          setPosicaoFila((count ?? 0) + 1);
        } else {
          setPosicaoFila(null);
        }
      } catch {
        setPosicaoFila(null);
      }

      const base = window.location.origin;
      setLinkFila(`${base}/fila?tel=${tel}&nome=${encodeURIComponent(nome.trim())}`);
      setSucesso(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErro(msg);
    } finally {
      setSalvando(false);
    }
  }

  /* ======================================================================
     SUCESSO
     ====================================================================== */

  if (sucesso) {
    return (
      <div className={styles.page}>
        <Link
          to="/obra"
          className="fixed top-4 left-4 z-[130] inline-flex items-center gap-2 rounded-xl border border-[rgba(113,154,255,0.35)] bg-[rgba(8,24,64,0.8)] px-3 py-2 text-xs font-bold text-white/95 hover:bg-[rgba(8,24,64,0.95)] transition"
        >
          ← Voltar ao início
        </Link>
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="rounded-[28px] border border-[rgba(113,154,255,0.28)] bg-[linear-gradient(180deg,rgba(24,55,120,0.92),rgba(20,48,111,0.95))] shadow-[0_22px_45px_rgba(0,0,0,0.28)] p-10 max-w-md w-full text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-extrabold text-white mb-2">Requisição enviada!</h2>
            <p className="text-[#b8c5eb] mb-8">O almoxarifado recebeu seu pedido e entrará em contato.</p>
            {posicaoFila != null && (
              <div className="mb-6 inline-flex px-4 py-2 rounded-full bg-[rgba(92,155,255,0.18)] border border-[rgba(92,155,255,0.45)] text-[#8fb2ff] font-extrabold text-sm">
                Posição na fila: #{posicaoFila}
              </div>
            )}
            <a
              href={linkFila}
              className="block bg-[linear-gradient(180deg,#4b7bf0,#3d6fe0)] hover:opacity-90 text-white font-extrabold py-4 px-6 rounded-[18px] transition mb-4 shadow-[0_10px_24px_rgba(52,104,223,0.35)]"
            >
              Ver minha fila de pedidos
            </a>
            <button
              onClick={() => {
                setSucesso(false);
                setItens([{ uid: uid(), itemId: null, codigo: null, descricao: '', quantidade: '1', unidade: 'un', observacao: '', fotos: [], fotosUrls: [], usoFrota: null }]);
                setObservacao('');
                setJustificativaUrgencia('');
                setCargo('');
                setPrazo('');
                setDevolucaoFrota('');
                setPrioridade('normal');
                setEntregaSolicitada(false);
                setAnexos([]);
                setAudioUrl('');
                setPosicaoFila(null);
              }}
              className="text-[#b8c5eb] hover:text-white text-sm transition"
            >
              Fazer outra requisição
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ======================================================================
     RENDER
     ====================================================================== */

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className="mb-4">
          <Link
            to="/obra"
            className="inline-flex items-center gap-2 rounded-xl border border-[rgba(113,154,255,0.35)] bg-[rgba(8,24,64,0.45)] px-3 py-2 text-xs font-bold text-white/95 hover:bg-[rgba(8,24,64,0.65)] transition"
          >
            ← Voltar ao início
          </Link>
        </div>
        {/* Hero */}
        <section className={styles.card + ' p-8 mb-6'}>
          <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-[#3560b8] bg-[rgba(7,22,64,0.28)] font-extrabold tracking-[0.08em] text-[0.9rem] mb-4 uppercase">
            <Package size={14} />
            Almoxarifado · Biasi Engenharia
          </span>
          <h2 className="m-0 mb-3 text-[2.6rem] leading-[1.05] tracking-[-0.03em]">Ficha de Requisição</h2>
          <p className="m-0 opacity-90 text-base leading-[1.45]">
            Solicite materiais, ferramentas ou veículos da frota. Escolha a categoria abaixo, preencha os campos e envie.
          </p>
        </section>

        {/* Tipo de Requisição */}
        <div className="font-extrabold uppercase tracking-[0.08em] text-[1.15rem] mt-5 mb-4">Tipo de Requisição</div>
        <section className="grid gap-3.5 mb-5 grid-cols-1 sm:grid-cols-3">
          <TipoCard
            active={categoria === 'insumos'}
            onClick={() => handleSetCategoria('insumos')}
            pill="Itens"
            icon={<Package size={32} strokeWidth={2.2} />}
            titulo="Item de Estoque"
            descricao="Solicite itens cadastrados no estoque do almoxarifado."
          />
          <TipoCard
            active={categoria === 'ferramentas'}
            onClick={() => handleSetCategoria('ferramentas')}
            pill="Ferramentas"
            icon={<Wrench size={32} strokeWidth={2.2} />}
            titulo="Ferramenta / Equipamento"
            descricao="Retirada ou reserva de ferramentas e equipamentos."
          />
          <TipoCard
            active={categoria === 'frota'}
            onClick={() => handleSetCategoria('frota')}
            pill="Uso de Frota"
            icon={<Truck size={32} strokeWidth={2.2} />}
            titulo="Carro / Frota"
            descricao="Solicite veículo da frota para operações em obra."
          />
        </section>

        <form onSubmit={enviar}>
          {/* Dados da Solicitação */}
          <section className={styles.section}>
            <h4 className={styles.h4}>Dados da Solicitação</h4>

            <div className="flex flex-col gap-2.5 mb-4">
              <label className={styles.label}>Obra *</label>
              <select className={styles.input} value={obra} onChange={(e) => setObra(e.target.value)} style={selectFieldStyle} required>
                <option value="" style={selectOptionStyle}>Selecione a obra</option>
                {obras.map((o) => <option key={o} value={o} style={selectOptionStyle}>{o}</option>)}
                <option value="Outro" style={selectOptionStyle}>Outro</option>
              </select>
              {obra === 'Outro' && (
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Digite o nome da obra"
                  value={obraOutro}
                  onChange={(e) => setObraOutro(e.target.value)}
                />
              )}
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 mb-4">
              <div className="flex flex-col gap-2.5">
                <label className={styles.label}>Seu nome *</label>
                <input
                  type="text"
                  className={styles.input}
                  placeholder="Nome completo"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-2.5">
                <label className={styles.label}>WhatsApp *</label>
                <input
                  type="tel"
                  className={styles.input}
                  placeholder="(11) 99999-9999"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-2.5 mb-4">
              <label className={styles.label}>Cargo do Solicitante *</label>
              <select className={styles.input} value={cargo} onChange={(e) => setCargo(e.target.value)} style={selectFieldStyle} required>
                <option value="" style={selectOptionStyle}>Selecione o cargo</option>
                {CARGOS.map((c) => (
                  <option key={c} value={c} style={selectOptionStyle}>{c}</option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              <div className="flex flex-col gap-2.5">
                <label className={styles.label}>Data da Solicitação *</label>
                <input type="text" className={styles.input + ' cursor-not-allowed opacity-80'} value={dataSolicitacao} readOnly />
              </div>
              <div className="flex flex-col gap-2.5">
                <label className={styles.label}>{categoria === 'frota' ? 'Data de uso / retirada *' : 'Prazo Desejado'}</label>
                <input
                  type="datetime-local"
                  step="60"
                  min={minPrazo}
                  className={styles.input}
                  value={prazo}
                  required={categoria === 'frota'}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v && v < minPrazo) {
                      setPrazo(minPrazo);
                    } else {
                      setPrazo(v);
                    }
                  }}
                />
              </div>
            </div>

            {(categoria === 'frota' || categoria === 'ferramentas') && (
              <div className="mt-4 flex flex-col gap-2.5">
                <label className={styles.label}>
                  {categoria === 'frota' ? 'Data de devolução *' : 'Data prevista de devolução'}
                </label>
                <input
                  type="datetime-local"
                  step="60"
                  min={prazo || minPrazo}
                  className={styles.input}
                  value={devolucaoFrota}
                  onChange={(e) => {
                    const v = e.target.value;
                    const minDevolucao = prazo || minPrazo;
                    if (v && v < minDevolucao) {
                      setDevolucaoFrota(minDevolucao);
                    } else {
                      setDevolucaoFrota(v);
                    }
                  }}
                  required={categoria === 'frota'}
                />
                <p className="m-0 text-[#89a2e2] text-[0.85rem]">
                  {categoria === 'frota'
                    ? 'Informe quando o veículo será devolvido. Pode ser outro dia.'
                    : 'Quando você pretende devolver a ferramenta. Pode deixar em branco se ainda não souber.'}
                </p>
              </div>
            )}

            {categoria !== 'frota' && (
              <div className="mt-4 flex flex-col gap-2.5">
                <label className={styles.label}>Entrega na obra?</label>
                <select
                  className={styles.input}
                  value={entregaSolicitada ? 'sim' : 'nao'}
                  onChange={(e) => setEntregaSolicitada(e.target.value === 'sim')}
                  style={selectFieldStyle}
                >
                  <option value="nao" style={selectOptionStyle}>Não, apenas separar/retirar</option>
                  <option value="sim" style={selectOptionStyle}>Sim, precisa entregar na obra</option>
                </select>
                <p className="m-0 text-[#89a2e2] text-[0.85rem]">
                  Se marcar sim, o rastreio mostra a fase "A caminho" antes de receber.
                </p>
              </div>
            )}
          </section>

          {/* Detalhes da Requisição */}
          <section className={styles.section}>
            <h4 className={styles.h4}>Detalhes da Requisição</h4>

            <div className="flex flex-col gap-3 mb-4">
              <label className={styles.label}>
                {categoria === 'frota' ? 'Veículos da Requisição' : 'Itens da Requisição'}
                <span className="ml-2 normal-case font-semibold text-[#89a2e2] text-[0.8rem]">
                  ({categoria === 'insumos'
                    ? `${insumos.length} itens cadastrados`
                    : categoria === 'ferramentas'
                    ? `${ferramentas.length} ferramentas cadastradas`
                    : `${veiculos.length} veículos ativos`})
                </span>
              </label>

              <div className="flex flex-col gap-3">
                {itens.map((linha) => (
                  <ItemRow
                    key={linha.uid}
                    linha={linha}
                    categoria={categoria}
                    insumos={insumos}
                    ferramentas={ferramentas}
                    veiculos={veiculos}
                    veiculosOcupados={veiculosOcupados}
                    loading={loadingCatalogos}
                    onChange={(patch) => updateLinha(linha.uid, patch)}
                    onRemove={() => removeLinha(linha.uid)}
                  />
                ))}
              </div>

              <div className="flex gap-2.5 mt-3">
                <button type="button" className={styles.btnSmall} onClick={addLinha}>
                  <Plus size={15} />
                  {categoria === 'frota' ? 'Adicionar veículo' : 'Adicionar item'}
                </button>
              </div>

              <div className="text-[#b8c5eb] text-[0.9rem] leading-[1.5] mt-2">
                Cada linha é buscada diretamente do cadastro de{' '}
                <strong className="text-white">
                  {categoria === 'insumos' ? 'Insumos' : categoria === 'ferramentas' ? 'Ferramentas' : 'Frota'}
                </strong>
                . Cadastre novos itens nas páginas correspondentes para que apareçam aqui.
              </div>
            </div>

            <div className="flex flex-col gap-2.5 mb-4">
              <label className={styles.label}>Prioridade</label>
              <select className={styles.input} value={prioridade} onChange={(e) => setPrioridade(e.target.value as 'normal' | 'urgente' | 'baixo')} style={selectFieldStyle}>
                <option value="normal" style={selectOptionStyle}>Prioridade Normal</option>
                <option value="urgente" style={selectOptionStyle}>Alta Prioridade (Urgente)</option>
                <option value="baixo" style={selectOptionStyle}>Baixa Prioridade</option>
              </select>
            </div>

            {prioridade === 'urgente' && (
              <div className="flex flex-col gap-2.5 mb-4">
                <label className={styles.label}>Justificativa da Urgência *</label>
                <textarea
                  className={styles.input + ' min-h-[100px] resize-y'}
                  placeholder="Explique por que é urgente"
                  value={justificativaUrgencia}
                  onChange={(e) => setJustificativaUrgencia(e.target.value)}
                />
              </div>
            )}

            <div className="flex flex-col gap-2.5">
              <label className={styles.label}>Observação</label>
              <textarea
                className={styles.input + ' min-h-[100px] resize-y'}
                placeholder="Observação (opcional)"
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
              />
            </div>
          </section>

          {/* Anexos */}
          <section className={styles.section}>
            {camMode && (
              <CameraModal
                mode={camMode}
                onCapture={(file) => setAnexos((prev) => [...prev, file])}
                onClose={() => setCamMode(null)}
              />
            )}
            <h4 className={styles.h4}>
              {categoria === 'frota' ? 'Áudio (opcional)' : 'Anexos e Registros'}
            </h4>
            <div className="flex gap-2.5 flex-wrap mb-3.5">
              {categoria !== 'frota' && (
                <>
                  <label className={styles.btnSmall + ' cursor-pointer'}>
                    <Paperclip size={15} />
                    Anexar arquivos
                    <input ref={fileInputRef} type="file" className="hidden" multiple accept="image/*,video/*,audio/*,application/pdf" onChange={(e) => handleFiles(e.target.files)} />
                  </label>
                  <button type="button" className={styles.btnSmall} onClick={() => setCamMode('photo')}>
                    <Camera size={15} />
                    Tirar foto
                  </button>
                  <button type="button" className={styles.btnSmall} onClick={() => setCamMode('video')}>
                    <Video size={15} />
                    Gravar vídeo
                  </button>
                </>
              )}
              {!gravando ? (
                <button type="button" className={styles.btnSmall} onClick={iniciarGravacao}><Mic size={15} />Gravar áudio</button>
              ) : (
                <button type="button" onClick={pararGravacao} className="inline-flex items-center gap-2 font-extrabold py-2.5 px-4 rounded-[14px] border border-[rgba(255,107,107,0.5)] bg-[rgba(255,107,107,0.12)] text-[#ff9797] text-[0.9rem] cursor-pointer animate-pulse">
                  <StopCircle size={15} />Parar gravação
                </button>
              )}
            </div>
            {audioUrl && (
              <div className="mb-3.5 flex items-center gap-3 px-4 py-3 rounded-[14px] border border-[rgba(113,154,255,0.3)] bg-[rgba(8,24,64,0.3)]">
                <Mic size={16} className="text-[#5c9bff] shrink-0" />
                <audio controls src={audioUrl} className="flex-1 h-8" />
                <button type="button" onClick={() => { setAudioUrl(''); setAnexos((prev) => prev.filter((f) => !f.name.startsWith('audio-'))); }} className="text-[#ff9797] text-[0.78rem] shrink-0">remover</button>
              </div>
            )}

            {categoria !== 'frota' && (
              <div
                className="rounded-[18px] border border-dashed border-[rgba(113,154,255,0.45)] bg-[rgba(8,24,64,0.24)] px-5 py-8 text-center text-[#b8c5eb]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
              >
                {anexos.length === 0
                  ? 'Arraste fotos, vídeos, áudios ou PDFs aqui, ou use o botão acima.'
                  : `${anexos.length} arquivo${anexos.length > 1 ? 's' : ''} selecionado${anexos.length > 1 ? 's' : ''}.`}
              </div>
            )}

            {anexos.length > 0 && (
              <div className="grid gap-3 mt-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
                {anexos.map((f, i) => (
                  <div key={i} className="rounded-[14px] border border-[rgba(113,154,255,0.28)] bg-[rgba(8,24,64,0.32)] p-3 flex flex-col gap-2">
                    <div className="text-[0.8rem] text-[#b8c5eb] truncate" title={f.name}>{f.name}</div>
                    <div className="text-[0.72rem] text-[#89a2e2]">{(f.size / 1024).toFixed(1)} KB</div>
                    <button type="button" className={styles.btnDanger + ' text-[0.8rem] py-2'} onClick={() => removeAnexo(i)}>Remover</button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {cargo && cargo !== 'Engenheiro' && cargo !== 'Almoxarifado' && (
            <div className="px-5 py-4 rounded-[18px] bg-[rgba(255,202,87,0.12)] border border-[rgba(255,202,87,0.35)] text-[#ffca57] text-[0.95rem] mb-5">
              Atenção: esta solicitação será encaminhada para aprovação do responsável antes do atendimento.
            </div>
          )}

          {erro && (
            <div className="px-5 py-4 rounded-[18px] bg-[rgba(255,107,107,0.12)] border border-[rgba(255,107,107,0.35)] text-[#ff9797] mb-5">
              {erro}
            </div>
          )}

          {sucesso && (
            <div className="px-5 py-4 rounded-[18px] bg-[rgba(54,196,133,0.15)] border border-[rgba(54,196,133,0.4)] text-[#6be3a5] mb-5 flex items-center gap-2 flex-wrap">
              <CheckCircle2 size={18} />
              <span>Requisição enviada com sucesso! O almoxarifado foi notificado.</span>
              {posicaoFila != null && (
                <span className="ml-2 px-3 py-1 rounded-full bg-[rgba(92,155,255,0.18)] border border-[rgba(92,155,255,0.45)] text-[#5c9bff] font-extrabold text-[0.85rem]">
                  Posição na fila: #{posicaoFila}
                </span>
              )}
            </div>
          )}

          <div className="flex justify-end mt-6">
            <button
              type="submit"
              disabled={salvando}
              className={styles.btnPrimary + ' py-4 px-8 text-[1.05rem] disabled:opacity-50'}
            >
              {salvando ? 'Enviando...' : 'Enviar Solicitação'}
            </button>
          </div>
        </form>

        <p className="text-center text-[#4f6ab5] text-xs mt-8">BiasíHub · Almoxarifado · Biasi Engenharia e Instalações</p>
      </div>
    </div>
  );
}
