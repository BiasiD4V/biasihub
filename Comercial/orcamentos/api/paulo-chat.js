const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vzaabtzcilyoknksvhrc.supabase.co';
const PAULO_TRAINING_TABLE = process.env.PAULO_TRAINING_TABLE || 'paulo_feedback_termos';
const PAULO_TRAINING_ENABLED = process.env.PAULO_TRAINING_ENABLED !== 'false';
const PAULO_CONHECIMENTO_TABLE = 'paulo_conhecimento';
const CONTEXTO_ROTA = {
  '/dashboard': 'Dashboard BI com KPIs e filtros comerciais.',
  '/dashboard-antigo': 'Dashboard antigo para comparacao historica.',
  '/orcamentos': 'Lista principal de orcamentos e funil comercial.',
  '/orcamentos/kanban': 'Kanban por etapa do funil comercial.',
  '/orcamentos/:id': 'Detalhe de orcamento com historico e follow-up.',
  '/clientes': 'Cadastro e manutencao de clientes.',
  '/fornecedores': 'Cadastro e manutencao de fornecedores.',
  '/insumos': 'Catalogo de insumos e custos.',
  '/composicoes': 'Composicoes de servicos e custos.',
  '/templates': 'Templates reutilizaveis para acelerar cadastro.',
  '/mao-de-obra': 'Gestao de mao de obra.',
  '/incluso-excluso': 'Fechamento de escopo, incluso e excluso.',
  '/aprovacoes': 'Fluxo de aprovacao de propostas.',
  '/relatorios': 'Relatorios gerenciais e analiticos.',
  '/configuracoes': 'Cadastros mestres e dicionarios do sistema.',
  '/operacao/orcamentos': 'Operacao comercial de orcamentos.',
  '/meus-dispositivos': 'Controle de dispositivos e sessoes.',
  '/membros': 'Gestao de membros e papeis.',
};

const GUIAS_ROTA = {
  '/dashboard': {
    titulo: 'Dashboard BI',
    descricao: 'Painel de desempenho com volume, valores, conversao e distribuicao por filtros.',
    sugestoes: [
      'O que eu estou vendo nesse dashboard?',
      'O que significa cada numero dos cards?',
      'Como ler taxa de conversao e ticket medio?',
      'Como descobrir gargalo usando filtros?',
    ],
    passosPadrao: [
      'Aplique um recorte de periodo (ano) para nao misturar contextos.',
      'Confira os cards principais: total, fechadas, valor total, valor fechado.',
      'Abra os graficos para identificar status e tendencia no tempo.',
      'Conclua com uma acao pratica (ex.: ajustar estrategia por disciplina ou responsavel).',
    ],
    passosPorTema: {
      indicadores: [
        'Leia primeiro total de propostas e fechadas.',
        'Compare valor total versus valor fechado.',
        'Cheque taxa de conversao e ticket medio para saber eficiencia versus tamanho de negocio.',
        'Defina uma acao: aumentar volume, melhorar conversao ou elevar ticket.',
      ],
      filtros: [
        'Limpe todos os filtros.',
        'Aplique apenas um filtro por vez (ano, status, disciplina, responsavel).',
        'Observe em qual filtro os numeros mudam de forma inesperada.',
        'Valide o campo correspondente no cadastro das propostas impactadas.',
      ],
    },
  },
  '/dashboard-antigo': {
    titulo: 'Dashboard Antigo',
    descricao: 'Visao historica para comparacao com o painel BI principal.',
    sugestoes: [
      'Quando usar esse dashboard antigo?',
      'Qual a diferenca para o Dashboard BI?',
      'Como comparar os resultados entre os dois paineis?',
      'Quais filtros devo aplicar primeiro?',
    ],
    passosPadrao: [
      'Defina o periodo para comparacao.',
      'Compare os principais indicadores com o Dashboard BI.',
      'Identifique divergencias de leitura.',
      'Decida qual painel usar como referencia final para a analise.',
    ],
  },
  '/orcamentos': {
    titulo: 'Orcamentos',
    descricao: 'Lista principal para criar, editar e acompanhar propostas.',
    sugestoes: [
      'Como criar um novo orcamento?',
      'Quais campos sao obrigatorios para salvar?',
      'Como validar se o orcamento foi salvo?',
      'Como filtrar por ano/status/responsavel?',
    ],
    passosPadrao: [
      'Clique em Novo Orcamento.',
      'Preencha os campos essenciais do cadastro.',
      'Salve e confirme feedback de sucesso.',
      'Volte para a lista e busque pelo registro para validar persistencia.',
    ],
    passosPorTema: {
      cadastro: [
        'Abra Novo Orcamento.',
        'Preencha cliente, disciplina, responsavel e dados comerciais basicos.',
        'Defina status/etapa inicial coerente.',
        'Salve e confirme na grade.',
      ],
      filtros: [
        'Limpe filtros ativos.',
        'Aplique primeiro o ano e depois status.',
        'Adicione responsavel/disciplina para refinar.',
        'Se sumir resultado, verifique se o campo esta preenchido no registro.',
      ],
    },
  },
  '/orcamentos/kanban': {
    titulo: 'Kanban de Orcamentos',
    descricao: 'Visao do funil por etapa com cards de propostas.',
    sugestoes: [
      'Como ler as colunas do kanban?',
      'Por que um card mudou de etapa?',
      'Como identificar gargalo no funil?',
      'Como priorizar cards para avancar etapa?',
    ],
    passosPadrao: [
      'Identifique as colunas com maior acumulado de cards.',
      'Abra os cards mais antigos dessas colunas.',
      'Atualize etapa/status conforme situacao real.',
      'Revise o quadro para confirmar reducao de gargalo.',
    ],
  },
  '/orcamentos/:id': {
    titulo: 'Detalhe do Orcamento',
    descricao: 'Edicao completa, historico, follow-up e dados de fechamento.',
    sugestoes: [
      'Como atualizar esse orcamento sem perder dados?',
      'Como registrar follow-up corretamente?',
      'Como mudar etapa/status com seguranca?',
      'Como validar historico apos editar?',
    ],
    passosPadrao: [
      'Revise dados atuais antes de alterar.',
      'Edite apenas os campos necessarios.',
      'Salve e confira confirmacao de sucesso.',
      'Reabra o registro para validar historico e campos alterados.',
    ],
  },
  '/clientes': {
    titulo: 'Clientes',
    descricao: 'Cadastro e manutencao de clientes para uso em propostas.',
    sugestoes: [
      'Como cadastrar cliente novo?',
      'Quais dados minimos devo preencher?',
      'Como validar que o cliente ficou ativo?',
      'Cliente aqui aparece em Configuracoes?',
    ],
    passosPadrao: [
      'Clique em Novo Cliente.',
      'Preencha identificacao e contato principal.',
      'Salve e confirme na lista.',
      'Use busca para localizar e validar o registro salvo.',
    ],
  },
  '/fornecedores': {
    titulo: 'Fornecedores',
    descricao: 'Cadastro e manutencao de fornecedores para cotacoes e apoio comercial.',
    sugestoes: [
      'Quais campos sao mais importantes no fornecedor?',
      'Como cadastrar fornecedor passo a passo?',
      'Como confirmar que salvou?',
      'Como atualizar um fornecedor existente?',
    ],
    passosPadrao: [
      'Clique em Novo Fornecedor.',
      'Preencha nome/razao social, CNPJ e contato principal.',
      'Adicione telefone/e-mail e classificacao.',
      'Salve, volte para a lista e confirme pesquisando o nome.',
    ],
    passosPorTema: {
      cadastro: [
        'Abra Novo Fornecedor.',
        'Preencha nome, CNPJ e responsavel de contato.',
        'Inclua telefone/e-mail para facilitar retorno rapido.',
        'Defina classificacao e salve.',
        'Valide o registro na lista.',
      ],
      edicao: [
        'Busque o fornecedor na lista.',
        'Abra edicao e altere apenas os campos necessarios.',
        'Salve e aguarde confirmacao.',
        'Reabra o fornecedor para garantir que os campos persistiram.',
      ],
    },
  },
  '/insumos': {
    titulo: 'Insumos',
    descricao: 'Catalogo de materiais e itens de custo usados nas composicoes.',
    sugestoes: [
      'Como cadastrar um insumo?',
      'Quais campos impactam mais o custo?',
      'Como corrigir valor de um insumo?',
      'Como validar o salvamento?',
    ],
    passosPadrao: [
      'Cadastre descricao, unidade e custo.',
      'Defina categoria/classificacao.',
      'Salve e valide na lista.',
      'Teste busca para confirmar que esta encontravel.',
    ],
  },
  '/composicoes': {
    titulo: 'Composicoes',
    descricao: 'Composicoes unitarias com insumos e mao de obra para formar custos.',
    sugestoes: [
      'Como montar uma composicao nova?',
      'Como revisar custo total?',
      'Como validar itens incluidos?',
      'Como corrigir composicao existente?',
    ],
    passosPadrao: [
      'Crie a composicao com nome claro.',
      'Adicione insumos e mao de obra com quantidades corretas.',
      'Confira o custo total calculado.',
      'Salve e valide abrindo novamente o item.',
    ],
  },
  '/templates': {
    titulo: 'Templates',
    descricao: 'Modelos para acelerar criacao de estruturas repetitivas.',
    sugestoes: [
      'Como criar um template util?',
      'Como aplicar template em um cadastro?',
      'Como revisar template antes de usar?',
      'Como evitar duplicidade de templates?',
    ],
    passosPadrao: [
      'Crie template com nome descritivo.',
      'Inclua apenas itens realmente reutilizaveis.',
      'Teste aplicacao em um caso real.',
      'Ajuste e publique para uso do time.',
    ],
  },
  '/mao-de-obra': {
    titulo: 'Mao de Obra',
    descricao: 'Gestao de tipos e custos de mao de obra usados em composicoes.',
    sugestoes: [
      'Como cadastrar uma mao de obra nova?',
      'Como ajustar custo sem quebrar composicoes?',
      'Quais campos revisar primeiro?',
      'Como validar salvamento?',
    ],
    passosPadrao: [
      'Cadastre funcao/tipo de mao de obra.',
      'Defina custo e unidade de referencia.',
      'Salve e valide na lista.',
      'Revise composicoes impactadas, se houver.',
    ],
  },
  '/incluso-excluso': {
    titulo: 'Incluso / Excluso',
    descricao: 'Tabela de fechamento de escopo com responsabilidades e pendencias.',
    sugestoes: [
      'Como preencher incluso/excluso passo a passo?',
      'Qual diferenca entre incluso, excluso e premissa?',
      'Como relacionar disciplina e responsavel?',
      'Como revisar pendencias antes de finalizar?',
    ],
    passosPadrao: [
      'Registre o item de escopo.',
      'Classifique como incluso, excluso ou premissa.',
      'Associe disciplina e responsavel.',
      'Revise observacoes/pendencias e salve.',
    ],
  },
  '/aprovacoes': {
    titulo: 'Aprovacoes',
    descricao: 'Fluxo de aprovacao de propostas e controle de status.',
    sugestoes: [
      'Como aprovar uma proposta corretamente?',
      'Como identificar o responsavel atual?',
      'O que fazer quando aprovacao trava?',
      'Como validar alteracao de status?',
    ],
    passosPadrao: [
      'Abra a proposta pendente.',
      'Revise dados de valor e escopo.',
      'Aplique decisao (aprovar/reprovar) com justificativa, quando necessario.',
      'Confirme o novo status na lista.',
    ],
  },
  '/relatorios': {
    titulo: 'Relatorios',
    descricao: 'Analises gerenciais com filtros e consolidacao de resultados.',
    sugestoes: [
      'Como montar um relatorio confiavel?',
      'Quais filtros aplicar primeiro?',
      'Como interpretar resultado rapidamente?',
      'Como validar se o recorte esta correto?',
    ],
    passosPadrao: [
      'Defina o objetivo da analise.',
      'Aplique periodo e filtros centrais.',
      'Leia indicadores principais e comparativos.',
      'Registre conclusao e acao recomendada.',
    ],
  },
  '/configuracoes': {
    titulo: 'Configuracoes',
    descricao: 'Cadastros mestres que alimentam filtros e formularios do sistema.',
    sugestoes: [
      'Como criar um novo cadastro mestre?',
      'O que muda no sistema quando altero configuracoes?',
      'Como evitar valores antigos nos filtros?',
      'Como validar se cadastro novo apareceu nas telas?',
    ],
    passosPadrao: [
      'Acesse a aba correta do cadastro mestre.',
      'Crie ou edite o item desejado.',
      'Salve e confirme na propria aba.',
      'Valide reflexo em telas que consomem esse cadastro.',
    ],
  },
  '/operacao/orcamentos': {
    titulo: 'Operacao - Orcamentos',
    descricao: 'Visao operacional de propostas para acompanhamento diario.',
    sugestoes: [
      'Como operar essa tela no dia a dia?',
      'Como priorizar propostas?',
      'Como ajustar filtros de trabalho?',
      'Como validar alteracoes rapidas?',
    ],
    passosPadrao: [
      'Filtre o recorte de trabalho do dia.',
      'Priorize propostas por urgencia/status.',
      'Atualize os registros necessarios.',
      'Revise a lista final para garantir consistencia.',
    ],
  },
  '/meus-dispositivos': {
    titulo: 'Meus Dispositivos',
    descricao: 'Gestao de sessoes e seguranca dos dispositivos autenticados.',
    sugestoes: [
      'Como remover um dispositivo com seguranca?',
      'Quando devo encerrar sessoes antigas?',
      'Como identificar acesso suspeito?',
      'Como confirmar que removi o dispositivo certo?',
    ],
    passosPadrao: [
      'Revise a lista de dispositivos ativos.',
      'Identifique sessao antiga ou desconhecida.',
      'Remova o dispositivo selecionado.',
      'Confirme que a sessao saiu da lista apos atualizacao.',
    ],
  },
  '/membros': {
    titulo: 'Membros',
    descricao: 'Gestao de usuarios, papeis e permissoes.',
    sugestoes: [
      'Como alterar papel de um membro?',
      'Como redefinir senha com seguranca?',
      'Quais cuidados antes de editar permissoes?',
      'Como validar alteracao aplicada?',
    ],
    passosPadrao: [
      'Abra o membro alvo na lista.',
      'Ajuste papel/permissao ou senha.',
      'Salve e confirme resposta de sucesso.',
      'Recarregue a lista para validar alteracao persistida.',
    ],
  },
};

const CAMPOS_PRIORITARIOS = {
  '/fornecedores': ['nome/razao social', 'CNPJ', 'contato principal', 'telefone/e-mail', 'classificacao'],
  '/clientes': ['nome/razao social', 'CNPJ/CPF', 'contato principal', 'e-mail e telefone', 'status ativo'],
  '/insumos': ['descricao do insumo', 'unidade', 'custo', 'categoria'],
  '/composicoes': ['nome da composicao', 'itens de custo', 'quantidades', 'valor total'],
  '/orcamentos': ['cliente', 'disciplina', 'responsavel', 'status/etapa', 'dados comerciais basicos'],
  '/incluso-excluso': ['item/escopo', 'tipo (incluso/excluso/premissa)', 'disciplina', 'responsavel', 'observacao'],
  '/dashboard': ['total de propostas', 'fechadas', 'valor total', 'valor fechado', 'taxa de conversao', 'ticket medio'],
};

const TERMOS_GERAIS = {
  'dashboard': 'Dashboard e o painel principal de indicadores do sistema.',
  'clientes': 'Clientes e a area de cadastro/gestao de clientes do sistema.',
  'fornecedores': 'Fornecedores e a area de cadastro/gestao de fornecedores e parceiros.',
  'insumos': 'Insumos e o catalogo de materiais com custo, fornecedor e historico.',
  'composicoes': 'Composicoes e a biblioteca de servicos para formar custos de orcamento.',
  'templates': 'Templates sao estruturas reutilizaveis para acelerar montagem de orcamentos.',
  'mao de obra': 'Mao de obra e a area para composicao unitara de profissionais e coeficientes.',
  'incluso / excluso': 'Incluso / Excluso define limite de responsabilidade no escopo da obra.',
  'orcamentos': 'Orcamentos e a operacao principal de propostas comerciais.',
  'aprovacoes': 'Aprovacoes e a fila de revisoes pendentes para decisao.',
  'relatorios': 'Relatorios e a area de analises e exportacoes gerenciais.',
  'configuracoes': 'Configuracoes centraliza dicionarios e dados mestres do sistema.',
  'meus dispositivos': 'Meus Dispositivos mostra computadores com sessao lembrada da conta.',
  'membros': 'Membros e a administracao de usuarios e papeis de acesso.',
  'em desenvolvimento': 'Em desenvolvimento indica modulo em construcao, ainda sem fluxo completo liberado.',
  'principal': 'Principal e o agrupamento de navegacao da area core no menu lateral.',
  'cadastros': 'Cadastros agrupa os modulos de base (clientes, fornecedores, insumos etc.).',
  'operacao': 'Operacao agrupa telas de execucao comercial (orcamentos e aprovacoes).',
  'analise': 'Analise agrupa telas de leitura gerencial e BI.',
  'sistema': 'Sistema agrupa configuracoes e seguranca da conta.',
  'administracao': 'Administracao agrupa gestao de membros/permissoes.',
  'sair': 'Sair encerra a sessao autenticada do usuario atual.',
};

const TERMOS_ROTA = {
  '/dashboard': {
    'card': 'Cards sao os indicadores-resumo no topo (ex.: total, fechadas, valor total).',
    'kpi': 'KPI e um indicador-chave de desempenho para medir resultado comercial.',
    'total de proposta': 'Total de propostas e a quantidade de propostas no recorte atual dos filtros.',
    'total de propostas': 'Total de propostas e a quantidade de propostas no recorte atual dos filtros.',
    'propostas': 'Propostas sao os registros comerciais/orcamentos que entram no funil e nos indicadores do painel.',
    'fechada': 'Fechada e a proposta com status FECHADO, ou seja, negocio ganho.',
    'fechadas': 'Fechadas e a quantidade de propostas ganhas (status FECHADO).',
    'fehcada': 'Fechada e a proposta com status FECHADO, ou seja, negocio ganho.',
    'nao fechada': 'Nao fechada representa proposta encerrada sem ganho.',
    'nao fechadas': 'Nao fechadas e o total de propostas encerradas sem ganho.',
    'enviada': 'Enviada representa proposta que foi enviada ao cliente e aguarda retorno/andamento.',
    'enviadas': 'Enviadas e a quantidade de propostas na fase de envio/analise.',
    'valor total': 'Valor total e a soma de valor_orcado de todas as propostas no recorte atual.',
    'valor fechado': 'Valor fechado e a soma de valor_orcado das propostas com status FECHADO.',
    'taxa de conversao': 'Taxa de conversao = propostas fechadas dividido pelo total de propostas no recorte.',
    'ticket medio': 'Ticket medio = valor total dividido pelo numero de propostas.',
    'propostas por ano': 'Grafico de Propostas por Ano mostra volume por ano e situacao (em andamento, fechadas, perdidas).',
    'distribuicao por status': 'Distribuicao por Status mostra percentual de cada status dentro do recorte atual.',
    'evolucao mensal': 'Evolucao Mensal mostra tendencia de total e fechadas ao longo dos meses.',
    'funil comercial': 'Funil Comercial mostra quantidade e valor por etapa do processo comercial.',
    'top 10 responsaveis': 'Ranking de responsaveis com maior volume de propostas no recorte.',
    'valor por disciplina': 'Compara valor orcado por disciplina tecnica.',
    'top 10 clientes por valor': 'Ranking de clientes com maior valor total orcado no recorte.',
    'tipo de obra': 'Compara valor total por tipologia de obra (ex.: OBRA, TP).',
    'ranking de conversao': 'Ranking de Conversao compara percentual de fechamento por responsavel (com minimo de propostas).',
    'propostas detalhadas': 'Secao de tabela detalhada com abas Todas, Fechadas e Perdidas.',
    'todas': 'Aba com todas as propostas do recorte atual.',
    'perdidas': 'Aba com propostas nao fechadas/canceladas/declinadas conforme regra da tela.',
  },
  '/orcamentos': {
    'etapa': 'Etapa representa o ponto do funil comercial em que a proposta se encontra.',
    'status': 'Status mostra a situacao atual da proposta (ex.: enviado, fechado, nao fechado).',
    'responsavel': 'Responsavel e quem conduz comercialmente aquele orcamento.',
    'lista': 'Lista mostra os orcamentos em formato tabular para busca e filtros rapidos.',
    'kanban': 'Kanban mostra os orcamentos por etapa do funil comercial.',
    'novo orcamento': 'Novo Orcamento abre o cadastro de uma proposta nova.',
    'taxa de fechamento': 'Taxa de fechamento e o percentual de propostas ganhas sobre o total.',
    'valor total orcado': 'Valor Total Orcado e a soma do valor_orcado no recorte atual.',
    'buscar': 'Buscar filtra por cliente, obra ou numero da proposta.',
    'limpar': 'Limpar remove filtros ativos e volta ao conjunto geral.',
    'total de propostas': 'Total de Propostas mostra quantas propostas existem no recorte atual.',
  },
  '/clientes': {
    'novo cliente': 'Novo Cliente abre cadastro de cliente novo.',
    'todos os tipos': 'Filtro para limitar clientes por tipo/classificacao.',
    'todos os status': 'Filtro para limitar clientes por status ativo/inativo.',
    'todos os segmentos': 'Filtro para limitar clientes por segmento de mercado.',
    'buscar por razao social fantasia ou cnpj': 'Busca textual por razao social, nome fantasia ou CNPJ.',
    'cnpj / cpf': 'Documento fiscal do cliente, usado para validacao e busca.',
  },
  '/fornecedores': {
    'classificacao': 'Classificacao ajuda a separar fornecedores por tipo, qualidade ou estrategia de compra/cotacao.',
    'contato principal': 'Contato principal e a pessoa/referencia mais importante para tratar cotacao e retorno.',
    'novo fornecedor': 'Novo Fornecedor abre cadastro de fornecedor novo.',
    'todos os estados': 'Filtro por UF/estado para localizar fornecedores por regiao.',
    'buscar por nome cnpj ou cidade': 'Busca textual por nome, CNPJ ou cidade do fornecedor.',
  },
  '/insumos': {
    'total de insumos': 'Total de Insumos mostra quantos itens existem no catalogo.',
    'fornecedores': 'Mostra quantidade de empresas vinculadas aos insumos cadastrados.',
    '+90 dias sem preco': 'Indica itens sem atualizacao de preco ha mais de 90 dias.',
    '+180 dias sem preco': 'Indica itens sem atualizacao de preco ha mais de 180 dias (prioridade alta).',
    'status': 'Status indica se o preco esta recente ou defasado pelo tempo sem atualizacao.',
    'atualiz.': 'Atualiz. indica a data da ultima atualizacao do preco.',
    'un.': 'Un. e a unidade de medida do insumo (PÃ‡, m, m2 etc.).',
    'custo': 'Custo e o valor unitario do insumo.',
    'todos os fornecedores': 'Filtro para restringir lista a um fornecedor especifico.',
    'todas unidades': 'Filtro para restringir por unidade de medida.',
    'qualquer periodo': 'Filtro temporal para recorte de atualizacao de precos.',
  },
  '/composicoes': {
    'biblioteca de composicoes': 'Biblioteca de Composicoes centraliza servicos compostos com historico/versionamento.',
    'versionamento': 'Versionamento guarda evolucao de composicoes ao longo do tempo.',
    'nova composicao': 'Nova Composicao abre fluxo para criar composicao de servico.',
  },
  '/templates': {
    'estruturas reutilizaveis': 'Estruturas Reutilizaveis sao modelos para reaproveitar disciplinas/etapas/ambientes.',
    'tipologia': 'Tipologia define o tipo de obra/modelo usado como base do template.',
    'hierarquia de disciplinas etapas e ambientes': 'Define a organizacao estrutural do template para reutilizacao.',
  },
  '/mao-de-obra': {
    'atividade': 'Atividade e o servico ou tarefa que sera executada (ex.: alvenaria, pintura, montagem).',
    'profissionais': 'Profissionais sao os tipos de mao de obra usados na atividade (ex.: oficial, ajudante, encarregado).',
    'profissional': 'Profissional e cada funcao de mao de obra considerada na composicao da atividade.',
    'jornada': 'Jornada e a quantidade de horas de trabalho por dia usada no calculo da atividade.',
    'coef': 'Coef. (Hh/UN) e o coeficiente de horas-homem por unidade do servico.',
    'hh': 'HH significa horas-homem, usado para calcular esforco de mao de obra.',
    'unid qtd': 'Unid QTD e a unidade base de quantidade da atividade (ex.: m2, m3, un).',
    'composicao unitaria': 'Composicao Unitaria representa o calculo de mao de obra por unidade de servico.',
    'nova composicao': 'Nova Composicao cria uma atividade com profissionais e coeficientes.',
  },
  '/incluso-excluso': {
    'premissa': 'Premissa e uma condicao considerada verdadeira para montar o escopo e custo.',
    'incluso': 'Incluso e o que esta contemplado no escopo da proposta.',
    'excluso': 'Excluso e o que nao esta contemplado no escopo da proposta.',
    'pendencia': 'Pendencia e um ponto em aberto que precisa de definicao para fechar escopo.',
    'fechamento de escopo': 'Fechamento de Escopo define limite de responsabilidade por item da obra.',
    'novo item': 'Novo Item cria linha de escopo com classificacao e responsavel.',
  },
  '/aprovacoes': {
    'fila de revisoes': 'Fila de revisoes mostra orcamentos aguardando aprovacao.',
    'aguardando aprovacao': 'Status de itens que dependem de decisao do aprovador.',
    'comentarios': 'Comentarios registram justificativas e contexto da decisao de aprovacao.',
  },
  '/relatorios': {
    'analises': 'Analises mostram leitura gerencial de produtividade e performance comercial.',
    'exportacoes': 'Exportacoes geram arquivos para compartilhamento externo.',
    'bdi': 'BDI e indicador de Beneficios e Despesas Indiretas aplicado no orcamento.',
    'indicadores por disciplina e periodo': 'Permite comparar desempenho por disciplina em janelas de tempo.',
  },
  '/configuracoes': {
    'cadastro mestre': 'Cadastro mestre e uma lista padrao usada por outras telas em filtros e formularios.',
    'dicionario': 'Dicionario e o conjunto de valores padrao (tipos, disciplinas, responsaveis etc.).',
    'tipos de obra': 'Tab para gerenciar tipologias oficiais de obras.',
    'disciplinas': 'Tab para gerenciar disciplinas tecnicas usadas em filtros e propostas.',
    'responsaveis comerciais': 'Tab para gerenciar responsaveis usados no funil comercial.',
    'unidades': 'Tab para unidades/simbolos de medida padrao.',
    'regioes': 'Tab para classificacao geografica (UF/regiao).',
    'categorias': 'Tab para categorias de insumo/servico/equipamento.',
    'mao de obra': 'Tab para tipos oficiais de mao de obra.',
    'nova disciplina': 'Acao para cadastrar disciplina nova.',
    'novo responsavel': 'Acao para cadastrar responsavel comercial novo.',
    'nova unidade': 'Acao para cadastrar unidade nova.',
    'nova regiao': 'Acao para cadastrar regiao nova.',
    'nova categoria': 'Acao para cadastrar categoria nova.',
    'novo tipo de mao de obra': 'Acao para cadastrar tipo de mao de obra novo.',
    'novo tipo de obra': 'Acao para cadastrar tipo de obra novo.',
    'status': 'Status indica ativo/inativo do item de cadastro mestre.',
    'cod / simb.': 'Codigo ou simbolo de referencia do item cadastrado.',
    'acoes': 'Acoes de editar, ativar/inativar ou remover item.',
  },
  '/meus-dispositivos': {
    'lembrar de mim': 'Opcao que salva sessao no dispositivo atual e invalida outras sessoes lembradas.',
    'ultimo acesso': 'Data/hora da ultima utilizacao registrada desse dispositivo.',
    'criado em': 'Data/hora de criacao do registro de dispositivo salvo.',
    'windows pc': 'Identificacao do tipo de dispositivo usado na autenticacao.',
  },
  '/membros': {
    'total de membros': 'Quantidade total de usuarios cadastrados no sistema.',
    'ativos': 'Quantidade de usuarios com status ativo.',
    'papel': 'Perfil de permissao do usuario (admin, gestor, orcamentista).',
    'desde': 'Data de criacao/cadastro do membro.',
    'acoes': 'Acoes para editar papel e redefinir senha.',
  },
};

const BLOCOS_ROTA = {
  '/dashboard': [
    'Cabecalho com filtros principais',
    'Cards de KPI no topo',
    'Graficos de distribuicao e evolucao',
    'Tabela/listas de apoio para leitura operacional',
  ],
  '/orcamentos': [
    'Barra de filtros e busca',
    'Acoes de criacao e edicao',
    'Tabela principal de propostas',
    'Navegacao para detalhe de orcamento',
  ],
  '/fornecedores': [
    'Busca e filtros de fornecedores',
    'Botao de novo cadastro',
    'Tabela com dados de contato/classificacao',
    'Acoes de edicao e manutencao',
  ],
  '/clientes': [
    'Cabecalho com resumo de clientes',
    'Barra de busca e filtros por tipo/status/segmento',
    'Tabela de clientes com CNPJ/CPF e status',
    'Acoes de criacao/edicao de cliente',
  ],
  '/insumos': [
    'Cards com total e alertas de atualizacao de preco',
    'Busca de descricao/fornecedor/codigo',
    'Filtros por fornecedor, unidade e periodo',
    'Tabela de insumos com custo e data de atualizacao',
  ],
  '/composicoes': [
    'Cabecalho da biblioteca com contextualizacao',
    'Acoes de nova composicao e busca',
    'Lista/tabela de composicoes com versionamento',
    'Acoes de manutencao da composicao',
  ],
  '/templates': [
    'Cabecalho com status do modulo',
    'Descricao de objetivo e estrutura dos templates',
    'Area de listagem/versionamento de templates',
    'Acoes de criacao e manutencao (quando habilitadas)',
  ],
  '/mao-de-obra': [
    'Lista de atividades/composicoes',
    'Tabela de profissionais por atividade',
    'Campos de jornada, coeficiente e unidade',
    'Acoes de salvar, editar e remover itens',
  ],
  '/incluso-excluso': [
    'Tabela de itens de escopo',
    'Classificacao incluso/excluso/premissa',
    'Campos de disciplina e responsavel',
    'Observacoes e pendencias para fechamento',
  ],
  '/orcamentos': [
    'Cards de resumo de propostas e taxa de fechamento',
    'Busca principal por cliente/obra/numero',
    'Filtros por ano, status, disciplina e responsavel',
    'Tabela e alternancia Lista/Kanban',
  ],
  '/aprovacoes': [
    'Cabecalho com contexto da fila de revisoes',
    'Lista de itens aguardando aprovacao',
    'Area de decisao e comentarios',
    'Status de desenvolvimento do modulo',
  ],
  '/relatorios': [
    'Cabecalho de analises e exportacoes',
    'Descricao dos tipos de relatorio disponiveis',
    'Filtros de periodo e disciplina',
    'Area de visualizacao/exportacao (quando habilitada)',
  ],
  '/configuracoes': [
    'Abas de cadastros mestres',
    'Acoes de criacao por aba (Novo Tipo, Nova Disciplina etc.)',
    'Busca por texto/codigo/simbolo',
    'Tabela com status, codigo e acoes',
  ],
  '/meus-dispositivos': [
    'Lista de dispositivos com acesso salvo',
    'Dados de ultimo acesso e criacao da sessao',
    'Orientacao de seguranca sobre lembrar de mim',
  ],
  '/membros': [
    'Cards de resumo de total e ativos',
    'Distribuicao por papel',
    'Tabela de membros com status e data',
    'Acoes de edicao de papel e senha',
  ],
};

const CORES_ROTA = {
  '/dashboard': [
    'Verde costuma representar ganho/fechado/positivo',
    'Vermelho costuma representar perda/cancelamento/alerta',
    'Azul costuma representar informacao neutra ou em andamento',
    'Amarelo costuma representar revisao/atencao',
  ],
  '/orcamentos': [
    'Badges coloridas ajudam a separar status e prioridade',
    'Tons de azul geralmente marcam acoes principais',
    'Tons de vermelho geralmente sinalizam risco/remocao',
  ],
  '/mao-de-obra': [
    'Azul destaca modo de edicao e foco',
    'Cinza marca informacao de apoio/neutra',
    'Vermelho sinaliza remocao ou erro de validacao',
  ],
};

const ACOES_GERAIS = {
  'novo': 'Abre o fluxo de criacao de um novo registro na tela atual.',
  'salvar': 'Persiste as alteracoes feitas no formulario/registro atual.',
  'editar': 'Coloca o item em modo de edicao para alterar os campos.',
  'excluir': 'Remove o item selecionado. Normalmente exige confirmacao.',
  'remover': 'Remove o item selecionado. Normalmente exige confirmacao.',
  'buscar': 'Filtra a lista com base no texto digitado.',
  'filtro': 'Aplica recortes para reduzir/organizar os dados exibidos.',
  'limpar filtros': 'Remove filtros ativos e volta para o conjunto completo de dados.',
  'atualizar': 'Recarrega os dados da tela para refletir informacoes mais recentes.',
};

const ACOES_ROTA = {
  '/dashboard': {
    'filtrar': 'Aplica recortes (ano, status, responsavel, disciplina, cliente) para recalcular os KPIs e graficos.',
    'limpar filtros': 'Zera os filtros e volta para a leitura geral do painel.',
    'atualizar': 'Recarrega os dados do dashboard para refletir o estado mais recente das propostas.',
  },
  '/orcamentos': {
    'novo orcamento': 'Abre o cadastro de nova proposta/orcamento.',
    'editar': 'Abre edicao do orcamento selecionado.',
    'kanban': 'Abre a visao por etapas do funil para acompanhar movimento dos orcamentos.',
  },
  '/orcamentos/kanban': {
    'mover card': 'Muda o card de etapa no funil, refletindo andamento comercial.',
  },
  '/orcamentos/:id': {
    'salvar': 'Salva alteracoes no detalhe do orcamento.',
    'anexo': 'Envia arquivo para storage e vincula ao orcamento.',
    'upload': 'Envia arquivo para storage e vincula ao orcamento.',
  },
  '/fornecedores': {
    'novo fornecedor': 'Abre cadastro de fornecedor novo.',
    'editar fornecedor': 'Abre edicao de fornecedor existente.',
    'todos os estados': 'Filtra fornecedores por estado/UF.',
  },
  '/clientes': {
    'novo cliente': 'Abre cadastro de cliente novo.',
    'editar cliente': 'Abre edicao de cliente existente.',
    'todos os tipos': 'Filtra clientes por tipo.',
    'todos os status': 'Filtra clientes por status (ativo/inativo).',
    'todos os segmentos': 'Filtra clientes por segmento.',
  },
  '/insumos': {
    'filtros': 'Abre/aplica filtros por fornecedor, unidade e periodo.',
    'todos os fornecedores': 'Filtra para um fornecedor especifico.',
    'todas unidades': 'Filtra por unidade de medida.',
    'qualquer periodo': 'Filtra por faixa de atualizacao de preco.',
  },
  '/composicoes': {
    'nova composicao': 'Cria composicao nova de servico.',
    'versionar': 'Cria nova versao de composicao mantendo historico.',
  },
  '/templates': {
    'criar template': 'Inicia criacao de template de orcamento (quando modulo estiver habilitado).',
    'versionar template': 'Cria nova versao do template existente.',
  },
  '/mao-de-obra': {
    'adicionar profissional': 'Inclui um novo profissional na atividade em edicao.',
    'editar': 'Ativa modo de edicao da atividade selecionada.',
    'salvar': 'Grava atividade e profissionais alterados.',
    'remover': 'Exclui atividade ou profissional selecionado.',
  },
  '/incluso-excluso': {
    'novo item': 'Abre o formulario para criar item de escopo (incluso/excluso/premissa).',
    'salvar': 'Grava o item de escopo na base.',
  },
  '/configuracoes': {
    'novo': 'Cria um novo item no cadastro mestre selecionado.',
    'nova disciplina': 'Cria disciplina nova no dicionario.',
    'novo responsavel': 'Cria responsavel comercial novo.',
    'nova unidade': 'Cria unidade/simbolo novo.',
    'nova regiao': 'Cria regiao nova.',
    'nova categoria': 'Cria categoria nova.',
    'novo tipo de mao de obra': 'Cria tipo de mao de obra novo.',
    'novo tipo de obra': 'Cria tipo de obra novo.',
    'ativar': 'Marca item como ativo para aparecer nas telas consumidoras.',
    'inativar': 'Oculta item das telas consumidoras sem apagar historico.',
  },
  '/meus-dispositivos': {
    'revogar dispositivo': 'Remove sessao salva do dispositivo selecionado.',
    'desconectar outros': 'Mantem dispositivo atual e encerra outros salvos.',
  },
  '/membros': {
    'editar membro': 'Abre modal para alterar papel e/ou redefinir senha de um membro.',
    'salvar': 'Envia alteracoes para /api/membros-update e persiste papel/senha.',
    'gerar senha': 'Gera senha aleatoria para redefinicao de acesso.',
  },
};

const BACKEND_ENDPOINTS = {
  '/api/membros': {
    metodo: 'GET',
    uso: 'Lista membros/usuarios para tela de Membros (somente admin).',
    autenticacao: 'Bearer token obrigatorio + validacao de papel admin.',
  },
  '/api/membros-update': {
    metodo: 'PATCH',
    uso: 'Atualiza papel e/ou redefine senha de membro (somente admin).',
    autenticacao: 'Bearer token obrigatorio + validacao de papel admin.',
  },
  '/api/upload': {
    metodo: 'POST',
    uso: 'Faz upload de arquivo em base64 para bucket anexos no Supabase Storage.',
    autenticacao: 'Sem Bearer no endpoint atual; protegido por service role no servidor.',
  },
  '/api/paulo-chat': {
    metodo: 'POST',
    uso: 'Processa perguntas do Paulo IA com contexto da rota e historico.',
    autenticacao: 'Bearer token obrigatorio + validacao de usuario via Supabase Auth.',
  },
};

const BACKEND_ROTAS = {
  '/membros': ['/api/membros', '/api/membros-update'],
  '/orcamentos/:id': ['/api/upload'],
};

function normalizar(texto = '') {
  return String(texto)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function obterPorRota(mapa, pathname = '') {
  if (!pathname) return null;
  if (mapa[pathname]) return mapa[pathname];

  if (pathname.startsWith('/orcamentos/') && mapa['/orcamentos/:id']) {
    return mapa['/orcamentos/:id'];
  }

  const chaves = Object.keys(mapa).sort((a, b) => b.length - a.length);
  const prefixo = chaves.find((k) => !k.includes(':') && (pathname === k || pathname.startsWith(`${k}/`)));
  return prefixo ? mapa[prefixo] : null;
}

function contextoDaRota(pathname = '') {
  const contexto = obterPorRota(CONTEXTO_ROTA, pathname);
  return contexto || 'Tela de apoio do sistema de orcamentos.';
}

function guiaDaRota(pathname = '') {
  return (
    obterPorRota(GUIAS_ROTA, pathname) || {
      titulo: 'Tela atual',
      descricao: contextoDaRota(pathname),
      sugestoes: [
        'O que eu estou vendo aqui?',
        'Qual passo a passo para usar essa tela?',
        'Como validar se os dados foram salvos?',
        'Quais erros mais comuns nessa pagina?',
      ],
      passosPadrao: [
        'Defina o objetivo do que voce quer fazer.',
        'Preencha ou ajuste os campos principais.',
        'Salve e confirme mensagem de sucesso.',
        'Reabra ou busque o registro para validar persistencia.',
      ],
    }
  );
}

function camposDaRota(pathname = '') {
  const campos = obterPorRota(CAMPOS_PRIORITARIOS, pathname);
  return Array.isArray(campos) ? campos : [];
}

function termosDaRota(pathname = '') {
  const termos = obterPorRota(TERMOS_ROTA, pathname);
  return {
    ...TERMOS_GERAIS,
    ...(termos && typeof termos === 'object' ? termos : {}),
  };
}

function blocosDaRota(pathname = '') {
  const blocos = obterPorRota(BLOCOS_ROTA, pathname);
  return Array.isArray(blocos) ? blocos : [];
}

function coresDaRota(pathname = '') {
  const cores = obterPorRota(CORES_ROTA, pathname);
  return Array.isArray(cores) ? cores : [];
}

function acoesDaRota(pathname = '') {
  const especificas = obterPorRota(ACOES_ROTA, pathname);
  return {
    ...ACOES_GERAIS,
    ...(especificas && typeof especificas === 'object' ? especificas : {}),
  };
}

function backendRelacionado(pathname = '') {
  const relacionados = obterPorRota(BACKEND_ROTAS, pathname);
  const lista = Array.isArray(relacionados) ? relacionados : [];
  return lista.map((r) => ({ rota: r, ...(BACKEND_ENDPOINTS[r] || {}) }));
}

function ultimasPerguntasUsuario(historico = []) {
  return historico
    .filter((item) => item.role === 'user')
    .map((item) => item.content)
    .slice(-4);
}

function sugestoesPorRota(pathname = '') {
  const base = [...guiaDaRota(pathname).sugestoes];
  if (!base.some((s) => normalizar(s).includes('explica tudo'))) {
    base.push('Me explica tudo dessa tela, detalhado.');
  }
  return base;
}

function parecePerguntaDeDefinicao(q = '') {
  const followupCurto = /^e\s+[^\s]+(?:\s+[^\s]+)?$/.test(q.replace(/[?.!,]/g, '').trim());
  return (
    q.includes('o que e') ||
    q.includes('oque e') ||
    q.includes('o que eh') ||
    q.includes('o que significa') ||
    q.includes('oque significa') ||
    q.includes('qual o significado') ||
    q.includes('qual significado') ||
    q.includes('aquele') ||
    q.includes('aquela') ||
    followupCurto
  );
}

function parecePerguntaDeBotao(q = '') {
  return (
    q.includes('botao') ||
    q.includes('botao') ||
    q.includes('o que faz') ||
    q.includes('oque faz') ||
    q.includes('pra que serve') ||
    q.includes('serve pra que') ||
    q.includes('funcao desse') ||
    q.includes('funcao desse botao') ||
    q.includes('para que serve')
  );
}

function pediuExplicacaoBackend(q = '') {
  return (
    q.includes('backend') ||
    q.includes('api') ||
    q.includes('endpoint') ||
    q.includes('server') ||
    q.includes('por tras') ||
    q.includes('como funciona por tras') ||
    q.includes('estudar o backend')
  );
}

function extrairAcaoDaPergunta(q = '') {
  if (!q) return '';

  const texto = q.replace(/[?.!,]/g, ' ').replace(/\s+/g, ' ').trim();
  const followup = texto.match(/^e\s+(.+)$/);
  if (followup?.[1]) return followup[1].trim();

  const porBotao = texto.match(/(?:botao|botao)\s+(.+)$/);
  if (porBotao?.[1]) return porBotao[1].trim();

  const porFaz = texto.match(/(?:o que faz|oque faz|pra que serve|serve pra que|para que serve)\s+(.+)$/);
  if (porFaz?.[1]) return porFaz[1].trim();

  return '';
}

function extrairTermoDaPergunta(q = '') {
  if (!q) return '';

  const limpeza = q.replace(/[?.!,]/g, ' ').replace(/\s+/g, ' ').trim();

  const followup = limpeza.match(/^e\s+(.+)$/);
  if (followup?.[1]) {
    return followup[1].trim();
  }

  if (
    q.includes('essa pagina') ||
    q.includes('essa tela') ||
    q.includes('este painel') ||
    q.includes('essa aba') ||
    q.includes('o que e essa') ||
    q.includes('oque e essa')
  ) {
    return '__pagina__';
  }

  const match = q.match(/(?:o que e|oque e|o que eh|o que significa|oque significa|qual o significado de|qual significado de|o que e a|o que e o|oque aquela|o que e aquela|o que e esse|o que e essa)\s+(.+)$/);
  if (!match) return '';

  return match[1]
    .replace(/[?.!,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function distanciaLevenshtein(a = '', b = '') {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + custo
      );
    }
  }

  return dp[m][n];
}

function encontrarTermoNoGlossario(termos = {}, termo = '') {
  const t = normalizar(termo).trim();
  if (!t) return '';

  const chaves = Object.keys(termos);
  if (!chaves.length) return '';

  const exata = chaves.find((k) => {
    const kn = normalizar(k);
    return t.includes(kn) || kn.includes(t);
  });
  if (exata) return exata;

  const tokens = t.split(' ').filter(Boolean);
  const porTokens = chaves.find((k) => {
    const kn = normalizar(k);
    return tokens.every((tok) => kn.includes(tok));
  });
  if (porTokens) return porTokens;

  let melhor = '';
  let melhorDist = Infinity;
  for (const chave of chaves) {
    const kn = normalizar(chave);
    const dist = distanciaLevenshtein(t, kn);
    if (dist < melhorDist) {
      melhorDist = dist;
      melhor = chave;
    }
  }

  const limiar = t.length <= 8 ? 2 : 3;
  return melhorDist <= limiar ? melhor : '';
}

function explicarTermo(pathname = '', termo = '') {
  const guia = guiaDaRota(pathname);
  const contexto = contextoDaRota(pathname);
  const t = termo.trim();

  if (!t) return '';
  if (t === '__pagina__') return explicarTela(pathname);

  const termos = termosDaRota(pathname);
  const chaveEncontrada = encontrarTermoNoGlossario(termos, t);

  if (chaveEncontrada) {
    return `${termos[chaveEncontrada]}\n\nSe quiser, eu te mostro agora como usar isso na pratica dentro de ${guia.titulo}.`;
  }

  if (t.includes('atividade') && pathname === '/mao-de-obra') {
    return 'Atividade e o servico que voce esta compondo. Ela agrupa os profissionais e coeficientes de HH para calcular esforco/custo de mao de obra.';
  }

  if ((t.includes('profissional') || t.includes('profissionais')) && pathname === '/mao-de-obra') {
    return 'Profissionais sao as funcoes de mao de obra usadas na atividade. Cada profissional entra com um coeficiente (Hh/UN) para formar o total de horas.';
  }

  return `Entendi. Nessa tela (${contexto}), esse termo nao esta mapeado no meu glossario ainda. Se voce me disser onde ele aparece (card, coluna, campo ou botao), eu te explico exatamente.`;
}

function explicarTermoConhecido(pathname = '', termo = '') {
  const guia = guiaDaRota(pathname);
  const t = termo.trim();
  if (!t) return '';

  const termos = termosDaRota(pathname);
  const chaveEncontrada = encontrarTermoNoGlossario(termos, t);
  if (!chaveEncontrada) return '';

  return `${termos[chaveEncontrada]}\n\nSe quiser, eu te mostro agora como usar isso na pratica dentro de ${guia.titulo}.`;
}

function ehConsultaCurta(q = '') {
  const palavras = q
    .replace(/[?.!,]/g, ' ')
    .split(/\s+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return palavras.length > 0 && palavras.length <= 4;
}

function explicarBotao(pathname = '', pergunta = '') {
  const guia = guiaDaRota(pathname);
  const acoes = acoesDaRota(pathname);
  const alvo = extrairAcaoDaPergunta(pergunta);

  if (!alvo) {
    const exemplos = Object.keys(acoes)
      .slice(0, 8)
      .map((a) => `- ${a}`)
      .join('\n');
    return [
      `Consigo sim. Na tela ${guia.titulo}, me diga o nome do botao (ex.: "salvar" ou "novo").`,
      'Acoes que eu ja reconheco aqui:',
      exemplos,
    ].join('\n');
  }

  const chave = encontrarTermoNoGlossario(acoes, alvo);
  if (chave) {
    return `${acoes[chave]}\n\nSe quiser, te passo o passo a passo desse botao sem erro.`;
  }

  return `Entendi o botao "${alvo}", mas ele ainda nao esta mapeado nessa rota. Se voce me disser em que parte da tela ele aparece (topo, tabela, modal), eu te explico com mais precisao.`;
}

function explicarBackend(pathname = '') {
  const relacionados = backendRelacionado(pathname);
  const gerais = Object.entries(BACKEND_ENDPOINTS)
    .map(([rota, info]) => `- ${rota} [${info.metodo}] -> ${info.uso}`)
    .join('\n');

  if (!relacionados.length) {
    return [
      'Mapa rapido do backend atual (api/):',
      gerais,
      '',
      'Observacao: muitas telas leem/escrevem direto no Supabase via repositorios do frontend. Os endpoints api entram em fluxos especificos (membros, upload e Paulo IA).',
    ].join('\n');
  }

  const porRota = relacionados
    .map((e) => `- ${e.rota} [${e.metodo}] -> ${e.uso}`)
    .join('\n');

  return [
    `Backend relacionado a tela ${guiaDaRota(pathname).titulo}:`,
    porRota,
    '',
    'Mapa completo do backend api:',
    gerais,
  ].join('\n');
}

function detectarTema(q = '') {
  if (q.includes('numero') || q.includes('indicador') || q.includes('kpi') || q.includes('taxa') || q.includes('ticket')) return 'indicadores';
  if (q.includes('filtro') || q.includes('buscar') || q.includes('pesquisa') || q.includes('ano') || q.includes('status')) return 'filtros';
  if (q.includes('criar') || q.includes('cadastrar') || q.includes('novo')) return 'cadastro';
  if (q.includes('editar') || q.includes('alterar') || q.includes('atualizar')) return 'edicao';
  if (q.includes('salvar') || q.includes('gravar') || q.includes('persist')) return 'salvamento';
  if (q.includes('erro') || q.includes('bug') || q.includes('nao funciona') || q.includes('nao consigo')) return 'erro';
  if (q.includes('o que eu estou vendo') || q.includes('oque eu estou vendo') || q.includes('o que estou vendo') || q.includes('oque estou vendo')) return 'visualizacao';
  return 'padrao';
}

function pediuExplicacaoTotal(q = '') {
  return (
    q.includes('explica tudo') ||
    q.includes('me explica tudo') ||
    q.includes('literalmente tudo') ||
    q.includes('cada letra') ||
    q.includes('cada frase') ||
    q.includes('cada ponto') ||
    q.includes('cada virgula') ||
    (q.includes('tudo') && (q.includes('site') || q.includes('pagina') || q.includes('tela')))
  );
}

function precisaPassoAPasso(q = '') {
  return (
    q.includes('passo a passo') ||
    q.includes('passo-a-passo') ||
    q.includes('nao sei') ||
    q.includes('nao entendi') ||
    q.includes('como faz') ||
    q.includes('me ajuda') ||
    q.includes('nao consigo') ||
    q.includes('sou novo')
  );
}

function montarListaNumerada(passos = []) {
  return passos.map((p, idx) => `${idx + 1}. ${p}`).join('\n');
}

function montarPassoAPasso(pathname = '', perguntaNormalizada = '') {
  const guia = guiaDaRota(pathname);
  const tema = detectarTema(perguntaNormalizada);
  const passosTema = guia.passosPorTema?.[tema];
  const passos = Array.isArray(passosTema) && passosTema.length > 0 ? passosTema : guia.passosPadrao;

  return [
    `Fechou, vamos juntos em ${guia.titulo}:`,
    montarListaNumerada(passos),
    'Se travar em algum ponto, me fala o numero do passo que eu destrincho com voce.',
  ].join('\n');
}

function explicarTela(pathname = '') {
  const guia = guiaDaRota(pathname);
  return [
    `Voce esta em ${guia.titulo}.`,
    guia.descricao,
    'Se quiser, eu te passo agora um passo a passo rapido para o objetivo que voce escolher.',
  ].join(' ');
}

function detalhamentoCompletoTela(pathname = '') {
  const guia = guiaDaRota(pathname);
  const campos = camposDaRota(pathname);
  const termos = Object.keys(termosDaRota(pathname));
  const blocos = blocosDaRota(pathname);
  const cores = coresDaRota(pathname);

  const secaoBlocos = blocos.length
    ? blocos.map((b, i) => `${i + 1}. ${b}`).join('\n')
    : guia.passosPadrao.map((b, i) => `${i + 1}. ${b}`).join('\n');

  const secaoCampos = campos.length
    ? campos.map((c) => `- ${c}`).join('\n')
    : '- Sem lista fixa de campos para esta rota.';

  const secaoTermos = termos.length
    ? termos.map((t) => `- ${t}`).join('\n')
    : '- Sem glossario dedicado para esta rota ainda.';

  const secaoCores = cores.length
    ? cores.map((c) => `- ${c}`).join('\n')
    : '- Cores seguem padrao visual do sistema (destaque, alerta, neutro).';

  return [
    `Fechou. Raio-x completo da tela ${guia.titulo}:`,
    '',
    '1) O que e essa tela:',
    `${guia.descricao}`,
    '',
    '2) Blocos visuais principais:',
    secaoBlocos,
    '',
    '3) Campos/itens mais importantes:',
    secaoCampos,
    '',
    '4) Termos que aparecem nessa tela:',
    secaoTermos,
    '',
    '5) Leitura de cores nessa tela:',
    secaoCores,
    '',
    '6) Passo a passo operacional:',
    montarListaNumerada(guia.passosPadrao),
    '',
    'Se voce quiser nivel literalmente texto por texto, eu continuo em lotes: cabecalho -> filtros -> tabela/cards -> botoes.',
  ].join('\n');
}

function detalhamentoCompletoSite(pathnameAtual = '') {
  const rotas = Object.entries(GUIAS_ROTA)
    .filter(([k]) => !k.includes(':'))
    .map(([rota, info], idx) => `${idx + 1}. ${info.titulo} (${rota}) - ${info.descricao}`)
    .join('\n');

  return [
    'Perfeito. Modo explicacao total do site ativado.',
    'Mapa completo das telas principais:',
    rotas,
    '',
    `Para nao ficar confuso nem gigante demais, eu comeco pela tela atual (${guiaDaRota(pathnameAtual).titulo}) e depois seguimos tela por tela.`,
    '',
    detalhamentoCompletoTela(pathnameAtual),
  ].join('\n');
}

function respostaDashboard(perguntaNormalizada = '') {
  if (
    perguntaNormalizada.includes('o que eu estou vendo') ||
    perguntaNormalizada.includes('oque eu estou vendo') ||
    perguntaNormalizada.includes('o que estou vendo') ||
    perguntaNormalizada.includes('oque estou vendo') ||
    perguntaNormalizada.includes('me explica o dashboard')
  ) {
    return [
      'Voce esta vendo um resumo comercial das propostas.',
      'No topo ficam os KPIs (volume, valores e eficiencia).',
      'No meio, os graficos mostram distribuicao por status, evolucao no tempo e leitura de funil.',
      'Nos filtros, voce recorta por ano, status, responsavel, disciplina e cliente.',
    ].join('\n');
  }

  if (
    perguntaNormalizada.includes('o que significa cada numero') ||
    perguntaNormalizada.includes('oque significa cada numero') ||
    perguntaNormalizada.includes('cada numero') ||
    perguntaNormalizada.includes('o que significa os numeros')
  ) {
    return [
      'Leitura rapida dos numeros:',
      '- Total: quantidade de propostas no recorte atual',
      '- Fechadas: propostas com status FECHADO',
      '- Nao fechadas/perdidas: propostas encerradas sem ganho',
      '- Enviadas: propostas em fase de envio/analise',
      '- Valor total: soma de valor_orcado',
      '- Valor fechado: soma do valor_orcado das fechadas',
      '- Taxa de conversao: fechadas / total',
      '- Ticket medio: valor total / total de propostas',
      'Se quiser, eu te ajudo a interpretar seus numeros atuais agora.',
    ].join('\n');
  }

  return '';
}

function checklistSalvamento(pathname = '') {
  const guia = guiaDaRota(pathname);
  return [
    `Boa. Para validar salvamento em ${guia.titulo}:`,
    '1. Clique em salvar e espere confirmacao de sucesso.',
    '2. Atualize a lista/grade.',
    '3. Localize o registro alterado pela busca.',
    '4. Reabra o item e confirme os campos principais.',
  ].join('\n');
}

function fallbackInteligente(pergunta = '', pathname = '', historico = [], options = {}) {
  const q = normalizar(pergunta);
  const contexto = contextoDaRota(pathname);
  const campos = camposDaRota(pathname);
  const ultimas = ultimasPerguntasUsuario(historico);
  const perguntaAnterior = ultimas.length > 1 ? ultimas[ultimas.length - 2] : '';
  const reportUnknown = typeof options?.reportUnknown === 'function' ? options.reportUnknown : null;

  if (pathname === '/dashboard') {
    const dash = respostaDashboard(q);
    if (dash) return dash;
  }

  if (q.includes('oi') || q.includes('ola') || q.includes('bom dia') || q.includes('boa tarde')) {
    return 'Oi! Tamo junto. Me fala o que voce quer fazer nessa tela que eu te conduzo no passo a passo.';
  }

  if (pediuExplicacaoBackend(q)) {
    return explicarBackend(pathname);
  }

  if (ehConsultaCurta(q)) {
    const explicacaoCurta = explicarTermoConhecido(pathname, q);
    if (explicacaoCurta) return explicacaoCurta;
  }

  if (parecePerguntaDeBotao(q)) {
    const explicacaoBotao = explicarBotao(pathname, q);
    if (reportUnknown && explicacaoBotao.includes('ainda nao esta mapeado nessa rota')) {
      reportUnknown({ tipo: 'botao', termo: extrairAcaoDaPergunta(q) || q, pergunta: pergunta });
    }
    return explicacaoBotao;
  }

  if (pediuExplicacaoTotal(q)) {
    if (q.includes('site') || q.includes('todas as paginas') || q.includes('todo site')) {
      return detalhamentoCompletoSite(pathname);
    }
    return detalhamentoCompletoTela(pathname);
  }

  if (
    q.includes('o que eu estou vendo') ||
    q.includes('oque eu estou vendo') ||
    q.includes('o que estou vendo') ||
    q.includes('oque estou vendo')
  ) {
    return explicarTela(pathname);
  }

  if (parecePerguntaDeDefinicao(q)) {
    const termo = extrairTermoDaPergunta(q);
    const explicacao = explicarTermo(pathname, termo);
    if (reportUnknown && explicacao.includes('nao esta mapeado no meu glossario')) {
      reportUnknown({ tipo: 'termo', termo: termo || q, pergunta: pergunta });
    }
    if (explicacao) return explicacao;
  }

  if (
    q.includes('importante preencher') ||
    q.includes('campos importantes') ||
    q.includes('obrigatorio') ||
    q.includes('o que preencher')
  ) {
    if (campos.length > 0) {
      return `Para nao dar retrabalho, prioriza estes campos:\n- ${campos.join('\n- ')}\n\nSe quiser, eu te digo a ordem ideal de preenchimento para essa tela.`;
    }
    return `Nessa tela (${contexto}), eu focaria primeiro em identificacao, dados essenciais e validacao final do registro.`;
  }

  if (
    q.includes('validar') ||
    q.includes('foi salvo') ||
    q.includes('salvou') ||
    q.includes('salvar') ||
    q.includes('gravar')
  ) {
    return checklistSalvamento(pathname);
  }

  if (q.includes('erro') || q.includes('bug') || q.includes('nao funciona')) {
    return [
      `Bora resolver isso no contexto de ${contexto}.`,
      '1. Me diga a acao que voce fez.',
      '2. O que voce esperava que acontecesse.',
      '3. O que aconteceu de fato (mensagem/resultado).',
      'Com isso eu te devolvo um diagnostico direto.',
    ].join('\n');
  }

  if (q.includes('filtro') || q.includes('ano') || q.includes('buscar')) {
    return [
      'Vamos achar o gargalo do filtro rapido:',
      '1. Limpe todos os filtros.',
      '2. Aplique um filtro por vez.',
      '3. Veja em qual filtro o resultado quebra.',
      '4. Valide o campo correspondente no cadastro do registro.',
    ].join('\n');
  }

  if (q.includes('depois') || q.includes('proximo passo') || q.includes('e agora')) {
    if (perguntaAnterior) {
      return `Perfeito, continuando do ponto anterior (${perguntaAnterior}). Se quiser, eu transformo isso agora em um passo a passo objetivo da tela atual.`;
    }
    return montarPassoAPasso(pathname, q);
  }

  if (precisaPassoAPasso(q) || q.includes('como') || q.includes('passo')) {
    return montarPassoAPasso(pathname, q);
  }

  return `Fechado. Estou com o contexto de ${contexto}. Se voce quiser, eu te guio agora em passo a passo para criar, editar, filtrar ou validar dados.`;
}

function resumirHistorico(historico) {
  if (!Array.isArray(historico)) return [];

  return historico
    .slice(-10)
    .map((item) => {
      const role = item?.role === 'assistant' ? 'assistant' : 'user';
      const content = String(item?.content || '').slice(0, 900);
      return { role, content };
    })
    .filter((item) => item.content.trim().length > 0);
}

function extrairTextoOpenAI(payload) {
  // OpenAI chat/completions format
  if (Array.isArray(payload?.choices) && payload.choices.length > 0) {
    const choice = payload.choices[0];
    if (typeof choice?.message?.content === 'string' && choice.message.content.trim()) {
      return choice.message.content.trim();
    }
  }

  // Fallback for older format
  if (typeof payload?.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  if (Array.isArray(payload?.output)) {
    for (const item of payload.output) {
      if (!Array.isArray(item?.content)) continue;
      for (const content of item.content) {
        if (typeof content?.text === 'string' && content.text.trim()) {
          return content.text.trim();
        }
        if (typeof content?.text?.value === 'string' && content.text.value.trim()) {
          return content.text.value.trim();
        }
      }
    }
  }

  return '';
}

function extrairTextoAnthropic(payload) {
  if (!payload || !Array.isArray(payload.content)) return '';
  const blocoTexto = payload.content.find((item) => item?.type === 'text' && typeof item?.text === 'string');
  return blocoTexto?.text?.trim() || '';
}

async function validarUsuario(authHeader, serviceKey) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  const userToken = authHeader.split(' ')[1];
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${userToken}`,
      apikey: serviceKey,
    },
  });

  if (!userRes.ok) {
    return { ok: false, status: 401, error: 'Invalid token' };
  }

  const userData = await userRes.json();
  return { ok: true, user: userData };
}

async function registrarNaoMapeados({ serviceKey, userId, pathname, eventos }) {
  if (!PAULO_TRAINING_ENABLED) return;
  if (!serviceKey) return;
  if (!Array.isArray(eventos) || eventos.length === 0) return;

  const payload = eventos.slice(0, 5).map((ev) => ({
    usuario_id: userId || null,
    rota: pathname || null,
    pergunta_original: String(ev?.pergunta || '').slice(0, 2000),
    tipo: String(ev?.tipo || 'termo').slice(0, 50),
    termo: String(ev?.termo || '').slice(0, 300),
    origem: 'paulo-chat',
    resolvido: false,
  }));

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${PAULO_TRAINING_TABLE}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const detail = await res.text();
      console.warn('Paulo treinamento: falha ao gravar eventos nao mapeados', res.status, detail);
    }
  } catch (error) {
    console.warn('Paulo treinamento: excecao ao gravar eventos nao mapeados', error);
  }
}

// â•â•â•â•â•â•â• SISTEMA DE APRENDIZADO ATIVO DO PAULO â•â•â•â•â•â•â•

async function buscarConhecimentoAprendido(serviceKey, pathname) {
  if (!serviceKey) return [];
  try {
    // Buscar Ãºltimos 30 aprendizados relevantes (mesma rota + globais)
    const rotas = [pathname, 'global'].filter(Boolean);
    const filtro = rotas.map(r => `rota.eq.${r}`).join(',');
    // Prioritize util=true (user-approved) and most recent; include auto entries for broader context
    const url = `${SUPABASE_URL}/rest/v1/${PAULO_CONHECIMENTO_TABLE}?select=pergunta,resposta,rota,categoria,util&or=(${filtro})&ativo=eq.true&order=util.desc,criado_em.desc&limit=40`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function salvarAprendizado(serviceKey, { pergunta, resposta, rota, categoria = 'conversa', util = false }) {
  if (!serviceKey || !pergunta || !resposta) return;
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/${PAULO_CONHECIMENTO_TABLE}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        pergunta: String(pergunta).slice(0, 2000),
        resposta: String(resposta).slice(0, 4000),
        rota: rota || 'global',
        categoria,
        ativo: true,
        util,
      }),
    });
  } catch {
    // silently fail
  }
}

function montarContextoAprendido(conhecimentos) {
  if (!conhecimentos.length) return '';
  // Separate user-approved (high trust) from auto-learned (lower trust)
  const aprovados = conhecimentos.filter(c => c.util || c.categoria === 'usuario_aprovado');
  const automaticos = conhecimentos.filter(c => !c.util && c.categoria !== 'usuario_aprovado').slice(0, 15);

  const linhasAprovadas = aprovados.map((c, i) =>
    `[APROVADO-${i + 1}] Rota: ${c.rota || 'global'}\nP: ${c.pergunta}\nR: ${c.resposta}`
  );
  const linhasAuto = automaticos.map((c, i) =>
    `[AUTO-${i + 1}] Rota: ${c.rota || 'global'}\nP: ${c.pergunta}\nR: ${c.resposta}`
  );

  const secoes = [];
  if (linhasAprovadas.length) {
    secoes.push('### CONHECIMENTO APROVADO PELO USUARIO (maxima prioridade):');
    secoes.push(...linhasAprovadas);
  }
  if (linhasAuto.length) {
    secoes.push('### HISTORICO DE CONVERSAS (contexto adicional):');
    secoes.push(...linhasAuto);
  }

  return [
    '\n--- BASE DE CONHECIMENTO APRENDIDA ---',
    ...secoes,
    '--- FIM DA BASE DE CONHECIMENTO ---\n',
  ].join('\n');
}

function playbookDaRota(pathname = '') {
  const guia = guiaDaRota(pathname);
  const campos = camposDaRota(pathname);
  const termos = Object.keys(termosDaRota(pathname));
  const acoes = Object.keys(acoesDaRota(pathname));
  const blocos = blocosDaRota(pathname);
  const cores = coresDaRota(pathname);
  const backend = backendRelacionado(pathname);
  return [
    `Rota atual: ${guia.titulo}`,
    `Resumo: ${guia.descricao}`,
    `Passo padrao: ${guia.passosPadrao.join(' -> ')}`,
    `Campos chave: ${campos.length ? campos.join(', ') : 'nao mapeado para esta rota'}`,
    `Blocos da tela: ${blocos.length ? blocos.join(' | ') : 'nao mapeado'}`,
    `Termos-chave: ${termos.length ? termos.join(', ') : 'nao mapeado'}`,
    `Acoes/botoes mapeados: ${acoes.length ? acoes.slice(0, 14).join(', ') : 'nao mapeado'}`,
    `Backend relacionado: ${backend.length ? backend.map((b) => `${b.rota} [${b.metodo}]`).join(' | ') : 'sem endpoint especifico; usa Supabase via repositorios'}`,
    `Leitura de cores: ${cores.length ? cores.join(' | ') : 'padrao semantico geral'}`,
  ].join('\n');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' });
  }

  try {
    const authHeader = req.headers.authorization;
    const validacao = await validarUsuario(authHeader, serviceKey);

    if (!validacao.ok) {
      return res.status(validacao.status).json({ error: validacao.error });
    }

    const pergunta = String(req.body?.pergunta || '').trim().slice(0, 2000);
    const pathname = String(req.body?.pathname || '').trim().slice(0, 200);
    const historico = resumirHistorico(req.body?.historico);
    const feedback = req.body?.feedback; // 'positivo' | 'negativo'
    const respostaPaulo = String(req.body?.resposta_paulo || '').trim().slice(0, 4000);
    const eventosNaoMapeados = [];
    const reportUnknown = (ev) => eventosNaoMapeados.push(ev);

    // â”€â”€ Feedback explÃ­cito do usuÃ¡rio â”€â”€
    if (feedback === 'positivo' && pergunta && respostaPaulo) {
      await salvarAprendizado(serviceKey, {
        pergunta,
        resposta: respostaPaulo,
        rota: pathname || 'global',
        categoria: 'usuario_aprovado',
        util: true,
      });
      return res.status(200).json({ ok: true, mensagem: 'Paulo aprendeu! Valeu pelo feedback.' });
    }

    if (feedback === 'negativo' && pergunta) {
      // Registrar como nÃ£o mapeado para revisÃ£o futura
      await registrarNaoMapeados({
        serviceKey,
        userId: validacao.user?.id,
        pathname,
        eventos: [{ tipo: 'feedback_negativo', termo: pergunta.slice(0, 300), pergunta }],
      });
      return res.status(200).json({ ok: true, mensagem: 'Registrado. Paulo vai melhorar.' });
    }

    if (!pergunta) {
      return res.status(400).json({ error: 'pergunta is required' });
    }

    const sugestoes = sugestoesPorRota(pathname);
    const openaiKey = process.env.OPENAI_API_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (!openaiKey && !anthropicKey) {
      const respostaFallback = fallbackInteligente(pergunta, pathname, historico, { reportUnknown });
      await registrarNaoMapeados({
        serviceKey,
        userId: validacao.user?.id,
        pathname,
        eventos: eventosNaoMapeados,
      });
      return res.status(200).json({
        resposta: respostaFallback,
        fonte: 'fallback',
        sugestoes,
      });
    }

    // Buscar conhecimento aprendido de conversas anteriores
    const conhecimentos = await buscarConhecimentoAprendido(serviceKey, pathname);
    const contextoAprendido = montarContextoAprendido(conhecimentos);

    const systemPrompt = [
      'Voce e o Paulo, assistente IA especializado no modulo Comercial do BiasiHub da Biasi Engenharia.',
      '',
      '## Personalidade',
      '- Tom profissional mas acessivel, como um colega experiente.',
      '- Responda em portugues-BR natural, sem parecer robo.',
      '- Seja direto e acionavel. Frases curtas. Sem enrolacao.',
      '- Use numeracao quando der passo a passo.',
      '- Pode usar estilo conversacional quando apropriado.',
      '',
      '## Regras de conteudo',
      '- NUNCA invente funcionalidades, campos ou botoes que nao existem no sistema.',
      '- Se nao souber algo, diga com transparencia e proponha verificacao pratica.',
      '- Sempre considere o contexto da rota atual para orientar exatamente o que fazer naquela tela.',
      '- Seu foco e o modulo Comercial. Se perguntarem sobre outro modulo, responda de forma breve e traga a resposta para o fluxo comercial quando possivel.',
      '- Quando o usuario pedir explicacao completa, entregue: visao geral, blocos da tela, campos principais, termos-chave, leitura de cores e fluxo de uso.',
      '- Quando o usuario te corrigir ou ensinar algo novo sobre o sistema (ex: "na verdade...", "o correto e...", "isso nao existe mais..."), extraia e coloque no final: [APRENDIZADO: descricao objetiva do que aprendeu]',
      '- Use [APRENDIZADO:] apenas para correcoes factuais confirmadas pelo usuario, nao para toda resposta.',
      '',
      '## Aprendizado continuo',
      '- Voce tem uma base de conhecimento que cresce a cada conversa.',
      '- Entradas marcadas como APROVADO PELO USUARIO tem prioridade maxima â€” trate como fato confirmado.',
      '- Entradas AUTO sao historico de conversas â€” use como contexto mas confirme antes de afirmar como verdade absoluta.',
      '- Quando o usuario confirmar uma resposta sua (thumbs up), ela entra na base de alta prioridade.',
      '',
      '## Contexto da rota atual',
      playbookDaRota(pathname),
      '',
      contextoAprendido,
    ].join('\n');

    const input = [
      {
        role: 'system',
        content: systemPrompt,
      },
      ...historico.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      {
        role: 'user',
        content: pergunta,
      },
    ];

    let resposta = '';
    let fonte = '';

    if (openaiKey) {
      try {
        const aiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: input,
            temperature: 0.4,
            max_tokens: 1200,
          }),
        });

        if (aiRes.ok) {
          const aiPayload = await aiRes.json();
          resposta = extrairTextoOpenAI(aiPayload);
          fonte = 'openai';
        } else {
          const erroTexto = await aiRes.text();
          console.error('Erro OpenAI Paulo:', aiRes.status, erroTexto);
        }
      } catch (errorOpenAI) {
        console.error('Erro OpenAI Paulo:', errorOpenAI);
      }
    }

    if (!resposta && anthropicKey) {
      try {
        const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
            max_tokens: 1200,
            system: systemPrompt,
            messages: [
              ...historico.map((m) => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.content,
              })),
              {
                role: 'user',
                content: pergunta,
              },
            ],
          }),
        });

        if (anthropicRes.ok) {
          const anthropicPayload = await anthropicRes.json();
          resposta = extrairTextoAnthropic(anthropicPayload);
          fonte = 'anthropic';
        } else {
          const erroTexto = await anthropicRes.text();
          console.error('Erro Anthropic Paulo:', anthropicRes.status, erroTexto);
        }
      } catch (errorAnthropic) {
        console.error('Erro Anthropic Paulo:', errorAnthropic);
      }
    }

    if (!resposta) {
      resposta = fallbackInteligente(pergunta, pathname, historico, { reportUnknown });
      fonte = 'fallback';
    }

    // Extrair e salvar aprendizados marcados com tag [APRENDIZADO:]
    const matchAprendizado = resposta.match(/\[APRENDIZADO:\s*(.+?)\]/i);
    if (matchAprendizado) {
      const aprendizado = matchAprendizado[1].trim();
      salvarAprendizado(serviceKey, {
        pergunta: pergunta.slice(0, 500),
        resposta: aprendizado,
        rota: pathname || 'global',
        categoria: 'auto-tag',
      }).catch(() => {});
      resposta = resposta.replace(/\s*\[APRENDIZADO:\s*.+?\]/gi, '').trim();
    }

    // Sempre salvar o par pergunta-resposta para aprendizado contÃ­nuo
    salvarAprendizado(serviceKey, {
      pergunta: pergunta.slice(0, 500),
      resposta: resposta.slice(0, 2000),
      rota: pathname || 'global',
      categoria: 'auto',
      util: false,
    }).catch(() => {});

    await registrarNaoMapeados({
      serviceKey,
      userId: validacao.user?.id,
      pathname,
      eventos: eventosNaoMapeados,
    });

    return res.status(200).json({
      resposta,
      fonte,
      sugestoes,
    });
  } catch (error) {
    console.error('Erro no Paulo IA:', error);
    return res.status(200).json({
      resposta: 'Tive uma instabilidade agora. Se quiser, me diga em uma frase o que voce precisa fazer e eu te passo o caminho em passos simples.',
      fonte: 'fallback',
      sugestoes: [
        'Me explica esta tela em passo a passo.',
        'Como validar se os dados foram salvos?',
      ],
    });
  }
}


