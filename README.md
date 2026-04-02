# iyagi

`iyagi`는 모바일 우선 텍스트 게임을 위한 **스토리 DSL**과 **플레이 엔진**(React)입니다. `.iyagi` 파일을 파싱해 씬·대사·선택지·변수를 구동합니다.

## 스택

- **React 18** + **TypeScript** + **Vite 5**
- 스타일: **Vanilla Extract**
- 선택지 **조건식**: **mathjs** (파싱 후 `==`/`!=`는 엄격 동등으로 치환)
- 씬/선택 **스크립트**: `jump`, `set`, `inc`, `dec` 등 — 내부적으로 `new Function`으로 실행 ([보안 전제는 `Todo.md` 참고](Todo.md))

## 시작하기

```bash
yarn          # 의존성
yarn dev      # http://localhost:5173
yarn test     # Vitest
yarn build && yarn preview
```

## 스토리 파일 (`.iyagi`)

공개 진입점은 **`parseDSL`** — 예시는 [`src/scenarios/demo.iyagi`](src/scenarios/demo.iyagi) 참고.

- **`vars:`** — 초기 변수 (`hp = 10` 등). 파싱 결과는 `Story.init`에 들어가며, `parseDSL(..., { init })`로 덮어쓸 수 있음.
- **`sceneId { ... }`** — 씬 본문
  - **`"따옴표로 감싼 한 줄`** — 텍스트 스텝
  - **그 외 한 줄** — 스크립트 스텝 (예: `if (hp <= 0) jump("gameover")`, `inc("hp", 1)`)
  - **`choices:`** 아래:
    - **`if (조건식) "레이블" -> { 스크립트 }`** — 조건이 참일 때만 선택 가능 (한 줄 `{ ... }` 권장)
    - **`"레이블" -> { ... }`** 또는 **`"레이블" ->`** 다음 줄에 `{ ... }` — 무조건 선택 가능

조건식은 JS와 비슷하게 쓰되, mathjs 규칙에 맞게 **`&&` `||` `!`는** 내부에서 `and` / `or` / `not`로 바뀝니다. **`tag == "문자열"`** 처럼 문자열 비교도 지원합니다 (`==`/`!=`는 모두 엄격 동등 의미).

## 스토리 로드

- [`src/story/current.ts`](src/story/current.ts): `src/scenarios/*.iyagi`가 있으면 그중 첫 파일을 사용합니다.
- 로컬 시나리오를 쓰려면 `src/scenarios/`에 `.iyagi`를 두면 됩니다.

## 주요 소스 구조

```
src/
  parser/parseScene.ts    # parseDSL, .iyagi 파서
  story/
    types.ts              # Story, Scene, Choice, Step
    engine.ts             # useStoryEngine (advance / choose)
    storyReducer.ts       # 상태 전이 (스크립트는 runScriptWithResult와 결합)
    evalWhen.ts           # 선택지 조건 평가
    current.ts            # 어떤 .iyagi를 쓸지 선택
  actions/index.ts        # runScript, 내장 액션 + customActions
  App.tsx                 # 플레이 UI
  scenarios/demo.iyagi   # 샘플 시나리오
```

## 테스트

```bash
yarn test
```

`src/__test__/` — 파싱, `evalWhen`, 액션, 리듀서 등.

## 로드맵·할 일

자세한 단계와 우선순위는 [`Todo.md`](Todo.md)를 참고하세요. (세이브/로드, HUD, 변수 선언 기반 헬퍼 자동 생성, 화면 분리 등.)
