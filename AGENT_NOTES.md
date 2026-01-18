# Agent Notes (text-rpg)

이 파일은 에이전트가 추후 작업 시 우선 참고할 요약/규칙 모음입니다.

## 핵심 구조
- 기술 스택: React + TypeScript + Vite + Vanilla Extract(CSS-in-TS)
- 스토리 데이터: `src/scenarios/*.ts` (gitignore 대상 폴더 `scenarios`)
- 현재 스토리 로더: `src/story/current.ts`
  - `../scenarios/*.ts`를 eager 로드해 첫 번째 유효 `Story` export 선택
  - 없으면 `src/example/*.ts`에서 유효 `Story` 탐색
  - 최종 폴백: 최소 데모 스토리(runtime crash 방지)

## 스타일 가이드(북 느낌)
- 폰트: `Chosunilbo_myungjo` (CDN) / 밝은 테마 고정
- 카드/버튼: border, radius(최소), shadow 제거; 버튼 배경은 hover/active에만 표시
- 선택지 레이아웃: column
- 본문 카드 고정 높이: `height: 65vh`, 내부 스크롤(`overflowY: auto`)
- `content` 그리드 간격: 0 (카드 바로 아래 선택지)
- App 카드 폰트 사이즈 소폭 축소

## 디버그
- 개발 모드(`import.meta.env.DEV`)일 때만 우측 하단 반투명 오버레이에 현재 변수 표시
- 오버레이는 `pointer-events: none`으로 상호작용에 영향 없음

## 스토리 엔진 (`src/story/engine.ts`)
- 상태:
  - `currentId: string` (현재 패시지 id)
  - `vars: Record<string, unknown>` (스토리 변수)
- 이동:
  - `enter` 효과: 패시지 진입 때 적용
  - 선택지 `do` 효과: 클릭 시 적용 후 `goto`로 이동
- 조건:
  - `if`: 모든 조건 AND
  - `ifAny`: 조건 그룹 중 하나라도 만족(OR), `if`와 동시 존재 시 둘 다 만족해야 표시
- 스냅샷/복구:
  - `getSnapshot()` → `{ id, vars }`
  - `setSnapshot(snap, { skipEnter })` → `skipEnter`로 복원 시 `enter` 1회 스킵

## 뒤로가기(이전 패시지/변수 복구)
- URL 노출 원치 않아 라우터 경로는 감추고, History API로만 처리
- App(`src/App.tsx`)에서:
  - 최초 렌더 때 `history.replaceState(snapshot)`
  - 패시지/변수 변경 시 `history.pushState(snapshot)`
  - `popstate`에서 스냅샷 복구(`setSnapshot(..., { skipEnter: true })`)
- 결과: 브라우저 뒤로가기 시 이전 패시지와 변수 상태가 그대로 복원됨(주소창에 pid 노출 없음)

## 트윈 변환기 (`scripts/convert-twine.js`)
- 입력: Twine HTML (`twine_examples/*.html` 등)
- 출력: `src/scenarios/<slug>.ts` (현재 로더가 자동 선택)
- 처리:
  - 링크 파싱: `[[Display|Target]]`, `[[Display->Target]]`, `[[Target]]`, `[[[Triple]]]]`
  - 매크로:
    - `(set:)` → `enter`(패시지) 또는 `do`(선택지) 효과로 변환
      - `set/inc/dec` 지원, `$` 생략 허용 (`$?var`)
    - `(if:)` → `if` 또는 `ifAny`(AND/OR 그룹)로 변환, 괄호/중첩 OR 처리
    - `(click:)` 블록: `[Label]<hook| ... (click:?hook)[ (set:...) [[표시->목표]] ]` 패턴 탐지
      - 라벨을 선택지로 만들고 블록 내 `(set:)`를 `do`로, 링크/`(go-to:)`를 `goto`로 매핑
    - 남는 매크로/링크 마크업은 본문 텍스트에서 제거(선택지와 중복 방지)
  - "외따로 떨어진(if:)": 링크 없는 경우 마지막/의도된 선택지에 조건 부여(휴리스틱)
  - 한글 slug 충돌 방지: `pid` 폴백 + suffix 부여
  - 선택지 비어있을 때: 다음 숫자 pid로 "다음으로" 자동 생성(최소 진행 보장)
  - 플레이스홀더 정규화:
    - `${var}` → `$var`로 통일
    - 오타 교정: `$siton_heart` → `$sion_heart`

## 텍스트/마크다운
- 줄바꿈 유지
- 간단 마크다운: `### 헤딩` 지원
- `$변수` 플레이스홀더는 렌더 시 현재 값으로 치환(App에서 인터폴레이션)

## 선택지 직접 수정(예: 패시지 46)
- `(click:)` 시나리오를 반영해야 할 경우, 변환 스크립트 보강이 최선이나
  빠른 대응을 위해 `choices`에 직접 `do/goto`를 작성하고,
  필요한 경우 임시 패시지(예: `"46b"`)를 추가하여 흐름을 구성

## 시나리오 파일/로더 규칙
- 시나리오 파일은 `scenarios` 폴더에 위치, gitignore 대상
- 로더는 export 이름에 의존하지 않음:
  - `story`가 있으면 우선, 없으면 모든 export 중 `Story` 형태를 선택
- 변환기는 더 이상 `src/story/current.ts`를 덮어쓰지 않음(안전)

## 설치/의존성 메모
- `react-router-dom`은 현재 URL 노출 없이 History API만 써서 필수는 아님
  - package.json에는 포함되어 있으나, App은 직접 History API 사용 중

## 앞으로의 주의/개선 포인트
- (click:) 내부에 복수 링크/분기 존재 시, 변환기의 선택지 합치기/분기 정확도 개선
- 더 풍부한 마크다운/서식 지원 고려(필요 시)
- 조건 파서/휴리스틱 테스트 케이스 확충


