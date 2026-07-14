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
  logo: `${import.meta.env.BASE_URL}logo.png`,
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
    jogador: 'Jogador',
    auth: 'Entrar / Cadastrar',
    regras: 'Regras',
    conquistas: 'Conquistas',
  },

  maisMenu: [
    {
      view: 'perfil',
      icon: '👤',
      title: 'Meu perfil',
      desc: 'Foto, bairro e sobre',
      section: 'conta',
      requiresLogin: false,
    },
    {
      view: 'auth',
      icon: '🔑',
      title: 'Entrar / Cadastrar',
      desc: 'Acesse sua conta',
      section: 'conta',
      hideWhenLoggedIn: true,
    },
    {
      view: 'auth',
      icon: '🚪',
      title: 'Sair',
      desc: 'Encerrar sessão',
      section: 'conta',
      requiresLogin: true,
      isLogout: true,
    },
    {
      view: 'conquistas',
      icon: '🏆',
      title: 'Conquistas',
      desc: 'Quem desbloqueou o quê',
      section: 'ranking',
    },
    {
      view: 'regras',
      icon: '📋',
      title: 'Regras',
      desc: 'Pontuação e partidas',
      section: 'ranking',
    },
  ],

  rankingColumns: [
    { key: 'position', label: '#', width: '48px' },
    { key: 'nickname', label: 'Jogador' },
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
    confirmDeleteMatch: 'Cancelar esta partida? Ela será removida.',
    confirmDeleteConfirmedMatch:
      'Esta partida já está confirmada. Cancelar remove do ranking. Continuar?',
    confirmEditMatch: 'Salvar alterações nesta partida confirmada?',
    pendingConfirmOne: 'Você tem 1 partida aguardando sua confirmação.',
    pendingConfirmMany: 'Você tem {count} partidas aguardando sua confirmação.',
    pendingConfirmHint: 'Abra a aba Partidas e confirme ou recuse.',
    saved: 'Salvo!',
    error: 'Algo deu errado. Tente de novo.',
    signedOut: 'Você saiu da conta.',
    checkEmail: 'Verifique seu e-mail para confirmar o cadastro (se exigido pelo Supabase).',
    emailConfirmed: 'E-mail confirmado! Você já pode usar o app.',
    emailConfirmFailed:
      'Não foi possível confirmar o e-mail. Abra o link no Chrome/Safari (não no app do Gmail) ou peça um novo cadastro.',
  },
};
