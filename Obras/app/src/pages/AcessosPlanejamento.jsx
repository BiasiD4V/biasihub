import React, { useState, useEffect } from 'react'
import { Users, Plus, Trash2, AlertCircle, Zap, ChevronDown, ChevronRight } from 'lucide-react'
import { supabase, perfisService } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import SearchableSelect, { obrasParaOptions } from '../components/ui/SearchableSelect'

export default function AcessosPlanejamento() {
  const { usuario } = useAuth()
  const [usuarios, setUsuarios] = useState([])
  const [obras, setObras] = useState([])
  const [acessos, setAcessos] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState(null)
  const [expandedUser, setExpandedUser] = useState(null)
  const [formularioAberto, setFormularioAberto] = useState(false)
  const [usuarioNew, setUsuarioNew] = useState('')
  const [obraNew, setObraNew] = useState('')
  const [papelNew, setPapelNew] = useState('supervisor')

  const papelOpcoes = ['gerente', 'planejamento', 'planejamento_obra', 'supervisor', 'visualizador']

  useEffect(() => {
    carregar()
  }, [])

  async function carregar() {
    try {
      setCarregando(true)

      // Carrega usuários (TODOS, inclusive admin para gerenciamento)
      const { data: usuariosData, error: usuariosError } = await supabase
        .from('perfis')
        .select('*')
        .order('nome')

      if (usuariosError) {
        console.warn('Aviso ao carregar usuários:', usuariosError)
      }

      console.log('Usuários carregados:', usuariosData?.length, usuariosData)
      setUsuarios(usuariosData || [])

      // Carrega obras
      const { data: obrasData, error: obrasError } = await supabase
        .from('obras')
        .select('*')
        .order('nome')

      if (obrasError) {
        console.warn('Aviso ao carregar obras:', obrasError)
      }

      console.log('Obras carregadas:', obrasData?.length, obrasData)
      setObras(obrasData || [])

      // Carrega acessos
      const { data: acessosData, error: acessosError } = await supabase
        .from('usuario_obra')
        .select('*')

      if (acessosError) {
        console.warn('Aviso ao carregar acessos:', acessosError)
      }

      console.log('Acessos carregados:', acessosData?.length, acessosData)
      setAcessos(acessosData || [])

      setErro(null)
    } catch (err) {
      console.error('Erro ao carregar:', err)
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }

  async function adicionarAcesso() {
    if (!usuarioNew || !obraNew) {
      alert('Selecione usuário e obra')
      return
    }

    // Verifica se já existe
    if (acessos.some(a => a.usuario_id === usuarioNew && a.obra_id === obraNew)) {
      alert('Este usuário já tem acesso a esta obra')
      return
    }

    try {
      const { data, error } = await supabase
        .from('usuario_obra')
        .insert({
          usuario_id: usuarioNew,
          obra_id: obraNew,
          papel: papelNew
        })
        .select()

      if (error) throw error

      setAcessos([...acessos, ...data])
      setUsuarioNew('')
      setObraNew('')
      setPapelNew('supervisor')
      setFormularioAberto(false)
      alert('✓ Acesso adicionado!')
    } catch (err) {
      console.error('Erro:', err)
      alert('Erro: ' + err.message)
    }
  }

  async function removerAcesso(id) {
    if (!confirm('Remover este acesso?')) return

    try {
      const { error } = await supabase
        .from('usuario_obra')
        .delete()
        .eq('id', id)

      if (error) throw error

      setAcessos(acessos.filter(a => a.id !== id))
      alert('✓ Acesso removido!')
    } catch (err) {
      console.error('Erro:', err)
      alert('Erro: ' + err.message)
    }
  }

  async function atualizarPapel(id, novoPapel) {
    try {
      const { error } = await supabase
        .from('usuario_obra')
        .update({ papel: novoPapel })
        .eq('id', id)

      if (error) throw error

      setAcessos(acessos.map(a => a.id === id ? { ...a, papel: novoPapel } : a))
      alert('✓ Papel atualizado!')
    } catch (err) {
      console.error('Erro:', err)
      alert('Erro: ' + err.message)
    }
  }

  if (carregando) {
    return <div className="p-8 text-center"><Zap className="animate-spin mx-auto" /> Carregando...</div>
  }

  if (usuario?.perfil !== 'admin') {
    return (
      <div className="p-8 text-center bg-red-50 text-red-700 rounded">
        <AlertCircle className="mx-auto mb-2" size={24} />
        <p className="font-semibold">Apenas administradores podem gerenciar acessos</p>
      </div>
    )
  }

  const getObraNome = (obraId) => {
    const obra = obras.find(o => o.id === obraId)
    return obra?.nome || obraId.slice(0, 8)
  }

  const usuarioHasAcessos = (usuarioId) => {
    return acessos.filter(a => a.usuario_id === usuarioId).length > 0
  }

  return (
    <div className="p-6 space-y-6">
      {/* INSTRUÇÕES */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex gap-3">
          <div className="flex-shrink-0 text-amber-600 mt-0.5">
            <AlertCircle size={18} />
          </div>
          <div className="text-sm">
            <p className="font-semibold text-amber-900 mb-1">Como funciona:</p>
            <ol className="list-decimal list-inside text-amber-800 space-y-0.5 text-xs">
              <li>Usuários fazem login via <strong>Microsoft 365</strong> ou Supabase em https://biasiobras.vercel.app</li>
              <li>Um perfil de <strong>supervisor</strong> é criado automaticamente</li>
              <li>Aqui você vincula cada usuário às <strong>obras que pode acessar</strong></li>
              <li>Opcionalmente, ajusta o <strong>papel</strong> (gerente, planejamento, etc)</li>
            </ol>
          </div>
        </div>
      </div>

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Acessos ao Planejamento</h1>
          <p className="text-sm text-slate-500 mt-1">Gerenciar permissões de usuários por obra</p>
        </div>
        <button
          onClick={() => setFormularioAberto(!formularioAberto)}
          className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 font-semibold flex items-center gap-2"
        >
          <Plus size={16} /> Adicionar Acesso
        </button>
      </div>

      {erro && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-start gap-2">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <div>{erro}</div>
        </div>
      )}

      {/* FORMULÁRIO */}
      {formularioAberto && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-4">
          <h2 className="font-semibold text-slate-900">Novo Acesso</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Usuário</label>
              <select
                value={usuarioNew}
                onChange={(e) => setUsuarioNew(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="">Selecione um usuário...</option>
                {usuarios.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.nome} ({u.perfil})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Obra</label>
              <SearchableSelect
                value={obraNew}
                onChange={setObraNew}
                options={obrasParaOptions(obras)}
                placeholder="Selecione uma obra..."
                clearable
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">Papel</label>
              <select
                value={papelNew}
                onChange={(e) => setPapelNew(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {papelOpcoes.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setFormularioAberto(false)}
              className="px-3 py-2 rounded bg-slate-200 text-slate-700 hover:bg-slate-300 font-semibold text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={adicionarAcesso}
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 font-semibold text-sm"
            >
              Adicionar
            </button>
          </div>
        </div>
      )}

      {/* TABELA OU LISTA EXPANDÍVEL */}
      {usuarios.length === 0 ? (
        <div className="p-8 bg-blue-50 text-center text-blue-900 rounded-lg space-y-3 border border-blue-200">
          <Users className="mx-auto text-blue-400" size={32} />
          <p className="font-semibold">Nenhum usuário fez login ainda</p>
          <p className="text-sm text-blue-800">
            Os usuários aparecerão aqui após fazer o <strong>primeiro login via Microsoft</strong>
          </p>
          <p className="text-xs mt-4 opacity-75">
            💡 Dica: Compartilhe o link <strong>https://biasiobras.vercel.app</strong> com a equipe.
            Após cada um fazer login, você poderá vincular às obras aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {usuarios.map(u => (
            <div key={u.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              {/* Header do Usuário */}
              <div
                onClick={() => setExpandedUser(expandedUser === u.id ? null : u.id)}
                className="p-4 cursor-pointer hover:bg-slate-50 flex items-center justify-between"
              >
                <div className="flex items-center gap-3 flex-1">
                  {(!usuarioHasAcessos(u.id)) && (
                    <div className="w-6 text-slate-400">—</div>
                  )}
                  {usuarioHasAcessos(u.id) && (
                    expandedUser === u.id
                      ? <ChevronDown size={18} className="text-slate-400" />
                      : <ChevronRight size={18} className="text-slate-400" />
                  )}
                  <div>
                    <div className="font-semibold text-slate-900">{u.nome}</div>
                    <div className="text-xs text-slate-500">{u.email} • {u.perfil}</div>
                  </div>
                </div>
                <div className="text-sm font-semibold text-slate-600">
                  {acessos.filter(a => a.usuario_id === u.id).length} obra(s)
                </div>
              </div>

              {/* Lista de Obras Expandida */}
              {expandedUser === u.id && usuarioHasAcessos(u.id) && (
                <div className="border-t border-slate-200 bg-slate-50">
                  {acessos
                    .filter(a => a.usuario_id === u.id)
                    .map((acesso) => (
                      <div key={acesso.id} className="p-4 border-t border-slate-200 flex items-center justify-between hover:bg-white">
                        <div>
                          <div className="font-medium text-slate-900">{getObraNome(acesso.obra_id)}</div>
                          <div className="text-xs text-slate-500">Papel atual: {acesso.papel}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={acesso.papel}
                            onChange={(e) => atualizarPapel(acesso.id, e.target.value)}
                            className="px-2 py-1 border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                          >
                            {papelOpcoes.map(p => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                          <button
                            onClick={() => removerAcesso(acesso.id)}
                            className="p-1.5 text-red-600 hover:bg-red-100 rounded"
                            title="Remover acesso"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* INFO */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
        <p className="font-semibold mb-2">📋 Matriz de Permissões</p>
        <ul className="list-disc list-inside space-y-1 text-xs">
          <li><strong>Admin:</strong> Acesso total a todas as obras (sem vinculação necesária)</li>
          <li><strong>Diretor:</strong> Visualiza planejamento, aprova reprogramações, exporta relatórios</li>
          <li><strong>Gerente:</strong> Visualiza, solicita e aprova reprogramações, exporta relatórios</li>
          <li><strong>Planejamento:</strong> Edita cronograma, registra avanços, solicita reprogramação, importa EAP</li>
          <li><strong>Supervisor:</strong> Visualiza, registra avanços, solicita reprogramação (conforme obra vinculada)</li>
          <li><strong>Visualizador:</strong> Apenas visualiza planejamento (acesso read-only)</li>
        </ul>
        <p className="text-xs mt-3 opacity-75">
          ℹ️ Admin/Diretor/Gerente/Planejamento: acesso global a todas obras. Supervisor/Visualizador: apenas obras vinculadas.
        </p>
      </div>
    </div>
  )
}
