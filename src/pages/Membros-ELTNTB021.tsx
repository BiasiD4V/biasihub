import { useEffect, useState } from 'react';
import { Users, Shield, ShieldCheck, HardHat, Circle } from 'lucide-react';
import { supabase } from '../infrastructure/supabase/client';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

interface Membro {
  id: string;
  nome: string;
  email: string;
  papel: string;
  ativo: boolean;
  criado_em: string;
}

const ICONE_PAPEL: Record<string, React.ElementType> = {
  admin: ShieldCheck,
  gestor: Shield,
  orcamentista: HardHat,
};

const COR_PAPEL: Record<string, string> = {
  admin: 'bg-red-50 text-red-700 border-red-200',
  gestor: 'bg-purple-50 text-purple-700 border-purple-200',
  orcamentista: 'bg-blue-50 text-blue-700 border-blue-200',
};

const ROTULO_PAPEL: Record<string, string> = {
  admin: 'Admin',
  gestor: 'Gestor',
  orcamentista: 'Orçamentista',
  user: 'Usuário',
  usuario: 'Usuário',
};

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function Membros() {
  const { usuario } = useAuth();
  const [membros, setMembros] = useState<Membro[]>([]);
  const [loading, setLoading] = useState(true);

  // Só admin pode ver
  if (usuario?.papel !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  useEffect(() => {
    async function carregarMembros() {
      try {
        // Usar API serverless que faz bypass do RLS
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          setLoading(false);
          return;
        }

        const response = await fetch('/api/membros', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setMembros(data as Membro[]);
        }
      } catch (err) {
        console.error('Erro ao carregar membros:', err);
      }
      setLoading(false);
    }
    carregarMembros();
  }, []);

  const totalAtivos = membros.filter(m => m.ativo).length;
  const porPapel = membros.reduce<Record<string, number>>((acc, m) => {
    acc[m.papel] = (acc[m.papel] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Membros</h1>
        <p className="text-sm text-slate-500 mt-1">Usuários cadastrados no sistema</p>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 rounded-lg p-2.5">
              <Users size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{membros.length}</p>
              <p className="text-xs text-slate-500">Total de membros</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3">
            <div className="bg-green-100 rounded-lg p-2.5">
              <Circle size={20} className="text-green-600 fill-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{totalAtivos}</p>
              <p className="text-xs text-slate-500">Ativos</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center gap-3 flex-wrap gap-y-1">
            {Object.entries(porPapel).map(([papel, qtd]) => (
              <span key={papel} className={`text-xs font-medium px-2.5 py-1 rounded-full border ${COR_PAPEL[papel] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                {ROTULO_PAPEL[papel] || papel}: {qtd}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Carregando membros...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Membro</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">E-mail</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Papel</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Desde</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {membros.map((m) => {
                const Icone = ICONE_PAPEL[m.papel] || Users;
                return (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-bold">
                            {m.nome.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-slate-700">{m.nome}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{m.email}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ${COR_PAPEL[m.papel] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                        <Icone size={12} />
                        {ROTULO_PAPEL[m.papel] || m.papel}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${m.ativo ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${m.ativo ? 'bg-green-500' : 'bg-slate-400'}`} />
                        {m.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">{formatarData(m.criado_em)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
