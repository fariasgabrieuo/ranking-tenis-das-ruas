/**
 * URL pública do app — usada no redirect de confirmação de e-mail.
 * Em produção: https://fariasgabrieuo.github.io/ranking-tenis-das-ruas/
 */
export function getAppBaseUrl() {
  if (typeof window === 'undefined') return '';

  let base = import.meta.env.BASE_URL || '/';
  if (!base.startsWith('/')) base = `/${base}`;
  if (!base.endsWith('/')) base = `${base}/`;

  return `${window.location.origin}${base}`;
}
