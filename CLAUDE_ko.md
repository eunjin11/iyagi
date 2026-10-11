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
3. `src/story/current.ts`가 `src/scenarios/*.iyagi` 파일을 모두 임포트해 스토리 카탈로그를 만들고, 메인 화면에서 선택한다
4. `Story` 객체 (`src/story/types.ts`)가 런타임 정규 포맷: `{ title, start, init, varDefs, scenes }`

### 핵심 엔진

- **`useStoryEngine`** (`src/hooks/useStoryEngine.ts`) — 플레이 + 세이브/로드를 합친 최상위 훅
- **`useStoryPlay`** (`src/hooks/useStoryPlay.ts`) — `useReducer(storyReducer, ...)`를 감싸고 `{ scene, currentStep, pastTexts, choices, vars, advance, choose }` 노출
- **`storyReducer`** (`src/story/storyReducer.ts`) — 상태 머신. 이벤트: `TAP_ADVANCE`, `SCRIPT_DONE`, `SET_SNAPSHOT`, `RUN_SCRIPT`, `CHOOSE`. 상태 형태: `{ sceneId, stepQueue, pastTexts, vars, storyLog }`
- **`useSaveEngine`** (`src/hooks/useSaveEngine.ts`) — 스냅샷을 `localStorage`에 저장

### 액션 시스템

`.iyagi` 파일의 스크립트는 `new Function(...)`으로 실행된다 (`src/actions/index.ts` 참고). 내장 액션: `jump(sceneId)`, `set(key, val)`, `inc(key, n)`, `dec(key, n)`, `addItem(id, name, icon, quantity, description, useAction)`, `useItem(id)`, `removeItem(id, quantity)`, `hasItem(id)`. `vars:`에 선언된 변수는 자동으로 헬퍼 함수를 생성한다: 숫자형은 `setHp(v)`, `addHp(n)`, `subHp(n)`, 불리언형은 `toggleAlive()`. 커스텀 도메인 액션은 `src/actions/customActions.ts`에 작성한다.

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

### stepQueue 아키텍처

`StoryEngineState`는 `stepIndex: number` 대신 `stepQueue: Step[]`을 보유한다. 씬 진입 시 `[...scene.steps]`를 큐에 복사한다. 스텝은 앞에서부터 꺼내며 진행한다.

- **`TAP_ADVANCE`**: `text` 스텝을 팝, 내용을 `pastTexts`에 추가
- **`RUN_SCRIPT`** / **`SCRIPT_DONE`**: `script` 스텝을 팝; `jumpTo`가 있으면 새 씬 스텝으로 큐를 리셋
- **`CHOOSE`**: 큐 앞의 `choices` 스텝을 선택된 `choice.steps`로 교체 — `[...choice.steps, ...queue.slice(1)]`

`choices`는 `Step` 유니온의 정식 타입이다. 큐 맨 앞에 `choices` 스텝이 있으면 UI가 선택지 목록을 렌더링한다. `isDone` = `stepQueue.length === 0`.

이 방식은 이전의 `stepIndex` + `choicesAt` + `resolveStep()` 구조를 대체하며, 선택지 블록 내 텍스트 라인을 위한 무명 씬(`__anon_N`) 생성도 제거했다. 선택지 액션 블록은 이제 `Choice.steps: Step[]`으로 직접 컴파일된다.

**post-choices 스텝**도 자연스럽게 동작한다: DSL에서 `choices:` 뒤에 배치된 스텝은 큐에서 `choices` 스텝 뒤에 위치하며, 주입된 `choice.steps`가 소진된 후 이어서 처리된다.

```
// CHOOSE 상태 전이
stepQueue: [choices, postStep1, postStep2]
  → CHOOSE "선택지 A"  (choice.steps = [scriptA, textA])
stepQueue: [scriptA, textA, postStep1, postStep2]
```

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
      "도망쳤다!"           // 선택지 블록 내 텍스트 라인 — 가능
      jump("other")
    }
  }
  "선택지 이후 post-step"   // choice.steps 소진 후 이어서 처리
}

inline { "text" "text2" }    // InlineScene: 스텝만, 스크립트 없음
```

`vars:` — 들여쓰기는 장식용(깊이 무관, 없어도 됨). 첫 번째 씬이 나오면 블록 종료.

`choices: { }` — 명시적 중괄호 필수. 각 선택지는 `->`와 액션 블록으로 끝난다.

액션 블록(`-> { }`) 안에 텍스트 라인과 스크립트 라인을 자유롭게 섞어 쓸 수 있다. 파싱 시점에 `Choice.steps: Step[]`으로 컴파일되며, 중간 씬은 생성하지 않는다.
