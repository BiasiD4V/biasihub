import { Clock, CheckCircle2, Users, Zap, Shield, TrendingUp, Heart, Mail, AlertTriangle, Sparkles, Building2 } from 'lucide-react'

const deletado = (usuario) => usuario?.motivoAguardando === 'deletado'

export default function PendingAccessPage({ usuario }) {
  const isDeleteado = deletado(usuario)
  const firstName = usuario?.nome?.split(' ')[0] || 'Colaborador'

  return (
    <div className="min-h-screen bg-[#0f1c3f] text-white overflow-x-hidden">

      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 py-16 overflow-hidden">
        {/* Decoração de fundo */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#FFC82D] opacity-5 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[#233772] opacity-30 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-white/5" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] rounded-full border border-white/[0.03]" />
        </div>

        <div className="relative z-10 w-full max-w-2xl mx-auto text-center">

          {/* Logo / ícone de empresa */}
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#FFC82D] to-[#e6a800] flex items-center justify-center shadow-2xl shadow-[#FFC82D]/30">
                <Building2 size={38} className="text-[#0f1c3f]" />
              </div>
              {/* Badge de status */}
              {isDeleteado ? (
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-red-500 border-2 border-[#0f1c3f] flex items-center justify-center">
                  <AlertTriangle size={14} className="text-white" />
                </div>
              ) : (
                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-amber-400 border-2 border-[#0f1c3f] flex items-center justify-center">
                  <Clock size={14} className="text-[#0f1c3f]" />
                </div>
              )}
            </div>
          </div>

          {/* Saudação personalizada */}
          <p className="text-[#FFC82D] text-sm font-semibold tracking-widest uppercase mb-3">
            Biasi ERP · Gestão de Obras
          </p>

          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight" style={{ fontFamily: 'Montserrat' }}>
            {isDeleteado ? (
              <>Seu acesso foi<br /><span className="text-red-400">suspenso</span></>
            ) : (
              <>Bem-vindo,<br /><span className="text-[#FFC82D]">{firstName}</span>! 👋</>
            )}
          </h1>

          <p className="text-white/60 text-lg mb-10 max-w-md mx-auto leading-relaxed">
            {isDeleteado
              ? 'Identificamos que seu perfil foi desativado por um administrador.'
              : 'Seu cadastro foi recebido. Estamos preparando tudo para você.'}
          </p>

          {/* Card de status */}
          {isDeleteado ? (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-left">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={20} className="text-red-400" />
                </div>
                <div>
                  <p className="font-semibold text-red-300 mb-1">Acesso Removido pelo Administrador</p>
                  <p className="text-white/60 text-sm leading-relaxed">
                    Seu acesso foi desativado, mas <strong className="text-white/80">seu perfil está preservado</strong> e pode ser reativado a qualquer momento. Se isso foi um engano, entre em contato com a administração.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-amber-400/10 border border-amber-400/30 rounded-2xl p-6 text-left">
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 flex items-center justify-center flex-shrink-0">
                  <Sparkles size={20} className="text-amber-400" />
                </div>
                <div>
                  <p className="font-semibold text-amber-300 mb-1">Solicitação Recebida com Sucesso</p>
                  <p className="text-white/60 text-sm leading-relaxed">
                    Estamos analisando seu perfil para liberar o acesso mais adequado. Isso leva <strong className="text-white/80">24 a 48 horas</strong>. Você receberá uma notificação assim que estiver tudo pronto.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Linha do tempo */}
          <div className="mt-8 flex items-center justify-center gap-0">
            {/* Passo 1 */}
            <div className="flex flex-col items-center">
              <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <CheckCircle2 size={18} className="text-white" />
              </div>
              <p className="text-xs text-white/50 mt-2 max-w-[72px] text-center leading-tight">Perfil criado</p>
            </div>
            <div className={`w-16 h-0.5 mb-5 ${isDeleteado ? 'bg-red-500/50' : 'bg-amber-400/50'}`} />
            {/* Passo 2 */}
            <div className="flex flex-col items-center">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shadow-lg ${isDeleteado ? 'bg-red-500 shadow-red-500/30' : 'bg-amber-400 shadow-amber-400/30'}`}>
                {isDeleteado
                  ? <AlertTriangle size={18} className="text-white" />
                  : <Clock size={18} className="text-[#0f1c3f]" />
                }
              </div>
              <p className="text-xs text-white/50 mt-2 max-w-[72px] text-center leading-tight">
                {isDeleteado ? 'Acesso suspenso' : 'Em análise'}
              </p>
            </div>
            <div className="w-16 h-0.5 mb-5 bg-white/10" />
            {/* Passo 3 */}
            <div className="flex flex-col items-center">
              <div className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                <Zap size={18} className="text-white/30" />
              </div>
              <p className="text-xs text-white/30 mt-2 max-w-[72px] text-center leading-tight">
                {isDeleteado ? 'Reativação' : 'Acesso liberado'}
              </p>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 opacity-40">
          <span className="text-xs tracking-wider uppercase">Saiba mais</span>
          <div className="w-px h-8 bg-white/40" />
        </div>
      </section>

      {/* ─── SOBRE A FERRAMENTA ───────────────────────────────────────────── */}
      <section className="px-6 py-20 bg-white text-[#0f1c3f]">
        <div className="max-w-4xl mx-auto">
          <p className="text-[#FFC82D] text-sm font-semibold tracking-widest uppercase mb-3 text-center">
            Feito para você
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 leading-tight" style={{ fontFamily: 'Montserrat' }}>
            Uma plataforma completa,<br />na palma da sua mão
          </h2>
          <p className="text-center text-slate-500 max-w-xl mx-auto mb-14 leading-relaxed">
            O <strong>Biasi ERP</strong> foi construído para as pessoas que fazem a Biasi acontecer — engenheiros, técnicos, gestores e equipes de campo.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: <TrendingUp size={24} />,
                titulo: 'Cronograma & Planejamento',
                descricao: 'EAP hierárquica, CPM, caminho crítico, baseline e Curva S — tudo em tempo real.',
                cor: '#233772',
              },
              {
                icon: <Shield size={24} />,
                titulo: 'Financeiro & Controle',
                descricao: 'IDP, IDC, EVM, reprogramações e indicadores de desempenho integrados.',
                cor: '#10b981',
              },
              {
                icon: <Users size={24} />,
                titulo: 'RH & Segurança',
                descricao: 'Gestão de equipes, controle de acesso e conformidade em segurança do trabalho.',
                cor: '#FFC82D',
              },
            ].map((item) => (
              <div key={item.titulo} className="rounded-2xl border border-slate-100 p-6 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ backgroundColor: item.cor + '15', color: item.cor }}>
                  {item.icon}
                </div>
                <h3 className="font-bold text-[#233772] mb-2">{item.titulo}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{item.descricao}</p>
              </div>
            ))}
          </div>

          {/* Destaque empresa */}
          <div className="mt-12 rounded-2xl bg-[#233772] p-8 text-white flex flex-col md:flex-row items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-[#FFC82D] flex items-center justify-center flex-shrink-0">
              <Building2 size={32} className="text-[#233772]" />
            </div>
            <div>
              <p className="font-bold text-xl mb-1" style={{ fontFamily: 'Montserrat' }}>Biasi Engenharia e Instalações</p>
              <p className="text-white/70 text-sm leading-relaxed">
                Mais de <strong className="text-[#FFC82D]">30 anos</strong> de experiência em instalações elétricas e hidráulicas comerciais e industriais.
                Sediada em Louveira/SP, levando excelência a cada projeto desde 1993.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CULTURA ─────────────────────────────────────────────────────── */}
      <section className="px-6 py-20 bg-slate-50 text-[#0f1c3f]">
        <div className="max-w-4xl mx-auto">
          <p className="text-[#FFC82D] text-sm font-semibold tracking-widest uppercase mb-3 text-center">
            Nossa Cultura
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 leading-tight" style={{ fontFamily: 'Montserrat' }}>
            Você faz parte<br />de algo maior
          </h2>
          <p className="text-center text-slate-500 max-w-md mx-auto mb-14 leading-relaxed">
            Cada pessoa aqui carrega um pedaço da identidade Biasi. Estes são os valores que nos guiam.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {[
              {
                icon: <Heart size={20} />,
                titulo: 'Colaboração',
                descricao: 'Valorizamos cada contribuição. Aqui, nenhum esforço passa despercebido.',
                bg: 'bg-rose-50',
                iconColor: 'text-rose-500',
                border: 'border-rose-100',
              },
              {
                icon: <Shield size={20} />,
                titulo: 'Excelência',
                descricao: 'Buscamos sempre a melhor qualidade — nas obras, nos processos e nas pessoas.',
                bg: 'bg-blue-50',
                iconColor: 'text-blue-500',
                border: 'border-blue-100',
              },
              {
                icon: <Zap size={20} />,
                titulo: 'Inovação',
                descricao: 'Tecnologia como aliada para simplificar e potencializar nosso trabalho.',
                bg: 'bg-amber-50',
                iconColor: 'text-amber-500',
                border: 'border-amber-100',
              },
              {
                icon: <CheckCircle2 size={20} />,
                titulo: 'Transparência',
                descricao: 'Comunicação clara e honesta em todos os processos e decisões.',
                bg: 'bg-emerald-50',
                iconColor: 'text-emerald-500',
                border: 'border-emerald-100',
              },
            ].map((item) => (
              <div key={item.titulo} className={`rounded-2xl border ${item.border} ${item.bg} p-6 flex gap-4`}>
                <div className={`w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0 ${item.iconColor}`}>
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-bold text-[#233772] mb-1">{item.titulo}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{item.descricao}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA / CONTATO ───────────────────────────────────────────────── */}
      <section className="px-6 py-20 bg-[#0f1c3f] text-white text-center">
        <div className="max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-[#FFC82D] flex items-center justify-center mx-auto mb-6">
            <Mail size={28} className="text-[#0f1c3f]" />
          </div>

          {isDeleteado ? (
            <>
              <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: 'Montserrat' }}>Quer restaurar seu acesso?</h2>
              <p className="text-white/60 mb-8 leading-relaxed">
                Seu perfil está <strong className="text-white/90">intacto e preservado</strong>. Basta solicitar a reativação ao administrador do sistema.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: 'Montserrat' }}>Alguma dúvida?</h2>
              <p className="text-white/60 mb-8 leading-relaxed">
                Nossa equipe está disponível para ajudar. Entre em contato e responderemos o mais rápido possível.
              </p>
            </>
          )}

          <a
            href="mailto:biasi-admin@biasiengenharia.com.br"
            className="inline-flex items-center gap-3 bg-[#FFC82D] text-[#0f1c3f] font-bold px-8 py-4 rounded-xl hover:bg-[#e6b400] transition-colors shadow-lg shadow-[#FFC82D]/20"
          >
            <Mail size={18} />
            biasi-admin@biasiengenharia.com.br
          </a>

          <div className="mt-16 pt-8 border-t border-white/10">
            <p className="text-white/30 text-sm">Biasi Engenharia e Instalações Ltda.</p>
            <p className="text-white/20 text-xs mt-1">Desde 1993 · Louveira, SP · Instalações Elétricas e Hidráulicas</p>
          </div>
        </div>
      </section>

    </div>
  )
}
