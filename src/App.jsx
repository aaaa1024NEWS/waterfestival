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
      '표고버섯 (9품)',
      '청태전 차 (9품)',
      '편백 우드랜드 (9경)',
      '천관산 공원 (9경)',
      '제암산 철쭉 (9경)',
      '가지산 보림사 (9경)',
      '헛개나무 제품 (9품)',
      '황칠 백숙 (9미)',
      '친환경 유기쌀 (9품)'
    ]
  },
  {
    title: '2단계: 토요시장',
    tone: 'market',
    items: [
      '장흥 한우 (9품)',
      '장흥 삼합 (9미)',
      '키조개 요리 (9미)',
      '바지락 회무침 (9미)',
      '석화 굴구이 (9미)',
      '싱싱 갑오징어 (9미)',
      '청정 무산김 (9품)',
      '탐진강 낙지 (9품)',
      '갯장어 샤브 (9미)'
    ]
  },
  {
    title: '3단계: 물축제',
    tone: 'water',
    items: [
      '탐진강 물결 (9경)',
      '찰진 매생이 (9품)',
      '명품 매생이탕 (9미)',
      '된장물회 (9미)',
      '정남진 전망대 (9경)',
      '바다 소등섬 (9경)',
      '메밀꽃 선학동 (9경)',
      '황칠 공예품 (9품)',
      '장흥 축제마크 (9경)'
    ]
  }
];

function App() {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const [gameState, setGameState] = useState('START');
  const [stageBadge, setStageBadge] = useState(INITIAL_STAGE_BADGE);
  const [transitionMessage, setTransitionMessage] = useState(
    '천관산의 가을 억새 보물을 모두 찾았습니다!'
  );

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

  const startGame = () => gameRef.current?.start();
  const nextStage = () => gameRef.current?.nextStage();
  const restartGame = () => gameRef.current?.restart();

  return (
    <main className="app-shell">
      <section className="game-shell" aria-label="정남진 장흥 물축제 홍보 게임">
        <header className="game-header">
          <div>
            <h1>대모험! 장흥 9경9미9품 투어</h1>
            <p>3개의 넓은 스테이지를 탐험하며 장흥의 아름다움을 만끽하세요.</p>
          </div>
          <aside className="stage-badge" aria-live="polite">
            <span>제19회 정남진 장흥 물축제</span>
            <strong style={{ color: stageBadge.color }}>{stageBadge.label}</strong>
          </aside>
        </header>

        <div className="canvas-frame">
          <canvas ref={canvasRef} width="800" height="500" tabIndex="0" />

          {gameState === 'START' && (
            <div className="overlay overlay-start">
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
                  <p>A / D 또는 ← / → 이동</p>
                  <p>W / Space 2단 점프</p>
                  <p>LShift / C 대시</p>
                  <p>마우스 왼쪽 클릭 물방울 물총</p>
                </div>
                <div>
                  <h2>3대 모험 코스</h2>
                  <p>천관산 연대봉</p>
                  <p>장흥 토요시장</p>
                  <p>정남진 물축제장</p>
                </div>
              </div>

              <button className="primary-button" type="button" onClick={startGame}>
                장흥 투어 모험 개시
              </button>
            </div>
          )}

          {gameState === 'TRANSITION' && (
            <div className="overlay overlay-transition">
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
        </div>

        <footer className="game-footer">
          <p>
            캐릭터가 움직이지 않는 경우 게임 화면을 한 번 클릭하면 조작 초점이 바로
            돌아옵니다.
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
