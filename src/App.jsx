import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createWaterFestivalGame } from './gameEngine';
import { fetchLeaderboard, saveLeaderboardEntry } from './lib/leaderboard';
import { isSupabaseConfigured } from './lib/supabaseClient';

const INITIAL_STAGE_BADGE = {
  label: 'STAGE 1 : 천관산 억새밭',
  color: '#f59e0b'
};

const PLAY_MODES = [
  { id: 'pc', icon: 'PC', label: 'PC 버전', description: '키보드와 마우스로 정교하게 플레이' },
  { id: 'mobile', icon: 'M', label: '모바일 버전', description: '가상 패드와 액션 버튼으로 플레이' }
];

const EMPTY_RUN_STATS = {
  currentStage: 1,
  stageTimes: [0, 0, 0],
  totalTime: 0
};

function formatDuration(milliseconds = 0) {
  const totalCentiseconds = Math.max(0, Math.floor(milliseconds / 10));
  const minutes = Math.floor(totalCentiseconds / 6000);
  const seconds = Math.floor((totalCentiseconds % 6000) / 100);
  const centiseconds = totalCentiseconds % 100;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centiseconds).padStart(2, '0')}`;
}

function App() {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const [playMode, setPlayMode] = useState(null);
  const [selectedModeIndex, setSelectedModeIndex] = useState(0);
  const [nickname, setNickname] = useState(() => localStorage.getItem('waterfestival-nickname') ?? '');
  const [gameState, setGameState] = useState('START');
  const [stageBadge, setStageBadge] = useState(INITIAL_STAGE_BADGE);
  const [transitionMessage, setTransitionMessage] = useState('천관산의 가을 억새 보물을 모두 찾았습니다!');
  const [treasurePopup, setTreasurePopup] = useState(null);
  const [popupCanClose, setPopupCanClose] = useState(false);
  const [runStats, setRunStats] = useState(EMPTY_RUN_STATS);
  const [completedRun, setCompletedRun] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leaderboardStatus, setLeaderboardStatus] = useState('loading');

  const cleanNickname = nickname.trim().replace(/\s+/g, ' ').slice(0, 12);
  const nicknameReady = cleanNickname.length >= 1;

  useEffect(() => {
    const prefersMobile = window.matchMedia('(max-width: 720px), (pointer: coarse)').matches;
    if (prefersMobile) setSelectedModeIndex(1);
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return undefined;

    const engine = createWaterFestivalGame({
      canvas: canvasRef.current,
      onGameStateChange: setGameState,
      onStageChange: setStageBadge,
      onTransitionMessageChange: setTransitionMessage,
      onTreasurePopupChange: setTreasurePopup,
      onRunStatsChange: setRunStats,
      onRunComplete: setCompletedRun
    });

    gameRef.current = engine;
    return () => {
      engine.destroy();
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLeaderboardStatus('loading');
    fetchLeaderboard()
      .then((rows) => {
        if (!cancelled) {
          setLeaderboard(rows);
          setLeaderboardStatus('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setLeaderboardStatus('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!treasurePopup) {
      setPopupCanClose(false);
      return undefined;
    }

    const delay = Math.max(0, treasurePopup.closeEnabledAt - performance.now());
    setPopupCanClose(delay === 0);
    const timer = window.setTimeout(() => setPopupCanClose(true), delay);
    return () => window.clearTimeout(timer);
  }, [treasurePopup]);

  useEffect(() => {
    if (!completedRun) return;

    let cancelled = false;
    const entry = {
      nickname: completedRun.nickname,
      play_mode: completedRun.playMode,
      stage1_ms: completedRun.stageTimes[0],
      stage2_ms: completedRun.stageTimes[1],
      stage3_ms: completedRun.stageTimes[2],
      total_ms: completedRun.totalTime
    };

    setLeaderboardStatus('saving');
    saveLeaderboardEntry(entry)
      .then(() => fetchLeaderboard())
      .then((rows) => {
        if (!cancelled) {
          setLeaderboard(rows);
          setLeaderboardStatus('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setLeaderboardStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, [completedRun]);

  const selectedMode = PLAY_MODES[selectedModeIndex];
  const currentStageTime = runStats.stageTimes[runStats.currentStage - 1] ?? 0;
  const completedRanking = useMemo(() => {
    if (!completedRun) return null;
    const index = leaderboard.findIndex(
      (row) => row.nickname === completedRun.nickname && Math.abs(row.total_ms - completedRun.totalTime) < 100
    );
    return index >= 0 ? index + 1 : null;
  }, [completedRun, leaderboard]);

  const requestMobileLandscape = async () => {
    if (playMode !== 'mobile') return;
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' });
    } catch {
      // Fullscreen and orientation lock availability differs by mobile browser.
    }
    try {
      await window.screen?.orientation?.lock?.('landscape');
    } catch {
      // iOS Safari does not expose orientation lock to web apps.
    }
  };

  const chooseSelectedMode = () => {
    if (!nicknameReady) return;
    localStorage.setItem('waterfestival-nickname', cleanNickname);
    setNickname(cleanNickname);
    setPlayMode(selectedMode.id);
  };

  const startGame = async () => {
    if (!nicknameReady || !playMode) return;
    setCompletedRun(null);
    await requestMobileLandscape();
    gameRef.current?.start({ nickname: cleanNickname, playMode });
  };

  const restartGame = async () => {
    setCompletedRun(null);
    await requestMobileLandscape();
    gameRef.current?.restart({ nickname: cleanNickname, playMode });
  };

  const closeTreasurePopup = () => {
    if (popupCanClose) gameRef.current?.closeTreasurePopup();
  };

  const pressMove = (direction) => (event) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    gameRef.current?.setMoveDirection(direction);
  };
  const releaseMove = (event) => {
    event.preventDefault();
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    gameRef.current?.stopMove();
  };
  const pressAction = (action) => (event) => {
    event.preventDefault();
    gameRef.current?.[action]?.();
  };
  const releaseAction = (action) => (event) => {
    event.preventDefault();
    gameRef.current?.[action]?.();
  };

  const appClassName = [
    'app-shell',
    playMode === 'mobile' ? 'app-shell--mobile' : '',
    gameState === 'PLAYING' ? 'app-shell--playing' : '',
    !playMode ? 'app-shell--selecting' : ''
  ].filter(Boolean).join(' ');

  return (
    <main className={appClassName}>
      <section className="game-shell" aria-label="정남진 장흥 물축제 홍보 게임">
        <header className="game-header">
          <div>
            <p className="header-kicker">RETRO WATER FESTIVAL QUEST</p>
            <h1 className="retro-logo">대모험! 장흥 9경9미9품 투어</h1>
            <p>3개의 스테이지를 달리며 장흥의 보물을 모으세요.</p>
          </div>
          <aside className="stage-badge" aria-live="polite">
            <span>제19회 정남진 장흥 물축제</span>
            <strong style={{ color: stageBadge.color }}>{stageBadge.label}</strong>
          </aside>
        </header>

        <div className="canvas-frame">
          <canvas ref={canvasRef} width="1920" height="1080" tabIndex="0" />

          {playMode && gameState !== 'START' && (
            <div className="game-timer" aria-live="off">
              <span>STAGE {runStats.currentStage}</span>
              <strong>{formatDuration(currentStageTime)}</strong>
              <span>TOTAL</span>
              <strong>{formatDuration(runStats.totalTime)}</strong>
            </div>
          )}

          {!playMode && (
            <div className="overlay overlay-start retro-screen">
              <p className="pixel-eyebrow">PLAYER SETUP</p>
              <div className="overlay-title logo-title">대모험! 장흥 9경9미9품 투어</div>
              <div className="player-setup">
                <label htmlFor="nickname">닉네임</label>
                <input
                  id="nickname"
                  value={nickname}
                  maxLength={12}
                  autoComplete="nickname"
                  placeholder="1~12글자로 입력"
                  onChange={(event) => setNickname(event.target.value)}
                />
                <small>{cleanNickname.length}/12</small>
              </div>
              <div className="mode-carousel" aria-label="플레이 버전 선택">
                <button className="mode-arrow" type="button" aria-label="이전 버전" onClick={() => setSelectedModeIndex((selectedModeIndex + 1) % PLAY_MODES.length)}>◀</button>
                <button className={`mode-card selected ${selectedMode.id === 'mobile' ? 'cyan' : ''}`} type="button" onClick={chooseSelectedMode} disabled={!nicknameReady}>
                  <span className="mode-icon">{selectedMode.icon}</span>
                  <strong>{selectedMode.label}</strong>
                  <small>{selectedMode.description}</small>
                </button>
                <button className="mode-arrow" type="button" aria-label="다음 버전" onClick={() => setSelectedModeIndex((selectedModeIndex + 1) % PLAY_MODES.length)}>▶</button>
              </div>
              <button className="primary-button" type="button" onClick={chooseSelectedMode} disabled={!nicknameReady}>
                {nicknameReady ? `${selectedMode.label} 선택` : '닉네임을 입력하세요'}
              </button>
            </div>
          )}

          {playMode && gameState === 'START' && (
            <div className="overlay overlay-start">
              <p className="pixel-eyebrow">{playMode === 'mobile' ? 'MOBILE PAD READY' : 'KEYBOARD READY'}</p>
              <div className="overlay-title">{cleanNickname}의 장흥 탐험</div>
              <p className="overlay-kicker">보물 팝업을 읽는 동안 초시계는 자동으로 멈춥니다.</p>
              <div className="start-grid">
                <div>
                  <h2>조작법</h2>
                  {playMode === 'mobile' ? <><p>좌/우 패드: 이동</p><p>JUMP: 2단 점프</p><p>DASH: 돌진</p><p>SHOT: 아래 방향 물총</p></> : <><p>A / D 또는 ← / → 이동</p><p>W / Space: 2단 점프</p><p>LShift / C: 대시</p><p>마우스 클릭: 물총</p></>}
                </div>
                <div><h2>3대 모험 코스</h2><p>천관산 연대봉</p><p>장흥 토요시장</p><p>정남진 물축제장</p></div>
              </div>
              <div className="button-row">
                <button className="primary-button" type="button" onClick={startGame}>게임 시작</button>
                <button className="ghost-button" type="button" onClick={() => setPlayMode(null)}>닉네임·버전 변경</button>
              </div>
            </div>
          )}

          {gameState === 'TRANSITION' && (
            <div className="overlay overlay-transition">
              <p className="pixel-eyebrow">AREA COMPLETE</p>
              <div className="overlay-title">STAGE CLEAR!</div>
              <p className="transition-message">{transitionMessage}</p>
              <div className="stage-result-time">스테이지 기록 <strong>{formatDuration(runStats.stageTimes[runStats.currentStage - 1])}</strong></div>
              <button className="secondary-button" type="button" onClick={() => gameRef.current?.nextStage()}>다음 스테이지 출발</button>
            </div>
          )}

          {gameState === 'CLEAR' && (
            <div className="overlay overlay-clear">
              <p className="pixel-eyebrow">QUEST COMPLETE</p>
              <div className="overlay-title">27대 보물 마스터!</div>
              <div className="run-summary">
                {runStats.stageTimes.map((time, index) => <div key={index}><span>STAGE {index + 1}</span><strong>{formatDuration(time)}</strong></div>)}
                <div className="total"><span>TOTAL</span><strong>{formatDuration(runStats.totalTime)}</strong></div>
              </div>
              <section className="leaderboard-panel" aria-label="리더보드">
                <div className="leaderboard-heading"><h2>TOP 10 LEADERBOARD</h2>{completedRanking && <span>현재 {completedRanking}위</span>}</div>
                <div className="leaderboard-list">
                  {leaderboard.map((row, index) => (
                    <div className="leaderboard-row" key={row.id}>
                      <span className="rank">{index + 1}</span><strong>{row.nickname}</strong><span>{row.play_mode === 'mobile' ? 'M' : 'PC'}</span><time>{formatDuration(row.total_ms)}</time>
                    </div>
                  ))}
                  {leaderboard.length === 0 && <p>{leaderboardStatus === 'loading' || leaderboardStatus === 'saving' ? '기록을 불러오는 중입니다.' : '첫 기록의 주인공이 되어 보세요.'}</p>}
                </div>
              </section>
              {leaderboardStatus === 'error' && <p className="leaderboard-error">온라인 순위 저장에 실패했습니다. Supabase 설정을 확인해 주세요.</p>}
              <button className="success-button" type="button" onClick={restartGame}>처음부터 다시하기</button>
            </div>
          )}

          {treasurePopup && (
            <div className="treasure-popup-overlay" role="dialog" aria-modal="true" aria-labelledby="treasure-popup-title">
              <article className="treasure-popup-card">
                <header>장흥 보물 획득</header>
                <div className="treasure-popup-content">
                  <div className="treasure-popup-image"><img src={treasurePopup.imageSrc} alt={`${treasurePopup.title} 보물`} /></div>
                  <div className="treasure-popup-copy">
                    <p className="popup-status">획득 완료 · 보물 정보</p>
                    <h2 id="treasure-popup-title">[{treasurePopup.item.kind}] {treasurePopup.title}</h2>
                    <p className="popup-description">{treasurePopup.description}</p>
                    <div className="popup-use"><strong>도감 기록</strong><span>{treasurePopup.item.kind} 도감에 저장되었습니다.</span></div>
                  </div>
                </div>
                <footer>
                  {popupCanClose ? <button type="button" onClick={closeTreasurePopup}>창 닫기</button> : <p>보물 설명을 읽어보세요. 3초 뒤 닫기 버튼이 나타납니다.</p>}
                </footer>
              </article>
            </div>
          )}

          {playMode === 'mobile' && gameState === 'PLAYING' && !treasurePopup && (
            <div className="mobile-pad" onContextMenu={(event) => event.preventDefault()}>
              <div className="pad-cluster move-cluster" aria-label="이동 패드">
                <button className="pad-button arrow" type="button" onPointerDown={pressMove('left')} onPointerUp={releaseMove} onPointerCancel={releaseMove} onPointerLeave={releaseMove}>◀</button>
                <button className="pad-button arrow" type="button" onPointerDown={pressMove('right')} onPointerUp={releaseMove} onPointerCancel={releaseMove} onPointerLeave={releaseMove}>▶</button>
              </div>
              <div className="pad-cluster action-cluster" aria-label="액션 패드">
                <button className="pad-button action shot" type="button" onPointerDown={pressAction('shootDown')}>SHOT</button>
                <button className="pad-button action jump" type="button" onPointerDown={pressAction('pressJump')} onPointerUp={releaseAction('releaseJump')} onPointerCancel={releaseAction('releaseJump')} onPointerLeave={releaseAction('releaseJump')}>JUMP</button>
                <button className="pad-button action dash" type="button" onPointerDown={pressAction('pressDash')} onPointerUp={releaseAction('releaseDash')} onPointerCancel={releaseAction('releaseDash')} onPointerLeave={releaseAction('releaseDash')}>DASH</button>
              </div>
            </div>
          )}
        </div>

        <footer className="game-footer">
          <p>{playMode === 'mobile' ? '모바일 버전에서는 화면을 가로로 돌리면 가장 편하게 플레이할 수 있습니다.' : 'PC 버전에서는 게임 화면을 클릭하면 조작 초점이 돌아옵니다.'}</p>
          <p>리더보드 저장: <strong className={isSupabaseConfigured ? 'status-ready' : 'status-waiting'}>{isSupabaseConfigured ? 'Supabase 온라인 연결됨' : '이 기기에 임시 저장 중'}</strong></p>
        </footer>
      </section>
    </main>
  );
}

export default App;
