import { getSupabase } from './supabase.js';

export async function fetchProfiles() {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from('profiles').select('*').order('nickname');
  if (error) throw error;
  return data;
}

export async function fetchProfile(id) {
  const supabase = await getSupabase();
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

export async function updateProfile(id, fields) {
  const payload = {};
  if (fields.full_name !== undefined) payload.full_name = fields.full_name.trim();
  if (fields.nickname !== undefined) payload.nickname = fields.nickname.trim();
  if (fields.bairro !== undefined) payload.bairro = fields.bairro?.trim() || null;
  if (fields.cidade !== undefined) payload.cidade = fields.cidade?.trim() || null;
  if (fields.about !== undefined) payload.about = fields.about?.trim() || null;
  if (fields.avatar_url !== undefined) payload.avatar_url = fields.avatar_url;

  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function uploadAvatar(userId, file) {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/avatar.${ext}`;
  const supabase = await getSupabase();

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  const avatarUrl = `${data.publicUrl}?t=${Date.now()}`;
  return updateProfile(userId, { avatar_url: avatarUrl });
}

export function getProfileLocation(profile) {
  if (profile?.bairro) return profile.bairro;
  if (profile?.cidade) return profile.cidade;
  return '—';
}

export function getProfileDisplayName(profile) {
  return profile?.nickname || profile?.full_name || '—';
}

export function isAppAdmin(profile) {
  return profile?.is_admin === true;
}

export function canCancelMatch(match, profile) {
  if (!profile || !match) return false;
  if (isAppAdmin(profile)) return true;
  return match.player1_id === profile.id || match.player2_id === profile.id;
}

export function canEditMatch(match, profile) {
  if (!profile || !match || match.status !== 'confirmed') return false;
  return canCancelMatch(match, profile);
}
