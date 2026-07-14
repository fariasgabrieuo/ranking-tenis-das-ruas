/**
 * Definições de conquistas — lógica de desbloqueio virá nas fases seguintes.
 */
export const ACHIEVEMENTS = [
  {
    id: 'first_win',
    title: 'Primeira Vitória',
    description: 'Venceu sua primeira partida confirmada.',
    icon: '🎾',
  },
  {
    id: 'streak_3',
    title: 'Trinca',
    description: 'Três vitórias seguidas.',
    icon: '🔥',
  },
  {
    id: 'clay_king',
    title: 'Rei do Saibro',
    description: '10 vitórias valendo no ranking.',
    icon: '👑',
  },
  {
    id: 'tiebreak_hero',
    title: 'Herói do Tie-break',
    description: 'Venceu um set 7-6.',
    icon: '💪',
  },
];

export function getAchievement(id) {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
