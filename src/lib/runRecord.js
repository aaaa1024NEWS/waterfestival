// Supabase에 연결할 때 그대로 insert payload로 사용할 실행 기록 형태입니다.
export function createRunRecord({
  nickname = '',
  playMode = 'pc',
  stageTimes = [0, 0, 0],
  totalTime = 0,
  createdAt = new Date().toISOString()
} = {}) {
  return {
    nickname: String(nickname).trim().slice(0, 12),
    playMode: playMode === 'mobile' ? 'mobile' : 'pc',
    stage1Ms: Math.max(0, Math.round(Number(stageTimes[0]) || 0)),
    stage2Ms: Math.max(0, Math.round(Number(stageTimes[1]) || 0)),
    stage3Ms: Math.max(0, Math.round(Number(stageTimes[2]) || 0)),
    totalMs: Math.max(0, Math.round(Number(totalTime) || 0)),
    createdAt
  };
}
