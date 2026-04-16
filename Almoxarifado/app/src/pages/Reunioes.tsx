import { useState, useEffect } from 'react';
import { ReunioesSemanais } from '../components/reunioes/ReunioesSemanais';
import { supabase } from '../infrastructure/supabase/client';

export function Reunioes() {
  const [membros, setMembros] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarMembros() {
      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('nome')
          .eq('ativo', true)
          .order('nome');

        if (error) throw error;
        if (data) setMembros(data.map(u => u.nome));
      } catch (err) {
        console.error('Erro ao carregar membros:', err);
      } finally {
        setLoading(false);
      }
    }
    carregarMembros();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-slate-400 font-bold uppercase tracking-widest text-xs animate-pulse">
        Carregando time...
      </div>
    );
  }

  return <ReunioesSemanais membrosDisponiveis={membros} />;
}
