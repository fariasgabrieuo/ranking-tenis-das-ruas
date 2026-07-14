/** Balde tradicional (Fluent Emoji) — o 🪣 nativo quebra no Windows 10. */
const BALDO_EMOJI_SRC = `${import.meta.env.BASE_URL}emoji/baldo.svg`;

export function getAchievementIconHtml(achievement) {
  if (achievement?.id === 'baldo') {
    return `<img class="achievement-emoji-img" src="${BALDO_EMOJI_SRC}" alt="🪣" width="16" height="16" draggable="false" loading="lazy">`;
  }
  return achievement?.icon ?? '';
}
