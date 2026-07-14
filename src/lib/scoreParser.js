/** Placares válidos de um set (vencedor-loser). */
const VALID_SET_SCORES = new Set([
  '6-0',
  '6-1',
  '6-2',
  '6-3',
  '6-4',
  '7-5',
  '7-6',
]);

/**
 * Interpreta placar de 1 set (ex: 6-4, 7-6).
 * O primeiro número é sempre do Jogador 1.
 */
export function parseSetScore(input) {
  if (!input?.trim()) {
    return { ok: false, error: 'Informe o placar do set (ex: 6-4 ou 7-6)' };
  }

  const normalized = input.trim().replace(/\s+/g, '').replace(':', '-');
  const match = normalized.match(/^(\d+)-(\d+)$/);
  if (!match) {
    return { ok: false, error: 'Formato inválido. Use 6-4 ou 7-6' };
  }

  const player1Games = parseInt(match[1], 10);
  const player2Games = parseInt(match[2], 10);

  if (player1Games > 7 || player2Games > 7) {
    return { ok: false, error: 'Placar acima de 7 games não é válido para 1 set' };
  }

  const winnerGames = Math.max(player1Games, player2Games);
  const loserGames = Math.min(player1Games, player2Games);
  const canonical = `${winnerGames}-${loserGames}`;

  if (!VALID_SET_SCORES.has(canonical)) {
    return {
      ok: false,
      error: 'Placar inválido. Vitória em 6 (com 2 games de diferença) ou 7-5 / 7-6',
    };
  }

  return {
    ok: true,
    player1Games,
    player2Games,
    scoreDisplay: `${player1Games}-${player2Games}`,
    hadTiebreak: winnerGames === 7 && loserGames === 6,
  };
}

/**
 * Monta e valida placar a partir dos games de cada jogador.
 */
export function parseSetScoreFromGames(player1GamesInput, player2GamesInput) {
  if (player1GamesInput === '' || player2GamesInput === '') {
    return { ok: false, error: 'Informe o placar dos dois jogadores' };
  }

  const player1Games = parseInt(String(player1GamesInput), 10);
  const player2Games = parseInt(String(player2GamesInput), 10);

  if (Number.isNaN(player1Games) || Number.isNaN(player2Games)) {
    return { ok: false, error: 'Placar inválido' };
  }

  return parseSetScore(`${player1Games}-${player2Games}`);
}

/** Garante que o placar bate com quem venceu. */
export function validateScoreForWinner(parsed, winnerIsPlayer1) {
  const { player1Games, player2Games } = parsed;

  if (player1Games === player2Games) {
    return { ok: false, error: 'O set não pode empatar' };
  }
  if (winnerIsPlayer1 && player1Games <= player2Games) {
    return { ok: false, error: 'O placar não bate com a vitória do Jogador 1' };
  }
  if (!winnerIsPlayer1 && player2Games <= player1Games) {
    return { ok: false, error: 'O placar não bate com a vitória do Jogador 2' };
  }

  return { ok: true };
}
