import { useEffect, useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { tarefasComentariosService, tarefasHistoricoService } from '../../lib/supabase.js'
import { useAuth } from '../../context/AuthContext.jsx'

export default function ModalComentarios({ tarefa, aberto, onClose }) {
  const { usuario } = useAuth()
  const [comentarios, setComentarios] = useState([])
  const [historico, setHistorico] = useState([])
  const [novoComentario, setNovoComentario] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!aberto || !tarefa) return
    setLoading(true)
    Promise.all([
      tarefasComentariosService.listarPorTarefa(tarefa.id),
      tarefasHistoricoService.listarPorTarefa(tarefa.id)
    ])
      .then(([coment, hist]) => {
        setComentarios(coment || [])
        setHistorico(hist || [])
      })
      .catch(e => setErro('Erro ao carregar dados: ' + (e.message || e)))
      .finally(() => setLoading(false))
  }, [aberto, tarefa])

  const handleEnviar = async e => {
    e.preventDefault()
    if (!novoComentario.trim()) return
    setLoading(true)
    setErro('')
    try {
      const novo = await tarefasComentariosService.criar({
        tarefa_id: tarefa.id,
        autor_id: usuario.id,
        comentario: novoComentario
      })
      setComentarios(prev => [...prev, novo])
      setNovoComentario('')
    } catch (e) {
      setErro('Erro ao enviar comentário: ' + (e.message || e))
    } finally {
      setLoading(false)
    }
  }

  if (!aberto || !tarefa) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200">
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <MessageCircle size={20} className="text-[#233772]" />
            <span className="font-bold text-[#233772]">Comentários e Histórico</span>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
          {erro && <div className="bg-red-100 text-red-700 px-3 py-2 rounded mb-2 font-bold">{erro}</div>}
          {loading && <div className="text-center text-[#233772] font-bold">Carregando...</div>}
          <div className="mb-4">
            <div className="font-bold text-sm text-[#233772] mb-1">Comentários</div>
            <div className="space-y-2">
              {comentarios.length === 0 && <div className="text-xs text-gray-400">Nenhum comentário ainda.</div>}
              {comentarios.map(c => (
                <div key={c.id} className="bg-slate-50 rounded-lg px-3 py-2 text-sm">
                  <div className="font-bold text-[#233772] text-xs flex items-center gap-2">
                    {c.autor?.avatar && <span className="inline-block w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center">{c.autor.avatar}</span>}
                    {c.autor?.nome || 'Usuário'}
                    <span className="text-gray-400 ml-2 text-[10px]">{new Date(c.created_at).toLocaleString()}</span>
                  </div>
                  <div className="mt-1 text-gray-700 whitespace-pre-line">{c.comentario}</div>
                </div>
              ))}
            </div>
            <form onSubmit={handleEnviar} className="mt-3 flex gap-2">
              <input
                type="text"
                value={novoComentario}
                onChange={e => setNovoComentario(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
                placeholder="Escreva um comentário..."
                disabled={loading}
                maxLength={500}
              />
              <button type="submit" className="px-4 py-2 rounded-xl bg-[#233772] text-white font-bold shadow hover:bg-[#1a2954] disabled:bg-gray-200 disabled:text-gray-400" disabled={loading || !novoComentario.trim()}>Enviar</button>
            </form>
          </div>
          <div>
            <div className="font-bold text-sm text-[#233772] mb-1">Histórico</div>
            <div className="space-y-2">
              {historico.length === 0 && <div className="text-xs text-gray-400">Nenhuma alteração registrada.</div>}
              {historico.map(h => (
                <div key={h.id} className="bg-slate-50 rounded-lg px-3 py-2 text-xs">
                  <div className="font-bold text-[#233772] flex items-center gap-2">
                    {h.alterado_por?.avatar && <span className="inline-block w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-xs font-bold flex items-center justify-center">{h.alterado_por.avatar}</span>}
                    {h.alterado_por?.nome || 'Usuário'}
                    <span className="text-gray-400 ml-2 text-[10px]">{new Date(h.created_at).toLocaleString()}</span>
                  </div>
                  <div className="mt-1 text-gray-700">
                    <span className="font-semibold">{h.acao}</span>: {h.valor_anterior} → {h.valor_novo}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
