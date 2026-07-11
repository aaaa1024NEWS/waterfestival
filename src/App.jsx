import React, { useEffect, useRef, useState } from 'react';
import { createWaterFestivalGame } from './gameEngine';

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

function App() {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const [playMode, setPlayMode] = useState(null);
  const [selectedModeIndex, setSelectedModeIndex] = useState(0);
  const [gameState, setGameState] = useState('START');
  const [stageBadge, setStageBadge] = useState(INITIAL_STAGE_BADGE);
  const [transitionMessage, setTransitionMessage] = useState('천관산의 가을 억새 보물을 모두 찾았습니다!');
  const [treasurePopup, setTreasurePopup] = useState(null);
  const [popupCanClose, setPopupCanClose] = useState(false);

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
      onTreasurePopupChange: setTreasurePopup
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

  const selectedMode = PLAY_MODES[selectedModeIndex];

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
    await requestMobileLandscape();
    gameRef.current?.start();
  };

  const restartGame = async () => {
    await requestMobileLandscape();
    gameRef.current?.restart();
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

          {!playMode && (
            <div className="overlay overlay-start retro-screen">
              <p className="pixel-eyebrow">SELECT PLAY STYLE</p>
              <div className="overlay-title logo-title">대모험! 장흥 9경9미9품 투어</div>
              <p className="overlay-copy compact">플레이 환경에 맞춰 조작 방식을 선택하세요.</p>
              <div className="mode-carousel" aria-label="플레이 버전 선택">
                <button className="mode-arrow" type="button" aria-label="이전 버전" onClick={() => setSelectedModeIndex((selectedModeIndex + 1) % PLAY_MODES.length)}>◀</button>
                <button className={`mode-card selected ${selectedMode.id === 'mobile' ? 'cyan' : ''}`} type="button" onClick={() => setPlayMode(selectedMode.id)}>
                  <span className="mode-icon">{selectedMode.icon}</span>
                  <strong>{selectedMode.label}</strong>
                  <small>{selectedMode.description}</small>
                </button>
                <button className="mode-arrow" type="button" aria-label="다음 버전" onClick={() => setSelectedModeIndex((selectedModeIndex + 1) % PLAY_MODES.length)}>▶</button>
              </div>
              <button className="primary-button" type="button" onClick={() => setPlayMode(selectedMode.id)}>{selectedMode.label}으로 시작</button>
            </div>
          )}

          {playMode && gameState === 'START' && (
            <div className="overlay overlay-start">
              <p className="pixel-eyebrow">{playMode === 'mobile' ? 'MOBILE PAD READY' : 'KEYBOARD READY'}</p>
              <div className="overlay-title">장흥 탐험기: 27개의 보물</div>
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
              <div className="overlay-title">27대 보물 마스터!</div>
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
