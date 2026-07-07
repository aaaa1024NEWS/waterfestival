# 정남진 장흥 물축제 게임

HTML 단일 파일로 되어 있던 게임을 React + Vite 앱 구조로 전환한 프로젝트입니다.

## 실행

```bash
npm install
npm run dev
```

로컬 주소는 `http://127.0.0.1:5173`입니다.

## 빌드

```bash
npm run build
```

빌드 결과물은 `dist` 폴더에 생성됩니다.
빌드 결과 확인은 `npm run preview` 후 `http://127.0.0.1:4173`에서 할 수 있습니다.

## Vercel 배포

Vercel에서 이 저장소를 연결하면 `vercel.json` 기준으로 다음 설정이 적용됩니다.

- Build Command: `npm run build`
- Output Directory: `dist`
- SPA rewrite: `/index.html`

## Supabase 환경 변수

`.env.example`을 참고해서 로컬에는 `.env.local` 파일을 만들고, Vercel 프로젝트 설정에는 같은 값을 Environment Variables로 등록하세요.

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

Supabase 연결 코드는 `src/lib/supabaseClient.js`에 준비되어 있습니다.
