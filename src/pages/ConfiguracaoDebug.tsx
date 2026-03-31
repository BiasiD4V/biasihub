import { useEffect, useState } from 'react';
import { supabase } from '../infrastructure/supabase/client';

export function ConfiguracaoDebug() {
  const [status, setStatus] = useState('Verificando...');
  const [info, setInfo] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const verificar = async () => {
      try {
        const url = import.meta.env.VITE_SUPABASE_URL || '(não definido)';
        const key = import.meta.env.VITE_SUPABASE_ANON_KEY
          ? import.meta.env.VITE_SUPABASE_ANON_KEY.slice(0, 20) + '...'
          : '(não definido)';

        const { count: countClientes, error: errC } = await supabase
          .from('clientes')
          .select('*', { count: 'exact', head: true });

        const { count: countFornecedores, error: errF } = await supabase
          .from('fornecedores')
          .select('*', { count: 'exact', head: true });

        setInfo({
          'VITE_SUPABASE_URL': url,
          'VITE_SUPABASE_ANON_KEY': key,
          'Clientes no banco': errC ? 'Erro: ' + errC.message : String(countClientes ?? 0),
          'Fornecedores no banco': errF ? 'Erro: ' + errF.message : String(countFornecedores ?? 0),
        });
        setStatus('OK');
      } catch (e: unknown) {
        setStatus('Erro: ' + (e instanceof Error ? e.message : String(e)));
      } finally {
        setCarregando(false);
      }
    };
    verificar();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-8 w-full max-w-lg">
        <h1 className="text-xl font-bold text-slate-800 mb-6">Debug de Configuração</h1>
        {carregando ? (
          <p className="text-slate-500">Verificando...</p>
        ) : (
          <>
            <p className={`font-medium mb-4 ${status === 'OK' ? 'text-green-600' : 'text-red-600'}`}>
              Status: {status}
            </p>
            <div className="space-y-3">
              {Object.entries(info).map(([k, v]) => (
                <div key={k} className="flex flex-col gap-1">
                  <span className="text-xs text-slate-500 font-medium uppercase">{k}</span>
                  <span className="text-sm text-slate-800 font-mono bg-slate-50 px-3 py-2 rounded-lg">{v}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
