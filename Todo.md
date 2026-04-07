# Text RPG — Action Plan

## 현재 상태 요약

| 레이어                                      | 완성도       | 비고                                                               |
| ------------------------------------------- | ------------ | ------------------------------------------------------------------ |
| DSL 파서 (`parseScene.ts`)                  | ✅ 기본 동작 | Langium 기반(`parseIyagi` → `astToStory`)으로 동작                 |
| 스토리 로드 (`current.ts`)                  | ✅ `.iyagi`만 | `scenarios/`에서 첫 파일을 사용                                    |
| 스토리 엔진 (`src/hooks/useStoryEngine.ts`) | ✅ 기본 동작 | stepQueue 아키텍처, advance / choose / save / load                 |
| Actions (`actions/index.ts`)                | ✅ 기본 동작 | jump, set, inc, dec + varDefs 자동 헬퍼(addHp 등)                  |
| UI (`App.tsx`)                              | 🔶 최소 구현 | 타이틀/플레이/엔딩 화면 분리, 씬 그래프 없음                        |
| 세이브/로드                                 | ✅ 구현됨    | localStorage 스냅샷 기반                                           |
| 선택지 조건부 표시                          | ✅ 구현됨    | `if (expr)`, `Choice.enabledWhen`, `evalWhen`                      |
| choice 블록 내 텍스트                       | ✅ 구현됨    | `Choice.steps: Step[]` — 텍스트·스크립트 혼합 가능                 |
| 스탯 표시                                   | ❌ 미구현    | 디버그 오버레이만 있음                                              |
| 백엔드 / 클라우드                           | ❌ 미구현    | 계획: Fastify + GraphQL Yoga (+ Relay 프론트)                       |

---

## 최근 완료

- [x] **stepQueue 아키텍처 리팩토링**
  - `stepIndex: number` → `stepQueue: Step[]` + `pastTexts: string[]`
  - `choices`를 `Step` 유니온에 통합 (`{ type: "choices"; choices: Choice[] }`)
  - `Choice.script: string` → `Choice.steps: Step[]` — 텍스트·스크립트 혼합 가능
  - `Scene.choices`, `Scene.choicesAt`, `resolveStep()` 제거
  - 익명 씬(`__anon_N`) 생성 로직 완전 제거
  - CHOOSE 전이: `stepQueue = [...choice.steps, ...stepQueue.slice(1)]`
- [x] **전투 시스템** (`rollAttack`, `_shakeTick` 화면 흔들림)
- [x] **세이브/로드** (localStorage 스냅샷)
- [x] **엔딩 메인화면 복귀 버튼**
- [x] **스토리 로그 패널**
- [x] **변수 자동 헬퍼** (`addHp`, `subHp`, `toggleAlive` 등, `varDefs` 기반)
- [x] **선택지 조건식** (`if (expr)`, `evalWhen`)
- [x] **Grammar delimiter 기반 개선** (`IND*` 터미널 제거 → `choices: { }` 명시적 구분자)
- [x] **VSCode 확장 / Format on Save**

---

## 진행 예정

### DSL / 파서

- [ ] `demo.iyagi` 전투 씬을 choice 블록 내 텍스트 방식으로 리팩토링
  - 현재: `choices:` 뒤 post-step 패턴
  - 목표: `"전투하기" -> { rollAttack(...) "결과 텍스트" jump("battle") }`
- [ ] 커스텀 Langium `ValidationRegistry` — 알 수 없는 씬 참조, 빈 `choices:` 경고
- [ ] 파서 에러 메시지에 줄 번호 포함 (`ParseResult.errors: { line, message }[]`)
- [ ] 개발 모드에서 파싱 에러를 화면에 표시

### 엔진

- [ ] `choose()` 진입 시 `enabledWhen` 재검사 (악의적 호출 방어)
- [ ] `$variable` 보간을 선택지 텍스트에도 적용 (현재는 text step만)
- [ ] 조건부 텍스트 스텝: `show (expr): "text"` DSL + `{ type: "conditional-text" }` Step 타입

### UI / 화면

- [ ] **HUD 컴포넌트** — hp, gold 등 상단 상시 표시 (`varDefs` 기반)
- [ ] **시나리오 목록 UI** — `scenarios/` 내 여러 `.iyagi` 선택 화면
- [ ] **씬 그래프 팝업** (dev 전용) — `jump()` 정적 분석으로 방향 그래프, React Flow 등 활용
- [ ] 씬 전환 애니메이션 (fade in/out)
- [ ] 타자 효과 (텍스트 한 글자씩 출력)
- [ ] 선택지 비활성화 시 시각적 표시 개선 (현재 opacity만)

### 인프라

- [ ] E2E 테스트 (Playwright) — 엔딩 경로 자동 검증
- [ ] CI 연동 (GitHub Actions — `yarn test` + `yarn check`)
- [ ] 스토리 작성 가이드 문서 (`docs/`)

---

## Phase 5 — 백엔드 · 클라우드 동기화 (Fastify · GraphQL Yoga · Relay)

**목표:** 스토리와 플레이 세이브를 서버에 저장하고, 로그인 후 다른 기기에서 이어서 편집·불러오기.

- [ ] Fastify + GraphQL Yoga API 서버 스캐폴딩
- [ ] DB 설계 — `User`, `Story(dslText)`, `PlayerSave` 테이블
- [ ] 인증 (JWT 또는 세션쿠키)
- [ ] GraphQL 스키마 MVP: `myStories`, `createStory`, `updateStory`
- [ ] 프론트에 Relay 도입 + `RelayEnvironmentProvider`

---

## Phase 6 — 프레임워크 설계 · 확장 API

**목표:** 엔진 코어를 패키지로 분리하고 공식 확장 지점(`customActions` 등) API를 고정.

- [ ] `@…/core` 패키지 분리 — `parseDSL`, `runScript`, `useStoryEngine`, 타입
- [ ] `createTextRpg({ story, customActions })` 공개 API 고정
- [ ] 내장 액션 vs 커스텀 충돌 정책 문서화
- [ ] "5분 튜토리얼" README / 최소 예제 레포
- [ ] `new Function` 보안 약관 명시 또는 샌드박스 인터프리터 로드맵
