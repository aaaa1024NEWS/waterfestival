import React, { useEffect, useRef, useState } from 'react';
import { createWaterFestivalGame } from './gameEngine';
import { isSupabaseConfigured } from './lib/supabaseClient';

const INITIAL_STAGE_BADGE = {
  label: 'STAGE 1 : 천관산 억새밭',
  color: '#f59e0b'
};

const TREASURE_COLUMNS = [
  {
    title: '1단계: 천관산',
    tone: 'autumn',
    items: [
      '9품 표고버섯',
      '9품 청태전',
      '9경 우드랜드',
      '9경 천관산',
      '9경 제암산',
      '9경 보림사',
      '9품 헛개나무',
      '9미 황칠백숙',
      '9품 아르미쌀'
    ]
  },
  {
    title: '2단계: 토요시장',
    tone: 'market',
    items: [
      '9품 육포',
      '9미 한우삼합',
      '9미 키조개요리',
      '9미 바지락회무침',
      '9미 석화',
      '9미 갑오징어회먹찜',
      '9품 장흥무산김',
      '9품 낙지',
      '9미 갯장어샤브샤브'
    ]
  },
  {
    title: '3단계: 물축제',
    tone: 'water',
    items: [
      '9경 탐진강',
      '9품 매생이',
      '9미 매생이탕',
      '9미 된장물회',
      '9경 전망대',
      '9경 소등섬',
      '9경 선학동마을',
      '9품 황칠나무',
      '9경 토요시장'
    ]
  }
];

const PLAY_MODES = [
  {
    id: 'pc',
    icon: 'PC',
    label: 'PC 버전',
    description: '키보드와 마우스로 정교하게 플레이'
  },
  {
    id: 'mobile',
    icon: 'M',
    label: '모바일 버전',
    description: '좌우 버튼과 액션 버튼으로 플레이'
  }
];

function App() {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const [playMode, setPlayMode] = useState(null);
  const [selectedModeIndex, setSelectedModeIndex] = useState(0);
  const [gameState, setGameState] = useState('START');
  const [stageBadge, setStageBadge] = useState(INITIAL_STAGE_BADGE);
  const [transitionMessage, setTransitionMessage] = useState(
    '천관산의 가을 억새 보물을 모두 찾았습니다!'
  );

  useEffect(() => {
    const prefersMobile = window.matchMedia('(max-width: 720px), (pointer: coarse)').matches;
    if (prefersMobile) {
      setSelectedModeIndex(1);
    }
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return undefined;

    const engine = createWaterFestivalGame({
      canvas: canvasRef.current,
      onGameStateChange: setGameState,
      onStageChange: setStageBadge,
      onTransitionMessageChange: setTransitionMessage
    });

    gameRef.current = engine;

    return () => {
      engine.destroy();
      gameRef.current = null;
    };
  }, []);

  const requestMobileLandscape = async () => {
    if (playMode !== 'mobile') return;

    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' });
      }
    } catch {
      // Some mobile browsers only allow orientation changes without fullscreen or not at all.
    }

    try {
      await window.screen?.orientation?.lock?.('landscape');
    } catch {
      // iOS Safari does not currently expose orientation lock to web apps.
    }
  };

  const startGame = async () => {
    await requestMobileLandscape();
    gameRef.current?.start();
  };
  const nextStage = () => gameRef.current?.nextStage();
  const restartGame = async () => {
    await requestMobileLandscape();
    gameRef.current?.restart();
  };
  const selectedMode = PLAY_MODES[selectedModeIndex];
  const chooseSelectedMode = () => setPlayMode(selectedMode.id);
  const selectPreviousMode = () =>
    setSelectedModeIndex((index) => (index + PLAY_MODES.length - 1) % PLAY_MODES.length);
  const selectNextMode = () =>
    setSelectedModeIndex((index) => (index + 1) % PLAY_MODES.length);
  const backToModeSelect = () => setPlayMode(null);

  const pressMoveLeft = (event) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    gameRef.current?.setMoveDirection('left');
  };

  const pressMoveRight = (event) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    gameRef.current?.setMoveDirection('right');
  };

  const releaseMove = (event) => {
    event.preventDefault();
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    gameRef.current?.stopMove();
  };

  const pressJump = (event) => {
    event.preventDefault();
    gameRef.current?.pressJump();
  };

  const releaseJump = (event) => {
    event.preventDefault();
    gameRef.current?.releaseJump();
  };

  const pressDash = (event) => {
    event.preventDefault();
    gameRef.current?.pressDash();
  };

  const releaseDash = (event) => {
    event.preventDefault();
    gameRef.current?.releaseDash();
  };

  const shootDown = (event) => {
    event.preventDefault();
    gameRef.current?.shootDown();
  };

  const appClassName = [
    'app-shell',
    playMode === 'mobile' ? 'app-shell--mobile' : '',
    gameState === 'PLAYING' ? 'app-shell--playing' : '',
    !playMode ? 'app-shell--selecting' : ''
  ]
    .filter(Boolean)
    .join(' ');

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

          {!playMode && (
            <div className="overlay overlay-start retro-screen">
              <p className="pixel-eyebrow">SELECT PLAY STYLE</p>
              <div className="overlay-title logo-title">대모험! 장흥 9경9미9품 투어</div>
              <p className="overlay-copy compact">
                플레이 환경에 맞춰 조작 방식을 먼저 선택하세요.
              </p>

              <div className="mode-carousel" aria-label="플레이 버전 선택">
                <button className="mode-arrow" type="button" onClick={selectPreviousMode}>
                  ◀
                </button>
                <button
                  className={`mode-card selected ${selectedMode.id === 'mobile' ? 'cyan' : ''}`}
                  type="button"
                  onClick={chooseSelectedMode}
                >
                  <span className="mode-icon">{selectedMode.icon}</span>
                  <strong>{selectedMode.label}</strong>
                  <small>{selectedMode.description}</small>
                </button>
                <button className="mode-arrow" type="button" onClick={selectNextMode}>
                  ▶
                </button>
              </div>
              <button className="primary-button" type="button" onClick={chooseSelectedMode}>
                {selectedMode.label}으로 시작
              </button>
              <div className="mode-hint">화살표로 버전을 바꾸고 시작 버튼을 누르세요.</div>
            </div>
          )}

          {playMode && gameState === 'START' && (
            <div className="overlay overlay-start">
              <p className="pixel-eyebrow">
                {playMode === 'mobile' ? 'MOBILE PAD READY' : 'KEYBOARD READY'}
              </p>
              <div className="overlay-title">장흥 탐험기: 27개의 보물</div>
              <p className="overlay-kicker">3개의 아름다운 장흥 랜드마크를 달리는 파쿠르 액션</p>
              <p className="overlay-copy">
                할로우 나이트풍의 쫀득한 아크로바틱 파쿠르로 장흥을 일주하세요.
                천관산의 억새 능선, 활기찬 토요시장, 쿨한 물축제장을 넘나들며 각
                스테이지마다 흩어진 9개의 보물을 획득하세요.
              </p>

              <div className="start-grid">
                <div>
                  <h2>아크로바틱 조작법</h2>
                  {playMode === 'mobile' ? (
                    <>
                      <p>좌/우 버튼: 이동</p>
                      <p>JUMP: 2단 점프와 벽점프</p>
                      <p>DASH: 돌진</p>
                      <p>SHOT: 아래 방향 고정 물총</p>
                    </>
                  ) : (
                    <>
                      <p>A / D 또는 ← / → 이동</p>
                      <p>W / Space 2단 점프</p>
                      <p>LShift / C 대시</p>
                      <p>마우스 왼쪽 클릭 물방울 물총</p>
                    </>
                  )}
                </div>
                <div>
                  <h2>3대 모험 코스</h2>
                  <p>천관산 연대봉</p>
                  <p>장흥 토요시장</p>
                  <p>정남진 물축제장</p>
                </div>
              </div>

              <div className="button-row">
                <button className="primary-button" type="button" onClick={startGame}>
                  장흥 투어 모험 개시
                </button>
                <button className="ghost-button" type="button" onClick={backToModeSelect}>
                  모드 다시 선택
                </button>
              </div>
            </div>
          )}

          {gameState === 'TRANSITION' && (
            <div className="overlay overlay-transition">
              <p className="pixel-eyebrow">AREA COMPLETE</p>
              <div className="overlay-title">STAGE CLEAR!</div>
              <p className="transition-message">{transitionMessage}</p>
              <p className="overlay-copy compact">
                다음 지역으로 이동하여 숨겨진 보물 9경9미9품을 계속 수집하세요.
              </p>
              <button className="secondary-button" type="button" onClick={nextStage}>
                다음 스테이지 출발
              </button>
            </div>
          )}

          {gameState === 'CLEAR' && (
            <div className="overlay overlay-clear">
              <p className="pixel-eyebrow">QUEST COMPLETE</p>
              <div className="overlay-title">27대 보물 마스터!</div>
              <p className="transition-message">
                장흥의 9경 9미 9품을 완벽하게 등재하고 수집했습니다.
              </p>

              <div className="treasure-grid">
                {TREASURE_COLUMNS.map((column) => (
                  <section className={`treasure-column ${column.tone}`} key={column.title}>
                    <h2>{column.title}</h2>
                    {column.items.map((item) => (
                      <p key={item}>{item}</p>
                    ))}
                  </section>
                ))}
              </div>

              <p className="invite-copy">올여름 시원함이 터지는 정남진 장흥 물축제로 초대합니다!</p>
              <button className="success-button" type="button" onClick={restartGame}>
                처음부터 다시하기
              </button>
            </div>
          )}

          {playMode === 'mobile' && gameState === 'PLAYING' && (
            <div className="mobile-pad" onContextMenu={(event) => event.preventDefault()}>
              <div className="pad-cluster move-cluster" aria-label="이동 패드">
                <button
                  className="pad-button arrow"
                  type="button"
                  onPointerDown={pressMoveLeft}
                  onPointerUp={releaseMove}
                  onPointerCancel={releaseMove}
                  onPointerLeave={releaseMove}
                >
                  ◀
                </button>
                <button
                  className="pad-button arrow"
                  type="button"
                  onPointerDown={pressMoveRight}
                  onPointerUp={releaseMove}
                  onPointerCancel={releaseMove}
                  onPointerLeave={releaseMove}
                >
                  ▶
                </button>
              </div>

              <div className="pad-cluster action-cluster" aria-label="액션 패드">
                <button
                  className="pad-button action shot"
                  type="button"
                  onPointerDown={shootDown}
                >
                  SHOT
                </button>
                <button
                  className="pad-button action jump"
                  type="button"
                  onPointerDown={pressJump}
                  onPointerUp={releaseJump}
                  onPointerCancel={releaseJump}
                  onPointerLeave={releaseJump}
                >
                  JUMP
                </button>
                <button
                  className="pad-button action dash"
                  type="button"
                  onPointerDown={pressDash}
                  onPointerUp={releaseDash}
                  onPointerCancel={releaseDash}
                  onPointerLeave={releaseDash}
                >
                  DASH
                </button>
              </div>
            </div>
          )}
        </div>

        <footer className="game-footer">
          <p>
            {playMode === 'mobile'
              ? '모바일 버전에서는 좌우 버튼으로 이동하고, SHOT은 아래 방향으로 발사됩니다.'
              : 'PC 버전에서는 게임 화면을 한 번 클릭하면 조작 초점이 바로 돌아옵니다.'}
          </p>
          <p>
            Supabase 연결 상태:{' '}
            <strong className={isSupabaseConfigured ? 'status-ready' : 'status-waiting'}>
              {isSupabaseConfigured ? '환경 변수 연결됨' : '환경 변수 대기 중'}
            </strong>
          </p>
        </footer>
      </section>
    </main>
  );
}

export default App;
