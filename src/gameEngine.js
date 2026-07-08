import gameBackgroundUrl from '../assets/game-background.png';

const treasureAssetModules = import.meta.glob('../assets/treasures/*.{jpg,jpeg,png,webp}', {
    eager: true,
    import: 'default',
    query: '?url'
});

const treasureAssets = Object.fromEntries(
    Object.entries(treasureAssetModules).map(([path, url]) => [
        decodeURIComponent(path.split('/').pop()),
        url
    ])
);

function treasureImage(filename) {
    return treasureAssets[filename];
}

const STAGE_BADGES = {
    1: { label: 'STAGE 1 : 천관산 억새밭', color: '#f59e0b' },
    2: { label: 'STAGE 2 : 장흥 토요시장', color: '#fbbf24' },
    3: { label: 'STAGE 3 : 정남진 물축제장', color: '#22d3ee' }
};

const TRANSITION_MESSAGES = {
    1: '천관산의 억새풀 보물을 전부 모았습니다!',
    2: '장흥 토요시장의 우량 특산물 보물을 전부 모았습니다!'
};

function getStageBadge(stage) {
    return STAGE_BADGES[stage] ?? STAGE_BADGES[1];
}

export function createWaterFestivalGame({
    canvas,
    onGameStateChange = () => {},
    onStageChange = () => {},
    onTransitionMessageChange = () => {}
}) {
    if (!canvas) {
        throw new Error('Canvas element is required.');
    }

    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const notifyGameState = () => onGameStateChange(gameState);
    const notifyStage = () => onStageChange(getStageBadge(currentStage));
        const treasureImageCache = new Map();
        const gameBackground = new Image();
        gameBackground.src = gameBackgroundUrl;

        const hollowPalette = {
            void: '#030712',
            deepBlue: '#071426',
            blueMist: 'rgba(96, 165, 250, 0.22)',
            lamp: 'rgba(191, 219, 254, 0.35)',
            shell: '#f8fafc',
            shellShade: '#dbeafe',
            ink: '#020617',
            cloak: '#101827',
            outline: '#00040c',
            platform: '#08111f',
            platformEdge: '#192a46',
            cyan: '#7dd3fc'
        };

        function drawCoverImage(image, dx, dy, dw, dh) {
            if (!image.complete || image.naturalWidth === 0) return false;

            const imageRatio = image.naturalWidth / image.naturalHeight;
            const targetRatio = dw / dh;
            let sx = 0;
            let sy = 0;
            let sw = image.naturalWidth;
            let sh = image.naturalHeight;

            if (imageRatio > targetRatio) {
                sw = image.naturalHeight * targetRatio;
                sx = (image.naturalWidth - sw) / 2;
            } else {
                sh = image.naturalWidth / targetRatio;
                sy = (image.naturalHeight - sh) / 2;
            }

            ctx.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
            return true;
        }

        function drawHollowScreenGrade() {
            const topFog = ctx.createLinearGradient(0, 0, 0, canvas.height);
            topFog.addColorStop(0, 'rgba(5, 14, 30, 0.35)');
            topFog.addColorStop(0.55, 'rgba(2, 6, 23, 0.18)');
            topFog.addColorStop(1, 'rgba(0, 0, 0, 0.58)');
            ctx.fillStyle = topFog;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            drawCoverImage(gameBackground, 0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(4, 13, 28, 0.24)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const glow = ctx.createRadialGradient(430, 260, 40, 430, 260, 420);
            glow.addColorStop(0, hollowPalette.lamp);
            glow.addColorStop(0.45, 'rgba(59, 130, 246, 0.08)');
            glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const vignette = ctx.createRadialGradient(400, 250, 180, 400, 250, 520);
            vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
            vignette.addColorStop(1, 'rgba(0, 0, 0, 0.72)');
            ctx.fillStyle = vignette;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        function getTreasureImage(src) {
            if (!src) return null;
            if (treasureImageCache.has(src)) {
                return treasureImageCache.get(src);
            }

            const image = new Image();
            image.src = src;
            treasureImageCache.set(src, image);
            return image;
        }

        // 게임 상태 관리
        let gameState = 'START'; // START, PLAYING, TRANSITION, CLEAR
        let currentStage = 1; // 1, 2, 3
        // 카메라 시점 줌인 배율
        const zoom = 1.6;

        // 입력 키 매핑 (초기값 설정)
        const keys = {
            a: false, d: false, w: false, s: false,
            ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false,
            space: false, shift: false, c: false
        };

        const mouse = { x: 0, y: 0 };

        // 플레이어 캐릭터 구조체
        const player = {
            x: 100,
            y: 800,
            width: 20,
            height: 32,
            vx: 0,
            vy: 0,
            speed: 5.0,
            jumpForce: 10.5,
            gravity: 0.48,
            isGrounded: false,
            canDoubleJump: true,
            hasDoubleJumped: false,
            isWallSliding: false,
            wallSlidingSide: null,
            
            // 대시 시스템
            dashCooldown: 0,
            dashTimer: 0,
            dashDirection: 0,
            dashSpeed: 15.0,
            isDashing: false,
            canDash: true,

            color: '#f8fafc',
            facing: 'right'
        };

        // 거대화된 맵 정보
        const levelWidth = 3200;
        const levelHeight = 1000;

        // 9경9미9품 데이터 풀 (총 27개 수집품 분할 수집)
        const stageItemsPool = {
            1: [
                { id: 1, kind: '9품', name: '표고버섯', color: '#fbbf24', icon: '🍄', imageSrc: treasureImage('9품표고버섯.jpg') },
                { id: 2, kind: '9품', name: '청태전', color: '#a3e635', icon: '🍵', imageSrc: treasureImage('9품청태전.jpg') },
                { id: 3, kind: '9경', name: '우드랜드', color: '#34d399', icon: '🌲', imageSrc: treasureImage('9경우드랜드.jpg') },
                { id: 4, kind: '9경', name: '천관산', color: '#f87171', icon: '⛰️', imageSrc: treasureImage('9경천관산.jpg') },
                { id: 5, kind: '9경', name: '제암산', color: '#f472b6', icon: '🌸', imageSrc: treasureImage('9경제암산.jpg') },
                { id: 6, kind: '9경', name: '보림사', color: '#fb923c', icon: '⛩️', imageSrc: treasureImage('9경 보림사.jpg') },
                { id: 7, kind: '9품', name: '헛개나무', color: '#60a5fa', icon: '🌿', imageSrc: treasureImage('9품헛개나무.jpg') },
                { id: 8, kind: '9미', name: '황칠백숙', color: '#cbd5e1', icon: '🍲', imageSrc: treasureImage('황칠백숙.png') },
                { id: 9, kind: '9품', name: '아르미쌀', color: '#fef08a', icon: '🌾', imageSrc: treasureImage('9품아르미쌀.jpg') }
            ],
            2: [
                { id: 10, kind: '9품', name: '육포', color: '#fca5a5', icon: '🐂', imageSrc: treasureImage('9품육포.jpg') },
                { id: 11, kind: '9미', name: '한우삼합', color: '#f87171', icon: '🥩', imageSrc: treasureImage('9미한우삼합.png') },
                { id: 12, kind: '9미', name: '키조개요리', color: '#93c5fd', icon: '🐚', imageSrc: treasureImage('9미키조개요리.png') },
                { id: 13, kind: '9미', name: '바지락회무침', color: '#f472b6', icon: '🥗', imageSrc: treasureImage('9미바지락회무침.png') },
                { id: 14, kind: '9미', name: '석화', color: '#cbd5e1', icon: '🦪', imageSrc: treasureImage('9미석화.png') },
                { id: 15, kind: '9미', name: '갑오징어회먹찜', color: '#e2e8f0', icon: '🦑', imageSrc: treasureImage('9미갑오징어회먹찜.png') },
                { id: 16, kind: '9품', name: '장흥무산김', color: '#475569', icon: '🍙', imageSrc: treasureImage('9품장흥무산김.jpg') },
                { id: 17, kind: '9품', name: '낙지', color: '#fda4af', icon: '🐙', imageSrc: treasureImage('9품낙지.jpg') },
                { id: 18, kind: '9미', name: '갯장어샤브샤브', color: '#93c5fd', icon: '🐟', imageSrc: treasureImage('9미갯장어샤브샤브.png') }
            ],
            3: [
                { id: 19, kind: '9경', name: '탐진강', color: '#38bdf8', icon: '💧', imageSrc: treasureImage('9경탐진강.jpg') },
                { id: 20, kind: '9품', name: '매생이', color: '#4ade80', icon: '🌿', imageSrc: treasureImage('9품매생이.jpg') },
                { id: 21, kind: '9미', name: '매생이탕', color: '#15803d', icon: '🥣', imageSrc: treasureImage('9미매생이탕.png') },
                { id: 22, kind: '9미', name: '된장물회', color: '#fbbf24', icon: '🍜', imageSrc: treasureImage('9미된장물회.png') },
                { id: 23, kind: '9경', name: '전망대', color: '#f472b6', icon: '🗼', imageSrc: treasureImage('9경전망대.jpg') },
                { id: 24, kind: '9경', name: '소등섬', color: '#60a5fa', icon: '🏝️', imageSrc: treasureImage('9경소등섬.jpg') },
                { id: 25, kind: '9경', name: '선학동마을', color: '#ffffff', icon: '🌼', imageSrc: treasureImage('9경선학동마을.jpg') },
                { id: 26, kind: '9품', name: '황칠나무', color: '#b45309', icon: '🪵', imageSrc: treasureImage('9품황칠나무.jpg') },
                { id: 27, kind: '9경', name: '토요시장', color: '#22d3ee', icon: '💎', imageSrc: treasureImage('9경토요시장.jpg') }
            ]
        };

        // 활성 수집품 목록
        let activeItems = [];

        // 보물 소환이 가능한 후보 스폰 위치 좌표들 (12개 지점 중 9개 무작위 선별)
        const spawnPositions = [
            { x: 380, y: 740 }, { x: 740, y: 550 }, { x: 1010, y: 440 },
            { x: 1180, y: 380 }, { x: 1500, y: 240 }, { x: 1750, y: 180 },
            { x: 1890, y: 310 }, { x: 2040, y: 250 }, { x: 2350, y: 140 },
            { x: 2750, y: 540 }, { x: 1550, y: 450 }, { x: 2620, y: 380 }
        ];

        // 대규모 천관산 입체 플랫폼 맵 데이터 (공용 골조, 스테이지별 질감/색상 적용)
        const platforms = [
            // [구간 1] 탐진강 초입 밸리 바닥 및 발판 (x: 0 ~ 800)
            { x: 0, y: 900, w: 550, h: 100, type: 'ground' },
            { x: 650, y: 820, w: 150, h: 30, type: 'rock' },
            { x: 820, y: 730, w: 100, h: 270, type: 'rock' }, 
            { x: 680, y: 620, w: 80, h: 30, type: 'rock' },

            // [구간 2] 수직 하강 틈새 및 천관폭포 벽타기 퍼즐구간 (x: 800 ~ 1300)
            { x: 950, y: 400, w: 30, h: 500, type: 'waterfall_wall' }, 
            { x: 1080, y: 300, w: 40, h: 600, type: 'rock' }, 
            { x: 1120, y: 820, w: 250, h: 180, type: 'ground' }, 
            { x: 1000, y: 520, w: 80, h: 25, type: 'rock' },
            { x: 1180, y: 450, w: 160, h: 30, type: 'rock' },

            // [구간 3] 억새 고원 공중 부유 징검다리 (x: 1300 ~ 2000)
            { x: 1420, y: 600, w: 50, h: 400, type: 'rock' },
            { x: 1550, y: 520, w: 120, h: 25, type: 'rock' },
            { x: 1720, y: 450, w: 120, h: 25, type: 'rock' },
            { x: 1880, y: 380, w: 100, h: 25, type: 'rock' },
            { x: 1750, y: 250, w: 80, h: 25, type: 'rock' },
            { x: 1500, y: 320, w: 100, h: 25, type: 'rock' },

            // [구간 4] 천관산 최고봉 '연대봉 정상' 거대 암탑 (x: 2000 ~ 2550)
            { x: 2120, y: 220, w: 380, h: 780, type: 'rock' }, 
            { x: 1980, y: 750, w: 80, h: 30, type: 'rock' },
            { x: 2020, y: 590, w: 60, h: 30, type: 'rock' },
            { x: 1950, y: 460, w: 80, h: 30, type: 'rock' },
            { x: 2040, y: 320, w: 60, h: 30, type: 'rock' },

            // [구간 5] 하산 절벽 코스 및 최종 축제 광장 (x: 2550 ~ 3200)
            { x: 2620, y: 450, w: 180, h: 30, type: 'rock' },
            { x: 2780, y: 620, w: 150, h: 30, type: 'rock' },
            { x: 2950, y: 830, w: 300, h: 170, type: 'ground' } 
        ];

        // 수렁 위험 구역들
        const hazards = [
            { x: 550, y: 970, w: 100, h: 30, name: '심연 급류' },
            { x: 820, y: 970, w: 300, h: 30, name: '폭포 소용돌이' },
            { x: 1370, y: 970, w: 750, h: 30, name: '수성 낭떠러지' },
            { x: 2500, y: 970, w: 450, h: 30, name: '계곡 수렁' }
        ];

        // 최종 아치
        const goal = { x: 3100, y: 750, w: 70, h: 80, name: '아치 게이트' };

        // 파티클 저장소
        let particles = [];
        let bullets = [];

        // 다층 패럴랙스 도트 산맥 배경 생성을 위한 데이터
        const mountainLayers = [];
        const numPeaks = 40;

        // 원경 산맥
        for (let i = 0; i < numPeaks; i++) {
            mountainLayers.push({
                x: i * 160,
                baseY: 420 + Math.random() * 120,
                w: 240 + Math.random() * 160,
                speedMult: 0.08,
                layer: 1
            });
        }
        // 중경 산맥
        for (let i = 0; i < numPeaks; i++) {
            mountainLayers.push({
                x: i * 190 - 40,
                baseY: 520 + Math.random() * 110,
                w: 180 + Math.random() * 120,
                speedMult: 0.22,
                layer: 2
            });
        }
        // 근경 산맥
        for (let i = 0; i < numPeaks; i++) {
            mountainLayers.push({
                x: i * 220 - 80,
                baseY: 640 + Math.random() * 70,
                w: 130 + Math.random() * 100,
                speedMult: 0.4,
                layer: 3
            });
        }

        // 도트 구름들
        const cloudLayers = [];
        for (let i = 0; i < 12; i++) {
            cloudLayers.push({
                x: Math.random() * levelWidth,
                y: 60 + Math.random() * 180,
                w: 70 + Math.random() * 80,
                h: 12 + Math.random() * 12,
                speed: 0.15 + Math.random() * 0.3
            });
        }

        // 반짝이는 별빛들
        const starLayers = [];
        for (let i = 0; i < 130; i++) {
            starLayers.push({
                x: Math.random() * 800,
                y: Math.random() * 500,
                size: Math.random() > 0.85 ? 2 : 1,
                alpha: Math.random() * 0.8 + 0.2,
                blinkSpeed: 0.008 + Math.random() * 0.015,
                color: Math.random() > 0.7 ? '#fef08a' : '#ffffff'
            });
        }

        // 시장(Stage 2) 전용 도트 배경 요소 (기와 가옥, 전통 상점, 오색등 등)
        const marketDecorations = [];
        for (let i = 0; i < 30; i++) {
            marketDecorations.push({
                x: i * 120 + 40,
                y: 600 + Math.random() * 150,
                w: 40 + Math.random() * 60,
                h: 80 + Math.random() * 100,
                color: Math.random() > 0.5 ? '#27272a' : '#1e293b',
                bannerColor: Math.random() > 0.6 ? '#f43f5e' : '#eab308'
            });
        }

        // 물축제(Stage 3) 전용 수직 물대포 및 분수
        const festivalWaterSprites = [];
        for (let i = 0; i < 15; i++) {
            festivalWaterSprites.push({
                x: 200 + i * 200,
                baseY: 900,
                height: 100 + Math.random() * 250,
                currentH: 0,
                speed: 1.5 + Math.random() * 2,
                dir: 1
            });
        }

        // 카메라 구조체
        const camera = {
            x: 0,
            y: 0,
            width: 800,
            height: 500
        };

        // 리셋 및 9개 무작위 아이템 배정 핵심 로직
        function selectAndPlaceRandomItems() {
            const currentPool = stageItemsPool[currentStage];
            
            // 스폰 위치 배열의 복사본 생성 후 셔플(Shuffle)
            const shuffledPositions = [...spawnPositions];
            for (let i = shuffledPositions.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [shuffledPositions[i], shuffledPositions[j]] = [shuffledPositions[j], shuffledPositions[i]];
            }

            activeItems = [];
            // 해당 스테이지에 구성된 고유 아이템 9개를 9개의 무작위 좌표에 밀착 맵핑
            for (let i = 0; i < 9; i++) {
                activeItems.push({
                    ...currentPool[i],
                    x: shuffledPositions[i].x,
                    y: shuffledPositions[i].y,
                    r: 12,
                    collected: false
                });
            }
        }

        // 스테이지 변환 처리
        function setupStage() {
            selectAndPlaceRandomItems();
            
            // 플레이어 원위치 리셋
            player.x = 80;
            player.y = 800;
            player.vx = 0;
            player.vy = 0;
            player.isGrounded = false;
            player.canDoubleJump = true;
            player.hasDoubleJumped = false;
            player.isDashing = false;
            player.canDash = true;

            particles = [];
            bullets = [];
            camera.x = 0;
            camera.y = 400;
            // 상단 뱃지 동적 업데이트
            notifyStage();
        }

        // 포커스 획득 보조 유틸 함수 (이프레임 제약 돌파용)
        function forceFocusOnGame() {
            canvas.focus();
            window.focus();
        }
        function startGame() {
            gameState = 'PLAYING';
            currentStage = 1;
            setupStage();
            notifyGameState();
            setTimeout(forceFocusOnGame, 50);
        }

        // 2단점프 및 아크로바틱 벽타기 트리거
        function handleJump() {
            if (gameState !== 'PLAYING') return;

            if (player.isWallSliding) {
                const pushDir = player.wallSlidingSide === 'left' ? 1 : -1;
                player.vx = pushDir * player.speed * 1.4;
                player.vy = -player.jumpForce * 0.95;
                player.canDoubleJump = true; 
                createJumpParticles(player.x + (player.wallSlidingSide === 'left' ? 0 : player.width), player.y + player.height/2, 8, '#38bdf8');
                return;
            }

            if (player.isGrounded) {
                player.vy = -player.jumpForce;
                player.isGrounded = false;
                player.canDoubleJump = true;
                // 스테이지별 찰진 먼지 이펙트 색변환
                let pCol = currentStage === 1 ? '#d97706' : (currentStage === 2 ? '#eab308' : '#60a5fa');
                createJumpParticles(player.x + player.width / 2, player.y + player.height, 10, pCol);
            } 
            else if (player.canDoubleJump) {
                player.vy = -player.jumpForce * 0.88;
                player.canDoubleJump = false;
                player.hasDoubleJumped = true;
                createJumpParticles(player.x + player.width / 2, player.y + player.height, 12, '#bae6fd');
            }
        }

        function handleDash() {
            if (gameState !== 'PLAYING' || !player.canDash || player.isDashing || player.dashCooldown > 0) return;

            player.isDashing = true;
            player.dashTimer = 8;
            player.dashCooldown = 32;
            player.canDash = false;
            
            if (keys.a || keys.ArrowLeft) {
                player.dashDirection = -1;
            } else if (keys.d || keys.ArrowRight) {
                player.dashDirection = 1;
            } else {
                player.dashDirection = player.facing === 'left' ? -1 : 1;
            }

            player.vy = 0;
            createDashParticles();
        }

        // 마우스 발사 고압 물방울건
        function shootWater() {
            const px = player.x + player.width / 2;
            const py = player.y + player.height / 2;
            const angle = Math.atan2(mouse.y - py, mouse.x - px);

            // 반동 메커니즘
            const deg = angle * (180 / Math.PI);
            if (deg > 45 && deg < 135 && !player.isGrounded) {
                player.vy = -player.jumpForce * 0.65;
                player.canDoubleJump = true; 
            }

            bullets.push({
                x: px,
                y: py,
                vx: Math.cos(angle) * 11,
                vy: Math.sin(angle) * 11,
                life: 38,
                radius: 4.5 + Math.random() * 2.5
            });

            for (let i = 0; i < 5; i++) {
                particles.push({
                    x: px,
                    y: py,
                    vx: Math.cos(angle + (Math.random() - 0.5) * 0.4) * (4 + Math.random() * 4),
                    vy: Math.sin(angle + (Math.random() - 0.5) * 0.4) * (4 + Math.random() * 4),
                    color: i % 2 === 0 ? '#60a5fa' : '#38bdf8',
                    size: 2 + Math.random() * 2,
                    decay: 0.05,
                    life: 1
                });
            }
        }

        // 다양한 도트 흩날림 생성기들
        function createJumpParticles(x, y, count = 8, color = '#f59e0b') {
            for (let i = 0; i < count; i++) {
                particles.push({
                    x: x,
                    y: y,
                    vx: (Math.random() - 0.5) * 5,
                    vy: (Math.random() - 0.3) * -2.5,
                    color: color,
                    size: 1.5 + Math.random() * 3,
                    decay: 0.04,
                    life: 1
                });
            }
        }

        function createDashParticles() {
            const side = player.facing === 'left' ? 1 : -1;
            for (let i = 0; i < 15; i++) {
                particles.push({
                    x: player.x + Math.random() * player.width,
                    y: player.y + Math.random() * player.height,
                    vx: (Math.random() * 4 + 2) * side,
                    vy: (Math.random() - 0.5) * 1.5,
                    color: '#e0f2fe',
                    size: 2.5 + Math.random() * 3,
                    decay: 0.06,
                    life: 1
                });
            }
        }

        function createCollectParticles(x, y, color) {
            for (let i = 0; i < 22; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 2.5 + Math.random() * 5.5;
                particles.push({
                    x: x,
                    y: y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    color: color,
                    size: 2.5 + Math.random() * 4,
                    decay: 0.025,
                    life: 1
                });
            }
        }

        function createSplashParticles(x, y) {
            for (let i = 0; i < 4; i++) {
                particles.push({
                    x: x,
                    y: y,
                    vx: (Math.random() - 0.5) * 3,
                    vy: (Math.random() - 0.7) * -2.5,
                    color: '#93c5fd',
                    size: 1.2 + Math.random() * 1.5,
                    decay: 0.05,
                    life: 1
                });
            }
        }

        function checkCollision(r1, r2) {
            return r1.x < r2.x + r2.w &&
                   r1.x + r1.w > r2.x &&
                   r1.y < r2.y + r2.h &&
                   r1.y + r1.h > r2.y;
        }

        function update() {
            if (gameState !== 'PLAYING') return;

            // 대시 연산
            if (player.dashCooldown > 0) player.dashCooldown--;
            
            if (player.isDashing) {
                player.vx = player.dashDirection * player.dashSpeed;
                player.vy = 0;
                player.dashTimer--;
                
                if (player.dashTimer % 2 === 0) {
                    particles.push({
                        x: player.x,
                        y: player.y,
                        vx: 0,
                        vy: 0,
                        color: 'rgba(56, 189, 248, 0.45)',
                        size: player.width,
                        decay: 0.12,
                        life: 0.5,
                        isGhost: true,
                        h: player.height
                    });
                }

                if (player.dashTimer <= 0) {
                    player.isDashing = false;
                    player.vx = player.dashDirection * player.speed;
                }
            } else {
                let targetVx = 0;
                if (keys.a || keys.ArrowLeft) {
                    targetVx = -player.speed;
                    player.facing = 'left';
                }
                if (keys.d || keys.ArrowRight) {
                    targetVx = player.speed;
                    player.facing = 'right';
                }

                player.vx += (targetVx - player.vx) * 0.22;

                if (player.isWallSliding) {
                    player.vy += player.gravity * 0.22;
                    if (player.vy > 1.6) player.vy = 1.6;
                } else {
                    player.vy += player.gravity;
                }
            }

            const oldX = player.x;
            const oldY = player.y;

            // X축 이동 및 충돌
            player.x += player.vx;
            if (player.x < 0) player.x = 0;
            if (player.x + player.width > levelWidth) player.x = levelWidth - player.width;

            let onWall = false;
            let wallSide = null;

            for (const p of platforms) {
                if (checkCollision({ x: player.x, y: player.y, w: player.width, h: player.height }, p)) {
                    if (player.vx > 0) {
                        player.x = p.x - player.width;
                        if (!player.isGrounded && player.vy > 0) {
                            onWall = true;
                            wallSide = 'right';
                        }
                    } else if (player.vx < 0) {
                        player.x = p.x + p.w;
                        if (!player.isGrounded && player.vy > 0) {
                            onWall = true;
                            wallSide = 'left';
                        }
                    }
                    player.vx = 0;
                }
            }

            // Y축 이동 및 충돌
            player.y += player.vy;
            player.isGrounded = false;

            for (const p of platforms) {
                if (checkCollision({ x: player.x, y: player.y, w: player.width, h: player.height }, p)) {
                    if (player.vy > 0) {
                        player.y = p.y - player.height;
                        player.isGrounded = true;
                        player.canDoubleJump = true;
                        player.hasDoubleJumped = false;
                        player.canDash = true;
                    } else if (player.vy < 0) {
                        player.y = p.y + p.h;
                    }
                    player.vy = 0;
                }
            }

            // 슬라이딩 판정
            if (onWall && !player.isGrounded) {
                player.isWallSliding = true;
                player.wallSlidingSide = wallSide;
                player.canDash = true;
            } else {
                player.isWallSliding = false;
                player.wallSlidingSide = null;
            }

            // 급류/수렁 피격 시 세이프 복귀
            for (const hz of hazards) {
                if (checkCollision({ x: player.x, y: player.y, w: player.width, h: player.height }, hz)) {
                    createCollectParticles(player.x + player.width/2, player.y + player.height/2, '#ef4444');
                    player.x = 100;
                    player.y = 800;
                    player.vx = 0;
                    player.vy = 0;
                }
            }

            // 보물 획득 체크
            for (const item of activeItems) {
                if (!item.collected) {
                    const ix = item.x;
                    const iy = item.y;
                    const px = player.x + player.width/2;
                    const py = player.y + player.height/2;
                    const dist = Math.hypot(px - ix, py - iy);

                    if (dist < item.r + Math.max(player.width, player.height)/2) {
                        item.collected = true;
                        createCollectParticles(item.x, item.y, item.color);
                    }
                }
            }

            // 축제 아치 도달 시 다음 스테이지 이동 또는 클리어
            const allCollected = activeItems.every(item => item.collected);
            if (checkCollision({ x: player.x, y: player.y, w: player.width, h: player.height }, goal)) {
                if (allCollected) {
                    if (currentStage < 3) {
                        gameState = 'TRANSITION';
                        onTransitionMessageChange(TRANSITION_MESSAGES[currentStage]);
                        notifyGameState();
                    } else {
                        gameState = 'CLEAR';
                        notifyGameState();
                    }
                } else {
                    player.vx = -4; // 보물이 전부 없을 시 입장 튕김
                }
            }

            // 물 탄환 이동 및 충돌
            for (let i = bullets.length - 1; i >= 0; i--) {
                const b = bullets[i];
                b.x += b.vx;
                b.y += b.vy;
                b.life--;

                let hitPlatform = false;
                for (const p of platforms) {
                    if (b.x > p.x && b.x < p.x + p.w && b.y > p.y && b.y < p.y + p.h) {
                        hitPlatform = true;
                        break;
                    }
                }

                if (b.life <= 0 || hitPlatform) {
                    createSplashParticles(b.x, b.y);
                    bullets.splice(i, 1);
                }
            }

            // 파티클 수명주기
            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                p.x += p.vx;
                p.y += p.vy;
                p.life -= p.decay;
                if (p.life <= 0) {
                    particles.splice(i, 1);
                }
            }

            // 구름 안개 이동
            cloudLayers.forEach(cloud => {
                cloud.x -= cloud.speed;
                if (cloud.x < -cloud.w) {
                    cloud.x = levelWidth + 20;
                }
            });

            // 3단계 물축제 대형 분수 애니메이션 연산
            if (currentStage === 3) {
                festivalWaterSprites.forEach(sprite => {
                    sprite.currentH += sprite.speed * sprite.dir;
                    if (sprite.currentH > sprite.height) {
                        sprite.dir = -1;
                        // 물줄기 끝에서 물방울 사방 방출
                        for (let i = 0; i < 2; i++) {
                            particles.push({
                                x: sprite.x,
                                y: sprite.baseY - sprite.currentH,
                                vx: (Math.random() - 0.5) * 4,
                                vy: (Math.random() - 0.5) * -2,
                                color: '#38bdf8',
                                size: 1.5 + Math.random() * 2,
                                decay: 0.03,
                                life: 1
                            });
                        }
                    } else if (sprite.currentH < 0) {
                        sprite.dir = 1;
                    }
                });

                // 상시 떠오르는 하얗고 파란 물방울 이펙트
                if (Math.random() < 0.25) {
                    particles.push({
                        x: camera.x + Math.random() * (canvas.width / zoom),
                        y: 1000,
                        vx: (Math.random() - 0.5) * 1.5,
                        vy: -2 - Math.random() * 3,
                        color: Math.random() > 0.4 ? '#60a5fa' : '#38bdf8',
                        size: 2 + Math.random() * 2.5,
                        decay: 0.01,
                        life: 1
                    });
                }
            }

            // 1단계 천관산 전용 바람에 날리는 억새꽃 씨앗 방출
            if (currentStage === 1 && Math.random() < 0.12) {
                particles.push({
                    x: camera.x + Math.random() * (canvas.width / zoom) + 100,
                    y: camera.y + Math.random() * 250,
                    vx: -1.2 - Math.random() * 1.5,
                    vy: 0.4 + Math.random() * 0.6,
                    color: Math.random() > 0.3 ? '#f3f4f6' : '#d97706', // 흰색 및 갈색 억새꽃 가루
                    size: 1.2 + Math.random() * 1.8,
                    decay: 0.004,
                    life: 1
                });
            }

            // 카메라 선형 보간 위치 정렬
            const viewW = canvas.width / zoom;
            const viewH = canvas.height / zoom;

            const targetCamX = player.x - viewW / 2 + player.width / 2;
            const targetCamY = player.y - viewH / 2 + player.height / 2;

            camera.x += (targetCamX - camera.x) * 0.12;
            camera.y += (targetCamY - camera.y) * 0.12;

            if (camera.x < 0) camera.x = 0;
            if (camera.x > levelWidth - viewW) camera.x = levelWidth - viewW;
            if (camera.y < 0) camera.y = 0;
            if (camera.y > levelHeight - viewH) camera.y = levelHeight - viewH;
        }

        // 전체 렌더링
        function draw() {
            // [배경 드로잉] 스테이지별 맞춤형 테마 컬러 스페이스
            if (currentStage === 1) {
                // 천관산 가을 억새밭 밤하늘 (고동색, 밤하늘 청록의 조화)
                ctx.fillStyle = '#0f0b08';
            } else if (currentStage === 2) {
                // 장흥 토요시장 저녁 장터 (깊어가는 황금빛 오렌지/다크 그레이 밤하늘)
                ctx.fillStyle = '#0c0a09';
            } else {
                // 시원한 물빛 가득 물축제장 밤하늘 (깊은 물빛 어스름)
                ctx.fillStyle = '#040d1a';
            }
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            drawHollowScreenGrade();

            // 밤하늘 총총히 빛나는 달빛 별들
            starLayers.forEach(star => {
                star.alpha += star.blinkSpeed;
                if (star.alpha > 1 || star.alpha < 0.2) {
                    star.blinkSpeed = -star.blinkSpeed;
                }
                ctx.fillStyle = star.color;
                ctx.globalAlpha = star.alpha;
                ctx.fillRect(star.x, star.y, star.size, star.size);
                ctx.globalAlpha = 1.0;
            });

            ctx.save();
            ctx.scale(zoom, zoom);
            ctx.translate(-camera.x, -camera.y);

            // [스테이지 2 전용 전통시장 가옥 배경 드로잉]
            if (currentStage === 2) {
                marketDecorations.forEach(deco => {
                    const px = deco.x - camera.x * 0.18;
                    // 은은한 전통 한옥 가옥 그림자
                    ctx.fillStyle = deco.color;
                    ctx.fillRect(px, deco.y, deco.w, 400);

                    // 삼각 기와 지붕 라인
                    ctx.beginPath();
                    ctx.moveTo(px - 10, deco.y);
                    ctx.lineTo(px + deco.w/2, deco.y - 15);
                    ctx.lineTo(px + deco.w + 10, deco.y);
                    ctx.closePath();
                    ctx.fill();

                    // 기와 위 붉고 노란 야시장 미니 오색 등불 도트
                    ctx.fillStyle = deco.bannerColor;
                    ctx.fillRect(px + deco.w/2 - 2, deco.y + 15, 4, 4);
                });
            }

            // [스테이지 3 전용 청량한 분수 물줄기 드로잉]
            if (currentStage === 3) {
                festivalWaterSprites.forEach(sprite => {
                    const px = sprite.x - camera.x * 0.15;
                    
                    // 은은한 네온 물기둥 바디
                    ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
                    ctx.fillRect(px - 10, sprite.baseY - sprite.currentH, 20, sprite.currentH);

                    // 주 물줄기 라인
                    ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(px, sprite.baseY);
                    ctx.lineTo(px, sprite.baseY - sprite.currentH);
                    ctx.stroke();

                    // 중심 포말 백색 라이트선
                    ctx.strokeStyle = '#ffffff';
                    ctx.lineWidth = 1;
                    ctx.beginPath();
                    ctx.moveTo(px, sprite.baseY);
                    ctx.lineTo(px, sprite.baseY - sprite.currentH);
                    ctx.stroke();
                });
            }

            // [32비트 다층 산맥 배경 드로잉]
            ctx.save();
            ctx.globalAlpha = 0.34;
            mountainLayers.forEach(bg => {
                const px = bg.x - camera.x * bg.speedMult;
                const py = bg.baseY - camera.y * bg.speedMult;

                let col1, col2;
                if (currentStage === 1) {
                    // 가을 천관산 컬러셋 (갈색, 고동색, 하얗게 빛나는 능선)
                    col1 = bg.layer === 1 ? '#1c130c' : (bg.layer === 2 ? '#2e1f14' : '#452f1e');
                    col2 = bg.layer === 1 ? '#0a0705' : (bg.layer === 2 ? '#120d09' : '#1f140e');
                } else if (currentStage === 2) {
                    // 토요시장 뒷산 컬러셋 (은근한 황색 달빛을 품은 잿빛 암벽산)
                    col1 = bg.layer === 1 ? '#110f0e' : (bg.layer === 2 ? '#1c1917' : '#292524');
                    col2 = bg.layer === 1 ? '#090807' : (bg.layer === 2 ? '#0e0d0c' : '#141211');
                } else {
                    // 물축제장 시원한 수풀산 컬러셋 (청색, 파란색, 물빛 기운)
                    col1 = bg.layer === 1 ? '#051121' : (bg.layer === 2 ? '#0a1e36' : '#102e52');
                    col2 = bg.layer === 1 ? '#02070f' : (bg.layer === 2 ? '#030b14' : '#051221');
                }

                const grad = ctx.createLinearGradient(px, py, px, levelHeight);
                grad.addColorStop(0, col1);
                grad.addColorStop(1, col2);
                
                ctx.fillStyle = grad;
                ctx.fillRect(px, py, bg.w, levelHeight - py);

                // 봉우리 형성
                ctx.beginPath();
                ctx.moveTo(px, py);
                ctx.lineTo(px + bg.w * 0.3, py - 40);
                ctx.lineTo(px + bg.w * 0.6, py - 15);
                ctx.lineTo(px + bg.w * 0.8, py - 45);
                ctx.lineTo(px + bg.w, py);
                ctx.closePath();
                ctx.fill();

                // 가을 침엽수 및 소나무 도트데코
                if (bg.layer === 3) {
                    ctx.fillStyle = currentStage === 1 ? '#5c3d24' : (currentStage === 2 ? '#1c1917' : '#0369a1');
                    ctx.fillRect(px + bg.w/3, py - 8, 2.5, 8);
                }
            });
            ctx.restore();

            // 배경 구름
            cloudLayers.forEach(cloud => {
                ctx.fillStyle = currentStage === 1 ? 'rgba(217, 119, 6, 0.04)' : (currentStage === 2 ? 'rgba(234, 179, 8, 0.03)' : 'rgba(255, 255, 255, 0.06)');
                ctx.fillRect(cloud.x, cloud.y, cloud.w, cloud.h);
                ctx.fillRect(cloud.x + 10, cloud.y - 4, cloud.w - 20, cloud.h + 8);
            });

            // [64비트 지형 테마 렌더링 - 맵의 발판 풀 꽃 연출]
            const windTime = Date.now() * 0.0025;
            platforms.forEach(p => {
                if (p.type === 'ground' || p.type === 'rock') {
                    // 발판 베이스 암석/대지
                    ctx.fillStyle = hollowPalette.platform;
                    ctx.fillRect(p.x, p.y, p.w, p.h);

                    ctx.strokeStyle = hollowPalette.outline;
                    ctx.lineWidth = 3;
                    ctx.strokeRect(p.x, p.y, p.w, p.h);
                    ctx.strokeStyle = 'rgba(125, 211, 252, 0.22)';
                    ctx.lineWidth = 1;
                    ctx.strokeRect(p.x + 3, p.y + 3, Math.max(0, p.w - 6), Math.max(0, p.h - 6));

                    // 발판 탑 레이어 (Grass/Soil Line)
                    if (currentStage === 1) {
                        // 가을 갈색빛 대지 라인
                        ctx.fillStyle = hollowPalette.platformEdge; 
                        ctx.fillRect(p.x, p.y, p.w, 6);
                        ctx.fillStyle = 'rgba(125, 211, 252, 0.28)'; 
                        ctx.fillRect(p.x, p.y + 6, p.w, 3);
                    } else if (currentStage === 2) {
                        // 황토빛 및 장터 마루목 라인
                        ctx.fillStyle = hollowPalette.platformEdge; 
                        ctx.fillRect(p.x, p.y, p.w, 5);
                        ctx.fillStyle = 'rgba(125, 211, 252, 0.28)'; 
                        ctx.fillRect(p.x, p.y + 5, p.w, 3);
                    } else {
                        // 물빛 네온 워터 라인
                        ctx.fillStyle = hollowPalette.platformEdge; 
                        ctx.fillRect(p.x, p.y, p.w, 5);
                        ctx.fillStyle = 'rgba(125, 211, 252, 0.28)'; 
                        ctx.fillRect(p.x, p.y + 5, p.w, 3);
                    }

                    // 64비트풍 도트 장식 피어내기
                    ctx.save();
                    for (let gx = p.x + 4; gx < p.x + p.w - 4; gx += 12) {
                        const sway = Math.sin(gx * 0.05 + windTime) * 3;
                        
                        if (currentStage === 1) {
                            // 1단계: 바람에 하얗게 흩날리는 은빛 억새풀 (흰색/고동색 억새대)
                            ctx.strokeStyle = '#f3f4f6'; // 하얀 억새꽃 이삭
                            ctx.lineWidth = 1.5;
                            ctx.beginPath();
                            ctx.moveTo(gx, p.y);
                            ctx.lineTo(gx + sway, p.y - 8);
                            ctx.stroke();

                            // 억새 줄기 대
                            ctx.strokeStyle = '#b45309'; 
                            ctx.lineWidth = 1;
                            ctx.beginPath();
                            ctx.moveTo(gx, p.y);
                            ctx.lineTo(gx + sway * 0.5, p.y - 5);
                            ctx.stroke();
                        } else if (currentStage === 2) {
                            // 2단계: 시장 등불 및 수풀 무늬
                            ctx.strokeStyle = '#f59e0b';
                            ctx.lineWidth = 1.5;
                            ctx.beginPath();
                            ctx.moveTo(gx, p.y);
                            ctx.lineTo(gx + sway * 0.4, p.y - 4);
                            ctx.stroke();
                        } else {
                            // 3단계: 물방울이 톡톡 터지는 물빛 새싹풀
                            ctx.strokeStyle = '#60a5fa';
                            ctx.lineWidth = 2;
                            ctx.beginPath();
                            ctx.moveTo(gx, p.y);
                            ctx.lineTo(gx + sway * 0.6, p.y - 6);
                            ctx.stroke();
                        }
                    }
                    ctx.restore();

                } else if (p.type === 'waterfall_wall') {
                    // 벽타기 특화 수직 벽면
                    if (currentStage === 1) {
                        ctx.fillStyle = '#451a03'; // 황토빛 동굴벽 느낌
                    } else if (currentStage === 2) {
                        ctx.fillStyle = '#1c1917'; // 목재 한옥 한식 기둥 느낌
                    } else {
                        ctx.fillStyle = '#0c4a6e'; // 흐르는 청량한 계곡 벽
                    }
                    ctx.fillRect(p.x, p.y, p.w, p.h);
                    
                    const cascade = (Date.now() / 8) % 30;
                    ctx.strokeStyle = currentStage === 3 ? '#38bdf8' : '#78350f';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    for (let lx = p.x + 4; lx < p.x + p.w; lx += 8) {
                        ctx.moveTo(lx, p.y);
                        ctx.lineTo(lx, p.y + p.h);
                    }
                    ctx.stroke();
                }
            });

            // 위험지역
            hazards.forEach(hz => {
                const pulse = Math.sin(Date.now() / 80) * 4;
                ctx.fillStyle = currentStage === 1 ? '#78350f' : (currentStage === 2 ? '#451a03' : '#1d4ed8');
                ctx.fillRect(hz.x, hz.y - pulse, hz.w, hz.h + pulse);

                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                for (let i = hz.x; i <= hz.x + hz.w; i += 8) {
                    ctx.lineTo(i, hz.y - pulse);
                    ctx.lineTo(i + 4, hz.y - 9 - pulse);
                    ctx.lineTo(i + 8, hz.y - pulse);
                }
                ctx.stroke();
            });

            // 골인 아치문
            ctx.fillStyle = 'rgba(8, 145, 178, 0.35)';
            ctx.fillRect(goal.x, goal.y, goal.w, goal.h);
            ctx.strokeStyle = '#22d3ee';
            ctx.lineWidth = 3;
            ctx.strokeRect(goal.x, goal.y, goal.w, goal.h);
            
            ctx.fillStyle = '#0e7490';
            ctx.fillRect(goal.x - 8, goal.y, goal.w + 16, 22);
            ctx.fillStyle = '#ffffff';
            ctx.font = '8px "Galmuri11"';
            ctx.textAlign = 'center';
            ctx.fillText(currentStage === 3 ? '물축제 완료' : '다음 코스로', goal.x + goal.w/2, goal.y + 14);

            // 보물 렌더링
            activeItems.forEach(item => {
                if (!item.collected) {
                    const bob = Math.sin(Date.now() / 180 + item.id) * 3;
                    const treasureImage = getTreasureImage(item.imageSrc);
                    const imageSize = 28;
                    
                    ctx.fillStyle = item.color + '33';
                    ctx.beginPath();
                    ctx.arc(item.x, item.y + bob, item.r * 1.9, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = 'rgba(2, 6, 23, 0.78)';
                    ctx.fillRect(item.x - imageSize / 2 - 3, item.y + bob - imageSize / 2 - 3, imageSize + 6, imageSize + 6);
                    ctx.strokeStyle = item.color;
                    ctx.lineWidth = 2;
                    ctx.strokeRect(item.x - imageSize / 2 - 3, item.y + bob - imageSize / 2 - 3, imageSize + 6, imageSize + 6);

                    if (treasureImage && treasureImage.complete && treasureImage.naturalWidth > 0) {
                        ctx.drawImage(treasureImage, item.x - imageSize / 2, item.y + bob - imageSize / 2, imageSize, imageSize);
                    } else {
                        ctx.fillStyle = item.color;
                        ctx.beginPath();
                        ctx.arc(item.x, item.y + bob, item.r, 0, Math.PI * 2);
                        ctx.fill();

                        ctx.fillStyle = '#ffffff';
                        ctx.font = '12px "Galmuri11"';
                        ctx.fillText(item.icon, item.x - 6, item.y + bob + 4);
                    }

                    ctx.font = '8px "Galmuri11"';
                    ctx.fillStyle = '#f8fafc';
                    ctx.fillText(item.name, item.x, item.y - item.r - 10 + bob);
                }
            });

            // 물 탄환
            bullets.forEach(b => {
                ctx.fillStyle = '#38bdf8';
                ctx.beginPath();
                ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
                ctx.fill();
            });

            // 이펙트 파티클
            particles.forEach(p => {
                ctx.fillStyle = p.color;
                if (p.isGhost) {
                    ctx.globalAlpha = p.life;
                    ctx.fillRect(p.x, p.y, p.size, p.h);
                    ctx.globalAlpha = 1.0;
                } else {
                    ctx.fillRect(p.x - p.size/2, p.y - p.size/2, Math.max(0.5, p.size * p.life), Math.max(0.5, p.size * p.life));
                }
            });

            // [주인공 온비 렌더링]
            ctx.save();
            ctx.translate(player.x + player.width/2, player.y + player.height/2);
            ctx.shadowColor = 'rgba(125, 211, 252, 0.45)';
            ctx.shadowBlur = player.isDashing ? 16 : 7;
            if (player.facing === 'left') {
                ctx.scale(-1, 1);
            }

            // 깊은 푸른 망토
            ctx.fillStyle = hollowPalette.cloak;
            ctx.fillRect(-player.width/2 - 1, -player.height/2 + 10, player.width + 2, player.height/2 + 6);

            // 헤드 물방울 투구
            ctx.fillStyle = player.color;
            ctx.beginPath();
            ctx.arc(0, -player.height/2 + 10, player.width/2 + 1, 0, Math.PI * 2);
            ctx.fill();

            // 입체 물빛 도트 광원
            ctx.fillStyle = '#e0f2fe';
            ctx.fillRect(-3, -player.height/2 + 5, 2.5, 2.5);

            // 꼬리 팁
            ctx.fillStyle = player.color;
            ctx.beginPath();
            ctx.moveTo(-player.width/2, -player.height/2 + 10);
            ctx.lineTo(0, -player.height/2 - 3);
            ctx.lineTo(player.width/2, -player.height/2 + 10);
            ctx.closePath();
            ctx.fill();

            // 기사 눈동자
            ctx.fillStyle = hollowPalette.ink;
            ctx.beginPath();
            ctx.arc(-3.5, -6, 3, 0, Math.PI * 2);
            ctx.arc(3.5, -6, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            if (player.isWallSliding) {
                ctx.fillStyle = hollowPalette.cyan;
                ctx.fillRect(-player.width/2, player.height/2 - 3, player.width, 3);
            }

            ctx.restore();

            ctx.restore(); // 뷰포트 배율 환원

            // ====== [상단 오버레이 가이드 UI] ======

            // 1. 수집 수풀 도감 판넬 (좌측 상단)
            ctx.fillStyle = 'rgba(7, 10, 19, 0.9)';
            ctx.fillRect(15, 15, 230, 125);
            ctx.strokeStyle = currentStage === 1 ? '#d97706' : (currentStage === 2 ? '#fbbf24' : '#22d3ee');
            ctx.lineWidth = 2;
            ctx.strokeRect(15, 15, 230, 125);

            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px "Galmuri11"';
            ctx.textAlign = 'left';
            ctx.fillText(`🏆 STAGE ${currentStage} 보물 도감`, 25, 33);

            let collectCount = 0;
            activeItems.forEach((item, index) => {
                const yPos = 50 + index * 10;
                ctx.font = '9px "Galmuri11"';
                if (item.collected) {
                    ctx.fillStyle = '#10b981';
                    ctx.fillText(`[완료] ${item.kind} ${item.name}`, 25, yPos);
                    collectCount++;
                } else {
                    ctx.fillStyle = '#64748b';
                    ctx.fillText(`[미지] ${item.kind} ${item.name}`, 25, yPos);
                }
            });

            // 2. 미션 정보 패널 (우측 상단)
            ctx.fillStyle = 'rgba(7, 10, 19, 0.9)';
            ctx.fillRect(575, 15, 210, 75);
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.strokeRect(575, 15, 210, 75);

            ctx.fillStyle = '#60a5fa';
            ctx.font = 'bold 11px "Galmuri11"';
            ctx.fillText('🎯 현재 스테이지 목표', 585, 33);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = '10px "Galmuri11"';
            if (collectCount === 9) {
                ctx.fillStyle = '#34d399';
                ctx.fillText('★ 보물 9종 전원 획득!', 585, 52);
                ctx.fillStyle = '#fef08a';
                ctx.fillText('☞ 우측 끝 아치 게이트로!', 585, 68);
            } else {
                ctx.fillStyle = '#f1f5f9';
                ctx.fillText(`보물 탐색 중 (${collectCount}/9)`, 585, 52);
                ctx.fillStyle = '#fb7185';
                ctx.fillText('⚠️ 보물을 다 모아야 통과가능', 585, 68);
            }

            // 3. 대시 미터기 (하단 중앙)
            ctx.fillStyle = 'rgba(7, 10, 19, 0.75)';
            ctx.fillRect(320, 455, 160, 20);
            ctx.fillStyle = player.dashCooldown === 0 ? '#10b981' : '#334155';
            const coolPct = player.dashCooldown === 0 ? 1 : (32 - player.dashCooldown) / 32;
            ctx.fillRect(322, 457, 156 * coolPct, 16);
            ctx.fillStyle = '#ffffff';
            ctx.font = '9px "Galmuri11"';
            ctx.textAlign = 'center';
            ctx.fillText(player.dashCooldown === 0 ? 'DASH (Shift/C) 사용가능' : '대시 쿨타임 충전 중...', 400, 469);
        }
        let animationFrameId = null;

        function gameLoop() {
            update();
            draw();
            animationFrameId = requestAnimationFrame(gameLoop);
        }

        function handleCanvasClick() {
            forceFocusOnGame();
        }

        function handleKeyDown(e) {
            if (gameState === 'PLAYING') {
                const preventKeys = ["space", " ", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift"];
                if (preventKeys.includes(e.key.toLowerCase())) {
                    e.preventDefault();
                }
            }

            const key = e.key.toLowerCase();
            if (key === 'a' || e.key === 'ArrowLeft') keys.a = true;
            if (key === 'd' || e.key === 'ArrowRight') keys.d = true;
            if (key === 'w' || e.key === 'ArrowUp' || e.key === ' ') {
                if (!keys.w) handleJump();
                keys.w = true;
            }
            if (key === 's' || e.key === 'ArrowDown') keys.s = true;
            if (e.key === 'Shift' || key === 'c') {
                if (!keys.shift) handleDash();
                keys.shift = true;
            }
        }

        function handleKeyUp(e) {
            const key = e.key.toLowerCase();
            if (key === 'a' || e.key === 'ArrowLeft') keys.a = false;
            if (key === 'd' || e.key === 'ArrowRight') keys.d = false;
            if (key === 'w' || e.key === 'ArrowUp' || e.key === ' ') keys.w = false;
            if (key === 's' || e.key === 'ArrowDown') keys.s = false;
            if (e.key === 'Shift' || key === 'c') keys.shift = false;
        }

        function handleMouseMove(e) {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;

            mouse.x = ((e.clientX - rect.left) * scaleX) / zoom + camera.x;
            mouse.y = ((e.clientY - rect.top) * scaleY) / zoom + camera.y;
        }

        function handleMouseDown() {
            if (gameState === 'PLAYING') {
                shootWater();
            }
        }

        function nextStage() {
            if (currentStage >= 3) return;

            currentStage++;
            gameState = 'PLAYING';
            setupStage();
            notifyGameState();
            setTimeout(forceFocusOnGame, 50);
        }

        function setMoveDirection(direction) {
            if (gameState !== 'PLAYING') return;

            keys.a = direction === 'left';
            keys.d = direction === 'right';
        }

        function stopMove() {
            keys.a = false;
            keys.d = false;
        }

        function pressJump() {
            if (!keys.w) {
                handleJump();
            }
            keys.w = true;
        }

        function releaseJump() {
            keys.w = false;
        }

        function pressDash() {
            if (!keys.shift) {
                handleDash();
            }
            keys.shift = true;
        }

        function releaseDash() {
            keys.shift = false;
        }

        function shootForward() {
            if (gameState !== 'PLAYING') return;

            const dir = player.facing === 'left' ? -1 : 1;
            mouse.x = player.x + player.width / 2 + dir * 120;
            mouse.y = player.y + player.height / 2;
            shootWater();
        }

        canvas.addEventListener('click', handleCanvasClick);
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mousedown', handleMouseDown);

        setupStage();
        notifyGameState();
        gameLoop();

        return {
            start: startGame,
            nextStage,
            restart: startGame,
            setMoveDirection,
            stopMove,
            pressJump,
            releaseJump,
            pressDash,
            releaseDash,
            shootForward,
            destroy() {
                if (animationFrameId) {
                    cancelAnimationFrame(animationFrameId);
                }
                canvas.removeEventListener('click', handleCanvasClick);
                window.removeEventListener('keydown', handleKeyDown);
                window.removeEventListener('keyup', handleKeyUp);
                canvas.removeEventListener('mousemove', handleMouseMove);
                canvas.removeEventListener('mousedown', handleMouseDown);
            }
        };
}
