/** Traduz erros comuns do Supabase Auth para mensagens claras em português. */
export function formatAuthError(err) {
  const msg = (err?.message ?? '').toLowerCase();
  const code = err?.code ?? '';

  if (
    msg.includes('rate limit') ||
    msg.includes('over_email_send_rate_limit') ||
    code === 'over_email_send_rate_limit'
  ) {
    return (
      'Limite de e-mails atingido no servidor (plano gratuito: ~2 por hora). ' +
      'Aguarde 1 hora e tente de novo, ou desligue a confirmação de e-mail no Supabase.'
    );
  }

  if (msg.includes('invalid login credentials')) {
    return 'E-mail ou senha incorretos. Se acabou de se cadastrar, confirme o e-mail antes de entrar.';
  }

  if (msg.includes('user already registered')) {
    return 'Este e-mail já está cadastrado. Use Entrar ou outro e-mail.';
  }

  if (msg.includes('duplicate key') || msg.includes('profiles_nickname_unique')) {
    return 'Este apelido já está em uso. Escolha outro apelido.';
  }

  return err?.message ?? 'Não foi possível concluir. Tente de novo.';
}
