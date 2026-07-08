# Vercel 최신 배포 연결 안내

현재 저장소에는 GitHub에 푸시될 때 Vercel 프로덕션 배포를 실행하는 GitHub Actions 워크플로가 들어 있습니다.

```text
.github/workflows/vercel-production.yml
```

이 워크플로가 작동하려면 GitHub 저장소의 `Settings > Secrets and variables > Actions`에 아래 3개 값을 추가해야 합니다.

```text
VERCEL_TOKEN
VERCEL_ORG_ID
VERCEL_PROJECT_ID
```

## Vercel에서 확인할 것

Vercel 프로젝트의 Git 설정도 아래처럼 되어 있어야 합니다.

```text
Repository: aaaa1024NEWS/waterfestival
Production Branch: main
Build Command: npm run build
Output Directory: dist
```

## 예전 게임이 계속 보일 때

예전 단일 HTML 주소인 `/game.html`로 들어가면 수정 전 게임이 보일 수 있어서, 이 파일은 최신 앱 `/`로 자동 이동하도록 바꿨습니다.

브라우저 캐시가 남아 있으면 `Ctrl + F5`로 강력 새로고침하세요.
