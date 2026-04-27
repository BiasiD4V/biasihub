import { useState, useEffect } from 'react';
import { ReunioesSemanais } from '../components/comercial/ReunioesSemanais';
import { supabase } from '../infrastructure/supabase/client';

export function Reunioes() {
  const [vendedores, setVendedores] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarVendedores() {
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('nome')
          .eq('ativo', true)
          .in('departamento', ['Comercial', 'Almoxarifado'])
          .order('nome');
        
        if (error) throw error;
        if (data) setVendedores(data.map(u => u.nome));
      } catch (err) {
        console.error('Erro ao carregar vendedores:', err);
      } finally {
        setLoading(false);
      }
    }
    carregarVendedores();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">
        Carregando time...
      </div>
    );
  }

  return <ReunioesSemanais membrosDisponiveis={vendedores} />;
}
