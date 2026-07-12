import React, { useEffect, useRef, useState } from 'react';
import { createWaterFestivalGame } from './gameEngine';
import { createRunRecord } from './lib/runRecord';
import { fetchLeaderboard, getLeaderboardStatus, saveLeaderboardRecord } from './lib/leaderboard';

const INITIAL_STAGE_BADGE = {
  label: 'STAGE 1 : 천관산 억새밭',
  color: '#f59e0b'
};

const TREASURE_COLUMNS = [
  {
    title: '1단계: 천관산',
    tone: 'autumn',
    items: ['9품 표고버섯', '9품 청태전', '9경 우드랜드', '9경 천관산', '9경 제암산', '9경 보림사', '9품 헛개나무', '9미 황칠백숙', '9품 아르미쌀']
  },
  {
    title: '2단계: 토요시장',
    tone: 'market',
    items: ['9품 육포', '9미 한우삼합', '9미 키조개요리', '9미 바지락회무침', '9미 석화', '9미 갑오징어회먹찜', '9품 장흥무산김', '9품 낙지', '9미 갯장어샤브샤브']
  },
  {
    title: '3단계: 물축제',
    tone: 'water',
    items: ['9경 탐진강', '9품 매생이', '9미 매생이탕', '9미 된장물회', '9경 전망대', '9경 소등섬', '9경 선학동마을', '9품 황칠나무', '9경 토요시장']
  }
];

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
  const [nickname, setNickname] = useState(() => localStorage.getItem('waterfestival-player-name') ?? '');
  const [gameState, setGameState] = useState('START');
  const [stageBadge, setStageBadge] = useState(INITIAL_STAGE_BADGE);
  const [transitionMessage, setTransitionMessage] = useState('천관산의 가을 억새 보물을 모두 찾았습니다!');
  const [treasurePopup, setTreasurePopup] = useState(null);
  const [popupCanClose, setPopupCanClose] = useState(false);
  const [runStats, setRunStats] = useState(EMPTY_RUN_STATS);
  const [lastRun, setLastRun] = useState(null);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [leaderboardRows, setLeaderboardRows] = useState([]);
  const [leaderboardState, setLeaderboardState] = useState('idle');
  const [runSaveState, setRunSaveState] = useState('idle');
  const savedRunKeyRef = useRef(null);

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
      onRunComplete: (record) => setLastRun(createRunRecord(record))
    });

    gameRef.current = engine;
    return () => {
      engine.destroy();
      gameRef.current = null;
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
    if (gameState !== 'CLEAR' || !lastRun) return undefined;

    const runKey = `${lastRun.nickname}-${lastRun.createdAt}-${lastRun.totalMs}`;
    if (savedRunKeyRef.current === runKey) return undefined;
    savedRunKeyRef.current = runKey;
    let cancelled = false;

    setRunSaveState('saving');
    saveLeaderboardRecord(lastRun)
      .then(async ({ record, saved, reason }) => {
        if (cancelled) return;
        if (!saved) {
          setRunSaveState(reason === 'not-configured' ? 'not-configured' : reason === 'invalid-time' ? 'invalid-time' : 'error');
          return;
        }
        setRunSaveState('saved');
        setLeaderboardRows((rows) => [record, ...rows].sort((a, b) => a.totalMs - b.totalMs).slice(0, 20));
      })
      .catch(() => {
        if (!cancelled) setRunSaveState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [gameState, lastRun]);

  const selectedMode = PLAY_MODES[selectedModeIndex];
  const cleanNickname = nickname.trim().replace(/\s+/g, ' ').slice(0, 12);
  const nicknameReady = cleanNickname.length > 0;

  const chooseSelectedMode = () => {
    if (!nicknameReady) return;
    localStorage.setItem('waterfestival-player-name', cleanNickname);
    setNickname(cleanNickname);
    setPlayMode(selectedMode.id);
  };

  const openLeaderboard = async () => {
    setLeaderboardOpen(true);
    setLeaderboardState('loading');
    try {
      const result = await fetchLeaderboard();
      setLeaderboardRows(result.records);
      setLeaderboardState(result.available ? 'ready' : 'not-configured');
    } catch {
      setLeaderboardState('error');
    }
  };

  const requestMobileLandscape = async () => {
    if (playMode !== 'mobile') return;
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' });
    } catch {
      // Fullscreen support differs by mobile browser.
    }
    try {
      await window.screen?.orientation?.lock?.('landscape');
    } catch {
      // iOS Safari does not expose orientation lock to web apps.
    }
  };

  const startGame = async () => {
    setLastRun(null);
    setRunSaveState('idle');
    await requestMobileLandscape();
    gameRef.current?.start({ nickname: cleanNickname, playMode });
  };

  const restartGame = async () => {
    setLastRun(null);
    setRunSaveState('idle');
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
            <div className="game-timers" aria-label="스테이지별 초시계">
              <div><span>STAGE 1</span><strong>{formatDuration(runStats.stageTimes[0])}</strong></div>
              <div><span>STAGE 2</span><strong>{formatDuration(runStats.stageTimes[1])}</strong></div>
              <div><span>STAGE 3</span><strong>{formatDuration(runStats.stageTimes[2])}</strong></div>
              <div className="total"><span>TOTAL</span><strong>{formatDuration(runStats.totalTime)}</strong></div>
            </div>
          )}

          {!playMode && (
            <div className="overlay overlay-start retro-screen">
              <p className="pixel-eyebrow">SELECT PLAY STYLE</p>
              <div className="overlay-title logo-title">대모험! 장흥 9경9미9품 투어</div>
              <p className="overlay-copy compact">플레이 환경에 맞춰 조작 방식을 선택하세요.</p>
              <label className="nickname-field">
                <span>닉네임</span>
                <input
                  value={nickname}
                  maxLength={12}
                  autoComplete="nickname"
                  placeholder="1~12글자로 입력"
                  onChange={(event) => setNickname(event.target.value)}
                />
                <small>{cleanNickname.length}/12</small>
              </label>
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
                {nicknameReady ? `${selectedMode.label}으로 시작` : '닉네임을 입력하세요'}
              </button>
              <button className="leaderboard-button" type="button" onClick={openLeaderboard}>
                리더보드 보기
              </button>
            </div>
          )}

          {leaderboardOpen && (
            <div className="overlay leaderboard-overlay" role="dialog" aria-modal="true" aria-labelledby="leaderboard-title">
              <p className="pixel-eyebrow">BEST RUNS</p>
              <div className="overlay-title" id="leaderboard-title">리더보드</div>
              <p className="leaderboard-caption">닉네임이 기록 앞에 표시됩니다. 전체 시간 기준으로 빠른 순서입니다.</p>
              {leaderboardState === 'loading' && <p className="leaderboard-message">기록을 불러오는 중...</p>}
              {leaderboardState === 'not-configured' && (
                <p className="leaderboard-message">Supabase 환경 변수와 game_runs 테이블을 설정하면 기록이 표시됩니다.</p>
              )}
              {leaderboardState === 'error' && <p className="leaderboard-message">리더보드를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.</p>}
              {leaderboardState === 'ready' && leaderboardRows.length === 0 && (
                <p className="leaderboard-message">아직 등록된 기록이 없습니다. 첫 기록을 남겨보세요.</p>
              )}
              {leaderboardRows.length > 0 && (
                <div className="leaderboard-table" role="table" aria-label="게임 리더보드">
                  <div className="leaderboard-row leaderboard-row--header" role="row">
                    <span>순위</span><span>닉네임</span><span>STAGE 1</span><span>STAGE 2</span><span>STAGE 3</span><span>TOTAL</span>
                  </div>
                  {leaderboardRows.map((row, index) => (
                    <div className="leaderboard-row" role="row" key={`${row.nickname}-${row.createdAt}-${index}`}>
                      <strong>{index + 1}</strong>
                      <strong className="leaderboard-name">{row.nickname}</strong>
                      <span className="leaderboard-stage-time" data-label="STAGE 1">{formatDuration(row.stage1Ms)}</span>
                      <span className="leaderboard-stage-time" data-label="STAGE 2">{formatDuration(row.stage2Ms)}</span>
                      <span className="leaderboard-stage-time" data-label="STAGE 3">{formatDuration(row.stage3Ms)}</span>
                      <strong className="leaderboard-total">{formatDuration(row.totalMs)}</strong>
                    </div>
                  ))}
                </div>
              )}
              <p className="leaderboard-connection">
                {getLeaderboardStatus() === 'ready' ? 'Supabase 연결됨' : 'Supabase 환경 변수 대기 중'}
              </p>
              <button className="ghost-button" type="button" onClick={() => setLeaderboardOpen(false)}>닫기</button>
            </div>
          )}

          {playMode && gameState === 'START' && (
            <div className="overlay overlay-start">
              <p className="pixel-eyebrow">{playMode === 'mobile' ? 'MOBILE PAD READY' : 'KEYBOARD READY'}</p>
              <div className="overlay-title">{cleanNickname}의 장흥 탐험기</div>
              <p className="overlay-kicker">각 스테이지에 흩어진 9개의 보물을 획득하세요.</p>
              <div className="start-grid">
                <div>
                  <h2>조작법</h2>
                  {playMode === 'mobile' ? <><p>좌/우 패드: 이동</p><p>JUMP: 2단 점프</p><p>DASH: 돌진</p><p>SHOT: 아래 방향 물총</p></> : <><p>A / D 또는 ← / → 이동</p><p>W / Space: 2단 점프</p><p>LShift / C: 대시</p><p>마우스 클릭: 물총</p></>}
                </div>
                <div><h2>3대 모험 코스</h2><p>천관산 연대봉</p><p>장흥 토요시장</p><p>정남진 물축제장</p></div>
              </div>
              <div className="button-row">
                <button className="primary-button" type="button" onClick={startGame}>게임 시작</button>
                <button className="ghost-button" type="button" onClick={() => setPlayMode(null)}>버전 다시 선택</button>
              </div>
            </div>
          )}

          {gameState === 'TRANSITION' && (
            <div className="overlay overlay-transition">
              <p className="pixel-eyebrow">AREA COMPLETE</p>
              <div className="overlay-title">STAGE CLEAR!</div>
              <p className="transition-message">{transitionMessage}</p>
              <button className="secondary-button" type="button" onClick={() => gameRef.current?.nextStage()}>다음 스테이지 출발</button>
            </div>
          )}

          {gameState === 'CLEAR' && (
            <div className="overlay overlay-clear">
              <p className="pixel-eyebrow">QUEST COMPLETE</p>
              <div className="overlay-title">{lastRun?.nickname || cleanNickname}의 27대 보물 마스터!</div>
              <div className="run-summary" aria-label="완주 기록">
                {runStats.stageTimes.map((time, index) => <div key={index}><span>STAGE {index + 1}</span><strong>{formatDuration(time)}</strong></div>)}
                <div className="total"><span>TOTAL</span><strong>{formatDuration(runStats.totalTime)}</strong></div>
              </div>
              <p className={`run-save-status run-save-status--${runSaveState}`} aria-live="polite">
                {runSaveState === 'saving' && '기록을 리더보드에 저장하는 중...'}
                {runSaveState === 'saved' && '기록이 리더보드에 등록되었습니다.'}
                {runSaveState === 'not-configured' && 'Supabase 설정 후 이 기록이 리더보드에 등록됩니다.'}
                {runSaveState === 'invalid-time' && '초시계 기록이 없어 저장하지 않았습니다. 게임을 끝까지 플레이해주세요.'}
                {runSaveState === 'error' && '기록 저장에 실패했습니다. Supabase 설정을 확인해주세요.'}
              </p>
              <div className="treasure-grid">
                {TREASURE_COLUMNS.map((column) => (
                  <section className={`treasure-column ${column.tone}`} key={column.title}>
                    <h2>{column.title}</h2>
                    {column.items.map((item) => <p key={item}>{item}</p>)}
                  </section>
                ))}
              </div>
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
                  {popupCanClose ? <button type="button" onClick={closeTreasurePopup}>닫기</button> : <p>보물 설명을 읽어보세요. 3초 뒤 닫기 버튼이 나타납니다.</p>}
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
        </footer>
      </section>
    </main>
  );
}

export default App;
