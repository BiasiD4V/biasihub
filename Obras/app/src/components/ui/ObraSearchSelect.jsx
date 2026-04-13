import { useState, useEffect, useRef } from 'react';
import { obrasService } from '../../lib/supabase';
import useObrasAcessiveis from '../../hooks/useObrasAcessiveis';
import { Search, XCircle } from 'lucide-react';

/**
 * Componente de busca e seleção de obras (autocomplete/select)
 * Props:
 *   value: obraId selecionado (string ou '')
 *   onChange: função (obraId) => void
 *   allowTodas: boolean (se mostra opção "Todas as obras")
 *   className: string (classes extras)
 */
export default function ObraSearchSelect({ value, onChange, allowTodas = false, className = '' }) {
  const [todasObras, setTodasObras] = useState([]);
  const obras = useObrasAcessiveis(todasObras);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    obrasService.listar()
      .then(data => setTodasObras(data || []))
      .finally(() => setLoading(false));
  }, []);

  // Filtra obras pelo texto digitado
  const obrasFiltradas = !busca
    ? obras
    : obras.filter(o =>
        (o.nome && o.nome.toLowerCase().includes(busca.toLowerCase())) ||
        (o.codigo && o.codigo.toLowerCase().includes(busca.toLowerCase()))
      );

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handleClick(e) {
      if (inputRef.current && !inputRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [dropdownOpen]);

  return (
    <div className={`w-full ${className}`}>
      <div className="bg-white border-2 border-[#233772] rounded-xl shadow p-0.5 flex flex-col gap-0.5 w-full">
        <div className="relative w-full" ref={inputRef}>
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#233772]" />
          <input
            type="text"
            placeholder="Digite o nome ou código da obra..."
            value={busca}
            onChange={e => {
              setBusca(e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => setDropdownOpen(true)}
            className="pl-9 pr-10 rounded-xl border border-slate-200 py-1 w-full font-[Montserrat] text-[#233772] bg-slate-50 focus:ring-2 focus:ring-[#233772] text-base"
            style={{ fontWeight: 500, height: 32, minHeight: 30, maxHeight: 36 }}
            autoComplete="off"
          />
          {busca && (
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500"
              onClick={() => setBusca('')}
              tabIndex={-1}
              aria-label="Limpar filtro"
            >
              <XCircle size={18} />
            </button>
          )}
          {dropdownOpen && (
            <div className="absolute left-0 right-0 mt-1 z-20 bg-white border-2 border-[#233772] rounded-xl shadow-lg max-h-48 overflow-y-auto animate-fade-in" style={{ minWidth: 340, maxWidth: 600 }}>
              {allowTodas && (!busca || 'todas as obras'.includes(busca.toLowerCase())) && (
                <div
                  className={`px-4 py-1 cursor-pointer hover:bg-blue-50 font-semibold text-[#233772] ${value === '' ? 'bg-blue-100' : ''}`}
                  onClick={() => { onChange(''); setDropdownOpen(false); }}
                >
                  Todas obras que tenho acesso
                </div>
              )}
              {obrasFiltradas.length === 0 && (
                <div className="px-4 py-1 text-gray-400 select-none">Nenhuma obra encontrada</div>
              )}
              {obrasFiltradas.map(obra => (
                <div
                  key={obra.id}
                  className={`px-4 py-1 cursor-pointer hover:bg-blue-50 ${value === obra.id ? 'bg-blue-100 font-bold' : ''}`}
                  onClick={() => { onChange(obra.id); setDropdownOpen(false); }}
                >
                  {obra.codigo ? obra.codigo + ' - ' : ''}{obra.nome}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-between items-center mt-1 text-xs text-gray-500 min-h-[18px]">
          <span>{obrasFiltradas.length} obra{obrasFiltradas.length === 1 ? '' : 's'} encontrada{obrasFiltradas.length === 1 ? '' : 's'}</span>
          {loading && <span className="text-[#233772] font-semibold animate-pulse">Carregando...</span>}
        </div>
      </div>
    </div>
  );
}
