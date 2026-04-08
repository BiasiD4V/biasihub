// src/hooks/useObrasAcessiveis.js
// Hook utilitário central para obter apenas as obras acessíveis ao usuário logado
// Uso: const obrasAcessiveis = useObrasAcessiveis(obras)

import { useAuth } from '../context/AuthContext'
import { PERFIS_ACESSO_GLOBAL } from '../lib/acesso.js'

/**
 * useObrasAcessiveis(obras)
 * Recebe um array de obras e retorna apenas as obras que o usuário pode acessar.
 * Usa PERFIS_ACESSO_GLOBAL hardcoded — não depende de configurações do banco.
 * Admin/Diretor/Gerente/Planejamento/Master: acesso global (todas as obras)
 * Supervisor/Visualizador: apenas obras vinculadas via usuario_obra
 */
export default function useObrasAcessiveis(obras = []) {
  const { usuario } = useAuth()
  if (!usuario) return []
  if (PERFIS_ACESSO_GLOBAL.includes(usuario.perfil)) return obras
  const vinculadas = usuario.obras_vinculadas || []
  return obras.filter(o => vinculadas.includes(o.id))
}
