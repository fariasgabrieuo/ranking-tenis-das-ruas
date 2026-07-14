import { ACHIEVEMENTS, getAchievement } from '../config/achievements.js';
import { computeRanking } from './ranking.js';

function confirmedMatches(matches) {
  return matches
    .filter((m) => m.status === 'confirmed' && m.winner_id)
    .sort(
      (a, b) =>
        new Date(a.played_at) - new Date(b.played_at) || new Date(a.created_at) - new Date(b.created_at),
    );
}

function winnerGames(match, winnerId) {
  return winnerId === match.player1_id ? match.player1_games : match.player2_games;
}

function loserGames(match, winnerId) {
  return winnerId === match.player1_id ? match.player2_games : match.player1_games;
}

/**
 * Calcula conquistas de todos os jogadores a partir das partidas confirmadas.
 * Público — derivado dos dados do ranking, sem edição manual.
 */
export function computeAllPlayerAchievements(profiles, matches) {
  const earned = new Map(profiles.map((p) => [p.id, new Set()]));
  const streaks = new Map(profiles.map((p) => [p.id, 0]));
  const matchCounts = new Map(profiles.map((p) => [p.id, 0]));

  const confirmed = confirmedMatches(matches);
  const processed = [];

  for (const match of confirmed) {
    const winnerId = match.winner_id;
    const loserId = winnerId === match.player1_id ? match.player2_id : match.player1_id;
    if (!earned.has(winnerId) || !earned.has(loserId)) continue;

    const rankingBefore = computeRanking(profiles, processed);
    const leader = rankingBefore[0];
    if (leader?.wins > 0 && loserId === leader.id) {
      earned.get(winnerId).add('carrasco');
    }

    if (winnerGames(match, winnerId) === 6 && loserGames(match, winnerId) === 0) {
      earned.get(winnerId).add('mestre');
    }

    streaks.set(winnerId, (streaks.get(winnerId) ?? 0) + 1);
    streaks.set(loserId, 0);

    if (streaks.get(winnerId) >= 3) earned.get(winnerId).add('em_chamas');
    if (streaks.get(winnerId) >= 6) earned.get(winnerId).add('invicto');

    matchCounts.set(winnerId, (matchCounts.get(winnerId) ?? 0) + 1);
    matchCounts.set(loserId, (matchCounts.get(loserId) ?? 0) + 1);

    processed.push(match);
  }

  for (const [playerId, streak] of streaks) {
    if (streak >= 3) earned.get(playerId)?.add('em_chamas');
  }

  const maxMatches = Math.max(0, ...matchCounts.values());
  if (maxMatches > 0) {
    for (const [playerId, count] of matchCounts) {
      if (count === maxMatches) earned.get(playerId)?.add('maratonista');
    }
  }

  const ranked = computeRanking(profiles, matches).filter((r) => r.matches > 0);
  if (ranked.length > 0) {
    const bestRate = Math.max(...ranked.map((r) => r.winRate));
    for (const r of ranked) {
      if (r.winRate === bestRate) earned.get(r.id)?.add('melhor_aproveitamento');
    }
  }

  const result = new Map();
  for (const [userId, ids] of earned) {
    result.set(
      userId,
      [...ids].map((id) => getAchievement(id)).filter(Boolean),
    );
  }
  return result;
}

export function getPlayerAchievements(achievementMap, playerId) {
  return achievementMap.get(playerId) ?? [];
}

export { ACHIEVEMENTS };
