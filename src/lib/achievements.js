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

function emptyCounts() {
  return new Map();
}

function bump(counts, id, amount = 1) {
  counts.set(id, (counts.get(id) ?? 0) + amount);
}

function countsToList(countMap) {
  return ACHIEVEMENTS.map((def) => {
    const count = countMap.get(def.id) ?? 0;
    if (count <= 0) return null;
    return { ...def, count };
  }).filter(Boolean);
}

/**
 * Calcula conquistas de todos os jogadores a partir das partidas confirmadas.
 * Público — derivado dos dados do ranking, sem edição manual.
 */
export function computeAllPlayerAchievements(profiles, matches) {
  const earned = new Map(profiles.map((p) => [p.id, emptyCounts()]));
  const winStreaks = new Map(profiles.map((p) => [p.id, 0]));
  const loseStreaks = new Map(profiles.map((p) => [p.id, 0]));
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
      bump(earned.get(winnerId), 'carrasco');
    }

    const wGames = winnerGames(match, winnerId);
    const lGames = loserGames(match, winnerId);
    if (wGames === 6 && lGames === 0) {
      bump(earned.get(winnerId), 'mestre');
      bump(earned.get(loserId), 'baldo');
    }

    winStreaks.set(winnerId, (winStreaks.get(winnerId) ?? 0) + 1);
    winStreaks.set(loserId, 0);

    const nextLoseStreak = (loseStreaks.get(loserId) ?? 0) + 1;
    loseStreaks.set(loserId, nextLoseStreak);
    loseStreaks.set(winnerId, 0);
    if (nextLoseStreak === 3) {
      bump(earned.get(loserId), 'fracassado');
    }

    matchCounts.set(winnerId, (matchCounts.get(winnerId) ?? 0) + 1);
    matchCounts.set(loserId, (matchCounts.get(loserId) ?? 0) + 1);

    processed.push(match);
  }

  for (const [playerId, streak] of winStreaks) {
    const counts = earned.get(playerId);
    if (!counts) continue;
    if (streak >= 3) counts.set('em_chamas', 1);
    if (streak >= 6) counts.set('invicto', 1);
  }

  const maxMatches = Math.max(0, ...matchCounts.values());
  if (maxMatches > 0) {
    const leaders = [...matchCounts.entries()].filter(([, count]) => count === maxMatches);
    const leaderId = leaders
      .map(([id]) => id)
      .sort((a, b) => {
        const nameA = profiles.find((p) => p.id === a)?.nickname ?? '';
        const nameB = profiles.find((p) => p.id === b)?.nickname ?? '';
        return nameA.localeCompare(nameB, 'pt-BR');
      })[0];
    earned.get(leaderId)?.set('maratonista', 1);
  }

  const ranked = computeRanking(profiles, matches).filter((r) => r.matches > 0);
  if (ranked.length > 0) {
    const bestRate = Math.max(...ranked.map((r) => r.winRate));
    for (const r of ranked) {
      if (r.winRate === bestRate) earned.get(r.id)?.set('melhor_aproveitamento', 1);
    }
  }

  const result = new Map();
  for (const [userId, counts] of earned) {
    result.set(userId, countsToList(counts));
  }
  return result;
}

export function getPlayerAchievements(achievementMap, playerId) {
  return achievementMap.get(playerId) ?? [];
}

function buildPreviewList(entries) {
  return entries
    .map(([id, count]) => {
      const def = getAchievement(id);
      return def ? { ...def, count } : null;
    })
    .filter(Boolean);
}

/**
 * Pré-visualização local — injeta conquistas de exemplo para ver o layout no ranking.
 * Só roda com `npm run dev`; não entra no build de produção.
 */
export function applyDevAchievementPreview(achievementMap, profiles) {
  if (!import.meta.env.DEV) return achievementMap;

  const player = profiles.find((p) => {
    const name = `${p.nickname ?? ''} ${p.full_name ?? ''}`.toLowerCase();
    return name.includes('gabriel');
  });
  if (!player) return achievementMap;

  const preview = new Map(achievementMap);
  preview.set(
    player.id,
    buildPreviewList([
      ['invicto', 1],
      ['em_chamas', 1],
      ['maratonista', 1],
      ['mestre', 2],
      ['baldo', 3],
      ['fracassado', 2],
    ]),
  );
  return preview;
}

export { ACHIEVEMENTS };
