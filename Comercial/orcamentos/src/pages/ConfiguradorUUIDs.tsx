import { useState, FormEvent } from 'react';
import { Copy, CheckCircle } from 'lucide-react';

interface User {
  email: string;
  id: string;
}

export function ConfiguradorUUIDs() {
  const [jsonInput, setJsonInput] = useState('');
  const [usuarios, setUsuarios] = useState<User[]>([]);
  const [sqlPronto, setSqlPronto] = useState('');
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErro('');
    setSqlPronto('');
    setCopiado(false);

    try {
      // Tentar parsear como JSON
      let dados = JSON.parse(jsonInput);

      // Se vier com estrutura de resposta da API
      if (dados.users) {
        dados = dados.users;
      }

      // Filtrar apenas os emails que queremos
      const emailsEsperados = [
        'guilherme@biasiengenharia.com',
        'pauloconfar@biasiengenharia.com',
        'ryan.stradioto@biasiengenharia.com'
      ];

      const usuariosFiltrados: User[] = dados
        .filter((u: any) => emailsEsperados.includes(u.email))
        .map((u: any) => ({
          email: u.email as string,
          id: u.id as string
        }));

      if (usuariosFiltrados.length === 0) {
        setErro('❌ Nenhum usuário encontrado com os emails esperados!');
        return;
      }

      setUsuarios(usuariosFiltrados);

      // Gerar SQL
      const sql = `-- Inserir usuários com UUIDs reais
INSERT INTO public.usuarios (id, nome, email, papel, ativo) VALUES
  ('${usuariosFiltrados.find(u => u.email === 'guilherme@biasiengenharia.com')?.id}', 'Guilherme', 'guilherme@biasiengenharia.com', 'admin', true),
  ('${usuariosFiltrados.find(u => u.email === 'pauloconfar@biasiengenharia.com')?.id}', 'Paulo Confar', 'pauloconfar@biasiengenharia.com', 'admin', true),
  ('${usuariosFiltrados.find(u => u.email === 'ryan.stradioto@biasiengenharia.com')?.id}', 'Ryan Stradioto', 'ryan.stradioto@biasiengenharia.com', 'admin', true)
ON CONFLICT (id) DO UPDATE SET
  nome = EXCLUDED.nome,
  email = EXCLUDED.email,
  papel = EXCLUDED.papel,
  ativo = EXCLUDED.ativo,
  atualizado_em = now();`;

      setSqlPronto(sql);
    } catch (err) {
      setErro('❌ JSON inválido! Cole o JSON da resposta da API.');
    }
  }

  function copiarParaClipboard() {
    navigator.clipboard.writeText(sqlPronto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">🔧 Configurador de UUIDs</h1>
          <p className="text-slate-300">Parse automático de UUIDs do Supabase Auth</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lado Esquerdo - Input */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">📋 Passo 1: Cole o JSON</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Instruções:
                </label>
                <ol className="list-decimal list-inside text-sm text-slate-400 space-y-1 mb-4">
                  <li>Abra DevTools (F12) → Console</li>
                  <li>Cole este comando e execute:
                    <code className="block bg-slate-900 text-amber-300 p-2 mt-1 rounded text-xs overflow-x-auto">
                      copy(document.body.innerText)
                    </code>
                  </li>
                  <li>Ou vá para: Supabase → Authentication → Users</li>
                  <li>Clique F12, Console, e cole:
                    <code className="block bg-slate-900 text-amber-300 p-2 mt-1 rounded text-xs">
                      JSON.stringify(document.querySelectorAll('tr'))
                    </code>
                  </li>
                </ol>
              </div>

              <textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder={`Cole aqui o JSON dos usuários. Exemplo:\n{\n  "users": [\n    {"email": "guilherme@...", "id": "uuid-1"},\n    ...\n  ]\n}`}
                className="w-full h-48 bg-slate-900 text-slate-100 rounded border border-slate-600 p-3 font-mono text-sm placeholder-slate-500 focus:border-blue-500 focus:outline-none"
              />

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors"
              >
                ▶️ Processar JSON
              </button>
            </form>

            {erro && (
              <div className="mt-4 bg-red-900/30 border border-red-700 text-red-300 p-3 rounded">
                {erro}
              </div>
            )}
          </div>

          {/* Lado Direito - Output */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-4">✅ Passo 2: SQL Gerado</h2>

            {usuarios.length > 0 && (
              <>
                <div className="bg-slate-900 rounded border border-slate-600 p-4 mb-4">
                  <h3 className="text-sm font-semibold text-slate-300 mb-3">Usuários encontrados:</h3>
                  <ul className="space-y-2">
                    {usuarios.map((u) => (
                      <li key={u.id} className="text-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle size={16} className="text-green-500" />
                          <span className="text-slate-300">{u.email}</span>
                        </div>
                        <div className="text-xs text-slate-500 ml-6 font-mono truncate">
                          {u.id}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {sqlPronto && (
              <>
                <div className="bg-slate-900 rounded border border-slate-600 p-4 mb-4 relative">
                  <button
                    onClick={copiarParaClipboard}
                    className="absolute top-2 right-2 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded transition-colors"
                    title="Copiar para clipboard"
                  >
                    <Copy size={16} />
                  </button>

                  <pre className="text-xs text-slate-300 font-mono overflow-x-auto max-h-64">
                    {sqlPronto}
                  </pre>
                </div>

                {copiado && (
                  <div className="bg-green-900/30 border border-green-700 text-green-300 p-3 rounded mb-4">
                    ✅ Copiado para clipboard!
                  </div>
                )}

                <div className="bg-blue-900/30 border border-blue-700 text-blue-300 p-3 rounded text-sm">
                  <strong>Próximos passos:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>Copie o SQL acima</li>
                    <li>Abra Supabase → SQL Editor</li>
                    <li>Cole e clique RUN</li>
                    <li>Execute: npm run dev</li>
                    <li>Teste login! 🎉</li>
                  </ol>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Info Footer */}
        <div className="mt-8 bg-slate-800 border border-slate-700 rounded-lg p-4 text-sm text-slate-300">
          <p>💡 <strong>Dica:</strong> Se tiver dúvida em pegar o JSON, abra o DevTools (F12) → Console e copie a resposta da API Supabase diretamente.</p>
        </div>
      </div>
    </div>
  );
}