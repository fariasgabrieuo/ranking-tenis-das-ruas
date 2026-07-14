/**
 * Configurações gerais do app — edite à vontade.
 */
export const APP = {
  name: 'Tênis das Ruas - O Ranking',
  wordmark: {
    primary: 'Tênis das Ruas',
    secondary: 'O Ranking',
  },
  subtitle: 'Quem manda na quadra?',
  logo: '/logo.png',
  locale: 'pt-BR',

  /** Abas: ranking | partidas | registrar | mais */
  tabs: ['ranking', 'partidas', 'registrar', 'mais'],

  tabLabels: {
    ranking: 'Ranking',
    partidas: 'Partidas',
    registrar: 'Registrar',
    mais: 'Mais',
  },

  /** Sub-views dentro da aba Mais */
  maisViews: {
    menu: 'Menu',
    perfil: 'Meu perfil',
    auth: 'Entrar / Cadastrar',
    regras: 'Regras',
  },

  rankingColumns: [
    { key: 'position', label: '#', width: '48px' },
    { key: 'nickname', label: 'Jogador' },
    { key: 'location', label: 'Bairro' },
    { key: 'points', label: 'Pts' },
    { key: 'wins', label: 'V' },
    { key: 'losses', label: 'D' },
    { key: 'gamesWon', label: 'Games+' },
    { key: 'winRate', label: '% Vit.' },
    { key: 'matches', label: 'Jogos' },
  ],

  showMedals: true,
  dateFormat: { day: '2-digit', month: '2-digit', year: 'numeric' },

  matchStatusLabels: {
    pending: 'Aguardando confirmação',
    confirmed: 'Confirmada',
    rejected: 'Recusada',
  },

  messages: {
    emptyRanking: 'Nenhum jogador ainda. Crie sua conta na aba Mais.',
    emptyMatches: 'Nenhuma partida registrada.',
    loginRequired: 'Entre na sua conta para registrar partidas.',
    confirmMatch: 'Confirmar esta partida?',
    rejectMatch: 'Recusar esta partida?',
    confirmDeleteMatch: 'Remover esta partida pendente?',
    saved: 'Salvo!',
    error: 'Algo deu errado. Tente de novo.',
    signedOut: 'Você saiu da conta.',
    checkEmail: 'Verifique seu e-mail para confirmar o cadastro (se exigido pelo Supabase).',
  },
};
