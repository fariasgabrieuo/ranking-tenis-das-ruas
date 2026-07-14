/**
 * Conquistas — desbloqueio automático virá na próxima fase.
 * Aparecerão no perfil do jogador e no glossário em Mais → Regras.
 */
export const ACHIEVEMENTS = [
  {
    id: 'invicto',
    title: 'Invicto',
    description: '6 vitórias consecutivas.',
    icon: '🏆',
  },
  {
    id: 'em_chamas',
    title: 'Em Chamas',
    description: '3 vitórias consecutivas.',
    icon: '🔥',
  },
  {
    id: 'carrasco',
    title: 'Carrasco',
    description: 'Vitória contra o líder do ranking.',
    icon: '💀',
  },
  {
    id: 'maratonista',
    title: 'Maratonista',
    description: 'Jogador com mais partidas no ranking (só um).',
    icon: '🎾',
  },
  {
    id: 'melhor_aproveitamento',
    title: 'Melhor Aproveitamento',
    description: 'Melhor percentual de vitórias.',
    icon: '🎯',
  },
  {
    id: 'mestre',
    title: 'Mestre',
    description: 'Vitória por 6-0.',
    icon: '👑',
  },
  {
    id: 'baldo',
    title: 'Baldo',
    description: 'Perdeu de 6-0.',
    icon: '🪣',
  },
  {
    id: 'fracassado',
    title: 'Fracassado',
    description: '3 derrotas consecutivas.',
    icon: '😢',
  },
];

export function getAchievement(id) {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
