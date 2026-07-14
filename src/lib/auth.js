import { getSupabase } from './supabase.js';
import { getAppBaseUrl } from './siteUrl.js';

export async function getSession() {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function signUp({ email, password, fullName, nickname }) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      emailRedirectTo: getAppBaseUrl(),
      data: {
        full_name: fullName.trim(),
        nickname: nickname.trim(),
      },
    },
  });
  if (error) throw error;
  return data;
}

export async function signIn({ email, password }) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  const supabase = await getSupabase();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function onAuthStateChange(callback) {
  const supabase = await getSupabase();
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return data.subscription;
}

/** Processa retorno do link de confirmação de e-mail (hash ou ?code= na URL). */
export async function completeAuthFromUrl() {
  const supabase = await getSupabase();
  const searchParams = new URLSearchParams(window.location.search);
  const code = searchParams.get('code');

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    window.history.replaceState(null, '', `${window.location.origin}${window.location.pathname}`);
    return { handled: true, session: data.session, authType: searchParams.get('type') };
  }

  const hash = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash;
  const hashParams = new URLSearchParams(hash);

  if (!hashParams.has('access_token') && !hashParams.has('type')) {
    return { handled: false, session: null };
  }

  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;

  window.history.replaceState(null, '', `${window.location.origin}${window.location.pathname}`);
  return { handled: true, session: data.session, authType: hashParams.get('type') };
}
