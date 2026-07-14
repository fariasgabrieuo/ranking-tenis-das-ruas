/** Traduz erros comuns do Supabase (Postgres / RLS) para português. */
export function formatSupabaseError(err) {
  const msg = err?.message ?? '';

  if (msg.includes('row-level security policy') && msg.includes('matches')) {
    return (
      'Não foi possível confirmar a partida por uma regra de segurança no banco. ' +
      'Peça ao admin para rodar o arquivo supabase/fix-match-confirm-rls.sql no Supabase.'
    );
  }

  return msg || 'Algo deu errado. Tente de novo.';
}
