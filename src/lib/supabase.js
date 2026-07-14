import { createClient } from '@supabase/supabase-js';

let client = null;
let configError = null;
let initPromise = null;

async function ensureClient() {
  if (client || configError) return;
  if (initPromise) {
    await initPromise;
    return;
  }

  initPromise = (async () => {
    try {
      const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import('../supabase-config.js');
      if (
        !SUPABASE_URL?.includes('supabase.co') ||
        SUPABASE_URL.includes('SEU-PROJETO') ||
        !SUPABASE_ANON_KEY ||
        SUPABASE_ANON_KEY.includes('SUA-ANON') ||
        SUPABASE_ANON_KEY.includes('SUA-ANON-KEY')
      ) {
        configError = 'Configure src/supabase-config.js com sua URL e Publishable key do Supabase';
      } else {
        client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: {
            detectSessionInUrl: true,
            persistSession: true,
            autoRefreshToken: true,
            flowType: 'pkce',
          },
        });
      }
    } catch {
      configError = 'Arquivo src/supabase-config.js não encontrado. Copie de supabase-config.example.js';
    }
  })();

  await initPromise;
}

export function getConfigError() {
  return configError;
}

export async function getSupabase() {
  await ensureClient();
  if (!client) throw new Error(configError ?? 'Supabase não configurado');
  return client;
}

export async function fetchMatches() {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('matches')
    .select('*')
    .order('played_at', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addMatch({
  player1_id,
  player2_id,
  registered_by_id,
  match_type,
  winner_id,
  score_display,
  player1_games,
  player2_games,
  had_tiebreak,
  played_at,
}) {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('matches')
    .insert({
      player1_id,
      player2_id,
      registered_by_id,
      match_type,
      status: 'pending',
      winner_id,
      score_display,
      player1_games,
      player2_games,
      had_tiebreak,
      played_at,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function confirmMatch(id) {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('matches')
    .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
    .eq('id', id)
    .eq('status', 'pending')
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function rejectMatch(id) {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('matches')
    .update({ status: 'rejected', winner_id: null })
    .eq('id', id)
    .eq('status', 'pending')
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteMatch(id) {
  const supabase = await getSupabase();
  const { error } = await supabase.from('matches').delete().eq('id', id);
  if (error) throw error;
}

export async function insertTimelineEvent(event_type, payload) {
  const supabase = await getSupabase();
  const { error } = await supabase.from('timeline_events').insert({ event_type, payload });
  if (error) throw error;
}

/** Resolve config na inicialização do app (main.js). */
export async function initSupabase() {
  await ensureClient();
}
