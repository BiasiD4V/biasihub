import { useState, useEffect, useMemo, type CSSProperties, type ReactNode } from 'react';
import { baseFornecedoresRepository, type BaseFornecedor } from '../infrastructure/supabase/baseFornecedoresRepository';

// ─── types ────────────────────────────────────────────────────────────────────
type ClsFilter = '' | 'A' | 'B' | 'C';
type OpenState = Record<string, boolean>;

// ─── helpers ──────────────────────────────────────────────────────────────────
function normalize(v: string) {
  return v.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
function unique<T>(arr: T[]): T[] {
  return [...new Set(arr)].filter(Boolean).sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'));
}
function specKey(r: BaseFornecedor) {
  return r.especifico + ' | Un.: ' + (r.unidade || 'N/D');
}

// ─── group rows into discipline → generic → specific → rows ──────────────────
type SpecMap = Record<string, BaseFornecedor[]>;
type GenMap  = Record<string, SpecMap>;
type DiscMap = Record<string, GenMap>;

function groupRows(rows: BaseFornecedor[]): DiscMap {
  const out: DiscMap = {};
  for (const r of rows) {
    const d = r.disciplina || 'Sem disciplina';
    const g = r.generico   || 'Sem genérico';
    const k = specKey(r);
    if (!out[d]) out[d] = {};
    if (!out[d][g]) out[d][g] = {};
    if (!out[d][g][k]) out[d][g][k] = [];
    out[d][g][k].push(r);
  }
  return out;
}

// ─── modal ────────────────────────────────────────────────────────────────────
interface ModalField { name: string; label: string; value?: string; wide?: boolean; type?: 'textarea' }

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.62)' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-2xl max-h-[90vh] overflow-auto rounded-[22px] border shadow-2xl" style={{ borderColor: 'rgba(126,172,255,.34)', background: 'linear-gradient(180deg,rgba(13,34,76,.98),rgba(7,19,43,.98))' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(126,172,255,.18)' }}>
          <h3 className="text-white font-black text-lg">{title}</h3>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl border text-white text-xl" style={{ borderColor: 'rgba(126,172,255,.22)', background: 'rgba(255,255,255,.08)' }}>×</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function FormModal({ title, fields, onSave, onClose }: { title: string; fields: ModalField[]; onSave: (data: Record<string, string>) => void; onClose: () => void }) {
  const [vals, setVals] = useState<Record<string, string>>(Object.fromEntries(fields.map(f => [f.name, f.value ?? ''])));
  function set(name: string, value: string) { setVals(p => ({ ...p, [name]: value })); }
  return (
    <Modal title={title} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        {fields.map(f => (
          <div key={f.name} className={f.wide ? 'col-span-2' : ''}>
            <label className="block text-[11px] font-black uppercase tracking-wider mb-1.5" style={{ color: '#bcd2ff' }}>{f.label}</label>
            {f.type === 'textarea' ? (
              <textarea value={vals[f.name]} onChange={e => set(f.name, e.target.value)} rows={3}
                className="w-full rounded-xl border px-3 py-2 text-sm text-white outline-none resize-vertical"
                style={{ borderColor: 'rgba(132,180,255,.38)', background: '#092154' }} />
            ) : (
              <input value={vals[f.name]} onChange={e => set(f.name, e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm text-white outline-none"
                style={{ borderColor: 'rgba(132,180,255,.38)', background: '#092154' }} />
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-3 mt-4 flex-wrap">
        <Btn cls="primary" onClick={() => onSave(vals)}>Salvar</Btn>
        <Btn onClick={onClose}>Cancelar</Btn>
      </div>
    </Modal>
  );
}

function ConfirmModal({ title, msg, onYes, onClose }: { title: string; msg: string; onYes: () => void; onClose: () => void }) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="rounded-xl border px-4 py-3 text-sm mb-4" style={{ borderColor: 'rgba(126,172,255,.16)', background: 'rgba(6,19,47,.5)', color: '#dce9ff' }}>{msg}</div>
      <div className="flex gap-3">
        <Btn cls="danger" onClick={onYes}>Confirmar</Btn>
        <Btn onClick={onClose}>Cancelar</Btn>
      </div>
    </Modal>
  );
}

function DetailsModal({ title, pairs, onClose }: { title: string; pairs: [string, string][]; onClose: () => void }) {
  return (
    <Modal title={title} onClose={onClose}>
      {pairs.map(([k, v]) => (
        <div key={k} className="rounded-xl border px-4 py-2.5 text-sm mb-2" style={{ borderColor: 'rgba(126,172,255,.16)', background: 'rgba(6,19,47,.5)', color: '#dce9ff' }}>
          <b className="text-white">{k}:</b> {v || '—'}
        </div>
      ))}
      <div className="mt-4"><Btn cls="blue" onClick={onClose}>Fechar</Btn></div>
    </Modal>
  );
}

function MoverModal({ row, allRows, onSave, onClose }: { row: BaseFornecedor; allRows: BaseFornecedor[]; onSave: (d: string, g: string, s: string) => void; onClose: () => void }) {
  const [disc, setDisc]   = useState(row.disciplina);
  const [gen, setGen]     = useState(row.generico);
  const [spec, setSpec]   = useState(row.especifico);
  const [newDisc, setNewDisc] = useState('');
  const [newGen, setNewGen]   = useState('');
  const [newSpec, setNewSpec] = useState('');

  const discs = unique(allRows.map(r => r.disciplina));
  const gens  = unique(allRows.filter(r => r.disciplina === disc).map(r => r.generico));
  const specs = unique(allRows.filter(r => r.disciplina === disc && r.generico === gen).map(r => r.especifico));

  function onDiscChange(v: string) { setDisc(v); setGen(''); setSpec(''); }
  function onGenChange(v: string)  { setGen(v); setSpec(''); }

  const finalDisc = disc === '__new__' ? newDisc.trim() : disc;
  const finalGen  = gen  === '__new__' ? newGen.trim()  : gen;
  const finalSpec = spec === '__new__' ? newSpec.trim() : spec;

  return (
    <Modal title={'Mover fornecedor: ' + row.fornecedor} onClose={onClose}>
      <div className="rounded-xl border px-4 py-2.5 text-sm mb-4" style={{ borderColor: 'rgba(126,172,255,.16)', background: 'rgba(6,19,47,.5)', color: '#dce9ff' }}>
        <b className="text-white">Local atual:</b> {row.disciplina} › {row.generico} › {row.especifico}
      </div>
      <div className="flex flex-col gap-3">
        <div>
          <label className="block text-[11px] font-black uppercase tracking-wider mb-1.5" style={{ color: '#bcd2ff' }}>Disciplina</label>
          <select value={disc} onChange={e => onDiscChange(e.target.value)} className="w-full rounded-xl border px-3 py-2.5 text-sm text-white outline-none" style={{ borderColor: 'rgba(132,180,255,.38)', background: '#092154' }}>
            {discs.map(d => <option key={d} value={d}>{d}</option>)}
            <option value="__new__">+ Nova disciplina…</option>
          </select>
          {disc === '__new__' && <input value={newDisc} onChange={e => setNewDisc(e.target.value)} placeholder="Nome da nova disciplina" className="w-full mt-2 rounded-xl border px-3 py-2 text-sm text-white outline-none" style={{ borderColor: 'rgba(132,180,255,.38)', background: '#092154' }} />}
        </div>
        <div>
          <label className="block text-[11px] font-black uppercase tracking-wider mb-1.5" style={{ color: '#bcd2ff' }}>Material genérico</label>
          <select value={gen} onChange={e => onGenChange(e.target.value)} className="w-full rounded-xl border px-3 py-2.5 text-sm text-white outline-none" style={{ borderColor: 'rgba(132,180,255,.38)', background: '#092154' }}>
            <option value="">Selecione…</option>
            {gens.map(g => <option key={g} value={g}>{g}</option>)}
            <option value="__new__">+ Novo genérico…</option>
          </select>
          {gen === '__new__' && <input value={newGen} onChange={e => setNewGen(e.target.value)} placeholder="Ex: Tubos PVC" className="w-full mt-2 rounded-xl border px-3 py-2 text-sm text-white outline-none" style={{ borderColor: 'rgba(132,180,255,.38)', background: '#092154' }} />}
        </div>
        <div>
          <label className="block text-[11px] font-black uppercase tracking-wider mb-1.5" style={{ color: '#bcd2ff' }}>Material específico</label>
          <select value={spec} onChange={e => setSpec(e.target.value)} className="w-full rounded-xl border px-3 py-2.5 text-sm text-white outline-none" style={{ borderColor: 'rgba(132,180,255,.38)', background: '#092154' }}>
            <option value="">Selecione…</option>
            {specs.map(s => <option key={s} value={s}>{s}</option>)}
            <option value="__new__">+ Novo específico…</option>
          </select>
          {spec === '__new__' && <input value={newSpec} onChange={e => setNewSpec(e.target.value)} placeholder="Ex: TUBO PVC DN 100MM" className="w-full mt-2 rounded-xl border px-3 py-2 text-sm text-white outline-none" style={{ borderColor: 'rgba(132,180,255,.38)', background: '#092154' }} />}
        </div>
      </div>
      <div className="flex gap-3 mt-5">
        <Btn cls="primary" onClick={() => { if (finalDisc && finalGen && finalSpec) onSave(finalDisc, finalGen, finalSpec); }}>Mover</Btn>
        <Btn onClick={onClose}>Cancelar</Btn>
      </div>
    </Modal>
  );
}

// ─── button ───────────────────────────────────────────────────────────────────
const BTN_STYLES: Record<string, CSSProperties> = {
  primary: { background: 'linear-gradient(135deg,#23d8c8,#1b78d4)', color: '#061630', borderColor: 'rgba(47,225,208,.42)' },
  blue:    { background: 'linear-gradient(135deg,#477dff,#6b7dff)', color: '#fff' },
  danger:  { background: 'linear-gradient(135deg,#ff5c7a,#d93d65)', color: '#fff', borderColor: 'rgba(255,92,122,.42)' },
  move:    { background: 'linear-gradient(135deg,#ff9a3c,#e06b00)', color: '#fff', borderColor: 'rgba(255,154,60,.42)' },
  default: { background: 'rgba(15,37,82,.92)', color: '#fff' },
};

function Btn({ cls = 'default', onClick, children, style }: { cls?: string; onClick: () => void; children: ReactNode; style?: CSSProperties }) {
  return (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onClick(); }}
      className="inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 font-black text-[11px] transition-all hover:brightness-110 hover:-translate-y-px active:translate-y-0"
      style={{ minHeight: 32, borderColor: 'rgba(126,172,255,.22)', ...(BTN_STYLES[cls] ?? BTN_STYLES.default), ...style }}
    >
      {children}
    </button>
  );
}

// ─── class tag ────────────────────────────────────────────────────────────────
function ClsTag({ cls }: { cls: string }) {
  const styles: Record<string, CSSProperties> = {
    A: { color: '#ffd16e', borderColor: 'rgba(255,209,110,.45)', background: 'rgba(255,176,32,.13)' },
    B: { color: '#9fbbff', borderColor: 'rgba(159,187,255,.45)', background: 'rgba(81,116,255,.16)' },
    C: { color: '#79e8bd', borderColor: 'rgba(121,232,189,.45)', background: 'rgba(55,207,142,.14)' },
  };
  return (
    <span className="inline-flex items-center justify-center rounded-[10px] border font-black text-[13px]"
      style={{ height: 32, minWidth: 44, padding: '0 10px', ...(styles[cls] ?? styles.B) }}>
      {cls}
    </span>
  );
}

// ─── supplier row ─────────────────────────────────────────────────────────────
function SupplierRow({ r, onEdit, onDelete, onMove }: {
  r: BaseFornecedor;
  onEdit: (r: BaseFornecedor) => void;
  onDelete: (r: BaseFornecedor) => void;
  onMove: (r: BaseFornecedor) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const varCls = !r.variacao ? '' : r.variacao.startsWith('-') ? 'negative' : '';

  return (
    <>
      {showDetails && (
        <DetailsModal
          title={'Fornecedor: ' + r.fornecedor}
          pairs={[
            ['Classe', r.cls],
            ['Material', r.especifico],
            ['Unidade', r.unidade],
            ['Último valor', r.ultimo_valor],
            ['Variação', r.variacao],
            ['Menor valor', r.menor_valor],
            ['Compras', r.qtd_compras],
            ['Tempo relacionamento', r.tempo_relacionamento + (r.tempo_relacionamento ? ' ano(s)' : '')],
            ['E-mail', r.email],
            ['Telefone', r.telefone],
            ['Contato', r.contato],
            ['Pedido', r.ultimo_pedido],
            ['Obra', r.ultima_obra],
            ['Fabricante', r.fabricante],
            ['Homologação', r.homologacao],
            ['Suporte', r.suporte],
            ['Ocorrências', r.ocorrencias],
          ]}
          onClose={() => setShowDetails(false)}
        />
      )}
      <div className="rounded-[13px] border" style={{
        minHeight: 86,
        borderColor: 'rgba(207,226,255,.42)',
        background: 'rgba(11,31,74,.86)',
        display: 'grid',
        gridTemplateColumns: '44px 1.25fr .72fr .68fr .68fr auto',
        alignItems: 'center',
        gap: 12,
        padding: '11px 14px',
      }}>
        <ClsTag cls={r.cls} />
        <div>
          <div className="text-sm font-black uppercase" style={{ color: '#f4f8ff', marginBottom: 5 }}>{r.fornecedor}</div>
          <div className="text-xs leading-snug" style={{ color: '#bcd2ff' }}>
            {['Ranking ' + r.rank, r.qtd_compras ? r.qtd_compras + ' compra(s)' : '', r.tempo_relacionamento ? r.tempo_relacionamento + ' ano(s)' : '', r.ultimo_pedido ? 'Pedido ' + r.ultimo_pedido : ''].filter(Boolean).join(' • ')}
          </div>
          <div className="mt-2">
            <Btn cls="move" onClick={() => onMove(r)} style={{ minHeight: 28, borderRadius: 10 }}>
              Mover fornecedor
            </Btn>
          </div>
        </div>
        <div className="hidden lg:block">
          <div className="text-[10px] font-black uppercase tracking-wide mb-1" style={{ color: '#8fa8d4' }}>E-mail</div>
          <div className="text-sm font-black break-all" style={{ color: '#fff' }}>{r.email || '—'}</div>
          <div className="text-[10px] font-black uppercase tracking-wide mt-2 mb-1" style={{ color: '#8fa8d4' }}>Telefone</div>
          <div className="text-sm font-black" style={{ color: '#fff' }}>{r.telefone || '—'}</div>
        </div>
        <div className="hidden md:block">
          <div className="text-[10px] font-black uppercase tracking-wide mb-1" style={{ color: '#8fa8d4' }}>Último valor</div>
          <div className="text-sm font-black" style={{ color: '#2fe1d0' }}>{r.ultimo_valor || '—'}</div>
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black mt-1" style={{ borderColor: 'rgba(47,225,208,.24)', background: 'rgba(47,225,208,.13)', color: '#98fff7' }}>Un.: {r.unidade || 'N/D'}</span>
        </div>
        <div className="hidden md:block">
          <div className="text-[10px] font-black uppercase tracking-wide mb-1" style={{ color: '#8fa8d4' }}>Variação</div>
          <div className={`text-sm font-black ${varCls === 'negative' ? '' : ''}`} style={{ color: varCls === 'negative' ? '#79e8bd' : r.variacao ? '#2fe1d0' : '#bfd1f3' }}>{r.variacao || 'N/D'}</div>
          <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black mt-1" style={{ borderColor: 'rgba(47,225,208,.24)', background: 'rgba(47,225,208,.13)', color: '#98fff7' }}>Menor: {r.menor_valor || '—'}</span>
        </div>
        <div className="flex gap-2 flex-wrap justify-end">
          <Btn cls="blue" onClick={() => setShowDetails(true)}>Ver</Btn>
          <Btn onClick={() => onEdit(r)}>Editar</Btn>
          <Btn cls="danger" onClick={() => onDelete(r)}>Excluir</Btn>
        </div>
      </div>
    </>
  );
}

// ─── specific level ───────────────────────────────────────────────────────────
function SpecificCard({ name, rows, open, onToggle, onAddSupplier, onDeleteSpecific, onEdit, onDelete, onMove }: {
  name: string; rows: BaseFornecedor[]; open: boolean; onToggle: () => void;
  onAddSupplier: () => void; onDeleteSpecific: () => void;
  onEdit: (r: BaseFornecedor) => void;
  onDelete: (r: BaseFornecedor) => void;
  onMove: (r: BaseFornecedor) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const sorted = [...rows].sort((a, b) => a.cls.localeCompare(b.cls) || (a.rank - b.rank));
  return (
    <>
      {showDetails && (
        <DetailsModal title={'Material específico: ' + name}
          pairs={[['Fornecedores', String(rows.length)], ['Classes', unique(rows.map(r => r.cls)).join(', ')]]}
          onClose={() => setShowDetails(false)} />
      )}
      <div className="rounded-[14px] border overflow-hidden" style={{ borderColor: 'rgba(126,172,255,.2)', background: 'rgba(7,22,54,.62)' }}>
        <div className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer border-b" style={{ minHeight: 58, borderColor: 'rgba(132,180,255,.16)' }} onClick={onToggle}>
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 flex items-center justify-center rounded-xl border flex-none text-sm font-black" style={{ background: 'rgba(47,225,208,.12)', borderColor: 'rgba(47,225,208,.18)', color: '#2fe1d0' }}>
              {open ? '⌄' : '›'}
            </span>
            <div className="min-w-0">
              <div className="font-black text-sm text-white truncate">{name}</div>
              <div className="text-xs mt-0.5" style={{ color: '#bcd2ff' }}>{rows.length} fornecedor(es) classificados</div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap justify-end" onClick={e => e.stopPropagation()}>
            <Btn cls="primary" onClick={onAddSupplier}>+ Fornecedor</Btn>
            <Btn cls="blue" onClick={() => setShowDetails(true)}>Ver</Btn>
            <Btn cls="danger" onClick={onDeleteSpecific}>Excluir</Btn>
            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black" style={{ borderColor: 'rgba(47,225,208,.24)', background: 'rgba(47,225,208,.13)', color: '#98fff7' }}>A/B/C relativo</span>
          </div>
        </div>
        {open && (
          <div className="flex flex-col gap-2 p-3">
            {sorted.map(r => (
              <SupplierRow key={r.id} r={r} onEdit={onEdit} onDelete={onDelete} onMove={onMove} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── generic level ────────────────────────────────────────────────────────────
function GenericCard({ name, specs, open, onToggle, onAddSpecific, onDeleteGeneric, openStates, onSpecToggle, onEdit, onDelete, onMove, onAddSupplier, onDeleteSpecific }: {
  name: string; specs: SpecMap; open: boolean; onToggle: () => void;
  onAddSpecific: () => void; onDeleteGeneric: () => void;
  openStates: OpenState; onSpecToggle: (k: string) => void;
  onEdit: (r: BaseFornecedor) => void;
  onDelete: (r: BaseFornecedor) => void;
  onMove: (r: BaseFornecedor) => void;
  onAddSupplier: (base: BaseFornecedor) => void;
  onDeleteSpecific: (row: BaseFornecedor) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const specKeys = Object.keys(specs).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  return (
    <>
      {showDetails && (
        <DetailsModal title={'Material genérico: ' + name}
          pairs={[['Materiais específicos', String(specKeys.length)]]}
          onClose={() => setShowDetails(false)} />
      )}
      <div className="rounded-[16px] border overflow-hidden" style={{ borderColor: 'rgba(132,180,255,.35)', background: 'rgba(9,25,57,.74)' }}>
        <div className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer border-b" style={{ minHeight: 58, borderColor: 'rgba(132,180,255,.16)' }} onClick={onToggle}>
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-9 h-9 flex items-center justify-center rounded-xl border flex-none text-sm font-black" style={{ background: 'rgba(47,225,208,.12)', borderColor: 'rgba(47,225,208,.18)', color: '#2fe1d0' }}>
              {open ? '⌄' : '›'}
            </span>
            <div className="min-w-0">
              <div className="font-black text-sm text-white truncate">{name}</div>
              <div className="text-xs mt-0.5" style={{ color: '#bcd2ff' }}>{specKeys.length} material(is) específico(s)</div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap justify-end" onClick={e => e.stopPropagation()}>
            <Btn cls="primary" onClick={onAddSpecific}>+ Material específico</Btn>
            <Btn cls="blue" onClick={() => setShowDetails(true)}>Ver</Btn>
            <Btn cls="danger" onClick={onDeleteGeneric}>Excluir</Btn>
          </div>
        </div>
        {open && (
          <div className="flex flex-col gap-3 p-3">
            {specKeys.map(k => {
              const specOpen = openStates['specific::' + k] !== false;
              const sample = specs[k][0];
              return (
                <SpecificCard
                  key={k} name={k} rows={specs[k]}
                  open={specOpen} onToggle={() => onSpecToggle('specific::' + k)}
                  onAddSupplier={() => onAddSupplier(sample)}
                  onDeleteSpecific={() => onDeleteSpecific(sample)}
                  onEdit={onEdit} onDelete={onDelete} onMove={onMove}
                />
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ─── discipline level ─────────────────────────────────────────────────────────
function DisciplineCard({ name, generics, open, onToggle, onAddGeneric, onDeleteDiscipline, openStates, onGenToggle, onSpecToggle, onEdit, onDelete, onMove, onAddSpecific, onAddSupplier, onDeleteGeneric, onDeleteSpecific }: {
  name: string; generics: GenMap; open: boolean; onToggle: () => void;
  onAddGeneric: () => void; onDeleteDiscipline: () => void;
  openStates: OpenState; onGenToggle: (k: string) => void; onSpecToggle: (k: string) => void;
  onEdit: (r: BaseFornecedor) => void;
  onDelete: (r: BaseFornecedor) => void;
  onMove: (r: BaseFornecedor) => void;
  onAddSpecific: (discipline: string, generic: string) => void;
  onAddSupplier: (base: BaseFornecedor) => void;
  onDeleteGeneric: (generic: string) => void;
  onDeleteSpecific: (row: BaseFornecedor) => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const genKeys = Object.keys(generics).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const total = Object.values(generics).flatMap(g => Object.values(g)).reduce((acc, rows) => acc + rows.length, 0);

  return (
    <>
      {showDetails && (
        <DetailsModal title={'Disciplina: ' + name}
          pairs={[['Materiais genéricos', String(genKeys.length)], ['Linhas', String(total)]]}
          onClose={() => setShowDetails(false)} />
      )}
      <div className="rounded-[18px] border overflow-hidden" style={{ borderColor: 'rgba(132,180,255,.45)', background: 'rgba(18,45,96,.6)' }}>
        <div className="flex items-center justify-between gap-3 px-4 py-4 cursor-pointer border-b" style={{ minHeight: 68, background: 'rgba(12,31,70,.72)', borderColor: 'rgba(132,180,255,.2)' }} onClick={onToggle}>
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 flex items-center justify-center rounded-xl border flex-none text-base font-black" style={{ background: 'rgba(47,225,208,.12)', borderColor: 'rgba(47,225,208,.18)', color: '#2fe1d0' }}>
              {open ? '⌄' : '›'}
            </span>
            <div className="min-w-0">
              <div className="font-black text-base text-white truncate">{name}</div>
              <div className="text-xs mt-0.5" style={{ color: '#bcd2ff' }}>{total} linha(s) de fornecedor/material</div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap justify-end" onClick={e => e.stopPropagation()}>
            <Btn cls="primary" onClick={onAddGeneric}>+ Material genérico</Btn>
            <Btn cls="blue" onClick={() => setShowDetails(true)}>Ver</Btn>
            <Btn cls="danger" onClick={onDeleteDiscipline}>Excluir</Btn>
            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-black" style={{ borderColor: 'rgba(47,225,208,.24)', background: 'rgba(47,225,208,.13)', color: '#98fff7' }}>
              {genKeys.length} materiais genéricos
            </span>
          </div>
        </div>
        {open && (
          <div className="flex flex-col gap-3 p-3">
            {genKeys.map(g => {
              const genOpen = openStates['generic::' + g] !== false;
              return (
                <GenericCard
                  key={g} name={g} specs={generics[g]}
                  open={genOpen} onToggle={() => onGenToggle('generic::' + g)}
                  onAddSpecific={() => onAddSpecific(name, g)}
                  onDeleteGeneric={() => onDeleteGeneric(g)}
                  openStates={openStates} onSpecToggle={onSpecToggle}
                  onEdit={onEdit} onDelete={onDelete} onMove={onMove}
                  onAddSupplier={onAddSupplier}
                  onDeleteSpecific={onDeleteSpecific}
                />
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

// ─── main page ────────────────────────────────────────────────────────────────
type ModalState =
  | { kind: 'none' }
  | { kind: 'addDiscipline' }
  | { kind: 'addGeneric'; discipline: string }
  | { kind: 'addSpecific'; discipline: string; generic: string }
  | { kind: 'addSupplier'; base: BaseFornecedor }
  | { kind: 'editSupplier'; row: BaseFornecedor }
  | { kind: 'deleteSupplier'; row: BaseFornecedor }
  | { kind: 'moveSupplier'; row: BaseFornecedor }
  | { kind: 'deleteDiscipline'; discipline: string }
  | { kind: 'deleteGeneric'; generic: string }
  | { kind: 'deleteSpecific'; especifico: string; unidade: string };

export function Fornecedores() {
  const [rows, setRows]           = useState<BaseFornecedor[]>([]);
  const [loading, setLoading]     = useState(true);
  const [busca, setBusca]         = useState('');
  const [filtroDisc, setFiltroDisc] = useState('');
  const [filtroGen, setFiltroGen]   = useState('');
  const [filtroClasse, setFiltroClasse] = useState<ClsFilter>('');
  const [statusMsg, setStatusMsg] = useState('Pronto para navegar.');
  const [openStates, setOpenStates] = useState<OpenState>({});
  const [modal, setModal]         = useState<ModalState>({ kind: 'none' });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setRows(await baseFornecedoresRepository.listarTodos()); }
    finally { setLoading(false); }
  }

  function status(msg: string) { setStatusMsg(msg); }
  function closeModal() { setModal({ kind: 'none' }); }

  function toggleKey(key: string) {
    setOpenStates(p => ({ ...p, [key]: p[key] === false ? true : (p[key] === undefined ? false : !p[key]) }));
  }
  function setAllOpen(v: boolean) {
    const next: OpenState = {};
    for (const r of rows) {
      next['discipline::' + r.disciplina] = v;
      next['generic::' + r.generico] = v;
      next['specific::' + specKey(r)] = v;
    }
    setOpenStates(next);
    status(v ? 'Todos os grupos foram expandidos.' : 'Todos os grupos foram recolhidos.');
  }

  // filtering
  const filtered = useMemo(() => {
    const q = normalize(busca);
    return rows.filter(r => {
      if (filtroClasse && r.cls !== filtroClasse) return false;
      if (filtroDisc  && r.disciplina !== filtroDisc) return false;
      if (filtroGen   && r.generico   !== filtroGen)  return false;
      if (q) {
        const text = normalize([r.disciplina, r.generico, r.especifico, r.fornecedor, r.unidade, r.ultimo_pedido, r.ultima_obra].join(' '));
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [rows, busca, filtroDisc, filtroGen, filtroClasse]);

  const tree = useMemo(() => groupRows(filtered), [filtered]);
  const discKeys = Object.keys(tree).sort((a, b) => a.localeCompare(b, 'pt-BR'));

  const allDiscs = unique(rows.map(r => r.disciplina));
  const allGens  = unique(rows.filter(r => !filtroDisc || r.disciplina === filtroDisc).map(r => r.generico));

  // metrics
  const totalDiscs = unique(rows.map(r => r.disciplina)).length;
  const totalGens  = unique(rows.map(r => r.generico)).length;
  const totalSpecs = unique(rows.map(r => r.especifico)).length;
  const totalFornecedores = unique(rows.map(r => r.fornecedor)).length;

  // ── modal handlers ────────────────────────────────────────────────────────
  async function saveDiscipline(data: Record<string, string>) {
    if (!data.discipline) return;
    await baseFornecedoresRepository.criar({
      disciplina: data.discipline,
      generico: data.generic || 'Novo material genérico',
      especifico: data.specific || 'Novo material específico',
      unidade: data.unit || '',
      cls: 'A',
      rank: 1,
      fornecedor: data.supplier || 'Novo fornecedor',
      ultimo_valor: '',
      variacao: '',
      menor_valor: '',
      tempo_relacionamento: '',
      qtd_compras: '',
      qtd_total: '',
      fabricante: '',
      homologacao: '',
      suporte: '',
      ocorrencias: '',
      email: '',
      telefone: '',
      contato: '',
      ultimo_pedido: '',
      ultima_obra: '',
    });
    await load(); closeModal(); status('Disciplina adicionada.');
  }

  async function saveGeneric(data: Record<string, string>) {
    if (!data.generic) return;
    const m = modal as { discipline: string };
    await baseFornecedoresRepository.criar({
      disciplina: m.discipline, generico: data.generic,
      especifico: data.specific || 'Novo material específico',
      unidade: data.unit || '', cls: 'A', rank: 1,
      fornecedor: 'Novo fornecedor', ultimo_valor: '', variacao: '', menor_valor: '',
      tempo_relacionamento: '', qtd_compras: '', qtd_total: '', fabricante: '',
      homologacao: '', suporte: '', ocorrencias: '', email: '', telefone: '',
      contato: '', ultimo_pedido: '', ultima_obra: '',
    });
    await load(); closeModal(); status('Material genérico adicionado.');
  }

  async function saveSpecific(data: Record<string, string>) {
    if (!data.specific) return;
    const m = modal as { discipline: string; generic: string };
    await baseFornecedoresRepository.criar({
      disciplina: m.discipline, generico: m.generic,
      especifico: data.specific, unidade: data.unit || '', cls: 'A', rank: 1,
      fornecedor: 'Novo fornecedor', ultimo_valor: '', variacao: '', menor_valor: '',
      tempo_relacionamento: '', qtd_compras: '', qtd_total: '', fabricante: '',
      homologacao: '', suporte: '', ocorrencias: '', email: '', telefone: '',
      contato: '', ultimo_pedido: '', ultima_obra: '',
    });
    await load(); closeModal(); status('Material específico adicionado.');
  }

  async function saveAddSupplier(data: Record<string, string>) {
    if (!data.supplier) return;
    const m = modal as { base: BaseFornecedor };
    const cls = (['A','B','C'].includes((data.cls ?? '').toUpperCase()) ? data.cls.toUpperCase() : 'B') as 'A'|'B'|'C';
    await baseFornecedoresRepository.criar({
      disciplina: m.base.disciplina, generico: m.base.generico,
      especifico: m.base.especifico, unidade: m.base.unidade,
      cls, rank: m.base.rank + 1,
      fornecedor: data.supplier, ultimo_valor: data.lastValue || '', variacao: data.variation || '',
      menor_valor: data.minValue || '', tempo_relacionamento: '', qtd_compras: '', qtd_total: '',
      fabricante: '', homologacao: '', suporte: '', ocorrencias: '', email: '', telefone: '',
      contato: '', ultimo_pedido: '', ultima_obra: '',
    });
    await load(); closeModal(); status('Fornecedor adicionado.');
  }

  async function saveEditSupplier(data: Record<string, string>) {
    const m = modal as { row: BaseFornecedor };
    const cls = (['A','B','C'].includes((data.cls ?? '').toUpperCase()) ? data.cls.toUpperCase() : m.row.cls) as 'A'|'B'|'C';
    await baseFornecedoresRepository.atualizar(m.row.id, {
      fornecedor: data.supplier, cls, ultimo_valor: data.lastValue, variacao: data.variation,
      menor_valor: data.minValue, qtd_compras: data.purchaseCount, tempo_relacionamento: data.relationshipYears,
    });
    await load(); closeModal(); status('Fornecedor editado.');
  }

  async function deleteSupplier() {
    const m = modal as { row: BaseFornecedor };
    await baseFornecedoresRepository.excluir(m.row.id);
    await load(); closeModal(); status('Fornecedor excluído.');
  }

  async function deleteDiscipline() {
    const m = modal as { discipline: string };
    await baseFornecedoresRepository.excluirPorDisciplina(m.discipline);
    await load(); closeModal(); status('Disciplina excluída.');
  }

  async function deleteGeneric() {
    const m = modal as { generic: string };
    await baseFornecedoresRepository.excluirPorGenerico(m.generic);
    await load(); closeModal(); status('Material genérico excluído.');
  }

  async function deleteSpecific() {
    const m = modal as { especifico: string; unidade: string };
    await baseFornecedoresRepository.excluirPorEspecifico(m.especifico, m.unidade);
    await load(); closeModal(); status('Material específico excluído.');
  }

  async function moveSupplier(d: string, g: string, s: string) {
    const m = modal as { row: BaseFornecedor };
    await baseFornecedoresRepository.atualizar(m.row.id, { disciplina: d, generico: g, especifico: s });
    await load(); closeModal(); status('Fornecedor movido para: ' + d + ' › ' + g + ' › ' + s);
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-full" style={{ background: 'radial-gradient(circle at 12% 4%,rgba(62,127,255,.26),transparent 30%),radial-gradient(circle at 82% 8%,rgba(47,225,208,.14),transparent 26%),linear-gradient(180deg,#0b1f46 0%,#081730 52%,#061126 100%)', padding: 22 }}>

      {/* ── modais ── */}
      {modal.kind === 'addDiscipline' && (
        <FormModal title="Adicionar disciplina"
          fields={[
            { name: 'discipline', label: 'Disciplina' },
            { name: 'generic', label: 'Primeiro material genérico' },
            { name: 'specific', label: 'Primeiro material específico' },
            { name: 'unit', label: 'Unidade' },
            { name: 'supplier', label: 'Fornecedor inicial' },
          ]}
          onSave={saveDiscipline} onClose={closeModal} />
      )}
      {modal.kind === 'addGeneric' && (
        <FormModal title="Adicionar material genérico"
          fields={[{ name: 'generic', label: 'Material genérico' }, { name: 'specific', label: 'Primeiro material específico' }, { name: 'unit', label: 'Unidade' }]}
          onSave={saveGeneric} onClose={closeModal} />
      )}
      {modal.kind === 'addSpecific' && (
        <FormModal title="Adicionar material específico"
          fields={[{ name: 'specific', label: 'Material específico' }, { name: 'unit', label: 'Unidade' }]}
          onSave={saveSpecific} onClose={closeModal} />
      )}
      {modal.kind === 'addSupplier' && (
        <FormModal title="Adicionar fornecedor"
          fields={[
            { name: 'supplier', label: 'Fornecedor' },
            { name: 'cls', label: 'Classe A/B/C', value: 'B' },
            { name: 'lastValue', label: 'Último valor cotado' },
            { name: 'variation', label: 'Taxa de variação' },
            { name: 'minValue', label: 'Menor valor unidade' },
          ]}
          onSave={saveAddSupplier} onClose={closeModal} />
      )}
      {modal.kind === 'editSupplier' && (
        <FormModal title="Editar fornecedor"
          fields={[
            { name: 'supplier', label: 'Fornecedor', value: modal.row.fornecedor },
            { name: 'cls', label: 'Classe A/B/C', value: modal.row.cls },
            { name: 'lastValue', label: 'Último valor cotado', value: modal.row.ultimo_valor },
            { name: 'variation', label: 'Taxa de variação', value: modal.row.variacao },
            { name: 'minValue', label: 'Menor valor unidade', value: modal.row.menor_valor },
            { name: 'purchaseCount', label: 'Quantidade de compras', value: modal.row.qtd_compras },
            { name: 'relationshipYears', label: 'Tempo de relacionamento', value: modal.row.tempo_relacionamento },
          ]}
          onSave={saveEditSupplier} onClose={closeModal} />
      )}
      {modal.kind === 'deleteSupplier' && (
        <ConfirmModal title="Excluir fornecedor"
          msg={`Excluir ${modal.row.fornecedor} deste material?`}
          onYes={deleteSupplier} onClose={closeModal} />
      )}
      {modal.kind === 'deleteDiscipline' && (
        <ConfirmModal title="Excluir disciplina"
          msg={`Excluir a disciplina "${modal.discipline}" e todos os itens dela?`}
          onYes={deleteDiscipline} onClose={closeModal} />
      )}
      {modal.kind === 'deleteGeneric' && (
        <ConfirmModal title="Excluir material genérico"
          msg={`Excluir o material genérico "${modal.generic}" e todos os itens dele?`}
          onYes={deleteGeneric} onClose={closeModal} />
      )}
      {modal.kind === 'deleteSpecific' && (
        <ConfirmModal title="Excluir material específico"
          msg={`Excluir o material específico "${modal.especifico}" desta unidade?`}
          onYes={deleteSpecific} onClose={closeModal} />
      )}
      {modal.kind === 'moveSupplier' && (
        <MoverModal row={modal.row} allRows={rows} onSave={moveSupplier} onClose={closeModal} />
      )}

      {/* ── header ── */}
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 18, alignItems: 'flex-start', borderBottom: '1px solid rgba(126,172,255,.25)', paddingBottom: 18, marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 15, display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg,#23d8c8,#477dff)', fontWeight: 900, fontSize: 20 }}>▦</div>
          <div>
            <h1 className="text-white font-black" style={{ fontSize: 'clamp(24px,3vw,34px)', lineHeight: 1.08 }}>Base de fornecedores para o BiasiHub</h1>
            <p style={{ marginTop: 8, color: '#d6e5ff', fontSize: 14, lineHeight: 1.45 }}>Prévia alimentada pela nova planilha <b>Base_BiasiHub_Fornecedores.xlsx</b>.</p>
          </div>
        </div>
      </header>

      <div style={{ borderRadius: 16, padding: '14px 16px', marginBottom: 18, lineHeight: 1.45, fontSize: 13, border: '1px solid rgba(255,208,40,.35)', background: 'rgba(255,208,40,.1)', color: '#ffe7a0' }}>
        Botões ativados com modal próprio: adicionar, visualizar, editar, mover e excluir funcionam na prévia. Os campos manuais continuam vazios para serem preenchidos por outra base.
      </div>

      {/* ── metrics ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(140px,1fr))', gap: 14, marginBottom: 18 }}>
        {[
          { icon: '▦', label: 'Disciplinas', value: totalDiscs, sub: 'Na Base_Site' },
          { icon: '▤', label: 'Materiais genéricos', value: totalGens, sub: 'Por disciplina' },
          { icon: '⬡', label: 'Materiais específicos', value: totalSpecs, sub: 'Com unidade' },
          { icon: '▣', label: 'Fornecedores', value: totalFornecedores, sub: 'Únicos' },
          { icon: '!', label: 'Linhas site', value: rows.length, sub: 'Base completa' },
        ].map(m => (
          <div key={m.label} style={{ minHeight: 106, borderRadius: 20, border: '1px solid rgba(116,169,255,.36)', background: 'linear-gradient(180deg,rgba(17,43,94,.88),rgba(13,36,81,.94))', padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 15, display: 'grid', placeItems: 'center', background: 'rgba(47,225,208,.13)', color: '#2fe1d0', fontSize: 21 }}>{m.icon}</div>
            <div>
              <div style={{ color: '#c9d8f4', fontSize: 11, fontWeight: 950, letterSpacing: .5, textTransform: 'uppercase', marginBottom: 7 }}>{m.label}</div>
              <div style={{ fontSize: 25, fontWeight: 950, lineHeight: 1, letterSpacing: -.9 }}>{m.value}</div>
              <div style={{ color: '#e1ebff', fontSize: 12, marginTop: 6, fontWeight: 650 }}>{m.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── search panel ── */}
      <div style={{ borderRadius: 22, border: '1px solid rgba(116,169,255,.32)', background: 'linear-gradient(180deg,rgba(16,42,92,.9),rgba(12,34,77,.92))', padding: 18, marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 180px 220px 160px auto', gap: 12, alignItems: 'center' }}>
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar fornecedor, material, unidade, pedido, obra, disciplina..."
            style={{ width: '100%', minHeight: 46, borderRadius: 14, border: '1px solid rgba(132,180,255,.38)', background: '#092154', padding: '0 15px', color: '#fff', outline: 'none' }} />
          <select value={filtroDisc} onChange={e => { setFiltroDisc(e.target.value); setFiltroGen(''); }}
            style={{ width: '100%', minHeight: 46, borderRadius: 14, border: '1px solid rgba(132,180,255,.38)', background: '#092154', padding: '0 15px', color: '#fff', outline: 'none' }}>
            <option value="">Todas as disciplinas</option>
            {allDiscs.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select value={filtroGen} onChange={e => setFiltroGen(e.target.value)}
            style={{ width: '100%', minHeight: 46, borderRadius: 14, border: '1px solid rgba(132,180,255,.38)', background: '#092154', padding: '0 15px', color: '#fff', outline: 'none' }}>
            <option value="">Todos os materiais genéricos</option>
            {allGens.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={filtroClasse} onChange={e => setFiltroClasse(e.target.value as ClsFilter)}
            style={{ width: '100%', minHeight: 46, borderRadius: 14, border: '1px solid rgba(132,180,255,.38)', background: '#092154', padding: '0 15px', color: '#fff', outline: 'none' }}>
            <option value="">Todas as classes</option>
            <option>A</option><option>B</option><option>C</option>
          </select>
          <button type="button" onClick={() => { setBusca(''); setFiltroDisc(''); setFiltroGen(''); setFiltroClasse(''); setOpenStates({}); status('Filtros limpos e árvore restaurada.'); }}
            style={{ minHeight: 46, borderRadius: 12, cursor: 'pointer', background: 'linear-gradient(135deg,#23d8c8,#1b78d4)', color: '#061630', border: '1px solid rgba(47,225,208,.42)', padding: '0 18px', fontWeight: 950, fontSize: 12, whiteSpace: 'nowrap' }}>
            Limpar filtros
          </button>
        </div>
      </div>

      {/* ── tree section ── */}
      <div style={{ borderRadius: 22, border: '1px solid rgba(124,226,255,.62)', background: 'linear-gradient(180deg,rgba(16,42,92,.9),rgba(12,34,77,.92))', overflow: 'hidden', marginBottom: 18 }}>
        {/* tree head */}
        <div style={{ minHeight: 86, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(132,180,255,.22)', background: 'rgba(17,43,94,.35)', gap: 14, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 19, fontWeight: 950, color: '#31d6d2', marginBottom: 4 }}>Árvore da base de dados</div>
            <div style={{ color: '#eff6ff', fontSize: 12, fontWeight: 700 }}>Disciplina → Material genérico → Material específico → Fornecedores A/B/C</div>
            <div style={{ color: '#bfd2ff', fontSize: 12, fontWeight: 800, marginTop: 8 }}>{statusMsg}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Btn cls="primary" onClick={() => setModal({ kind: 'addDiscipline' })}>+ Disciplina</Btn>
            <Btn onClick={() => setAllOpen(true)}>Expandir tudo</Btn>
            <Btn onClick={() => setAllOpen(false)}>Recolher tudo</Btn>
            {(['A','B','C'] as ClsFilter[]).map(c => (
              <Btn key={c} cls={filtroClasse === c ? 'blue' : 'default'} onClick={() => { setFiltroClasse(filtroClasse === c ? '' : c); status(filtroClasse === c ? 'Mostrando todas as classes.' : 'Filtro aplicado: Classe ' + c + '.'); }}>
                Classe {c}
              </Btn>
            ))}
            <Btn cls={!filtroClasse ? 'blue' : 'default'} onClick={() => { setFiltroClasse(''); status('Mostrando todas as classes.'); }}>Todas</Btn>
            <span className="inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-black" style={{ background: 'rgba(47,225,208,.13)', borderColor: 'rgba(47,225,208,.24)', color: '#98fff7' }}>Amostra real da planilha</span>
          </div>
        </div>

        {/* tree body */}
        <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {loading && (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(47,225,208,.3)', borderTopColor: '#2fe1d0' }} />
                <p className="text-sm font-black uppercase tracking-widest" style={{ color: '#8fa8d4' }}>Carregando...</p>
              </div>
            </div>
          )}
          {!loading && discKeys.length === 0 && (
            <div style={{ padding: 18, color: '#bfd1f3' }}>Nenhum resultado encontrado.</div>
          )}
          {!loading && discKeys.map(d => {
            const discOpen = openStates['discipline::' + d] !== false;
            return (
              <DisciplineCard
                key={d} name={d} generics={tree[d]}
                open={discOpen} onToggle={() => toggleKey('discipline::' + d)}
                onAddGeneric={() => setModal({ kind: 'addGeneric', discipline: d })}
                onDeleteDiscipline={() => setModal({ kind: 'deleteDiscipline', discipline: d })}
                openStates={openStates}
                onGenToggle={toggleKey} onSpecToggle={toggleKey}
                onEdit={r => setModal({ kind: 'editSupplier', row: r })}
                onDelete={r => setModal({ kind: 'deleteSupplier', row: r })}
                onMove={r => setModal({ kind: 'moveSupplier', row: r })}
                onAddSpecific={(disc, gen) => setModal({ kind: 'addSpecific', discipline: disc, generic: gen })}
                onAddSupplier={base => setModal({ kind: 'addSupplier', base })}
                onDeleteGeneric={generic => setModal({ kind: 'deleteGeneric', generic })}
                onDeleteSpecific={row => setModal({ kind: 'deleteSpecific', especifico: row.especifico, unidade: row.unidade })}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
