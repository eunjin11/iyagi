import type { Choice, Scene, Step, StoryV2, VariableBag } from '../story/types';

// ---------------------------------------------------------------------------
// 공개 API
// ---------------------------------------------------------------------------

export type ParseResult = {
  story: StoryV2;
  errors: string[];
};

/**
 * DSL 텍스트 전체를 파싱해 StoryV2를 반환한다.
 *
 * 형식:
 * ```
 * sceneName {
 *   "대사"
 *   if (heart > 0) jump("sceneB")
 *   choices:
 *     "선택지 1" -> { jump("sceneA") }
 *     "선택지 2" -> { setHeart(heart - 1); jump("sceneB") }
 * }
 * ```
 */
export function parseDSL(
  src: string,
  opts?: { title?: string; start?: string; init?: VariableBag }
): ParseResult {
  const errors: string[] = [];
  const scenes: Record<string, Scene> = {};

  const sceneBlocks = splitSceneBlocks(src, errors);

  for (const { name, body } of sceneBlocks) {
    const scene = parseSceneBody(name, body, errors);
    scenes[name] = scene;
  }

  const firstId = sceneBlocks[0]?.name ?? 'start';

  const story: StoryV2 = {
    title: opts?.title ?? 'Story',
    start: opts?.start ?? firstId,
    scenes,
    init: opts?.init,
  };

  return { story, errors };
}

// ---------------------------------------------------------------------------
// 내부 파싱 로직
// ---------------------------------------------------------------------------

type SceneBlock = { name: string; body: string };

/**
 * 최상위 `sceneName { ... }` 블록들을 추출한다.
 * 중괄호 depth를 추적해 중첩 블록을 올바르게 처리.
 */
function splitSceneBlocks(src: string, errors: string[]): SceneBlock[] {
  const blocks: SceneBlock[] = [];
  // scene 이름: 영숫자 + _ (공백 없음)
  const headerRe = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*\{/gm;
  let match: RegExpExecArray | null;

  while ((match = headerRe.exec(src)) !== null) {
    const name = match[1];
    const openBrace = match.index + match[0].length - 1; // '{' 위치
    let depth = 1;
    let i = openBrace + 1;

    while (i < src.length && depth > 0) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') depth--;
      i++;
    }

    if (depth !== 0) {
      errors.push(`Scene "${name}": 닫히지 않은 중괄호`);
      continue;
    }

    const body = src.slice(openBrace + 1, i - 1);
    blocks.push({ name, body });
  }

  return blocks;
}

function parseSceneBody(id: string, body: string, errors: string[]): Scene {
  const steps: Step[] = [];
  const choices: Choice[] = [];

  const lines = body.split('\n');
  let inChoices = false;
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    // 빈 줄 / 주석
    if (line === '' || line.startsWith('//')) {
      i++;
      continue;
    }

    // choices: 블록 시작
    if (line === 'choices:') {
      inChoices = true;
      i++;
      continue;
    }

    if (inChoices) {
      // "텍스트" -> { script }  (한 줄)
      const singleLine = matchChoiceSingleLine(line);
      if (singleLine) {
        choices.push(singleLine);
        i++;
        continue;
      }

      // "텍스트" -> {   (멀티라인 시작)
      const multiStart = /^"([^"]+)"\s*->\s*\{/.exec(line);
      if (multiStart) {
        const text = multiStart[1];
        // 같은 줄에서 닫히는지 확인
        const afterBrace = line.slice(multiStart[0].length);
        const closingIdx = afterBrace.indexOf('}');
        if (closingIdx !== -1) {
          // 한 줄에서 열고 닫힘 — 이미 singleLine에서 처리됐어야 하지만 안전망
          choices.push({ text, script: afterBrace.slice(0, closingIdx).trim() });
          i++;
          continue;
        }

        // 여러 줄에 걸친 choice body 수집
        const scriptLines: string[] = [afterBrace];
        i++;
        while (i < lines.length) {
          const inner = lines[i].trim();
          if (inner === '}') { i++; break; }
          scriptLines.push(inner);
          i++;
        }
        choices.push({ text, script: scriptLines.join('\n').trim() });
        continue;
      }

      // choices: 구역 안에 있지만 choice 패턴이 아니면 choices 구역 종료
      inChoices = false;
      continue;
    }

    // text step: "..."
    const textMatch = /^"((?:[^"\\]|\\.)*)"$/.exec(line);
    if (textMatch) {
      steps.push({ type: 'text', content: unescapeString(textMatch[1]) });
      i++;
      continue;
    }

    // script step: 나머지 모든 것
    steps.push({ type: 'script', code: line });
    i++;
  }

  if (inChoices && choices.length === 0) {
    errors.push(`Scene "${id}": choices: 선언은 있으나 선택지가 없음`);
  }

  return { id, steps, choices };
}

/** `"텍스트" -> { script }` 한 줄 패턴 매칭 */
function matchChoiceSingleLine(line: string): Choice | null {
  const re = /^"([^"]+)"\s*->\s*\{([^}]*)\}$/;
  const m = re.exec(line);
  if (!m) return null;
  return { text: m[1], script: m[2].trim() };
}

function unescapeString(s: string): string {
  return s.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}
