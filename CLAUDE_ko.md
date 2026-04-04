# CLAUDE_ko.md

이 파일은 이 저장소에서 작업할 때 Claude Code(claude.ai/code)를 위한 안내 문서다.

## 명령어

```bash
yarn dev          # 개발 서버 http://localhost:5173
yarn build        # tsc -b && vite build
yarn test         # 단위 테스트 전체 실행 (Vitest)
yarn test:watch   # 감시 모드
yarn test:e2e     # Playwright E2E 테스트
yarn lint         # Biome 린트
yarn format       # Biome 포맷 (--write)
yarn check        # Biome 린트 + 포맷 검사
yarn langium:generate  # 문법에서 파서 재생성 (src/language/__generated__/)
```

단일 테스트 파일 실행:
```bash
yarn vitest run src/__test__/actions.test.ts
```

## 아키텍처

**iyagi**는 커스텀 DSL(`.iyagi` 파일)과 React 플레이 엔진을 가진 모바일 퍼스트 텍스트 게임 엔진이다.

### 스토리 파이프라인

1. **`.iyagi` DSL** → Langium으로 파싱 (`src/language/parseIyagi.ts`) → AST → `Story` 객체로 변환 (`src/language/astToStory.ts`)
2. **빌드 타임**에 `vite.config.ts`의 Vite 플러그인이 `.iyagi` 파일을 JSON으로 변환
3. `src/story/current.ts`가 `src/scenarios/*.iyagi` 파일을 모두 임포트 — 첫 번째 파일이 활성 스토리
4. `Story` 객체 (`src/story/types.ts`)가 런타임 정규 포맷: `{ title, start, init, varDefs, scenes }`

### 핵심 엔진

- **`useStoryEngine`** (`src/hooks/useStoryEngine.ts`) — 플레이 + 세이브/로드를 합친 최상위 훅
- **`useStoryPlay`** (`src/hooks/useStoryPlay.ts`) — `useReducer(storyReducer, ...)`를 감싸고 `{ scene, currentStep, pastTexts, choices, vars, advance, choose }` 노출
- **`storyReducer`** (`src/story/storyReducer.ts`) — 상태 머신. 이벤트: `TAP_ADVANCE`, `SCRIPT_DONE`, `SET_SNAPSHOT`, `RUN_SCRIPT`, `CHOOSE`. 상태 형태: `{ sceneId, stepIndex, vars, storyLog }`
- **`useSaveEngine`** (`src/hooks/useSaveEngine.ts`) — 스냅샷을 `localStorage`에 저장

### 액션 시스템

`.iyagi` 파일의 스크립트는 `new Function(...)`으로 실행된다 (`src/actions/index.ts` 참고). 내장 액션: `jump(sceneId)`, `set(key, val)`, `inc(key, n)`, `dec(key, n)`. `vars:`에 선언된 변수는 자동으로 헬퍼 함수를 생성한다: 숫자형은 `setHp(v)`, `addHp(n)`, `subHp(n)`, 불리언형은 `toggleAlive()`. 커스텀 도메인 액션은 `src/actions/customActions.ts`에 작성한다.

### 선택지 조건

선택지의 `if (expr)` 조건은 `new Function`으로 평가된다 (`src/story/evalWhen.ts`). 평가 전에 정규화: `==`/`!=` → `===`/`!==`, `and`/`or`/`not` → `&&`/`||`/`!`. `tag == "value"` 같은 문자열 비교는 엄격한 동등 비교로 동작한다.

### 생성된 파일

`src/language/__generated__/`에는 `langium generate`로 생성된 파서 파일이 있다. 직접 편집하지 말 것 — 문법을 수정한 후 `yarn langium:generate`로 재생성한다.

---

## 설계 결정

### 문법: 들여쓰기 기반이 아닌 구분자 기반

초기 구현은 `IND2`/`IND4`/`IND6`/`IND8` 고정 터미널로 들여쓰기 수를 하드코딩했다. Langium은 `IndentationAwareTokenBuilder`(INDENT/DEDENT 토큰)도 제공하지만, 이 DSL은 이미 씬 바디와 액션 블록에 `{}`를 사용하고 있어 INDENT/DEDENT와 섞으면 구조가 복잡해진다. 대신 `choices: { }` 명시적 구분자를 도입해 파서가 들여쓰기 없이도 구조를 결정할 수 있게 했다. 결과적으로 `IND*` 터미널과 `indentationDiagnostics.ts` 수동 검증이 모두 제거됐다.

**`vars:`가 `{}`를 쓰지 않는 이유:** `VarLine`은 `ID '=' value NL` 패턴으로 씬 선언(`ID '{'`)과 완전히 구별된다. `{}`가 없어도 파싱이 명확하고, YAML/TOML 스타일의 단순 key-value 선언에는 `{}`가 오히려 노이즈다.

### ScriptHead vs ScriptToken 구분

`TextLine`(`"..."`)과 `ScriptLine`(스크립트)을 구별하기 위해 `ScriptHead`는 STRING을 제외한다. `ScriptLine`의 첫 토큰이 STRING이면 `TextLine`으로 파싱된다. 두 번째 토큰 이후(`tailTokens`)는 `ScriptToken`을 사용해 STRING도 허용한다. `ActionScriptLine`도 동일한 전략으로 `ActionTextLine`과 구별된다.

### choicesAt — post-step 인코딩

씬에 `choices:` 뒤에 스텝이 있을 때(Option B 패턴), `Scene.choicesAt` 필드로 "선택지가 표시되는 stepIndex 슬롯"을 기록한다.

- `stepIndex < choicesAt` → 선택 전 스텝 (`steps[stepIndex]`)
- `stepIndex === choicesAt` → 선택지 표시 (`isDone = true`)
- `stepIndex > choicesAt` → 선택 후 스텝 (`steps[stepIndex - 1]`)

`engineDerived.ts`의 `resolveStep(scene, stepIndex)` 헬퍼로 로직을 통일한다. 단, 순환 의존성 방지를 위해 `storyReducer.ts` 내부에 같은 로직을 로컬로 복사했다.

### 무명 씬 (`__anon_N`)

**조건:** 선택지 액션 블록 `{ }` 안에 텍스트 라인이 하나라도 있으면 무명 씬 생성. 스크립트만 있으면 생성하지 않고 스크립트 문자열을 그대로 반환한다.

**파싱 시점(컴파일 타임)에** `astToStory.ts`가 처리한다. 엔진(`storyReducer`)은 전혀 모른다.

```
// .iyagi
"공격" ->
  {
    set("x", 1)
    "공격했다!"     ← 텍스트 라인 있음 → 무명 씬 생성
    jump("next")
  }

// 파싱 결과
choice  = { text: "공격", script: 'jump("__anon_0")' }
scenes["__anon_0"] = {
  steps: [
    { type: "script", code: 'set("x", 1)' },
    { type: "text",   content: "공격했다!" },
    { type: "script", code: 'jump("next")' },
  ],
  choices: []
}

// 텍스트 없는 블록 — 무명 씬 없음
"도망" -> { set("x", 0)  jump("out") }
choice  = { text: "도망", script: 'set("x", 0)\njump("out")' }
```

**런타임 흐름:**
```
CHOOSE "공격"
  → choice.script 실행: jump("__anon_0")
  → sceneId = "__anon_0", stepIndex = 0
  → script set("x",1)   자동 실행
  → text  "공격했다!"   TAP_ADVANCE 대기
  → script jump("next") 자동 실행
  → sceneId = "next"
```

**여러 선택지:** `anonCounter`가 파일 전체에서 단조 증가(`__anon_0`, `__anon_1`, ...)하므로 ID 충돌 없음.

**핵심:** 엔진은 `__anon_0`을 일반 씬과 동일하게 처리한다. 복잡한 분기 처리는 파싱 단계에서 끝난다.

---

## DSL 문법 레퍼런스

```iyagi
vars:
  hp = 10
  alive = true

sceneId {
  "따옴표로 감싼 줄 = 텍스트 스텝"
  inc("hp", 1)              // 따옴표 없는 줄 = 스크립트 스텝

  choices: {
    if (hp >= 5) "선택지 A" -> { jump("nextScene") }
    "선택지 B" -> {
      set("alive", false)
      jump("other")
    }
  }
  "선택지 이후 post-step"   // 선택 후 자동 실행 (choicesAt)
}

inline { "text" "text2" }    // InlineScene: 스텝만, 스크립트 없음
```

`vars:` — 들여쓰기는 장식용(깊이 무관, 없어도 됨). 첫 번째 씬이 나오면 블록 종료.

`choices: { }` — 명시적 중괄호 필수. 각 선택지는 `->`와 액션 블록으로 끝난다.

액션 블록(`-> { }`) 안에 텍스트 라인이 있으면 파싱 시점에 무명 씬(`__anon_N`)으로 컴파일된다.
