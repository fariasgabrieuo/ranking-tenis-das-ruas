/** Ícone SVG do balde — o emoji 🪣 não renderiza bem no Windows 10. */
export const BALDO_BUCKET_SVG = `<svg class="achievement-icon-svg" viewBox="0 0 36 36" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
  <path fill="#8899A6" d="M13.2 8.2c0-2.1 2.1-3.7 4.8-3.7s4.8 1.6 4.8 3.7V10h-9.6V8.2z"/>
  <path fill="#55ACEE" d="M10.5 10.5h15l-2.1 17.5H12.6L10.5 10.5z"/>
  <path fill="#3B88C3" d="M9.5 10.5h17v2.8H9.5z"/>
  <path fill="#BBDDFF" d="M13 15.5h10v9.5H13z"/>
  <path fill="#3B88C3" d="M11.5 28.5h13v2H11.5z"/>
</svg>`;

export function getAchievementIconHtml(achievement) {
  if (achievement?.id === 'baldo') return BALDO_BUCKET_SVG;
  return achievement?.icon ?? '';
}
