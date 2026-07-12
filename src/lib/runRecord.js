// Supabase에 연결할 때 그대로 insert payload로 사용할 실행 기록 형태입니다.
export function createRunRecord({
  nickname = '',
  playMode = 'pc',
  stageTimes,
  totalTime,
  stage1Ms,
  stage2Ms,
  stage3Ms,
  totalMs,
  createdAt = new Date().toISOString()
} = {}) {
  const normalizedStageTimes = Array.isArray(stageTimes)
    ? stageTimes
    : [stage1Ms, stage2Ms, stage3Ms];
  const normalizedTotalTime = totalTime ?? totalMs;

  return {
    nickname: String(nickname).trim().slice(0, 12),
    playMode: playMode === 'mobile' ? 'mobile' : 'pc',
    stage1Ms: Math.max(0, Math.round(Number(normalizedStageTimes[0]) || 0)),
    stage2Ms: Math.max(0, Math.round(Number(normalizedStageTimes[1]) || 0)),
    stage3Ms: Math.max(0, Math.round(Number(normalizedStageTimes[2]) || 0)),
    totalMs: Math.max(0, Math.round(Number(normalizedTotalTime) || 0)),
    createdAt
  };
}
