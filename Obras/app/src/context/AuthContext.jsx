// Utilitário para converter string camelCase para snake_case
function toSnakeCase(str) {
  return str
    .replace(/([A-Z])/g, '_$1')
    .replace(/[-\s]/g, '_')
    .toLowerCase();
}

// Converte todas as permissões de um perfil para snake_case e remove duplicatas
function normalizePermissoesConfig(config) {
  const novo = {};
  for (const perfil in config) {
    if (!Array.isArray(config[perfil])) continue;
    const snake = config[perfil].map(toSnakeCase);
    // Remove duplicatas
    novo[perfil] = Array.from(new Set(snake));
  }
  return novo;
}

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { PERMISSOES_PADRAO, PERFIS_ACESSO_GLOBAL } from '../lib/acesso.js'

const AuthContext = createContext(null)

const MODO_AUTH = import.meta.env.VITE_SUPABASE_URL ? 'supabase' : 'mock'

// ─── Mapeamento papel BiasíHub → perfil ERP Obras ─────────────────────────
// A tabela `usuarios` do Hub usa o campo `papel`.
// O ERP usa o campo `perfil` com roles próprias.
const MAPA_PAPEIS = {
  'dono':          'master',
  'admin':         'admin',
  'gestor':        'gerente',
  'almoxarifado':  'visualizador',
  'comercial':     'visualizador',
}

// Gera avatar (iniciais) a partir do nome
function gerarAvatar(nome) {
  if (!nome) return '?'
  return nome.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
}

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null)
  const [erro, setErro] = useState(null)
  const [carregando, setCarregando] = useState(true)
  const [permissoesConfig, setPermissoesConfig] = useState(null) // null = usa padrão hardcoded

  // ─── Carrega configurações de permissões do banco ─────────────
  const carregarPermissoes = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('configuracoes')
        .select('valor')
        .eq('chave', 'permissoes_perfil')
        .single()
      if (data?.valor) {
        setPermissoesConfig(normalizePermissoesConfig(data.valor));
      }
    } catch {
      // Tabela pode não existir ainda — usa padrão
    }
  }, [])

  // ─── Carrega overrides de permissão do usuário ───────────────────────
  const carregarOverrides = useCallback(async (userId) => {
    try {
      const agora = new Date().toISOString()
      const { data } = await supabase
        .from('usuario_permissoes_override')
        .select('permissao, concedida, validade_em')
        .eq('usuario_id', userId)
        .or(`validade_em.is.null,validade_em.gt.${agora}`) // apenas overrides válidos
      return data || []
    } catch {
      return [] // tabela pode não existir ainda
    }
  }, [])

  // ─── Registra acesso no audit_log (sem depender do hook useAuditLog) ────
  const registrarAuditDireto = useCallback(async (perfil, acao, detalhes = null) => {
    if (!perfil?.id) return
    try {
      await supabase.from('audit_log').insert({
        usuario_id:     perfil.id,
        usuario_nome:   perfil.nome,
        usuario_perfil: perfil.perfil,
        acao,
        modulo: 'autenticacao',
        detalhes,
      })
    } catch { /* audit nunca bloqueia */ }
  }, [])

  // ─── Carrega perfil do banco via tabela `usuarios` do BiasíHub ──────────
  // Usa o campo `papel` do Hub e mapeia para perfil do ERP Obras.
  // Não cria perfis (o Hub gerencia os usuários).
  // metodoLogin: 'sso' | null (null = apenas restaurar sessão)
  const carregarPerfil = useCallback(async (userId, _userMeta = null, _sso = false, metodoLogin = null) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome, email, papel, ativo, departamento')
        .eq('id', userId)
        .single()

      if (error || !data) {
        console.error('[AUTH] Usuário não encontrado na tabela usuarios:', error?.message)
        await supabase.auth.signOut()
        setErro('Usuário não encontrado. Acesse pelo BiasíHub.')
        return false
      }

      if (!data.ativo) {
        console.warn('[AUTH] Usuário inativo:', userId)
        await supabase.auth.signOut()
        setErro('Seu acesso foi desativado. Entre em contato com o administrador.')
        return false
      }

      // Mapeia papel do Hub → perfil do ERP
      const papelHub = (data.papel || '').toLowerCase().trim()
      const perfilERP = MAPA_PAPEIS[papelHub] || 'visualizador'

      const perfil = {
        id: data.id,
        nome: data.nome,
        email: data.email,
        perfil: perfilERP,         // campo que o ERP usa para permissões
        papel: papelHub,           // campo original do Hub (para referência)
        avatar: gerarAvatar(data.nome),
        ativo: data.ativo,
        departamento: data.departamento,
        gestor_setores: [],        // não usa gestores setoriais no Hub
        permissoes_override: [],   // não usa overrides individuais
        obras_vinculadas: [],      // gestor/admin veem todas as obras (PERFIS_ACESSO_GLOBAL)
      }

      setUsuario(perfil)

      // Registra login se for acesso explícito via Hub SSO
      if (metodoLogin) {
        registrarAuditDireto(perfil, 'login', 'Login via BiasíHub').catch(() => {})
      }
      return true
    } catch (erro) {
      console.error('[AUTH] Erro ao carregar perfil:', erro.message)
      await supabase.auth.signOut()
      setErro('Erro ao carregar perfil. Tente novamente.')
      return false
    }
  }, [registrarAuditDireto])

  // ─── Verifica sessão ao iniciar ───────────────────────────────
  useEffect(() => {
    if (MODO_AUTH === 'mock') {
      console.log('[AUTH] Modo MOCK ativado, carregando bypassed')
      setCarregando(false)
      return
    }

    carregarPermissoes() // carrega configuração de permissões em paralelo

    console.log('[AUTH] Iniciando listener de sessão')
    const timeout = setTimeout(() => {
      console.warn('[AUTH] Timeout 5s atingido na verificação de sessão')
      setCarregando(false)
    }, 5000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('[AUTH] Evento:', event, '| User:', session?.user?.id, '| Provider:', session?.user?.app_metadata?.provider)

      if (event === 'INITIAL_SESSION') {
        // INITIAL_SESSION dispara:
        // 1. Na primeira carga (com sessão existente ou null)
        // 2. Após SSO redirect do Azure AD (session.user será preenchido com dados Azure)
        if (session?.user) {
          const sso = session.user.app_metadata?.provider && session.user.app_metadata.provider !== 'email'
          console.log('[AUTH] INITIAL_SESSION com user:', {
            id: session.user.id,
            sso,
            provider: session.user.app_metadata?.provider,
            email: session.user.email
          })
          // Passa 'sso' como metodoLogin para registrar login via SSO no audit_log
          await carregarPerfil(session.user.id, session.user.user_metadata, sso, sso ? 'sso' : null)
        } else {
          console.log('[AUTH] INITIAL_SESSION sem user (não autenticado)')
        }
        clearTimeout(timeout)
        setCarregando(false)
      } else if (event === 'SIGNED_OUT') {
        console.log('[AUTH] Usuário fez logout')
        setUsuario(null)
        clearTimeout(timeout)
        setCarregando(false)
      }
    })

    return () => {
      subscription.unsubscribe()
      clearTimeout(timeout)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── LOGIN MICROSOFT SSO ─────────────────────────────────────────
  const loginComMicrosoft = useCallback(async () => {
    if (MODO_AUTH !== 'supabase') {
      setErro('SSO Microsoft disponível apenas em produção.')
      return false
    }

    setErro(null)
    try {
      console.log('[SSO] Iniciando fluxo OAuth com redirectTo:', globalThis.location.origin)

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          scopes: 'email profile openid',
          redirectTo: globalThis.location.origin,
          skipBrowserRedirect: false, // Certifica que redirecionamento automático acontece
        }
      })

      console.log('[SSO] Resposta OAuth:', { data, error })

      if (error) {
        console.error('[SSO] Erro OAuth:', error)
        setErro(`Erro OAuth: ${error.message || 'Erro desconhecido'}`)
        return false
      }

      if (data?.url) {
        console.log('[SSO] Redirecionando para:', data.url)
        globalThis.location.href = data.url
        return true
      }

      console.warn('[SSO] Nenhuma URL retornada, status:', data)
      setErro('Erro ao iniciar login. Configuração OAuth pode estar incorreta.')
      return false
    } catch (e) {
      console.error('[SSO] Exceção:', e.message, e)
      setErro(`Erro ao conectar com Microsoft: ${e.message}`)
      return false
    }
  }, [])

  // ─── LOGIN email/senha ────────────────────────────────────────
  const login = useCallback(async (email, senha) => {
    setErro(null)

    if (MODO_AUTH === 'mock') {
      await new Promise(r => setTimeout(r, 400))
      const usuarios = await getMock()
      const encontrado = usuarios.find(
        u => u.email.toLowerCase() === email.toLowerCase() && u.senha === senha
      )
      if (encontrado) {
        const { senha: _, ...semSenha } = encontrado
        setUsuario(semSenha)
        return true
      }
      setErro('E-mail ou senha inválidos.')
      return false
    }

    // Supabase com timeout de 12s
    let authResult
    try {
      authResult = await Promise.race([
        supabase.auth.signInWithPassword({ email, password: senha }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 12000))
      ])
    } catch (e) {
      setErro(e.message === 'timeout'
        ? 'Tempo esgotado. Verifique sua conexão e tente novamente.'
        : 'Erro ao conectar. Tente novamente.'
      )
      return false
    }

    const { data, error } = authResult

    if (error) {
      if (error.message.includes('Invalid login')) {
        setErro('E-mail ou senha inválidos. Verifique suas credenciais.')
      } else if (error.message.includes('Email not confirmed')) {
        setErro('E-mail não confirmado. Verifique sua caixa de entrada.')
      } else {
        setErro(error.message)
      }
      return false
    }

    if (data?.user) {
      return await carregarPerfil(data.user.id, data.user.user_metadata, false, 'email')
    }

    setErro('Não foi possível autenticar. Tente novamente.')
    return false
  }, [carregarPerfil])

  // ─── LOGOUT ───────────────────────────────────────────────────
  const logout = useCallback(async () => {
    // Registra logout antes de limpar o estado (enquanto ainda temos os dados do usuário)
    if (usuario && MODO_AUTH === 'supabase') {
      await registrarAuditDireto(usuario, 'logout').catch(() => {})
    }
    if (MODO_AUTH === 'supabase') {
      await supabase.auth.signOut()
    }
    setUsuario(null)
    setErro(null)
  }, [usuario, registrarAuditDireto])

  // ─── PERMISSÕES ───────────────────────────────────────────────
  const temPermissao = useCallback((permissao) => {
    if (!usuario) return false
    // master sempre tem tudo — sem exceção
    if (usuario.perfil === 'master') return true

    // Verifica override individual do usuário primeiro (tem prioridade sobre perfil)
    const overrides = usuario.permissoes_override || []
    const override = overrides.find(o => o.permissao === permissao)
    if (override) return override.concedida

    // Fallback: usa configuração do banco se disponível, senão usa padrão hardcoded
    const config = permissoesConfig || PERMISSOES_PADRAO
    return (config[usuario.perfil] || config['visualizador'] || []).includes(permissao)
  }, [usuario, permissoesConfig])

  // Salva nova configuração de permissões no banco (admin only)
  const salvarPermissoes = useCallback(async (novaConfig) => {
    // Sempre salva em snake_case e sem duplicatas
    const configSnake = normalizePermissoesConfig(novaConfig);
    const { error } = await supabase
      .from('configuracoes')
      .upsert({
        chave: 'permissoes_perfil',
        valor: configSnake,
        atualizado_por: usuario?.id,
        atualizado_em: new Date().toISOString(),
      }, { onConflict: 'chave' })
    if (!error) setPermissoesConfig(configSnake)
    return !error
  }, [usuario])

  // Verifica se o usuário pode ver uma obra específica
  // Admin/Diretor/Gerente veem todas; outros só as vinculadas via usuario_obra
  const podeVerObra = useCallback((obraId) => {
    if (!usuario) return false
    if (PERFIS_ACESSO_GLOBAL.includes(usuario.perfil)) return true
    // obras_vinculadas é preenchido ao carregar o perfil (query em usuario_obra)
    return (usuario.obras_vinculadas || []).includes(obraId)
  }, [usuario])

  return (
    <AuthContext.Provider value={{
      usuario,
      setUsuario, // expõe setter para atualização de perfil
      erro,
      carregando,
      login,
      loginComMicrosoft,
      logout,
      temPermissao,
      podeVerObra,
      carregarOverrides, // permite recarregar overrides após edição admin
      permissoesConfig: permissoesConfig !== null ? permissoesConfig : PERMISSOES_PADRAO,
      salvarPermissoes,
      isLogado: !!usuario,
      modoAuth: MODO_AUTH,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
