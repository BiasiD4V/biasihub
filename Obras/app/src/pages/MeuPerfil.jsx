import React, { useState, useRef } from 'react'
import { User, Mail, Briefcase, Building2, Layers, Camera, Save, Loader2, Check, AlertTriangle, Lock } from 'lucide-react'
import { supabase, perfisService } from '../lib/supabase.js'
import { useAuth } from '../context/AuthContext.jsx'

const perfilBadge = {
  master:       { bg: '#111827', text: '#fff', label: 'Master' },
  admin:        { bg: '#7c3aed', text: '#fff', label: 'Admin' },
  diretor:      { bg: '#233772', text: '#fff', label: 'Diretor' },
  gerente:      { bg: '#2d4494', text: '#fff', label: 'Gerente' },
  planejamento: { bg: '#0891b2', text: '#fff', label: 'Planejamento' },
  supervisor:   { bg: '#FFC82D', text: '#233772', label: 'Supervisor' },
  visualizador: { bg: '#B3B3B3', text: '#fff', label: 'Visualizador' },
}

export default function MeuPerfil() {
  const { usuario, setUsuario } = useAuth()
  const inputFotoRef = useRef(null)

  const [form, setForm] = useState({
    nome:         usuario?.nome         || '',
    cargo:        usuario?.cargo        || '',
    setor:        usuario?.setor        || '',
    departamento: usuario?.departamento || '',
  })

  const [fotoPreview, setFotoPreview] = useState(usuario?.foto_url || null)
  const [fotoArquivo, setFotoArquivo] = useState(null)
  const [salvando,    setSalvando]    = useState(false)
  const [sucesso,     setSucesso]     = useState(false)
  const [erro,        setErro]        = useState(null)

  const badge = perfilBadge[usuario?.perfil] || perfilBadge.visualizador

  const handleFoto = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) { setErro('Foto deve ter no máximo 2 MB.'); return }
    setFotoArquivo(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  const salvar = async () => {
    if (!form.nome.trim()) { setErro('Nome é obrigatório.'); return }
    setSalvando(true)
    setErro(null)
    setSucesso(false)

    try {
      let foto_url = usuario?.foto_url || null

      if (fotoArquivo) {
        const ext = fotoArquivo.name.split('.').pop()
        const path = `avatars/${usuario.id}.${ext}`
        const { error: upErr } = await supabase.storage
          .from('perfis')
          .upload(path, fotoArquivo, { upsert: true, contentType: fotoArquivo.type })
        if (upErr) throw new Error('Erro ao enviar foto: ' + upErr.message)
        const { data: urlData } = supabase.storage.from('perfis').getPublicUrl(path)
        foto_url = urlData.publicUrl + '?t=' + Date.now()
      }

      const atualizados = {
        nome:         form.nome.trim(),
        cargo:        form.cargo.trim()        || null,
        setor:        form.setor.trim()        || null,
        departamento: form.departamento.trim() || null,
        foto_url,
      }
      await perfisService.atualizar(usuario.id, atualizados)

      if (typeof setUsuario === 'function') {
        setUsuario(prev => ({ ...prev, ...atualizados }))
      }

      setSucesso(true)
      setFotoArquivo(null)
      setTimeout(() => setSucesso(false), 3000)
    } catch (e) {
      setErro(e.message)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">

      <div>
        <h2 className="text-lg font-bold" style={{ color: '#233772' }}>Meu Perfil</h2>
        <p className="text-xs mt-0.5" style={{ color: '#B3B3B3' }}>
          Visualize e atualize suas informações pessoais
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-6" style={{ border: '1px solid #e5e7eb' }}>

        {/* Foto + nome + badge */}
        <div className="flex items-center gap-5">
          <div className="relative flex-shrink-0">
            <div className="w-20 h-20 rounded-full overflow-hidden flex items-center justify-center text-2xl font-bold"
              style={{ backgroundColor: '#233772', color: '#fff' }}>
              {fotoPreview
                ? <img src={fotoPreview} alt="avatar" className="w-full h-full object-cover" />
                : (usuario?.avatar || '?')}
            </div>
            <button
              onClick={() => inputFotoRef.current?.click()}
              className="absolute bottom-0 right-0 w-7 h-7 rounded-full flex items-center justify-center shadow-md transition-colors"
              style={{ backgroundColor: '#FFC82D', color: '#233772' }}
              title="Trocar foto">
              <Camera size={13} />
            </button>
            <input ref={inputFotoRef} type="file" accept="image/*" className="hidden" onChange={handleFoto} />
          </div>
          <div>
            <p className="font-bold text-base" style={{ color: '#233772' }}>{usuario?.nome}</p>
            <p className="text-xs mb-2" style={{ color: '#B3B3B3' }}>{usuario?.email}</p>
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold"
              style={{ backgroundColor: badge.bg, color: badge.text }}>
              {badge.label}
            </span>
          </div>
        </div>

        <hr style={{ borderColor: '#f1f5f9' }} />

        <div className="space-y-4">

          {/* Nome */}
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#233772' }}>
              <User size={11} /> Nome Completo
            </label>
            <input
              type="text"
              value={form.nome}
              onChange={e => setForm({ ...form, nome: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ border: '1.5px solid #e5e7eb', fontFamily: 'Montserrat, sans-serif' }}
              onFocus={e => e.target.style.borderColor = '#233772'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          {/* Email somente leitura */}
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#233772' }}>
              <Mail size={11} /> E-mail cadastrado
            </label>
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm"
              style={{ border: '1.5px solid #f1f5f9', backgroundColor: '#f8fafc', color: '#B3B3B3' }}>
              <span className="flex-1">{usuario?.email}</span>
              <Lock size={12} style={{ color: '#d1d5db' }} />
            </div>
            <p className="text-[10px] mt-1" style={{ color: '#B3B3B3' }}>
              O e-mail não pode ser alterado aqui. Solicite ao administrador.
            </p>
          </div>

          {/* Cargo */}
          <div>
            <label className="flex items-center gap-1.5 text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#233772' }}>
              <Briefcase size={11} /> Cargo
            </label>
            <input
              type="text"
              value={form.cargo}
              onChange={e => setForm({ ...form, cargo: e.target.value })}
              placeholder="Ex: Engenheiro de Obras"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={{ border: '1.5px solid #e5e7eb', fontFamily: 'Montserrat, sans-serif' }}
              onFocus={e => e.target.style.borderColor = '#233772'}
              onBlur={e => e.target.style.borderColor = '#e5e7eb'}
            />
          </div>

          {/* Setor + Departamento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#233772' }}>
                <Building2 size={11} /> Setor
              </label>
              <input
                type="text"
                value={form.setor}
                onChange={e => setForm({ ...form, setor: e.target.value })}
                placeholder="Ex: Operações"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ border: '1.5px solid #e5e7eb', fontFamily: 'Montserrat, sans-serif' }}
                onFocus={e => e.target.style.borderColor = '#233772'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-[11px] font-semibold mb-1.5 uppercase tracking-wider" style={{ color: '#233772' }}>
                <Layers size={11} /> Departamento
              </label>
              <input
                type="text"
                value={form.departamento}
                onChange={e => setForm({ ...form, departamento: e.target.value })}
                placeholder="Ex: Engenharia"
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={{ border: '1.5px solid #e5e7eb', fontFamily: 'Montserrat, sans-serif' }}
                onFocus={e => e.target.style.borderColor = '#233772'}
                onBlur={e => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>
          </div>
        </div>

        {erro && (
          <div className="rounded-lg px-4 py-3 text-sm flex items-center gap-2"
            style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626' }}>
            <AlertTriangle size={15} /> {erro}
          </div>
        )}
        {sucesso && (
          <div className="rounded-lg px-4 py-3 text-sm flex items-center gap-2"
            style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a' }}>
            <Check size={15} /> Perfil atualizado com sucesso!
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold text-white transition-colors"
            style={{ backgroundColor: salvando ? '#B3B3B3' : '#233772' }}
            onMouseEnter={e => !salvando && (e.currentTarget.style.backgroundColor = '#1a2a5e')}
            onMouseLeave={e => !salvando && (e.currentTarget.style.backgroundColor = '#233772')}
          >
            {salvando
              ? <><Loader2 size={14} className="animate-spin" /> Salvando...</>
              : <><Save size={14} /> Salvar Alterações</>}
          </button>
        </div>
      </div>

      <div className="rounded-xl p-4 text-sm" style={{ backgroundColor: '#f8fafc', border: '1px solid #e5e7eb' }}>
        <p className="font-semibold mb-1" style={{ color: '#233772' }}>Perfil de Acesso</p>
        <p className="text-xs" style={{ color: '#B3B3B3' }}>
          Seu perfil atual é <strong>{badge.label}</strong>. As permissões são definidas pelo administrador do sistema e não podem ser alteradas aqui.
        </p>
      </div>

    </div>
  )
}