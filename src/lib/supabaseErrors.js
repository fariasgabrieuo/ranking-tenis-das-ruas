/** Traduz erros comuns do Supabase (Postgres / RLS) para português. */
export function formatSupabaseError(err) {
  const msg = err?.message ?? '';

  if (msg.includes('row-level security policy') && msg.includes('matches')) {
    if (msg.toLowerCase().includes('delete')) {
      return (
        'Não foi possível cancelar a partida por uma regra de segurança no banco. ' +
        'Peça ao admin para rodar supabase/fix-match-cancel-rls.sql no Supabase.'
      );
    }
    return (
      'Não foi possível alterar a partida. Peça ao admin para rodar fix-match-confirm-rls.sql ' +
      'ou fix-match-edit-rls.sql no Supabase, conforme a ação.'
    );
  }

  return msg || 'Algo deu errado. Tente de novo.';
}
