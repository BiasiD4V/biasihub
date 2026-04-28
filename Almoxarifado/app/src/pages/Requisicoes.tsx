import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../infrastructure/supabase/client';
import type { Requisicao, StatusRequisicao } from '../domain/entities/Requisicao';
import { useAuth } from '../context/AuthContext';
import { Camera, Check, CheckCircle2, ChevronDown, ChevronUp, ClipboardList, Clock, Mic, Package, Paperclip, Play, Plus, ShoppingCart, StopCircle, Truck, Video, Wrench, X, XCircle } from 'lucide-react';
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
  // múltiplas fotos por item
  fotos: File[];
  fotosUrls: string[];
  // metadados adicionais p/ rastreabilidade no jsonb
  marca?: string | null;
  categoria?: string | null;
  grupo?: string | null;
  placa?: string | null;
  modelo?: string | null;
  usoFrota?: string | null;
};

const STORAGE_BUCKET = 'requisicoes';

const OBRAS_PADRAO: string[] = [];

const CARGOS = ['Almoxarifado', 'Engenheiro', 'Encarregado', 'Técnico', 'Administrativo', 'Compras'];

const UNIDADES = ['un', 'pç', 'cx', 'm', 'm²', 'm³', 'kg', 'L', 'mL', 'rolo', 'par', 'saco', 'barra', 'jogo'];

const STATUS_CONFIG: Record<StatusRequisicao, { label: string; cor: string; bg: string }> = {
  pendente: { label: 'Aguardando', cor: '#ffca57', bg: 'rgba(255,202,87,0.15)' },
  aprovada: { label: 'Em separação', cor: '#5c9bff', bg: 'rgba(92,155,255,0.15)' },
  entregue: { label: 'Concluído', cor: '#36c485', bg: 'rgba(54,196,133,0.18)' },
  cancelada: { label: 'Cancelada', cor: '#ff6b6b', bg: 'rgba(255,107,107,0.15)' },
};

const COLUNAS: StatusRequisicao[] = ['pendente', 'aprovada', 'entregue'];

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

function formatDataBR(d: string) {
  try {
    return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return d;
  }
}

/* ======================================================================
   ESTILOS (inspirados no HTML do mock)
   ====================================================================== */

const styles = {
  page: 'min-h-full w-full bg-gradient-to-b from-[#071b49] to-[#0b2260] text-[#f4f7ff] font-[Inter,Segoe_UI,Arial,sans-serif]',
  container: 'w-full max-w-[1240px] mx-auto px-4 pt-4 pb-10',
  card:
    'rounded-[28px] border border-[rgba(113,154,255,0.28)] bg-[linear-gradient(180deg,rgba(24,55,120,0.92),rgba(20,48,111,0.95))] shadow-[0_22px_45px_rgba(0,0,0,0.28)]',
  section:
    'rounded-[28px] border border-[rgba(113,154,255,0.28)] bg-[linear-gradient(180deg,rgba(24,55,120,0.92),rgba(20,48,111,0.95))] shadow-[0_22px_45px_rgba(0,0,0,0.28)] p-6 mb-5',
  input:
    'w-full rounded-[18px] border border-[#3560b8] bg-[rgba(10,30,77,0.32)] text-[#f4f7ff] px-4 py-4 outline-none placeholder:text-[#b8c5eb] min-h-[54px] focus:border-[#5c89ff] transition-colors',
  inputCompact:
    'w-full rounded-[14px] border border-[#3560b8] bg-[rgba(10,30,77,0.32)] text-[#f4f7ff] px-3 py-3 outline-none placeholder:text-[#b8c5eb] min-h-[48px] focus:border-[#5c89ff] transition-colors',
  label: 'font-extrabold uppercase text-[0.9rem] text-[#f4f7ff] tracking-wide',
  btn:
    'inline-flex items-center justify-center gap-2 font-extrabold py-3 px-5 rounded-[18px] border border-[rgba(113,154,255,0.28)] bg-white/[0.03] text-[#f4f7ff] cursor-pointer transition-all hover:-translate-y-[1px] hover:bg-white/[0.06]',
  btnPrimary:
    'inline-flex items-center justify-center gap-2 font-extrabold py-3 px-5 rounded-[18px] border-transparent bg-[linear-gradient(180deg,#4b7bf0,#3d6fe0)] text-white shadow-[0_10px_24px_rgba(52,104,223,0.35)] cursor-pointer transition-all hover:-translate-y-[1px]',
  btnSmall:
    'inline-flex items-center justify-center gap-2 font-extrabold py-2.5 px-4 rounded-[14px] border border-[rgba(113,154,255,0.28)] bg-white/[0.03] text-[#f4f7ff] text-[0.9rem] cursor-pointer transition-all hover:bg-white/[0.06]',
  btnDanger:
    'inline-flex items-center justify-center gap-2 font-extrabold py-2.5 px-4 rounded-[14px] border border-[rgba(255,107,107,0.4)] bg-[rgba(255,107,107,0.08)] text-[#ff9797] text-[0.9rem] cursor-pointer transition-all hover:bg-[rgba(255,107,107,0.15)]',
  h4: 'text-[#4f80f5] font-extrabold uppercase tracking-[0.1em] text-[1.15rem] m-0 mb-5 pb-3 border-b border-white/50',
  pill:
    'inline-flex items-center px-3.5 py-2 rounded-full bg-[rgba(10,30,77,0.45)] font-extrabold text-[0.9rem] uppercase',
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
    if (!valueId) {
      setQuery('');
      return;
    }
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
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (valueId) onSelect(null);
        }}
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
   LINHA DE ITEM (adaptativa por categoria)
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

  // Item especial pra quando a pessoa não sabe o nome/código.
  // A foto vira a referência principal e o almoxarifado identifica no interno.
  const optOutro: AutocompleteItem = {
    id: '__OUTRO__',
    titulo: '➕ Outro / não sei o nome',
    sub: 'Tire uma foto e o almoxarifado identifica',
  };

  const autoItems = useMemo<AutocompleteItem[]>(() => {
    if (categoria === 'insumos') {
      const arr: AutocompleteItem[] = [optOutro];
      insumos.forEach((i) => arr.push({
        id: i.id,
        titulo: `${i.codigo} - ${normalizeDisplayText(i.descricao)}`,
        sub: `${i.unidade || 'un'}${i.grupo ? ` • ${i.grupo}` : ''}`,
      }));
      return arr;
    }
    if (categoria === 'ferramentas') {
      const arr: AutocompleteItem[] = [optOutro];
      ferramentas.forEach((f) => arr.push({
        id: f.id,
        titulo: `${f.codigo} - ${normalizeDisplayText(f.descricao)}`,
        sub: `${f.marca || ''}${f.marca ? ' • ' : ''}${f.unidade || 'un'}${f.estoque_atual != null ? ` • estoque ${f.estoque_atual}` : ''}`,
      }));
      return arr;
    }
    return veiculos.map((v) => {
      const ocupado = veiculosOcupados.has(v.id);
      return {
        id: v.id,
        titulo: `${v.placa ? v.placa + ' - ' : ''}${v.modelo}`,
        sub: ocupado ? 'Indisponível neste período' : (v.marca || ''),
        disabled: ocupado,
      };
    });
  }, [categoria, insumos, ferramentas, veiculos, veiculosOcupados]);

  function handleSelect(item: AutocompleteItem | null) {
    if (!item) {
      onChange({ itemId: null, codigo: null, descricao: '', unidade: linha.unidade });
      return;
    }
    if (item.id === '__OUTRO__') {
      onChange({ itemId: '__OUTRO__', codigo: null, descricao: '', unidade: linha.unidade || 'un' });
      return;
    }
    if (categoria === 'insumos') {
      const raw = insumos.find((i) => i.id === item.id);
      if (!raw) return;
      onChange({
        itemId: raw.id,
        codigo: raw.codigo,
        descricao: normalizeDisplayText(raw.descricao),
        unidade: raw.unidade || linha.unidade || 'un',
        grupo: raw.grupo,
      });
    } else if (categoria === 'ferramentas') {
      const raw = ferramentas.find((f) => f.id === item.id);
      if (!raw) return;
      onChange({
        itemId: raw.id,
        codigo: raw.codigo,
        descricao: normalizeDisplayText(raw.descricao),
        unidade: raw.unidade || linha.unidade || 'un',
        marca: raw.marca,
        categoria: raw.categoria,
      });
    } else {
      const raw = veiculos.find((v) => v.id === item.id);
      if (!raw) return;
      if (veiculosOcupados.has(raw.id)) return;
      onChange({
        itemId: raw.id,
        codigo: raw.placa,
        descricao: `${raw.placa ? raw.placa + ' - ' : ''}${raw.modelo}`,
        unidade: 'uso',
        placa: raw.placa,
        modelo: raw.modelo,
        marca: raw.marca,
      });
    }
  }

  const mostrarUnidade = categoria === 'insumos';
  const isFrota = categoria === 'frota';
  const gridClass = isFrota
    ? 'grid gap-3 items-start grid-cols-1 sm:grid-cols-[minmax(0,2.2fr)_52px]'
    : mostrarUnidade
    ? 'grid gap-3 items-start grid-cols-1 sm:grid-cols-[minmax(0,2.2fr)_120px_180px_52px]'
    : 'grid gap-3 items-start grid-cols-1 sm:grid-cols-[minmax(0,2.2fr)_120px_52px]';

  const [camOpen, setCamOpen] = useState(false);

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
        {/* Descrição (autocomplete) */}
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
        {/* Unidade — apenas para insumos */}
        {mostrarUnidade && (
          <div>
            <select
              className={styles.inputCompact}
              value={linha.unidade}
              onChange={(e) => onChange({ unidade: e.target.value })}
              style={selectFieldStyle}
            >
              {UNIDADES.map((u) => (
                <option key={u} value={u} style={selectOptionStyle}>
                  {u}
                </option>
              ))}
              {linha.unidade && !UNIDADES.includes(linha.unidade) && (
                <option value={linha.unidade} style={selectOptionStyle}>
                  {linha.unidade}
                </option>
              )}
            </select>
          </div>
        )}
        {/* Remover */}
        <button
          type="button"
          onClick={() => {
            if (deleteArmed) onRemove();
            else {
              setDeleteArmed(true);
              setTimeout(() => setDeleteArmed(false), 2500);
            }
          }}
          className={`w-[52px] h-[52px] rounded-[14px] border cursor-pointer font-extrabold text-xl transition ${
            deleteArmed
              ? 'border-[rgba(255,107,107,0.6)] bg-[rgba(255,107,107,0.12)] text-[#ff6b6b]'
              : 'border-[rgba(113,154,255,0.28)] bg-white/[0.03] text-[#f4f7ff]'
          }`}
          title={deleteArmed ? 'Clique de novo para confirmar' : 'Remover item'}
        >
          <X size={18} className="mx-auto" />
        </button>
      </div>
      <div className="mt-3">
        {isFrota ? (
          <div className="grid gap-3 md:grid-cols-2">
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
              <option value="" style={selectOptionStyle}>
                Para que vai usar? *
              </option>
              <option value="visitar_obra" style={selectOptionStyle}>
                Visitar obra
              </option>
              <option value="outros" style={selectOptionStyle}>
                Outros
              </option>
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
      {/* Fotos do item — múltiplas. Em frota não exibimos foto de item. */}
      {!isFrota && (
        <div className="mt-2 flex items-start gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => setCamOpen(true)}
            className={styles.btnSmall + ' text-[0.8rem] py-1.5'}
          >
            <Camera size={13} />
            {linha.fotosUrls.length > 0 ? `Adicionar foto (${linha.fotosUrls.length})` : 'Foto do item'}
          </button>
          {linha.fotosUrls.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              {linha.fotosUrls.map((url, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={url}
                    alt={`foto-${idx}`}
                    className="w-12 h-12 object-cover rounded-[10px] border border-[rgba(113,154,255,0.4)]"
                  />
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
   TIPO-CARD (Insumos / Ferramentas / Frota)
   ====================================================================== */

function TipoCard({
  active,
  onClick,
  pill,
  icon,
  titulo,
  descricao,
}: {
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

export function Requisicoes() {
  const { usuario } = useAuth();
  const isGestor = usuario?.papel === 'gestor' || usuario?.papel === 'admin' || usuario?.papel === 'dono';

  const [view, setView] = useState<'form' | 'kanban'>('form');
  const [categoria, setCategoria] = useState<CategoriaType>('insumos');

  /* dados da solicitação */
  const [obras, setObras] = useState<string[]>(OBRAS_PADRAO);
  const [obra, setObra] = useState('');
  const [obraOutro, setObraOutro] = useState('');
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

  // Valor mínimo para o campo "Prazo Desejado" (impede datas passadas)
  const minPrazo = useMemo(() => {
    const d = new Date();
    d.setSeconds(0, 0);
    // Ajusta para o timezone local no formato datetime-local (yyyy-MM-ddTHH:mm)
    const off = d.getTimezoneOffset();
    const local = new Date(d.getTime() - off * 60_000);
    return local.toISOString().slice(0, 16);
  }, [dataSolicitacao]);
  const [prazo, setPrazo] = useState('');
  const [devolucaoFrota, setDevolucaoFrota] = useState('');
  const [prioridade, setPrioridade] = useState<'normal' | 'urgente' | 'baixo'>('normal');
  const [entregaSolicitada, setEntregaSolicitada] = useState(false);
  const [observacao, setObservacao] = useState('');
  const [justificativaUrgencia, setJustificativaUrgencia] = useState('');

  /* itens da requisição */
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

  /* câmera (foto/vídeo) no bloco Anexos */
  const [camMode, setCamMode] = useState<'photo' | 'video' | null>(null);

  /* kanban */
  const [reqs, setReqs] = useState<Requisicao[]>([]);
  const [loadingReqs, setLoadingReqs] = useState(false);
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set());
  // Atendimento parcial: { requisicao_id: { item_index: qtd_atendida_string } }
  const [qtdAtendidaDraft, setQtdAtendidaDraft] = useState<Record<string, Record<number, string>>>({});
  const [mostrarCompras, setMostrarCompras] = useState(false);

  /* envio */
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const [posicaoFila, setPosicaoFila] = useState<number | null>(null);

  /* ---------- Carrega catálogos ---------- */
  useEffect(() => {
    async function carregar() {
      setLoadingCatalogos(true);
      try {
        const [obrasRes, insumosRes, ferrRes, veicRes] = await Promise.all([
          supabase.from('obras').select('nome').order('nome'),
          supabase
            .from('itens_almoxarifado')
            .select('id,codigo,descricao,unidade,grupo')
            .eq('ativo', true)
            .eq('tipo', 'material')
            .order('descricao')
            .limit(5000),
          supabase
            .from('itens_almoxarifado')
            .select('id,codigo,descricao,unidade,marca,categoria,estoque_atual')
            .eq('ativo', true)
            .eq('tipo', 'ferramenta')
            .order('descricao'),
          supabase
            .from('veiculos')
            .select('id,placa,modelo,marca')
            .eq('ativo', true)
            .order('modelo'),
        ]);

        if (obrasRes.data && obrasRes.data.length > 0) {
          setObras(obrasRes.data.map((o: { nome: string }) => o.nome));
        }
        setInsumos((insumosRes.data || []) as InsumoOpt[]);
        setFerramentas((ferrRes.data || []) as FerramentaOpt[]);
        setVeiculos((veicRes.data || []) as VeiculoOpt[]);
      } catch (err) {
        console.error('[Requisições] erro ao carregar catálogos:', err);
      } finally {
        setLoadingCatalogos(false);
      }
    }
    void carregar();
  }, []);

  /* ---------- Kanban ---------- */
  async function carregarReqs() {
    setLoadingReqs(true);
    try {
      const { data, error } = await supabase
        .from('requisicoes_almoxarifado')
        .select('*, solicitante:usuarios!requisicoes_almoxarifado_solicitante_id_fkey(nome)')
        .order('criado_em', { ascending: false });
      if (error) throw error;
      setReqs((data || []) as unknown as Requisicao[]);
    } catch (err) {
      console.error('[Requisições] erro ao carregar kanban:', err);
      setReqs([]);
    } finally {
      setLoadingReqs(false);
    }
  }

  useEffect(() => {
    if (view === 'kanban') carregarReqs();
  }, [view]);

  // Realtime: quando o almoxarifado mexer em alguma requisição, atualiza kanban na hora
  useEffect(() => {
    if (view !== 'kanban') return;
    const channel = supabase
      .channel('requisicoes-kanban-vercel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'requisicoes_almoxarifado' },
        () => {
          void carregarReqs();
        }
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [view]);

  /* ---------- Carros ocupados no período (frota) ----------
     Inclui agendamentos ativos + manutenções (com ou sem previsão) +
     acidentes sem data_resolucao. Mesma lógica do RequisicaoPublica.
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
          supabase
            .from('manutencoes_veiculo')
            .select('veiculo_id, data, data_saida')
            .lte('data', fim),
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
          if (!row.data_saida || row.data_saida >= inicio) {
            if (row?.veiculo_id) ids.add(String(row.veiculo_id));
          }
        }
        for (const row of acidRes.data || []) {
          if (row?.veiculo_id) ids.add(String(row.veiculo_id));
        }
        setVeiculosOcupados(ids);
      } catch (err) {
        console.warn('[Requisicoes] exceção em ocupados', err);
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
    setItens([
      { uid: uid(), itemId: null, codigo: null, descricao: '', quantidade: '1', unidade: unidadeDefault, observacao: '', fotos: [], fotosUrls: [], usoFrota: null },
    ]);
  }

  /* ---------- Operações sobre itens ---------- */
  function addLinha() {
    setItens((prev) => [
      ...prev,
      {
        uid: uid(),
        itemId: null,
        codigo: null,
        descricao: '',
        quantidade: '1',
        unidade: categoria === 'frota' ? 'uso' : 'un',
        observacao: '',
        fotos: [],
        fotosUrls: [],
        usoFrota: null,
      },
    ]);
  }

  function updateLinha(u: string, patch: Partial<ItemLinha>) {
    setItens((prev) => prev.map((l) => (l.uid === u ? { ...l, ...patch } : l)));
  }

  function removeLinha(u: string) {
    setItens((prev) => (prev.length > 1 ? prev.filter((l) => l.uid !== u) : prev));
  }

  /* ---------- Anexos ---------- */
  function handleFiles(files: FileList | null) {
    if (!files) return;
    setAnexos((prev) => [...prev, ...Array.from(files)]);
  }

  function removeAnexo(i: number) {
    setAnexos((prev) => prev.filter((_, idx) => idx !== i));
  }

  /* ---------- Áudio ---------- */
  async function iniciarGravacao() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setAnexos((prev) => [...prev, new File([blob], `audio-${Date.now()}.webm`, { type: 'audio/webm' })]);
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setGravando(true);
    } catch {
      setErro('Não foi possível acessar o microfone.');
    }
  }

  function pararGravacao() {
    mediaRecorderRef.current?.stop();
    setGravando(false);
  }

  /* ---------- Enviar ---------- */
  async function enviar(e?: React.FormEvent) {
    e?.preventDefault();
    setErro('');

    const obraFinal = obra === 'Outro' ? obraOutro.trim() : obra;
    if (!obraFinal) return setErro('Selecione a obra.');
    if (!cargo) return setErro('Selecione o cargo.');
    if (itens.length === 0) return setErro('Adicione ao menos um item.');

    // Item válido: tem itemId e quantidade. Para "__OUTRO__", a descrição pode
    // ficar vazia porque a identificação será feita pela foto.
    const itensValidos = itens.filter((l) => {
      if (!l.itemId || Number(l.quantidade) <= 0) return false;
      if (l.itemId === '__OUTRO__') return true;
      return l.descricao.trim().length > 0;
    });
    if (itensValidos.length === 0) {
      return setErro(
        categoria === 'insumos'
          ? 'Selecione ao menos um item do estoque com quantidade valida.'
          : categoria === 'ferramentas'
          ? 'Selecione ao menos uma ferramenta do cadastro com quantidade válida.'
          : 'Selecione ao menos um veículo da frota.'
      );
    }
    if (prioridade === 'urgente' && !justificativaUrgencia.trim()) {
      return setErro('Justifique a urgência.');
    }

    const itensSemFoto = categoria === 'frota' ? [] : itensValidos.filter((l) => (l.fotos?.length ?? 0) === 0);
    if (itensSemFoto.length > 0) {
      return setErro('Foto do item é obrigatória em todos os itens da requisição.');
    }

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

    setSalvando(true);
    try {
      const tipoJson = categoria === 'insumos' ? 'material' : categoria === 'ferramentas' ? 'ferramenta' : 'carro';

      // ---------- Upload de fotos por item e anexos gerais para o Storage ----------
      async function tryUpload(file: File, prefix: string): Promise<string | null> {
        try {
          const safeName = file.name.replace(/[^\w.\-]+/g, '_');
          const path = `${usuario!.id}/${Date.now()}_${prefix}_${safeName}`;
          const { error: upErr } = await supabase.storage
            .from(STORAGE_BUCKET)
            .upload(path, file, { upsert: false, contentType: file.type || undefined });
          if (upErr) {
            console.warn('[Requisições] upload falhou', upErr);
            return null;
          }
          const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
          return data.publicUrl || null;
        } catch (err) {
          console.warn('[Requisições] upload exception', err);
          return null;
        }
      }

      const itensPayload = await Promise.all(
        itensValidos.map(async (l, idx) => {
          const urls = (
            await Promise.all(l.fotos.map((f, i) => tryUpload(f, `item${idx}_${i}`)))
          ).filter((u): u is string => !!u);
          if (categoria !== 'frota' && l.fotos.length > 0 && urls.length !== l.fotos.length) {
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
            // metadados de atendimento (preenchidos no almoxarifado)
            quantidade_atendida: null,
            faltante: null,
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
      ]
        .filter(Boolean)
        .join(' | ');

      const { data: inserted, error } = await supabase
        .from('requisicoes_almoxarifado')
        .insert({
          solicitante_id: usuario!.id,
          obra: obraFinal,
          observacao: obsFinal,
          itens: itensPayload,
        })
        .select('id, criado_em')
        .single();

      if (error) throw error;

      // ---------- Calcular posição na fila ----------
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

      setSucesso(true);
      // reset
      setObra('');
      setObraOutro('');
      setCargo('');
      setPrazo('');
      setDevolucaoFrota('');
      setPrioridade('normal');
      setEntregaSolicitada(false);
      setObservacao('');
      setJustificativaUrgencia('');
      setAnexos([]);
      setAudioUrl('');
      setItens([
        {
          uid: uid(),
          itemId: null,
          codigo: null,
          descricao: '',
          quantidade: '1',
          unidade: categoria === 'frota' ? 'uso' : 'un',
          observacao: '',
          fotos: [],
          fotosUrls: [],
          usoFrota: null,
        },
      ]);
      setTimeout(() => setSucesso(false), 5000);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setErro(msg);
    } finally {
      setSalvando(false);
    }
  }

  async function atualizarStatus(id: string, status: StatusRequisicao) {
    const updates: Record<string, unknown> = { status };
    if (status === 'aprovada') {
      updates.data_aprovacao = new Date().toISOString();
      updates.aprovado_por_id = usuario!.id;
    }
    await supabase.from('requisicoes_almoxarifado').update(updates).eq('id', id);
    setReqs((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  }

  function toggleExpandir(id: string) {
    setExpandidas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // inicializa rascunho de qtd atendida com qtd solicitada
    setQtdAtendidaDraft((prev) => {
      if (prev[id]) return prev;
      const req = reqs.find((r) => r.id === id);
      if (!req) return prev;
      const itensRaw = (Array.isArray(req.itens) ? req.itens : []) as unknown as Record<string, unknown>[];
      const map: Record<number, string> = {};
      itensRaw.forEach((it, i) => {
        const atendida = it.quantidade_atendida as number | null | undefined;
        const solicitada = it.quantidade as number | undefined;
        map[i] = String(atendida ?? solicitada ?? '');
      });
      return { ...prev, [id]: map };
    });
  }

  async function iniciarSeparacao(id: string) {
    const nowIso = new Date().toISOString();
    // Anota em colunas (se existirem) e também dentro de `observacao` (failsafe)
    const req = reqs.find((r) => r.id === id);
    const obsAtual = (req?.observacao as string) || '';
    const obsComSep = obsAtual.includes('separacao_iniciada:')
      ? obsAtual
      : `${obsAtual}${obsAtual ? ' | ' : ''}separacao_iniciada:${nowIso}|separador:${usuario!.id}`;
    const tentativa1: Record<string, unknown> = {
      iniciado_em: nowIso,
      separador_id: usuario!.id,
      observacao: obsComSep,
    };
    let { error } = await supabase.from('requisicoes_almoxarifado').update(tentativa1).eq('id', id);
    if (error) {
      // Fallback: colunas iniciado_em/separador_id podem não existir. Salva só em observacao.
      console.warn('[Requisições] fallback iniciarSeparacao:', error.message);
      const res = await supabase
        .from('requisicoes_almoxarifado')
        .update({ observacao: obsComSep })
        .eq('id', id);
      error = res.error;
    }
    if (error) {
      setErro('Não foi possível iniciar a separação.');
      return;
    }
    setReqs((prev) =>
      prev.map((r) => (r.id === id ? { ...r, iniciado_em: nowIso, separador_id: usuario!.id, observacao: obsComSep } : r))
    );
  }

  async function finalizarSeparacao(id: string) {
    const nowIso = new Date().toISOString();
    const req = reqs.find((r) => r.id === id);
    if (!req) return;
    const draft = qtdAtendidaDraft[id] || {};
    const itensRaw = (Array.isArray(req.itens) ? req.itens : []) as unknown as Record<string, unknown>[];
    let temParcial = false;
    const itensAtualizados = itensRaw.map((it, idx) => {
      const solicitada = Number(it.quantidade ?? 0);
      const rawAtendida = draft[idx];
      const atendida = rawAtendida === '' || rawAtendida == null ? solicitada : Number(rawAtendida);
      const falta = Math.max(0, solicitada - (isFinite(atendida) ? atendida : 0));
      if (falta > 0) temParcial = true;
      return {
        ...it,
        quantidade_atendida: isFinite(atendida) ? atendida : solicitada,
        faltante: falta,
      };
    });

    const obsAtual = (req.observacao as string) || '';
    const obsComFim = obsAtual.includes('separacao_finalizada:')
      ? obsAtual
      : `${obsAtual}${obsAtual ? ' | ' : ''}separacao_finalizada:${nowIso}${
          temParcial ? '|atendimento:parcial' : '|atendimento:total'
        }`;

    const payload: Record<string, unknown> = {
      status: 'entregue',
      itens: itensAtualizados,
      finalizado_em: nowIso,
      observacao: obsComFim,
    };
    let { error } = await supabase.from('requisicoes_almoxarifado').update(payload).eq('id', id);
    if (error) {
      console.warn('[Requisições] fallback finalizarSeparacao:', error.message);
      // Fallback sem coluna finalizado_em
      const { finalizado_em: _ignored, ...rest } = payload;
      void _ignored;
      const res = await supabase.from('requisicoes_almoxarifado').update(rest).eq('id', id);
      error = res.error;
    }
    if (error) {
      setErro('Não foi possível finalizar a separação.');
      return;
    }
    setReqs((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              status: 'entregue' as StatusRequisicao,
              itens: itensAtualizados as unknown as Requisicao['itens'],
              finalizado_em: nowIso,
              observacao: obsComFim,
            }
          : r
      )
    );
  }

  // Extrai timestamp de "separacao_iniciada:...", usado como fallback
  function extrairTimestamp(obs: string | undefined, chave: string): string | null {
    if (!obs) return null;
    const re = new RegExp(`${chave}:([^|]+)`);
    const m = obs.match(re);
    return m ? m[1].trim() : null;
  }

  function formatarDuracao(iniIso: string, fimIso: string): string {
    try {
      const ini = new Date(iniIso).getTime();
      const fim = new Date(fimIso).getTime();
      const ms = Math.max(0, fim - ini);
      const totalSec = Math.floor(ms / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      if (h > 0) return `${h}h ${m}min`;
      if (m > 0) return `${m}min ${s}s`;
      return `${s}s`;
    } catch {
      return '—';
    }
  }

  // Lista agregada para Compras: itens faltantes em requisições com atendimento parcial
  const listaCompras = useMemo(() => {
    const acc: Array<{
      codigo: string | null;
      descricao: string;
      unidade: string;
      faltante: number;
      obra: string;
      requisicao: string;
    }> = [];
    reqs.forEach((r) => {
      const itensRaw = (Array.isArray(r.itens) ? r.itens : []) as unknown as Record<string, unknown>[];
      itensRaw.forEach((it) => {
        const falta = Number(it.faltante ?? 0);
        if (falta > 0) {
          acc.push({
            codigo: (it.codigo as string) || null,
            descricao: (it.descricao as string) || (it.nome as string) || '',
            unidade: (it.unidade as string) || 'un',
            faltante: falta,
            obra: r.obra,
            requisicao: r.id,
          });
        }
      });
    });
    return acc;
  }, [reqs]);

  /* ======================================================================
     RENDER
     ====================================================================== */

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        {/* Topbar */}
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="m-0 mb-2 text-[2.2rem] font-extrabold tracking-[-0.02em]">Requisições</h1>
            <p className="m-0 opacity-90 text-base">Solicite materiais, ferramentas ou veículos da frota</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button type="button" onClick={() => setView('form')} className={view === 'form' ? styles.btnPrimary : styles.btn}>
              <Plus size={16} />
              Nova Requisição
            </button>
            <button type="button" onClick={() => setView('kanban')} className={view === 'kanban' ? styles.btnPrimary : styles.btn}>
              <ClipboardList size={16} />
              Gerenciar
            </button>
          </div>
        </div>

        {view === 'form' && (
          <>
            {/* Hero */}
            <section className={styles.card + ' p-8 mb-6'}>
              <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full border border-[#3560b8] bg-[rgba(7,22,64,0.28)] font-extrabold tracking-[0.08em] text-[0.9rem] mb-4 uppercase">
                <Package size={14} />
                Almoxarifado · Biasi Engenharia
              </span>
              <h2 className="m-0 mb-3 text-[2.6rem] leading-[1.05] tracking-[-0.03em]">Ficha de Requisição</h2>
              <p className="m-0 opacity-90 max-w-[760px] text-base leading-[1.45]">
                Solicite materiais, ferramentas ou veículos da frota. Escolha a categoria abaixo, preencha os campos e anexe fotos ou
                documentos diretamente no próprio formulário.
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
                    <option value="" style={selectOptionStyle}>
                      Selecione a obra
                    </option>
                    {obras.map((o) => (
                      <option key={o} value={o} style={selectOptionStyle}>
                        {o}
                      </option>
                    ))}
                    <option value="Outro" style={selectOptionStyle}>
                      Outro
                    </option>
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

                <div className="flex flex-col gap-2.5 mb-4">
                  <label className={styles.label}>Solicitante</label>
                  <input
                    type="text"
                    className={styles.input + ' opacity-70 cursor-not-allowed'}
                    value={usuario?.nome || usuario?.email || ''}
                    readOnly
                  />
                </div>

                <div className="flex flex-col gap-2.5 mb-4">
                  <label className={styles.label}>Cargo do Solicitante *</label>
                  <select className={styles.input} value={cargo} onChange={(e) => setCargo(e.target.value)} style={selectFieldStyle} required>
                    <option value="" style={selectOptionStyle}>
                      Selecione o cargo
                    </option>
                    {CARGOS.map((c) => (
                      <option key={c} value={c} style={selectOptionStyle}>
                        {c}
                      </option>
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
                        // Não permite datas/horários passados
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
                        ? 'Use este campo para reservar o carro por mais de um dia quando necessário.'
                        : 'Quando você pretende devolver a ferramenta. Pode deixar em branco se ainda não souber.'}
                    </p>
                  </div>
                )}

                {categoria !== 'frota' && (
                  <div className="mt-4 flex flex-col gap-2.5">
                    <label className={styles.label}>Retirada ou entrega?</label>
                    <select
                      className={styles.input}
                      value={entregaSolicitada ? 'sim' : 'nao'}
                      onChange={(e) => setEntregaSolicitada(e.target.value === 'sim')}
                      style={selectFieldStyle}
                    >
                      <option value="nao" style={selectOptionStyle}>
                        Vou buscar / só separar no almoxarifado
                      </option>
                      <option value="sim" style={selectOptionStyle}>
                        Precisa entregar na obra
                      </option>
                    </select>
                    <p className="m-0 text-[#89a2e2] text-[0.85rem]">
                      O almoxarifado decide no interno se entrega com frota Biasi, terceiro ou outro transporte.
                    </p>
                  </div>
                )}
              </section>

              {/* Detalhes da Requisição (Itens) */}
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
                      {categoria === 'insumos'
                        ? 'Insumos'
                        : categoria === 'ferramentas'
                        ? 'Ferramentas'
                        : 'Frota'}
                    </strong>
                    . Cadastre novos itens nas páginas correspondentes para que apareçam aqui.
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 mb-4">
                  <label className={styles.label}>Prioridade</label>
                  <select
                    className={styles.input}
                    value={prioridade}
                    onChange={(e) => setPrioridade(e.target.value as 'normal' | 'urgente' | 'baixo')}
                    style={selectFieldStyle}
                  >
                    <option value="normal" style={selectOptionStyle}>
                      Prioridade Normal
                    </option>
                    <option value="urgente" style={selectOptionStyle}>
                      Alta Prioridade (Urgente)
                    </option>
                    <option value="baixo" style={selectOptionStyle}>
                      Baixa Prioridade
                    </option>
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
                        <input
                          ref={fileInputRef}
                          type="file"
                          className="hidden"
                          multiple
                          accept="image/*,video/*,audio/*,application/pdf"
                          onChange={(e) => handleFiles(e.target.files)}
                        />
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
                    <button type="button" className={styles.btnSmall} onClick={iniciarGravacao}>
                      <Mic size={15} />
                      Gravar áudio
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={pararGravacao}
                      className="inline-flex items-center gap-2 font-extrabold py-2.5 px-4 rounded-[14px] border border-[rgba(255,107,107,0.5)] bg-[rgba(255,107,107,0.12)] text-[#ff9797] text-[0.9rem] cursor-pointer animate-pulse"
                    >
                      <StopCircle size={15} />
                      Parar gravação
                    </button>
                  )}
                </div>

                {audioUrl && (
                  <div className="mb-3.5 flex items-center gap-3 px-4 py-3 rounded-[14px] border border-[rgba(113,154,255,0.3)] bg-[rgba(8,24,64,0.3)]">
                    <Mic size={16} className="text-[#5c9bff] shrink-0" />
                    <audio controls src={audioUrl} className="flex-1 h-8" />
                    <button
                      type="button"
                      onClick={() => {
                        setAudioUrl('');
                        setAnexos((prev) => prev.filter((f) => !f.name.startsWith('audio-')));
                      }}
                      className="text-[#ff9797] text-[0.78rem] hover:text-[#ff6b6b] shrink-0"
                    >
                      remover
                    </button>
                  </div>
                )}

                {categoria !== 'frota' && (
                  <div
                    className="rounded-[18px] border border-dashed border-[rgba(113,154,255,0.45)] bg-[rgba(8,24,64,0.24)] px-5 py-8 text-center text-[#b8c5eb]"
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleFiles(e.dataTransfer.files);
                    }}
                  >
                    {anexos.length === 0
                      ? 'Arraste fotos, vídeos, áudios ou PDFs aqui, ou use o botão acima.'
                      : `${anexos.length} arquivo${anexos.length > 1 ? 's' : ''} selecionado${anexos.length > 1 ? 's' : ''}.`}
                  </div>
                )}

                {anexos.length > 0 && (
                  <div className="grid gap-3 mt-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4">
                    {anexos.map((f, i) => (
                      <div
                        key={i}
                        className="rounded-[14px] border border-[rgba(113,154,255,0.28)] bg-[rgba(8,24,64,0.32)] p-3 flex flex-col gap-2"
                      >
                        <div className="text-[0.8rem] text-[#b8c5eb] truncate" title={f.name}>
                          {f.name}
                        </div>
                        <div className="text-[0.72rem] text-[#89a2e2]">{(f.size / 1024).toFixed(1)} KB</div>
                        <button type="button" className={styles.btnDanger + ' text-[0.8rem] py-2'} onClick={() => removeAnexo(i)}>
                          Remover
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[#89a2e2] text-[0.85rem] mt-3 m-0">
                  Obs.: o upload dos arquivos para o storage ainda será integrado em uma próxima etapa. Por enquanto, registra apenas o
                  conteúdo dos itens.
                </p>
              </section>

              {/* Avisos */}
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

              {/* Footer */}
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
          </>
        )}

        {view === 'kanban' && (
          <>
            <section className={styles.section}>
              <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
                <h4 className={styles.h4 + ' !mb-0 !pb-0 !border-b-0'}>Solicitações Registradas</h4>
                {listaCompras.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setMostrarCompras((v) => !v)}
                    className={styles.btnSmall}
                    title="Itens faltantes para enviar às Compras"
                  >
                    <ShoppingCart size={14} />
                    Lista para Compras ({listaCompras.length})
                    {mostrarCompras ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                )}
              </div>

              {mostrarCompras && listaCompras.length > 0 && (
                <div className="mb-5 rounded-[14px] border border-[rgba(255,202,87,0.35)] bg-[rgba(255,202,87,0.08)] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="m-0 font-extrabold text-[#ffca57]">Itens faltantes (atendimento parcial)</p>
                    <button
                      type="button"
                      className={styles.btnSmall + ' text-[0.8rem]'}
                      onClick={() => {
                        const linhas = listaCompras.map(
                          (l) =>
                            `${l.codigo ? l.codigo + ' - ' : ''}${l.descricao}\t${l.faltante} ${l.unidade}\tObra: ${l.obra}`
                        );
                        navigator.clipboard?.writeText(linhas.join('\n')).catch(() => undefined);
                      }}
                    >
                      Copiar lista
                    </button>
                  </div>
                  <ul className="text-[#f4f7ff] text-[0.9rem] space-y-1">
                    {listaCompras.map((l, i) => (
                      <li key={i} className="flex items-center gap-2 flex-wrap">
                        <strong>{l.descricao}</strong>
                        <span className="text-[#ffca57]">faltam {l.faltante} {l.unidade}</span>
                        <span className="text-[#89a2e2] text-[0.8rem]">· obra {l.obra}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {loadingReqs ? (
                <p className="text-[#b8c5eb]">Carregando...</p>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                  {COLUNAS.map((status) => {
                    const cfg = STATUS_CONFIG[status];
                    const col = reqs.filter((r) => r.status === status);
                    return (
                      <div
                        key={status}
                        className="rounded-[20px] border border-[rgba(113,154,255,0.28)] bg-[rgba(8,24,64,0.24)] p-4"
                      >
                        <div className="flex items-center gap-2 mb-4">
                          <span
                            className="px-3 py-1 rounded-full text-[0.8rem] font-extrabold uppercase"
                            style={{ color: cfg.cor, background: cfg.bg, border: `1px solid ${cfg.cor}44` }}
                          >
                            {cfg.label}
                          </span>
                          <span className="text-[#b8c5eb] text-sm">{col.length}</span>
                        </div>
                        <div className="flex flex-col gap-3">
                          {col.length === 0 ? (
                            <div className="border border-dashed border-[rgba(113,154,255,0.28)] rounded-[14px] p-5 text-center text-[#89a2e2] text-[0.9rem]">
                              Sem requisições
                            </div>
                          ) : (
                            col.map((r, posIdx) => {
                              const solicitante = r.solicitante as unknown as { nome: string } | undefined;
                              const itensRaw = (Array.isArray(r.itens) ? r.itens : []) as unknown as Record<string, unknown>[];
                              const primeiro = itensRaw[0];
                              const tipo = primeiro?.tipo as string | undefined;
                              const urgente = primeiro?.urgente === 'sim';

                              let TipoIcon = Package;
                              if (tipo === 'ferramenta') TipoIcon = Wrench;
                              else if (tipo === 'carro') TipoIcon = Truck;

                              const resumo = itensRaw
                                .slice(0, 3)
                                .map((i) => {
                                  const desc = (i.descricao || i.nome || '') as string;
                                  const qtd = i.quantidade as number | undefined;
                                  const un = i.unidade as string | undefined;
                                  return `${desc}${qtd ? ` · ${qtd} ${un || ''}` : ''}`.trim();
                                })
                                .join('\n');

                              const aberto = expandidas.has(r.id);
                              const iniciadoIso = r.iniciado_em || extrairTimestamp(r.observacao || undefined, 'separacao_iniciada');
                              const finalizadoIso = r.finalizado_em || extrairTimestamp(r.observacao || undefined, 'separacao_finalizada');
                              const emSeparacao = !!iniciadoIso && !finalizadoIso;
                              const entregaSolicitadaCard = ['sim', 's', 'true', '1', 'yes'].includes(
                                String(extrairTimestamp(r.observacao || undefined, 'entrega') || '').trim().toLowerCase()
                              );
                              const anexosUrls = (extrairTimestamp(r.observacao || undefined, 'anexos_urls') || '')
                                .split(',')
                                .map((s) => s.trim())
                                .filter(Boolean);

                              // Posição na fila para pendentes (col já vem ordenada por criado_em desc)
                              const posFila =
                                status === 'pendente'
                                  ? reqs
                                      .filter((x) => x.status === 'pendente')
                                      .slice()
                                      .sort((a, b) => (a.criado_em > b.criado_em ? 1 : -1))
                                      .findIndex((x) => x.id === r.id) + 1
                                  : null;

                              const numeroPedido = r.id.replace(/-/g, '').slice(-6).toUpperCase();
                              // Fase atual derivada dos itens
                              const FASES_LBL = entregaSolicitadaCard
                                ? ['Separando', 'Separado', 'A caminho', 'Recebido']
                                : ['Separando', 'Separado', 'Finalizado', 'Recebido'];
                              const faseAtual = itensRaw.reduce<number>((max, i) => {
                                const f = Number(i.fase_rastreio ?? 0);
                                return Number.isFinite(f) && f > max ? f : max;
                              }, status === 'entregue' ? 3 : 0);
                              const mostrarFase = status === 'aprovada' || status === 'entregue';
                              const faseLabel = FASES_LBL[Math.max(0, Math.min(3, faseAtual))] || 'Separando';

                              return (
                                <div
                                  key={r.id}
                                  className="rounded-[14px] border border-[rgba(113,154,255,0.28)] bg-[rgba(8,24,64,0.28)] p-4"
                                >
                                  <button
                                    type="button"
                                    onClick={() => toggleExpandir(r.id)}
                                    className="w-full text-left"
                                  >
                                    <div className="mb-2">
                                      <p className="m-0 font-bold text-white text-[0.95rem] flex items-center gap-2 flex-wrap">
                                        <TipoIcon size={16} className="text-[#89a2e2]" />
                                        <span className="px-2 py-0.5 text-[0.7rem] font-extrabold bg-[rgba(120,160,255,0.18)] text-[#b8c8ff] rounded-full border border-[rgba(120,160,255,0.35)] tracking-wider">
                                          #{numeroPedido}
                                        </span>
                                        {r.obra}
                                        {urgente && (
                                          <span className="px-2 py-0.5 text-[0.7rem] font-extrabold bg-[rgba(255,107,107,0.2)] text-[#ff6b6b] rounded-full border border-[rgba(255,107,107,0.3)]">
                                            URGENTE
                                          </span>
                                        )}
                                        {posFila != null && (
                                          <span className="px-2 py-0.5 text-[0.7rem] font-extrabold bg-[rgba(92,155,255,0.18)] text-[#5c9bff] rounded-full border border-[rgba(92,155,255,0.35)]">
                                            #{posFila} na fila
                                          </span>
                                        )}
                                        {mostrarFase && (
                                          <span className="px-2 py-0.5 text-[0.7rem] font-extrabold bg-[rgba(137,183,255,0.18)] text-[#89b7ff] rounded-full border border-[rgba(137,183,255,0.35)]">
                                            Fase {faseAtual + 1}/4: {faseLabel}
                                          </span>
                                        )}
                                        {emSeparacao && (
                                          <span className="px-2 py-0.5 text-[0.7rem] font-extrabold bg-[rgba(255,202,87,0.18)] text-[#ffca57] rounded-full border border-[rgba(255,202,87,0.35)] animate-pulse">
                                            EM SEPARAÇÃO
                                          </span>
                                        )}
                                        <span className="ml-auto text-[#89a2e2]">
                                          {aberto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </span>
                                      </p>
                                      <p className="m-0 mt-1 text-[#89a2e2] text-[0.78rem]">
                                        {solicitante?.nome || '—'} · {formatDataBR(r.data_solicitacao)}
                                      </p>
                                    </div>
                                    {!aberto && (
                                      <p className="text-[#b8c5eb] text-[0.85rem] whitespace-pre-line mb-1">{resumo}</p>
                                    )}
                                  </button>

                                  {aberto && (
                                    <div className="mt-3 space-y-3">
                                      {/* Itens detalhados com atendimento parcial */}
                                      <div className="space-y-2">
                                        {itensRaw.map((it, idx) => {
                                          const desc = (it.descricao || it.nome || '') as string;
                                          const qtd = Number(it.quantidade ?? 0);
                                          const un = (it.unidade as string) || 'un';
                                          const fotosItem = (it.fotos_urls as string[] | undefined) || [];
                                          const fotoLegacy = (it.foto_material as string | null | undefined) || null;
                                          const todasFotos = [
                                            ...(fotoLegacy && !fotosItem.includes(fotoLegacy) ? [fotoLegacy] : []),
                                            ...fotosItem,
                                          ];
                                          const obs = (it.observacao as string | null) || null;
                                          const atendidaSalva = it.quantidade_atendida as number | null | undefined;
                                          const faltaSalva = it.faltante as number | null | undefined;
                                          const draftVal =
                                            qtdAtendidaDraft[r.id]?.[idx] ?? String(atendidaSalva ?? qtd);
                                          const draftNum = Number(draftVal);
                                          const faltaDraft = Math.max(0, qtd - (isFinite(draftNum) ? draftNum : 0));

                                          return (
                                            <div
                                              key={idx}
                                              className="rounded-[12px] border border-[rgba(113,154,255,0.2)] bg-[rgba(8,24,64,0.35)] p-3"
                                            >
                                              <div className="flex items-start gap-2 justify-between flex-wrap">
                                                <div className="min-w-0">
                                                  <p className="m-0 font-bold text-white text-[0.9rem]">{desc}</p>
                                                  <p className="m-0 text-[#89a2e2] text-[0.78rem]">
                                                    Solicitado: <strong className="text-white">{qtd} {un}</strong>
                                                    {atendidaSalva != null && (
                                                      <> · Atendido: <strong className="text-[#6be3a5]">{atendidaSalva} {un}</strong></>
                                                    )}
                                                    {faltaSalva != null && faltaSalva > 0 && (
                                                      <> · <span className="text-[#ffca57]">faltou {faltaSalva} {un}</span></>
                                                    )}
                                                  </p>
                                                  {obs && (
                                                    <p className="m-0 mt-1 text-[#b8c5eb] text-[0.8rem] italic">
                                                      Obs.: {obs}
                                                    </p>
                                                  )}
                                                </div>
                                                {isGestor && emSeparacao && tipo !== 'carro' && (
                                                  <div className="flex items-center gap-1.5">
                                                    <label className="text-[#89a2e2] text-[0.75rem]">Qtd atendida</label>
                                                    <input
                                                      type="number"
                                                      min="0"
                                                      max={qtd}
                                                      value={draftVal}
                                                      onChange={(e) =>
                                                        setQtdAtendidaDraft((prev) => ({
                                                          ...prev,
                                                          [r.id]: { ...(prev[r.id] || {}), [idx]: e.target.value },
                                                        }))
                                                      }
                                                      className="w-[80px] rounded-[10px] border border-[#3560b8] bg-[rgba(10,30,77,0.4)] text-white px-2 py-1 text-[0.85rem] outline-none focus:border-[#5c89ff]"
                                                    />
                                                    {faltaDraft > 0 && (
                                                      <span className="text-[#ffca57] text-[0.75rem] font-bold">
                                                        −{faltaDraft}
                                                      </span>
                                                    )}
                                                  </div>
                                                )}
                                              </div>
                                              {todasFotos.length > 0 && (
                                                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                                                  {todasFotos.map((url, i) => (
                                                    <a
                                                      key={i}
                                                      href={url}
                                                      target="_blank"
                                                      rel="noreferrer"
                                                      className="inline-block"
                                                    >
                                                      <img
                                                        src={url}
                                                        alt={`foto-${i}`}
                                                        className="w-14 h-14 object-cover rounded-[10px] border border-[rgba(113,154,255,0.4)]"
                                                      />
                                                    </a>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>

                                      {/* Anexos gerais (fotos/vídeos/áudios do solicitante) */}
                                      {anexosUrls.length > 0 && (
                                        <div className="rounded-[12px] border border-[rgba(113,154,255,0.2)] bg-[rgba(8,24,64,0.35)] p-3">
                                          <p className="m-0 mb-2 text-[#89a2e2] text-[0.78rem] font-extrabold uppercase">
                                            Anexos do solicitante
                                          </p>
                                          <div className="flex items-center gap-2 flex-wrap">
                                            {anexosUrls.map((url, i) => {
                                              const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(url);
                                              const isAudio = /\.(webm|mp3|wav|ogg|m4a)(\?|$)/i.test(url) && !isVideo;
                                              const isImage = /\.(jpg|jpeg|png|webp|gif|heic)(\?|$)/i.test(url);
                                              if (isImage) {
                                                return (
                                                  <a key={i} href={url} target="_blank" rel="noreferrer">
                                                    <img
                                                      src={url}
                                                      alt={`anexo-${i}`}
                                                      className="w-16 h-16 object-cover rounded-[10px] border border-[rgba(113,154,255,0.4)]"
                                                    />
                                                  </a>
                                                );
                                              }
                                              if (isVideo) {
                                                return (
                                                  <video key={i} src={url} controls className="w-40 rounded-[10px]" />
                                                );
                                              }
                                              if (isAudio) {
                                                return (
                                                  <audio key={i} src={url} controls className="w-44" />
                                                );
                                              }
                                              return (
                                                <a
                                                  key={i}
                                                  href={url}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  className="text-[0.8rem] text-[#5c9bff] underline"
                                                >
                                                  arquivo {i + 1}
                                                </a>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      )}

                                      {/* Timestamps de separação */}
                                      {(iniciadoIso || finalizadoIso) && (
                                        <div className="text-[#b8c5eb] text-[0.78rem] flex items-center gap-3 flex-wrap">
                                          {iniciadoIso && (
                                            <span className="inline-flex items-center gap-1">
                                              <Clock size={12} />
                                              Início: {new Date(iniciadoIso).toLocaleString('pt-BR')}
                                            </span>
                                          )}
                                          {finalizadoIso && (
                                            <span className="inline-flex items-center gap-1">
                                              <CheckCircle2 size={12} />
                                              Fim: {new Date(finalizadoIso).toLocaleString('pt-BR')}
                                            </span>
                                          )}
                                          {iniciadoIso && finalizadoIso && (
                                            <span className="inline-flex items-center gap-1 text-[#6be3a5] font-bold">
                                              Duração: {formatarDuracao(iniciadoIso, finalizadoIso)}
                                            </span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Ações de status */}
                                  {isGestor && status === 'pendente' && (
                                    <div className="flex gap-2 mt-3">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          atualizarStatus(r.id, 'aprovada');
                                        }}
                                        className="flex-1 py-1.5 text-[0.8rem] font-bold text-[#6be3a5] bg-[rgba(54,196,133,0.12)] hover:bg-[rgba(54,196,133,0.2)] rounded-lg border border-[rgba(54,196,133,0.3)] transition-colors"
                                      >
                                        <span className="inline-flex items-center gap-1.5">
                                          <Check size={14} />
                                          Aprovar
                                        </span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          atualizarStatus(r.id, 'cancelada');
                                        }}
                                        className="flex-1 py-1.5 text-[0.8rem] font-bold text-[#ff9797] bg-[rgba(255,107,107,0.12)] hover:bg-[rgba(255,107,107,0.2)] rounded-lg border border-[rgba(255,107,107,0.3)] transition-colors"
                                      >
                                        <span className="inline-flex items-center gap-1.5">
                                          <XCircle size={14} />
                                          Cancelar
                                        </span>
                                      </button>
                                    </div>
                                  )}
                                  {isGestor && status === 'aprovada' && (
                                    <div className="flex gap-2 mt-3 flex-wrap">
                                      {!iniciadoIso ? (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (!aberto) toggleExpandir(r.id);
                                            iniciarSeparacao(r.id);
                                          }}
                                          className="flex-1 py-1.5 text-[0.8rem] font-bold text-[#ffca57] bg-[rgba(255,202,87,0.12)] hover:bg-[rgba(255,202,87,0.2)] rounded-lg border border-[rgba(255,202,87,0.3)] transition-colors"
                                        >
                                          <span className="inline-flex items-center gap-1.5">
                                            <Play size={14} />
                                            Iniciar separação
                                          </span>
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            finalizarSeparacao(r.id);
                                          }}
                                          className="flex-1 py-1.5 text-[0.8rem] font-bold text-[#6be3a5] bg-[rgba(54,196,133,0.12)] hover:bg-[rgba(54,196,133,0.2)] rounded-lg border border-[rgba(54,196,133,0.3)] transition-colors"
                                        >
                                          <span className="inline-flex items-center gap-1.5">
                                            <CheckCircle2 size={14} />
                                            Finalizar separação
                                          </span>
                                        </button>
                                      )}
                                    </div>
                                  )}
                                  {/* uso de posIdx evitado pelo linter */}
                                  <span className="hidden">{posIdx}</span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}

