# Text RPG — Action Plan

## 현재 상태 요약

| 레이어 | 완성도 | 비고 |
|---|---|---|
| DSL 파서 (`parseScene.ts`) | ✅ 기본 동작 | 에러 메시지에 줄 번호 없음 |
| 스토리 엔진 (`engine.ts`) | ✅ 기본 동작 | getSnapshot/setSnapshot 구현됨 |
| Actions (`actions/index.ts`) | ✅ 기본 동작 | jump, set, inc, dec 등 |
| UI (`App.tsx`) | 🔶 최소 구현 | 단일 화면, 타이틀/엔딩 분리 없음 |
| 세이브/로드 | ❌ 미구현 | 엔진 API는 있으나 UI/저장 없음 |
| 선택지 조건부 표시 | ❌ 미구현 | gold >= 1 같은 조건 처리 안 됨 |
| 스탯 표시 | ❌ 미구현 | 디버그 오버레이만 있음 |

---

## Phase 1 — 게임플레이 완성 (필수)

### 1-1. 선택지 조건부 활성화
선택지에 `[condition]` 구문 추가. 조건 불충족 시 비활성(회색) 표시.

**DSL 예시:**
```
choices:
  "빵을 산다 [gold >= 1]" -> { dec("gold", 1); inc("hp", 2); jump("start") }
  "그냥 둘러본다"          -> { jump("start") }
```

**작업:**
- [ ] `parseScene.ts` — Choice 타입에 `condition?: string` 필드 추가
- [ ] `types.ts` — `Choice` 타입 업데이트
- [ ] `engine.ts` — `choose()` 시 condition 평가, 불충족 시 차단
- [ ] `App.tsx` — 조건 불충족 선택지를 `aria-disabled` + 회색으로 렌더링

### 1-2. 세이브/로드 (localStorage)
`getSnapshot` / `setSnapshot`은 이미 구현됨. UI와 저장소 연결만 필요.

**작업:**
- [ ] `useStoryEngine` 내부에 자동저장 (`useEffect` + `localStorage`) 추가
- [ ] 앱 시작 시 저장된 스냅샷이 있으면 복원 여부 물어보기
- [ ] 타이틀 화면에 "이어하기 / 새 게임" 버튼 추가

### 1-3. 인게임 스탯 표시 (HUD)
디버그 오버레이 → 실제 UI로 승격.

**작업:**
- [ ] HUD 컴포넌트 구현 (hp, gold 등 상단 표시, `VarDef` 목록 기반 — 1-4와 연동)
- [ ] `$variable` 보간을 선택지 텍스트에도 적용 (현재 text step만 지원)

### 1-4. 변수 선언 DSL + 헬퍼 함수 자동 생성
현재 변수 초기값은 `parseDSL(dsl, { init: {...} })`로 DSL 외부에서 주입하고,
`setHeart` / `addHeart` 같은 편의 함수는 `actions/index.ts`에 하드코딩되어 있음.
이를 DSL 안에서 선언하고 헬퍼 함수를 자동 생성하는 구조로 변경.

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
- [ ] `types.ts` — `VarDef` 타입 추가, `StoryV2`에 `varDefs?: VarDef[]` 필드 추가
  ```ts
  export type VarDef = {
    name: string;
    init: number | string | boolean;
  };
  ```
- [ ] `parseScene.ts` — DSL 최상단 `vars:` 블록 파싱
  - `name = value` 형태의 줄을 `VarDef[]`로 변환
  - 숫자/문자열/불리언 타입을 초기값으로 추론
  - 파싱된 `varDefs`로 `init` 자동 populate (외부 `init` 옵션은 override용으로 유지)
- [ ] `actions/index.ts` — `createActions(ctx, varDefs?)` 시그니처 변경
  - `varDefs` 순회하며 타입별 헬퍼 함수 동적 생성
  - 하드코딩된 `setHeart`, `addHeart`, `setGold`, `addGold` 제거
- [ ] `engine.ts` — `runScript` / `createActions` 호출 시 `story.varDefs` 전달
- [ ] `demo.story.ts` — `vars:` 블록 방식으로 마이그레이션, `parseDSL` opts에서 `init` 제거

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
현재 `current.ts`는 첫 번째 시나리오만 자동 로드. 여러 시나리오 선택 불가.

**작업:**
- [ ] 타이틀 화면에서 `scenarios/` 내 모든 스토리 목록 표시
- [ ] 스토리 선택 → 플레이 진입

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
`parseDSL`은 핵심 로직이나 테스트가 없음.

**작업:**
- [ ] Vitest 설치 및 설정
- [ ] `parseScene.test.ts` 작성 (happy path + 에러 케이스)

---

## Phase 4 — 장기 개선 (선택)

- [ ] 씬 전환 애니메이션 (fade in/out)
- [ ] 배경 이미지 / 일러스트 지원 (`Scene`에 `image?: string` 필드)
- [ ] 타자 효과 (텍스트가 한 글자씩 출력되는 연출)
- [ ] BGM/효과음 지원 (`play("bgm_forest")` 액션)
- [ ] Twine → DSL 변환 스크립트 완성 (`scripts/convert-twine.js`)
- [ ] 스토리 DSL용 VS Code 문법 하이라이팅 확장

---

## 우선순위 요약

```
Phase 1-4 (vars 선언 + 헬퍼 자동생성)
       ↓
Phase 1-1 (선택지 조건)  →  Phase 1-2 (세이브)  →  Phase 1-3 (HUD, varDefs 활용)
       ↓
Phase 3-2 (화면 분리)   →  Phase 2-3 (시나리오 목록 UI, 타이틀과 연동)
       ↓
Phase 2-1 (파서 에러)   →  Phase 3-3 (테스트)
       ↓
Phase 2-2, 3-1 (순서 무관)
       ↓
Phase 4 (여유 있을 때)
```
