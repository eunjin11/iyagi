# Text RPG — Action Plan

## 현재 상태 요약

| 레이어                       | 완성도        | 비고                                                                  |
| ---------------------------- | ------------- | --------------------------------------------------------------------- |
| DSL 파서 (`parseScene.ts`)   | ✅ 기본 동작  | Langium 기반(`parseIyagi` → `astToStory`)으로 동작                    |
| 스토리 로드 (`current.ts`)   | ✅ `.iyagi`만 | `scenarios/`에서 첫 파일을 사용 |
| 스토리 엔진 (`src/hooks/useStoryEngine.ts`) | ✅ 기본 동작  | advance / choose 중심                                                 |
| Actions (`actions/index.ts`) | ✅ 기본 동작  | jump, set, inc, dec 등                                                |
| UI (`App.tsx`)               | 🔶 최소 구현  | 단일 화면, 타이틀/엔딩 분리 없음; dev 변수 오버레이만 (씬 그래프 → 2-5) |
| 세이브/로드                  | ❌ 미구현     | 스냅샷 API·UI·저장 전부 없음                                          |
| 선택지 조건부 표시           | ✅ 구현됨     | `if (expr) "레이블" -> …`, `Choice.enabledWhen` + `evalWhen` (mathjs·AST) |
| 스탯 표시                    | ❌ 미구현     | 디버그 오버레이만 있음                                                |
| 백엔드 / 클라우드            | ❌ 미구현     | 계획: Fastify + GraphQL Yoga (+ Relay 프론트)                         |
| 프레임워크 / 확장            | 🔶 초기       | `customActions` 패턴 있음 → 공개 API·패키지 경계는 Phase 6            |

---

## 최근 완료

- [x] **Option B (post-steps)**: `choices:` 블록 뒤에 텍스트·스크립트를 배치해 선택 결과를 인라인으로 표현 (`choicesAt` 필드)
- [x] **무명 씬 (익명 블록)**: 선택지 액션 블록 `{ }` 안에 텍스트 라인을 쓰면 컴파일 타임에 `__anon_N` 씬으로 변환
- [x] **화면 흔들림 효과**: `rollAttack` 히트 시 `_shakeTick` → CSS `shakeActive` 애니메이션
- [x] **Grammar delimiter 기반 개선**: `IND2`/`IND4`/`IND6`/`IND8` 고정 터미널 제거 → `choices: { }` 명시적 구분자 도입, `ActionLine6/8` 단일 `ActionLine`으로 병합, `indentationDiagnostics.ts` 삭제

---

## 무명 씬 후속 작업

### 무명 씬 + post-step 연계
선택지 블록에 텍스트가 있어 무명 씬으로 변환될 때, 부모 씬에 `choicesAt`(post-step)이 함께 있으면 무명 씬 종료 후 post-step으로 자동 진입하지 않음. 현재는 무명 씬 끝에 명시적 `jump()`를 넣어야 함.

- [ ] 컴파일 타임에 무명 씬 끝에 부모 씬 continuation jump 자동 삽입
  또는 엔진에 **call stack** 추가 (`storyLog` 외 `returnStack` 필드)

### 선택지 중첩 (nested choices)
무명 씬 블록 안에서 다시 `choices: { }` 블록 사용.

- [ ] `BlockAction`의 `ActionLine`에 `ChoiceBlock` 추가 (Grammar 수정 → `yarn langium:generate`)
- [ ] `astToStory`에서 무명 씬 내 choices 재귀 처리

### 인라인 블록 텍스트 지원
`"option" -> { "text" jump("x") }` 한 줄 형태.

- [ ] `InlineAction`(`codeTokens`)에서 독립 STRING 토큰을 텍스트 스텝으로 감지하는 로직 추가
  (현재 `cstBetween`으로 통째로 스크립트 문자열로 처리됨)

### 무명 씬 ID 로그 숨기기
`StoryLogPanel`에 `enterScene: __anon_0` 같은 내부 ID가 노출됨.

- [ ] `__anon_` 접두사 씬 진입 로그는 표시 필터링

---

## Phase 1 — 게임플레이 완성 (필수)

### 1-4. 변수 선언 DSL + 헬퍼 함수 자동 생성 (최우선)

DSL 최상단 `vars:` 블록은 이미 파싱되어 `Story.init`에 반영됨 (`src/language/astToStory.ts`).
다만 **`VarDef[]` 메타데이터·타입 추론 저장**과 **`setHp`/`addHp` 류 자동 생성**은 아직 없고,
변수 초기값은 `parseDSL(dsl, { init: {...} })`로 외부 주입하는 경로도 병행 가능함(외부 init 우선 병합 유지).
`setHeart` / `addHeart` 등 편의 함수는 `actions/index.ts`에 하드코딩된 상태.
이를 DSL 선언 기반 자동 헬퍼로 바꾸는 것이 본 항목의 목표.

**DSL 예시 (변경 후):**

```
vars:
  hp = 10
  gold = 0
  heart = 5

start {
  addHp(1)        // 자동 생성된 헬퍼
  setHeart(3)     // 자동 생성된 헬퍼
  inc("gold", 2)  // 기존 방식도 계속 동작 (하위 호환)
  ...
}
```

**자동 생성 규칙:**
| 변수 타입 | 생성되는 함수 |
|---|---|
| `number` | `set{Name}(v)`, `add{Name}(n)`, `sub{Name}(n)` |
| `string` | `set{Name}(v)` |
| `boolean` | `set{Name}(v)`, `toggle{Name}()` |

예: `hp = 10` → `setHp(v)`, `addHp(n)`, `subHp(n)`

**작업:**

- [ ] `types.ts` — `VarDef` 타입 추가, `Story`에 `varDefs?: VarDef[]` 필드 추가
  ```ts
  export type VarDef = {
    name: string;
    init: number | string | boolean;
  };
  ```
- [ ] `astToStory.ts` — `vars:` 블록으로부터 `varDefs` 생성 + `init` 자동 populate (외부 `init` 옵션은 override용으로 유지)
- [ ] `actions/index.ts` — `createActions(ctx, varDefs?)` 시그니처 변경
  - `varDefs` 순회하며 타입별 헬퍼 함수 동적 생성
  - 하드코딩된 `setHeart`, `addHeart`, `setGold`, `addGold` 제거
- [ ] `runScript` / `runScriptWithResult` 호출 시 `story.varDefs` 전달
- [ ] `demo.iyagi` — 자동 헬퍼 사용 예시 일부 반영 (기존 `inc/dec/set`도 하위호환 유지)

### 1-1. 선택지 조건부 활성화 ✅ (기본 완료)

조건 불충족 시 버튼 비활성·툴팁. (`when` 문법은 제거, `if (…) "레이블"` 한 줄만 지원.)

**DSL 예시:**

```
choices:
  if (gold >= 1) "빵을 산다" -> { dec("gold", 1); inc("hp", 2); jump("start") }
  "그냥 둘러본다" -> { jump("start") }
```

**구현 요약:** `types.Choice.enabledWhen?: string` — 파서가 `if (...)` 안 식을 저장, `App.tsx`에서 `evalWhen`으로 평가 후 `disabled` / `aria-disabled`.

**작업:**

- [x] `parseScene.ts` — `matchIfChoiceLine`, `choiceFromParts` + 조건 문자열 검증(`assertWhenExprParses`)
- [x] `types.ts` — `enabledWhen`
- [x] `App.tsx` — 비활성·툴팁·클릭 차단
- [x] `story/evalWhen.ts` — mathjs 파싱 + `==`/`!=` AST를 `seq`(===)로 치환, 문자열 리터럴 비교 지원
- [ ] (선택) `useStoryPlay` — `choose()` 진입 시 `enabledWhen` 재검사(악의적 호출·미래 API 대비)

### 1-2. 세이브/로드 (localStorage)

엔진에 스냅샷(`sceneId`, `stepIndex`, `vars`)을 꺼내 넣을 API가 필요하면 `getSnapshot` / `setSnapshot`(및 선택 `restart`)을 `useStoryEngine`에 다시 추가한 뒤 연동한다.

**작업:**

- [ ] `useStoryPlay` — 스냅샷 getter(및 필요 시 `restart`) 추가
- [ ] `useStoryEngine` 내부에 자동저장 (`useEffect` + `localStorage`) 추가
- [ ] 앱 시작 시 저장된 스냅샷이 있으면 복원 여부 물어보기
- [ ] 타이틀 화면에 "이어하기 / 새 게임" 버튼 추가

### 1-3. 인게임 스탯 표시 (HUD)

디버그 오버레이 → 실제 UI로 승격.

**작업:**

- [ ] HUD 컴포넌트 구현 (hp, gold 등 상단 표시, `VarDef` 목록 기반 — **1-4 완료 후**)
- [ ] `$variable` 보간을 선택지 텍스트에도 적용 (현재 text step만 지원)

---

## Phase 2 — 스토리 저작 경험 개선

### 2-1. 파서 에러 메시지 개선

현재 에러 메시지에 줄 번호가 없어 디버깅이 어려움.

**작업:**

- [ ] `splitSceneBlocks` / `parseSceneBody`에 줄 번호 추적 추가
- [ ] `ParseResult.errors`를 `{ line: number; message: string }[]`로 변경
- [ ] 개발 모드에서 파싱 에러를 화면에 표시

### 2-2. DSL 확장 — `show:` 조건부 텍스트

**DSL 예시:**

```
show (gold >= 5): "주머니가 묵직하다."
```

**작업:**

- [ ] `Step` 타입에 `{ type: 'conditional-text'; condition: string; content: string }` 추가
- [ ] 파서에서 `show (expr): "text"` 패턴 파싱
- [ ] 엔진에서 condition 평가 후 렌더링 여부 결정

### 2-3. `scenarios/` 폴더 스토리 목록 UI

현재 `current.ts`는 `*.iyagi`만 로드하며, 여러 개일 때 첫 파일만 자동 선택된다.

**작업:**

- [ ] 타이틀 화면에서 `scenarios/` 내 모든 `.iyagi` 목록 표시
- [ ] 스토리 선택 → 플레이 진입

### 2-4. Langium 기반 DSL 파서 (`langium-cli`) ✅ 기본 완료

DSL 파서는 **Langium** 기반으로 동작 중(`src/language/iyagi.langium`, `parseIyagi`, `astToStory`). `choices: { }` delimiter 기반 문법으로 개선 완료. 스크립트 줄은 JS 전체를 파싱하지 않고 문자열로만 잡아 `new Function`으로 실행.

**작업:**

- [x] 의존성: `langium`, `langium-cli`
- [x] `src/language/iyagi.langium` — delimiter 기반 문법 (`choices: {}`, 들여쓰기 자유)
- [x] `package.json` 스크립트: `langium:generate` + `langium-config.json` → `src/language/__generated__/`
- [x] `parseIyagi` + `astToStory`로 입력 문자열 → AST → `Story`
- [ ] 커스텀 `ValidationRegistry` / 진단 — 알 수 없는 씬 참조, 빈 `choices:` 등

**연계:**

- **2-1** 줄 번호·에러 구조는 Langium 진단으로 상당 부분 대체 가능
- **3-3** 테스트는 픽스처 + Langium `parseDocument` + `astToStory` 기대값 검증으로 이행

### 2-5. 디버그: 씬 그래프 팝업 (노드·링크 뷰)

Twine의 패시지 맵처럼 **파싱된 `Story`를 방향 그래프로 보여 주는 읽기 전용 뷰**. 저작자가 분기·순환·고립 씬을 한눈에 확인하기 위함. 실시간 `.iyagi` 편집·역파서는 범위 밖(별도 에디터 과제).

**데이터:**

- 노드: `Object.keys(story.scenes)` (또는 실제 존재하는 씬 ID 집합), `story.start`는 시각적 강조
- 간선: 각 씬의 `choices[].script` 및 `steps` 중 `type === 'script'`인 `code`에서 `jump("…")` / `jump('…')` 호출을 **정규식 등으로 정적 추출** (동적 `jump(변수)`는 그래프에 표기 불가 또는 "알 수 없음"으로 문서화)
- `if (…) jump(…)`가 포함된 스크립트는 간선을 **조건부**(점선·별색·라벨)로 구분

**UI/UX:**

- `import.meta.env.DEV`에서만 노출되는 버튼 → `<dialog>` 또는 전체 화면 모달(딤, ESC·닫기)
- 그래프 캔버스: **React Flow**(`@xyflow/react`) 또는 Cytoscape/vis-network 등 (노드 드래그·줌·미니맵 우선순위에 맞게 선택)
- 자동 레이아웃: DAG면 **dagre** 등 계층 배치, 루프 많으면 force-directed 보조
- (선택) 현재 플레이 중인 `sceneId`로 해당 노드 하이라이트
- (선택) 노드 더블클릭 시 **디버그 점프** — `useStoryEngine`에 `sceneId`/`stepIndex`를 외부에서 세팅하는 API 추가 여부 검토

**작업:**

- [ ] `src/story/` 또는 `src/debug/` — `storyToGraph(story): { nodes; edges }` 순수 함수 + `jump` 추출 헬퍼
- [ ] 단위 테스트 — 샘플 `story` 또는 `demo.iyagi` 파싱 결과로 간선 개수·대상 씬 ID 기대값 검증
- [ ] 의존성 추가 — 그래프 라이브러리 + (선택) 레이아웃 패키지
- [ ] `App.tsx`(또는 `src/debug/StoryGraphModal.tsx`) — dev 버튼, 모달, 그래프 마운트
- [ ] README 또는 본 항목에 **한계** 명시: 동적 `jump`, 런타임만 도달하는 분기는 정적 그래프와 불일치 가능
- [ ] (후순위/Twine 급) 노드 배치·연결 편집이 `.iyagi` 파일에 반영되는 **비주얼 에디터**는 별도 Phase로 쪼개기

---

## Phase 3 — 기술 부채 해소

### 3-1. `new Function()` 보안 검토

현재 `runScript`는 `new Function()`으로 DSL 스크립트를 실행. 로컬 파일만 사용한다면 허용 가능하나, 외부 입력 처리 시 위험.

**작업:**

- [ ] 외부 스토리 파일 로드 계획이 있는지 결정
- [ ] 있다면: 허용된 함수만 호출 가능한 인터프리터로 교체 검토

### 3-2. 화면 분리 — 타이틀 / 게임 / 엔딩

현재 `App.tsx` 하나에 모든 상태가 섞여 있음. `react-router-dom`이 이미 설치되어 있으므로 라우팅으로 분리.

**화면 구성:**

```
/          → TitleScreen   (새 게임 / 이어하기 / 시나리오 선택)
/play      → GameScreen    (현재 StoryView 로직)
/ending    → EndingScreen  (엔딩 연출 + 재시작 / 타이틀로)
```

**작업:**

- [ ] `react-router-dom` `<BrowserRouter>` + `<Routes>` 설정 (`main.tsx`)
- [ ] `src/screens/TitleScreen.tsx` 생성
  - 스토리 제목 / 시작 버튼
  - localStorage에 저장된 세이브가 있으면 "이어하기" 버튼 표시
  - `scenarios/` 목록이 여러 개일 경우 선택 UI (→ 2-3과 연동)
- [ ] `src/screens/GameScreen.tsx` 생성
  - 기존 `StoryView` 로직 이전
  - `isDone && choices.length === 0` 조건(엔딩) 감지 시 `/ending`으로 navigate
- [ ] `src/screens/EndingScreen.tsx` 생성
  - "— END —" 연출
  - "처음부터 다시" → `/` 또는 `/play` (새 게임)
  - "타이틀로" → `/`
- [ ] `App.tsx`를 라우터 껍데기로 단순화

### 3-3. 파서 테스트 추가

`parseDSL`·액션 스모크 테스트 도입됨 (`vitest`, `npm run test`).

**작업:**

- [x] Vitest 설치 및 설정 (`vitest.config.ts`, `package.json` scripts)
- [x] `src/__test__/parseScene.test.ts` — vars, 씬/선택지(한 줄·멀티라인), `if` 조건부 선택, `demo.iyagi` 통합, 에러 케이스
- [x] `src/__test__/actions.test.ts` — `runScript`, `inc`/`dec`/`set`, `jump`, 커스텀 `heal`, ReferenceError
- [x] `src/__test__/evalWhen.test.ts` — 리터럴·비교·논리·문자열 `==` 등
- [x] `src/__test__/storyReducer.test.ts` — 이벤트/리듀서 스모크
- [ ] (선택) `test/fixtures/*.iyagi` 파일 분리, CI 연동

---

## Phase 4 — 장기 개선 (선택)

- [ ] 씬 전환 애니메이션 (fade in/out)
- [ ] 배경 이미지 / 일러스트 지원 (`Scene`에 `image?: string` 필드)
- [ ] 타자 효과 (텍스트가 한 글자씩 출력되는 연출)
- [ ] BGM/효과음 지원 (`play("bgm_forest")` 액션)
- [ ] 스토리 DSL용 VS Code 문법 하이라이팅 확장

---

## Phase 5 — 백엔드 · 클라우드 동기화 (Fastify · GraphQL Yoga · Relay)

**목표:** 작업 중인 게임 스토리(DSL 또는 메타)를 서버에 저장하고, 로그인 후 다른 기기에서 이어서 편집·불러오기.

### 5-1. API 서버 스캐폴딩 (Fastify + GraphQL Yoga)

- [ ] `server/`(또는 별도 패키지)에 **Fastify** + TypeScript(또는 Node ESM) 프로젝트 추가
- [ ] GraphQL Yoga를 Fastify에 붙이기 — 공식 연동은 `@graphql-yoga/plugin-fastify` 등 (Yoga 문서 기준)
- [ ] `/graphql` 외 헬스체크·REST 훅은 Fastify 라우트로 확장
- [ ] 인증은 Fastify `preHandler`/플러그인에서 처리 후 GraphQL 컨텍스트로 `user` 주입 검토
- [ ] 개발 시 Vite `proxy` 또는 `@fastify/cors`로 프론트와 연결

### 5-2. 영속 저장소 · 데이터 모델

- [ ] DB 선택: 로컬 개발은 SQLite, 배포는 Postgres 등
- [ ] 최소 테이블 예: `User`, `Story`(id, userId, title, dslText, updatedAt)
- [ ] (선택) `StoryRevision` — 수정 이력·되돌리기

### 5-3. 인증 · 권한

- [ ] 회원 가입/로그인(이메일+비밀번호 또는 OAuth)
- [ ] 세션 쿠키 또는 JWT — `saveStory` / `story` 조회 시 **본인 데이터만** 허용
- [ ] 프론트: 로그인 상태에 따른 라우트/헤더

### 5-4. GraphQL 스키마 · 리졸버 (MVP)

- [ ] `Query`: `me`, `myStories` / `story(id)`
- [ ] `Mutation`: `createStory`, `updateStory` (DSL 문자열 저장)
- [ ] 나중에 플레이 세이브 동기화가 필요하면 `PlayerSave` 타입·mutation 추가 검토

### 5-5. 프론트 — Relay 도입

- [ ] `relay-compiler`, `babel-plugin-relay`(또는 Vite용 Relay 플러그인) 설정
- [ ] `RelayEnvironmentProvider` + `fetch` 기반 네트워크 레이어
- [ ] 첫 화면: `myStories` 목록 + `story` 상세(또는 에디터에 DSL 주입)까지 한 사이클
- [ ] (선택) Relay 스토어를 localStorage에 직렬화 — **오프라인/새로고침 캐시용**이지 서버 저장 대체가 아님

### 5-6. 배포·운영 (나중에)

- [ ] API·DB 호스팅, `VITE_GRAPHQL_URL` 등 환경 변수
- [ ] HTTPS, 쿠키 `SameSite`/`Secure` 정책 점검

---

## Phase 6 — 프레임워크 설계 · 확장 API

**목표:** 엔진을 **재사용 가능한 코어**로 두고, 개발자(게임 제작자)가 `customActions` 등을 **공식 확장 지점**으로 등록해 쓰는 구조. 지금 레포의 `createCustomActions(ctx)` 병합 방향을 유지하되, **공개 API·패키지 경계·문서**를 고정한다.

### 6-1. 공개 API 고정

- [ ] 진입 형태 결정: 예) `createTextRpg({ story, customActions, … })` / `useStoryEngine` 옵션에 `createCustomActions` 주입
- [ ] 안정적으로 export할 타입 목록: `Story`, `ActionContext`, `ParseResult`, 훅 시그니처 등
- [ ] **충돌 정책** 문서화: 내장 액션(`jump`, `set` …) vs 커스텀 동일 이름 시 우선순위(현재: 내장 우선)

### 6-2. 확장 지점 (액션 외 여지)

- [ ] **커스텀 액션:** `(ctx: ActionContext) => Record<string, Function>` 단일 팩토리 유지 또는 `plugins[]` / 네임스페이스 옵션
- [ ] (선택) `defineActions({ … })` 류 헬퍼로 타입 추론·자동완성 개선
- [ ] (후순위) 테마 / HUD 슬롯 / 라우트 훅 등 “호스트가 바꿀 수 있는 지점” 목록만 잡아 두기

### 6-3. 패키지·경계 (모노레포 또는 npm)

- [ ] **`@…/core`** (또는 `packages/core`): `parseDSL`, `runScript`, `useStoryEngine`, 타입 — **UI·스토리 로드 없음**
- [ ] **`@…/react`** (선택): 현재 `App` 수준 뷰 컴포넌트
- [ ] **호스트 앱:** `.iyagi` 로드(`glob`/`fetch`), `currentStory` 조립, **프로젝트 전용 `customActions.ts`**
- [ ] 버전 정책(semver)과 브레이킹 변경 시 마이그레이션 노트

### 6-4. 문서 · 온보딩

- [ ] README/가이드: “5분 튜토리얼” — 스토리 파일 + 액션 등록 + 화면 연결
- [ ] (선택) **최소 예제 레포** 템플릿 `create-text-rpg` 등

### 6-5. 보안·실행 모델 (프레임워크 약관)

- [ ] `new Function` 기반 스크립트 실행을 공식 전제로 할지, 샌드박스/대체 인터프리터 로드맵을 문서에 명시 (→ Phase 3-1과 연결)

---

## 우선순위 요약

```
Phase 1-4 (vars 선언 + 헬퍼 자동생성)
       ↓
Phase 1-1 (선택지 조건) ✅  →  Phase 1-2 (세이브)  →  Phase 1-3 (HUD, varDefs 활용)
       ↓
Phase 3-2 (화면 분리)   →  Phase 2-3 (시나리오 목록 UI, 타이틀과 연동)
       ↓
Phase 2-1 (파서 에러)   →  Phase 3-3 (테스트)
       ↓
Phase 2-4 (Langium)     — 2-1·3-3과 겹침 많음 → vars/show 문법 안정 후 본격화 권장
       ↓
Phase 2-2, 3-1 (순서 무관)
       ↓
Phase 4 (여유 있을 때)
       ↓
Phase 5 (백엔드 · Fastify · GraphQL Yoga · Relay, 단일 플레이 루프 안정 후)
       ↓
Phase 6 (프레임워크 API · 패키지 분리 · 문서) — 코어 기능·API 안정된 뒤 병행·추진 가능
```
