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

## 저장 시 `.iyagi` 자동 포맷 (Format on Save)
이 레포는 VSCode 확장(`iyagi-lang`)이 `.iyagi`용 포맷터를 포함하고 있어, 별도 Run-on-Save 확장 없이도 저장(`Ctrl+S`) 시 자동 포맷이 가능합니다.

1. 확장 설치(로컬)
   - `vscode-extension/iyagi-lang`을 VSCode/Cursor에서 “Run Extension”으로 실행하거나, VSIX로 설치합니다.
2. 프로젝트 전용 설정
   - `.vscode/settings.json`에 `[iyagi]` 전용 `editor.defaultFormatter` / `editor.formatOnSave`가 포함되어 있습니다.
3. 검증
   - `src/scenarios/demo.iyagi`를 열고 저장(`Ctrl+S`)해보세요.
   - `{}` 블록/선택지 들여쓰기와 줄바꿈이 자동으로 정렬됩니다.

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

## DSL을 만든 이유
이 프로젝트는 “스토리 작성”을 핵심으로 두기 때문에, 코드(JSON/JS)로 만들면 반복되는 구조(배열/필드명/중괄호)를 줄이고, 작가가 씬과 선택지를 자연스럽게 적을 수 있도록 **도메인 특화 언어(DSL)**를 만들었습니다.

- JSON/JS는 `Story -> Scene -> Step/Choice` 같은 구조를 매번 전부 써야 해서, 같은 내용 대비 작성량이 커집니다.
- `.iyagi`에서는 `vars:`, `sceneId { ... }`, `choices:` 같은 “스토리 단위” 문법을 파서가 직접 이해해, 데이터 표현이 간결해집니다.
- 선택지 조건(`if (...)`)과 스크립트(실행 코드)를 문법 레벨에서 분리해, 조건은 `mathjs`, 실행은 `new Function` 기반 스크립트로 처리하도록 설계를 명확히 했습니다.

## 같은 내용을 더 짧게: `.iyagi` vs JS(Object)
엔진은 내부적으로 `Story` 타입 객체를 받습니다. 따라서 아래처럼 JS에서 직접 `Story`를 구성할 수도 있지만, 구조가 길어집니다.

### `.iyagi`로 작성(짧고 읽기 쉬움)
```iyagi
vars:
  hp = 10
  gold = 1

village {
  choices:
    if (gold >= 1) "빵을 산다" -> { dec("gold", 1); inc("hp", 2); jump("going_home") }
    "다시 길로 나온다"       -> { jump("start") }
}
```

### JS(Object)로 작성(구조 반복이 많음)
```js
const story = {
  title: "여행",
  start: "village",
  init: { hp: 10, gold: 1 },
  scenes: {
    village: {
      id: "village",
      steps: [],
      choices: [
        {
          text: "빵을 산다",
          enabledWhen: "gold >= 1",
          script: 'dec("gold", 1);\ninc("hp", 2);\njump("going_home")',
        },
        {
          text: "다시 길로 나온다",
          script: 'jump("start")',
        },
      ],
    },
  },
};
```

결론적으로 `.iyagi`는 “스토리 데이터”에만 집중하게 해주고, JS/JSON에서 반복되는 구조 템플릿을 제거해서 훨씬 짧고 깔끔하게 작성할 수 있습니다.

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
