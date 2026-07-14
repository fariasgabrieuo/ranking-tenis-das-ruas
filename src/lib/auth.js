import { getSupabase } from './supabase.js';

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
