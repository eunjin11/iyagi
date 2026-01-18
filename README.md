# Text RPG (React + Vite + Vanilla Extract)

모바일 우선(Mobile-first)으로 설계된 텍스트 어드벤처 RPG의 초기 셋업입니다.  
React + TypeScript + Vite 기반이며, 스타일은 Vanilla Extract로 구성했습니다.

## 시작하기

1. 의존성 설치

```bash
yarn
```

2. 개발 서버 실행

```bash
yarn dev
# http://localhost:5173
```

3. 프로덕션 빌드

```bash
yarn build
yarn preview
```

## 구조

```
text-rpg/
  ├─ public/
  ├─ src/
  │  ├─ styles/
  │  │  ├─ theme.css.ts     # 토큰/글로벌 스타일
  │  │  └─ app.css.ts       # 앱 컨테이너/컴포넌트 스타일
  │  ├─ App.tsx
  │  ├─ main.tsx
  │  └─ vite-env.d.ts
  ├─ index.html
  ├─ package.json
  ├─ tsconfig.json
  ├─ tsconfig.node.json
  └─ vite.config.ts
```

## Vanilla Extract

- `src/styles/theme.css.ts`에서 전역 테마 토큰과 글로벌 스타일을 정의합니다.
- `src/styles/app.css.ts`에서 레이아웃과 UI 요소 스타일을 구성합니다.

## 반응형 기본

- 모바일 우선으로 폰트/레이아웃이 스케일되도록 `clamp`와 토큰을 사용했습니다.
- 최대 콘텐츠 너비를 제한해 가독성을 유지했습니다.
