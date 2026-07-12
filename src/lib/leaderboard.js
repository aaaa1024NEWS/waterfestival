import { isSupabaseConfigured, supabase } from './supabaseClient';
import { createRunRecord } from './runRecord';

const LEADERBOARD_TABLE = 'game_runs';

export function getLeaderboardStatus() {
  return isSupabaseConfigured ? 'ready' : 'not-configured';
}

export async function saveLeaderboardRecord(record) {
  const normalized = createRunRecord(record);
  if (!isSupabaseConfigured || !supabase) {
    return { record: normalized, saved: false, reason: 'not-configured' };
  }

  const { data, error } = await supabase
    .from(LEADERBOARD_TABLE)
    .insert({
      nickname: normalized.nickname,
      play_mode: normalized.playMode,
      stage1_ms: normalized.stage1Ms,
      stage2_ms: normalized.stage2Ms,
      stage3_ms: normalized.stage3Ms,
      total_ms: normalized.totalMs,
      created_at: normalized.createdAt
    })
    .select('nickname, play_mode, stage1_ms, stage2_ms, stage3_ms, total_ms, created_at')
    .single();

  if (error) throw error;
  return { record: mapLeaderboardRow(data), saved: true };
}

export async function fetchLeaderboard(limit = 20) {
  if (!isSupabaseConfigured || !supabase) {
    return { records: [], available: false, reason: 'not-configured' };
  }

  const { data, error } = await supabase
    .from(LEADERBOARD_TABLE)
    .select('nickname, play_mode, stage1_ms, stage2_ms, stage3_ms, total_ms, created_at')
    .order('total_ms', { ascending: true })
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return { records: (data ?? []).map(mapLeaderboardRow), available: true };
}

function mapLeaderboardRow(row = {}) {
  return {
    nickname: String(row.nickname ?? '').trim().slice(0, 12),
    playMode: row.play_mode === 'mobile' ? 'mobile' : 'pc',
    stage1Ms: Math.max(0, Number(row.stage1_ms) || 0),
    stage2Ms: Math.max(0, Number(row.stage2_ms) || 0),
    stage3Ms: Math.max(0, Number(row.stage3_ms) || 0),
    totalMs: Math.max(0, Number(row.total_ms) || 0),
    createdAt: row.created_at ?? null
  };
}
