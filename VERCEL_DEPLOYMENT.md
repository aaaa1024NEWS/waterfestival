# Vercel 배포 안내

이 프로젝트는 Vercel의 GitHub 연동으로 배포합니다.

GitHub `main` 브랜치에 푸시하면 Vercel이 자동으로 새 Production 배포를 만듭니다.
별도의 GitHub Actions 배포 토큰은 필요하지 않습니다.

## Vercel 설정

Vercel 프로젝트 설정은 아래처럼 유지하면 됩니다.

```text
Repository: aaaa1024NEWS/waterfestival
Production Branch: main
Build Command: npm run build
Output Directory: dist
```

## 최신 게임이 보이지 않을 때

이전 HTML 주소인 `/game.html`로 들어가도 최신 React/Vite 앱의 `/`로 이동하도록 설정되어 있습니다.

브라우저 캐시가 남아 있으면 `Ctrl + F5`로 강력 새로고침하세요.
