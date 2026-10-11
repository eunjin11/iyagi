# iyagi

[데모 플레이 하기](https://iyagi-brown.vercel.app/)

https://github.com/user-attachments/assets/cda8203a-3360-485d-a67e-03824f01b89a


`iyagi`는 모바일 우선 텍스트 게임을 위한 **스토리 DSL**과 **플레이 엔진**(React)입니다. `.iyagi` 파일을 파싱해 씬·대사·선택지·변수를 구동합니다.

## 스택

- **React 18** + **TypeScript** + **Vite 5**
- 스타일: **Vanilla Extract**
- `.iyagi` 파싱: **langium**
- 씬/선택 **스크립트**: `jump`, `set`, `inc`, `dec`, `addItem`, `removeItem` 등 — 내부적으로 `new Function`으로 실행

## 시작하기

```bash
yarn          # 의존성
yarn dev      # http://localhost:5173
yarn test     # Vitest
yarn build && yarn preview
```

## 스토리 파일 (`.iyagi`)

공개 진입점은 **`parseDSL`** — 예시는 [`src/scenarios/demo.iyagi`](src/scenarios/demo.iyagi) 참고

- **`vars:`** — 초기 변수 (`hp = 10` 등).
  - 파싱 결과는 `Story.init`에 들어가며, `parseDSL(..., { init })`로 덮어쓸 수 있음(외부 init 우선 병합).
  - 동시에 `Story.varDefs`(변수 메타데이터 목록: `{ name, init }[]`)도 생성됨.
  - `vars:`로 선언된 변수는 **스크립트에서 자동 헬퍼 함수로도 사용 가능**:
    - `number`: `setHp(v)`, `addHp(n)`, `subHp(n)`
    - `boolean`: `setAlive(v)`, `toggleAlive()`
    - `string`: `setTag(v)`
- **`sceneId { ... }`** — 씬 본문
  - **`"따옴표로 감싼 한 줄`** — 텍스트 스텝
  - **그 외 한 줄** — 스크립트 스텝 (예: `if (hp <= 0) jump("gameover")`, `inc("hp", 1)`)
  - **`choices: { ... }`** — 선택지 블록 (명시적 `{}` 필수)
    - **`if (조건식) "레이블" -> { ... }`** — 조건이 참일 때만 선택 가능
    - 액션 블록 `{ }` 안에 텍스트 라인과 스크립트 라인을 자유롭게 섞어 쓸 수 있음
  - `choices: { }` 뒤에 텍스트·스크립트를 쓰면 **선택 후 자동 실행** (선택된 choice.steps 소진 후 이어서 처리)
  - 인벤토리: `addItem(id, name, icon, quantity, description, useAction)`, `useItem(id)`, `removeItem(id, quantity)`, `hasItem(id)`

`hasItem("key")`는 스크립트뿐 아니라 선택지와 `if` 조건에서도 사용할 수 있습니다. 새 조회 함수는 `src/actions/queries.ts`의 `createQueries`에 정의하면 두 실행 경로에 함께 제공됩니다. 조건 평가에는 엔진 상태를 받는 `evalStoryCondition`을 사용합니다.

`src/scenarios/`에 `.iyagi` 파일을 여러 개 둘 수 있습니다. 각 파일은 메인 화면의 스토리 선택 목록에 자동으로 나타나며, 저장 데이터도 스토리별로 분리됩니다. 아이템의 `useAction`는 사용 버튼을 눌렀을 때 실행되고 아이템 1개가 소비됩니다.

```iyagi
addItem("potion", "회복 물약", "🧪", 2, "체력을 회복한다.", "heal(5)")
```

### 인벤토리

| 함수 | 동작 |
| --- | --- |
| `addItem(id, name, icon = "📦", quantity = 1, description = "", useAction = "")` | 아이템을 추가합니다. 같은 ID가 있으면 수량을 늘립니다. |
| `hasItem(id)` | 현재 인벤토리에서 수량이 0보다 큰 아이템의 보유 여부를 반환합니다. |
| `useItem(id)` | `useAction`을 실행하고 1개를 소비합니다. 사용 동작이 없으면 `false`를 반환합니다. |
| `removeItem(id, quantity = 1)` | 지정한 수량을 제거합니다. 남은 수량이 0 이하이면 목록에서 제거합니다. |

`hasItem()`은 별도의 보유 변수를 생성하거나 저장하지 않습니다. 조건에는 `if (hasItem("key"))`처럼 직접 사용할 수 있습니다. 메뉴에서 아이템을 누르면 설명과 사용·버리기 버튼이 나타나며, 사용 동작이 있는 아이템에만 사용 버튼이 표시됩니다.

### 저장·불러오기

저장은 브라우저의 `localStorage`에 기록됩니다. 진행 위치, 대사와 로그, 전역·지역 변수, 인벤토리(수량·설명·`useAction` 포함)를 함께 저장하고 불러옵니다. 저장 목록은 스토리별로 분리되며, 형식 검증을 통과하지 못한 저장 항목은 목록에서 제외됩니다.

## 같은 내용을 더 짧게: `.iyagi` vs JS(Object)

이 프로젝트는 “스토리 작성”을 핵심으로 두기 때문에, 코드(JSON/JS)로 만들면 반복되는 구조(배열/필드명/중괄호)를 줄이고, 작가가 씬과 선택지를 자연스럽게 적을 수 있도록 **도메인 특화 언어(DSL)**를 만들었습니다.

- JSON/JS는 `Story -> Scene -> Step/Choice` 같은 구조를 매번 전부 써야 해서, 같은 내용 대비 작성량이 커집니다.
- `.iyagi`에서는 `vars:`, `sceneId { ... }`, `choices:` 같은 “스토리 단위” 문법을 파서가 직접 이해해, 데이터 표현이 간결해집니다.
- 선택지 조건(`if (...)`)과 스크립트(실행 코드)를 문법 레벨에서 분리해, `new Function` 기반 스크립트로 처리하도록 설계를 명확히 했습니다.

엔진은 내부적으로 `Story` 타입 객체를 받습니다. 따라서 아래처럼 JS에서 직접 `Story`를 구성할 수도 있지만, 구조가 길어집니다.

### `.iyagi`로 작성
```iyagi
vars:
  hp = 10
  gold = 1

village {
  "마을은 평화롭다. 장터가 북적인다."
  "빵집에서 고소한 냄새가 풍긴다."
  choices: {
    if (gold >= 1) "빵을 산다" ->
      {
        dec("gold", 1)
        inc("hp", 2)
        jump("going_home")
      }
    "다시 길로 나온다" -> { jump("start") }
  }
}
```

### JS(Object)로 작성
```js
const story = {
  title: "여행",
  start: "village",
  init: { hp: 10, gold: 1 },
  scenes: {
    village: {
      id: "village",
      steps: [
        { type: "text", content: "마을은 평화롭다. 장터가 북적인다." },
        { type: "text", content: "빵집에서 고소한 냄새가 풍긴다." },
        {
          type: "choices",
          choices: [
            {
              text: "빵을 산다",
              enabledWhen: "gold >= 1",
              steps: [
                { type: "script", code: 'dec("gold", 1)' },
                { type: "script", code: 'inc("hp", 2)' },
                { type: "script", code: 'jump("going_home")' },
              ],
            },
            {
              text: "다시 길로 나온다",
              steps: [{ type: "script", code: 'jump("start")' }],
            },
          ],
        },
      ],
    },
  },
};
```

`.iyagi`는 “스토리 작성”에만 집중하게 해주고, JS/JSON에서 반복되는 구조 템플릿을 제거해서 훨씬 짧고 깔끔하게 작성할 수 있습니다.

## 저장 시 `.iyagi` 자동 포맷 (Format on Save)

https://github.com/user-attachments/assets/66e64c2d-16d7-428f-a3dc-af8959152ac4

이 레포는 VSCode 확장(`iyagi-lang`)이 `.iyagi`용 포맷터를 포함하고 있어, 별도 Run-on-Save 확장 없이도 저장(`Ctrl+S`) 시 자동 포맷이 가능합니다.

1. 확장 설치(로컬)
   - `iyagi-vscode-extension`을 VSCode/Cursor에서 “Run Extension”으로 실행하거나, VSIX로 설치합니다.
2. 프로젝트 전용 설정
   - `.vscode/settings.json`에 `[iyagi]` 전용 `editor.defaultFormatter` / `editor.formatOnSave`가 포함되어 있습니다.
3. 검증
   - `src/scenarios/demo.iyagi`를 열고 저장(`Ctrl+S`)해보세요.
   - `{}` 블록/선택지 들여쓰기와 줄바꿈이 자동으로 정렬됩니다.

## 스토리 로드

- [`src/story/current.ts`](src/story/current.ts): `src/scenarios/*.iyagi`를 모두 불러와 스토리 선택 목록을 만들고, `demo.iyagi`를 기본 스토리로 사용합니다.
- 로컬 시나리오를 쓰려면 `src/scenarios/`에 `.iyagi`를 두면 됩니다.

## 주요 소스 구조

```
src/
  App.tsx                  # 메인/플레이 전환, 선택한 스토리와 이어하기 상태
  pages/
    MainPage.tsx           # 스토리 선택, 게임 시작, 이어하기
    PlayPage.tsx           # 대사·선택지·로그·메뉴를 연결하는 플레이 화면
  parser/parseScene.ts     # 공개 파싱 진입점 parseDSL
  language/                # Langium 문법·파싱, AST → Story 변환
  hooks/
    useStoryEngine.ts      # 플레이 API와 저장 API 결합
    useStoryPlay.ts        # 플레이 상태·전이, 선택지 조건, 아이템 사용·버리기
    useSaveEngine.ts       # 스토리별 저장 목록과 저장·불러오기
  story/
    types.ts               # Story, Scene, Choice, Step, InventoryItem, 변수 타입
    engineDerived.ts       # 엔진 상태에서 화면 표시 상태 도출
    storyReducer.ts        # 진행·선택·인벤토리 등 상태 전이
    runScriptWithResult.ts # 스크립트 실행 결과를 상태 전이에 전달
    evalWhen.ts            # 선택지·if 조건 평가
    snapshots.ts           # localStorage 저장과 저장 데이터 검증
    current.ts             # 시나리오 목록과 기본 스토리
  actions/
    index.ts               # runScript와 내장 액션
    queries.ts             # 스크립트·조건에서 공유하는 hasItem 등 조회 함수
    customActions.ts       # 게임별 추가 액션
  components/story/
    GameMenu.tsx           # 저장·불러오기와 인벤토리 메뉴
    InventoryGrid.tsx      # 아이템 슬롯·툴팁·사용·버리기
  scenarios/
    demo.iyagi             # 기본 샘플 스토리
    item-test.iyagi        # 아이템 획득·사용·조건 검사 샘플
```

## 테스트

```bash
yarn test
```

`src/__test__/` — 파싱, 조건 평가, 액션, 리듀서, 저장 데이터 검증 등.

브라우저 E2E는 Playwright로 실행합니다.

```bash
yarn playwright install chromium
yarn test:e2e
# 설치된 Chrome으로 실행하려면
PW_USE_SYSTEM_CHROME=1 yarn test:e2e
```

`e2e/` — 스토리 선택·저장 격리, 아이템 보유 조건·사용·버리기, 저장 후 인벤토리 복원, 툴팁 터치 동작 등. E2E는 개발 서버를 5174 포트에서 실행합니다.
