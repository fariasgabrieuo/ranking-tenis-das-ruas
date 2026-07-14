/**
 * REGRAS DO RANKING — Tênis das Ruas
 *
 * 1 set = 1 partida. Placar ex: 6-4, 7-6.
 * Ranqueadas (ranked): vitória = 2 pts | Livre (friendly): vitória = 1 pt
 * Derrota = 0 pts. Sem empate.
 * Desempate: pontos → games ganhos → vitórias → apelido.
 */
export const RULES = {
  points: {
    rankedWin: 2,
    friendlyWin: 1,
    loss: 0,
  },

  tiebreakers: ['points', 'gamesWon', 'wins', 'nickname'],

  minMatchesToRank: 0,

  requireScore: true,

  matchTypes: {
    ranked: {
      label: 'Ranqueadas',
      description: 'Conta 2 pontos no ranking. Precisa de confirmação do adversário.',
    },
    friendly: {
      label: 'Livre',
      description: 'Conta 1 ponto no ranking. Precisa de confirmação do adversário.',
    },
  },

  /** Só partidas confirmadas entram no ranking */
  countOnlyConfirmed: true,

  /** Zona inferior do ranking (mínimo de jogadores para exibir) */
  cafeComLeite: {
    minPlayers: 5,
    labels: ['Café com Leite', 'Leitinho'],
  },
};
