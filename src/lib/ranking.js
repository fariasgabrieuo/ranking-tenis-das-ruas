import { RULES } from '../config/rules.js';
import { getProfileDisplayName, getProfileLocation } from './profiles.js';

function emptyStats(profile) {
  return {
    id: profile.id,
    nickname: profile.nickname,
    full_name: profile.full_name,
    location: getProfileLocation(profile),
    wins: 0,
    losses: 0,
    matches: 0,
    points: 0,
    gamesWon: 0,
    gamesLost: 0,
    winRate: 0,
  };
}

function pointsForWin(matchType) {
  return matchType === 'friendly' ? RULES.points.friendlyWin : RULES.points.rankedWin;
}

function compareByTiebreakers(a, b) {
  for (const key of RULES.tiebreakers) {
    let diff = 0;
    switch (key) {
      case 'points':
        diff = b.points - a.points;
        break;
      case 'gamesWon':
        diff = b.gamesWon - a.gamesWon;
        break;
      case 'wins':
        diff = b.wins - a.wins;
        break;
      case 'nickname':
        diff = a.nickname.localeCompare(b.nickname, 'pt-BR');
        break;
      default:
        break;
    }
    if (diff !== 0) return diff;
  }
  return 0;
}

function addGames(stats, playerId, match) {
  const isP1 = match.player1_id === playerId;
  const won = isP1 ? match.player1_games : match.player2_games;
  const lost = isP1 ? match.player2_games : match.player1_games;
  stats[playerId].gamesWon += won;
  stats[playerId].gamesLost += lost;
}

/**
 * Calcula ranking a partir de perfis + partidas confirmadas.
 */
export function computeRanking(profiles, matches) {
  const stats = Object.fromEntries(profiles.map((p) => [p.id, emptyStats(p)]));

  const eligible = RULES.countOnlyConfirmed
    ? matches.filter((m) => m.status === 'confirmed')
    : matches.filter((m) => m.status !== 'rejected');

  const sortedMatches = [...eligible].sort(
    (a, b) => new Date(a.played_at) - new Date(b.played_at) || new Date(a.created_at) - new Date(b.created_at),
  );

  for (const match of sortedMatches) {
    const p1 = stats[match.player1_id];
    const p2 = stats[match.player2_id];
    if (!p1 || !p2 || !match.winner_id) continue;

    p1.matches += 1;
    p2.matches += 1;
    addGames(stats, match.player1_id, match);
    addGames(stats, match.player2_id, match);

    const winnerId = match.winner_id;
    const loserId = winnerId === match.player1_id ? match.player2_id : match.player1_id;

    stats[winnerId].wins += 1;
    stats[loserId].losses += 1;
    stats[winnerId].points += pointsForWin(match.match_type);
    stats[loserId].points += RULES.points.loss;
  }

  for (const s of Object.values(stats)) {
    s.winRate = s.matches > 0 ? Math.round((s.wins / s.matches) * 100) : 0;
  }

  let ranked = Object.values(stats).filter((s) => s.matches >= RULES.minMatchesToRank);
  ranked.sort(compareByTiebreakers);
  ranked = ranked.map((s, i) => ({ ...s, position: i + 1 }));

  return ranked;
}

export function getPlayerName(profiles, id) {
  const profile = profiles.find((p) => p.id === id);
  return profile ? getProfileDisplayName(profile) : '—';
}

export function getCafeComLeiteZone(totalPlayers) {
  if (totalPlayers < RULES.cafeComLeite.minPlayers) return new Set();
  return new Set([totalPlayers, totalPlayers - 1]);
}
