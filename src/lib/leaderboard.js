import { isSupabaseConfigured, supabase } from './supabaseClient';

const LOCAL_STORAGE_KEY = 'waterfestival-leaderboard-v1';
const TABLE_NAME = 'waterfestival_scores';

function sanitizeEntry(entry) {
  return {
    id: entry.id ?? crypto.randomUUID(),
    nickname: String(entry.nickname ?? '익명').trim().slice(0, 12),
    play_mode: entry.play_mode === 'mobile' ? 'mobile' : 'pc',
    stage1_ms: Math.max(0, Math.round(Number(entry.stage1_ms) || 0)),
    stage2_ms: Math.max(0, Math.round(Number(entry.stage2_ms) || 0)),
    stage3_ms: Math.max(0, Math.round(Number(entry.stage3_ms) || 0)),
    total_ms: Math.max(0, Math.round(Number(entry.total_ms) || 0)),
    created_at: entry.created_at ?? new Date().toISOString()
  };
}

function readLocalEntries() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.map(sanitizeEntry) : [];
  } catch {
    return [];
  }
}

function writeLocalEntry(entry) {
  const entries = [sanitizeEntry(entry), ...readLocalEntries()]
    .sort((a, b) => a.total_ms - b.total_ms)
    .slice(0, 50);
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(entries));
  return entries;
}

export async function fetchLeaderboard(limit = 10) {
  if (!isSupabaseConfigured) {
    return readLocalEntries().sort((a, b) => a.total_ms - b.total_ms).slice(0, limit);
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select('id,nickname,play_mode,stage1_ms,stage2_ms,stage3_ms,total_ms,created_at')
    .order('total_ms', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map(sanitizeEntry);
}

export async function saveLeaderboardEntry(entry) {
  const payload = sanitizeEntry(entry);

  if (!isSupabaseConfigured) {
    writeLocalEntry(payload);
    return payload;
  }

  const { data, error } = await supabase
    .from(TABLE_NAME)
    .insert({
      nickname: payload.nickname,
      play_mode: payload.play_mode,
      stage1_ms: payload.stage1_ms,
      stage2_ms: payload.stage2_ms,
      stage3_ms: payload.stage3_ms,
      total_ms: payload.total_ms
    })
    .select('id,nickname,play_mode,stage1_ms,stage2_ms,stage3_ms,total_ms,created_at')
    .single();

  if (error) throw error;
  return sanitizeEntry(data);
}

