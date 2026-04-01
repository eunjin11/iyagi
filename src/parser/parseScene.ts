import type { Choice, Scene, Step, Story, VariableBag } from "../story/types";
import { assertWhenExprParses } from "../story/evalWhen";

// ---------------------------------------------------------------------------
// 공개 API
// ---------------------------------------------------------------------------

export type ParseResult = {
  story: Story;
  errors: string[];
};

/**
 * DSL 텍스트 전체를 파싱해 Story를 반환한다.
 *
 * 형식:
 * ```
 * vars:
 *   hp = 10
 *   gold = 0
 *
 * sceneName {
 *   "대사"
 *   if (heart > 0) jump("sceneB")
 *   choices:
 *     if (gold >= 1) "빵" -> { dec("gold", 1) }
 *     "선택지" -> { jump("sceneA") }
 *     "선택지 2" ->
 *       {
 *         jump("sceneB")
 *         set("hp", 5)
 *       }
 * }
 * ```
 *
 * `init`은 (DSL `vars:`로 만든 맵) 위에 `opts.init`을 얹어 병합한다 — 외부 옵션이 우선.
 */
export function parseDSL(
  src: string,
  opts?: { title?: string; start?: string; init?: VariableBag },
): ParseResult {
  const errors: string[] = [];
  const scenes: Record<string, Scene> = {};

  const { rest, init: initFromVars } = extractVarsBlock(src, errors);
  const sceneBlocks = splitSceneBlocks(rest, errors);

  for (const { name, body } of sceneBlocks) {
    const scene = parseSceneBody(name, body, errors);
    scenes[name] = scene;
  }

  const firstId = sceneBlocks[0]?.name ?? "start";

  const story: Story = {
    title: opts?.title ?? "Story",
    start: opts?.start ?? firstId,
    scenes,
    init: { ...initFromVars, ...opts?.init },
  };

  return { story, errors };
}

// ---------------------------------------------------------------------------
// 내부 파싱 로직
// ---------------------------------------------------------------------------

/**
 * 파일 맨 앞(주석·빈 줄 뒤)의 `vars:` 블록을 파싱하고, 나머지 문자열을 돌려준다.
 * 첫 `sceneName {` 줄 직전까지가 vars 영역으로 간주된다.
 */
function extractVarsBlock(
  src: string,
  errors: string[],
): { rest: string; init: VariableBag } {
  const init: VariableBag = {};
  const lines = src.split("\n");
  let i = 0;
  while (
    i < lines.length &&
    (lines[i].trim() === "" || lines[i].trim().startsWith("//"))
  ) {
    i++;
  }
  if (i >= lines.length || lines[i].trim() !== "vars:") {
    return { rest: src, init: {} };
  }

  i++;
  const assignRe = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/;
  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();
    if (line === "" || line.startsWith("//")) {
      i++;
      continue;
    }
    if (/^[a-zA-Z_][a-zA-Z0-9_]*\s*\{/.test(line)) break;

    const m = assignRe.exec(line);
    if (!m) {
      errors.push(`vars: 줄을 해석할 수 없음: ${line}`);
      i++;
      continue;
    }
    const name = m[1];
    const rawVal = m[2].trim();
    const parsed = parseVarInitValue(rawVal, errors);
    if (parsed !== undefined) init[name] = parsed;
    i++;
  }

  const rest = lines.slice(i).join("\n");
  return { rest, init };
}

function parseVarInitValue(
  raw: string,
  errors: string[],
): number | string | boolean | undefined {
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (/^-?\d+$/.test(raw)) return Number(raw);
  if (/^-?\d+\.\d+$/.test(raw) || /^-?\d*\.\d+$/.test(raw)) return Number(raw);
  const strMatch = /^"((?:[^"\\]|\\.)*)"$/.exec(raw);
  if (strMatch) return unescapeString(strMatch[1]);
  errors.push(`vars: 초기값 형식을 알 수 없음: ${raw}`);
  return undefined;
}

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
      if (src[i] === "{") depth++;
      else if (src[i] === "}") depth--;
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

  const lines = body.split("\n");
  let inChoices = false;
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    // 빈 줄 / 주석
    if (line === "" || line.startsWith("//")) {
      i++;
      continue;
    }

    // choices: 블록 시작
    if (line === "choices:") {
      inChoices = true;
      i++;
      continue;
    }

    if (inChoices) {
      const ifLineChoice = matchIfChoiceLine(line, id, errors);
      if (ifLineChoice) {
        choices.push(ifLineChoice);
        i++;
        continue;
      }

      // "텍스트" -> { script }  (한 줄)
      const singleLine = matchChoiceSingleLine(line, id, errors);
      if (singleLine) {
        choices.push(singleLine);
        i++;
        continue;
      }

      // "텍스트" ->   다음 줄에 `{` … `}` (줄바꿈 스타일)
      const arrowOnly = /^"([^"]+)"\s*->\s*$/.exec(line);
      if (arrowOnly) {
        const text = arrowOnly[1];
        let j = i + 1;
        while (
          j < lines.length &&
          (lines[j].trim() === "" || lines[j].trim().startsWith("//"))
        ) {
          j++;
        }
        if (j >= lines.length) {
          errors.push(`Scene "${id}": 선택지 "${text}" -> 뒤에 { 가 없음`);
          i++;
          continue;
        }
        const openTrim = lines[j].trim();
        let k: number;
        let script: string;

        if (openTrim === "{") {
          const scriptLines: string[] = [];
          k = j + 1;
          while (k < lines.length) {
            const inner = lines[k].trim();
            if (inner === "}") {
              k++;
              break;
            }
            scriptLines.push(inner);
            k++;
          }
          script = scriptLines.join("\n").trim();
        } else if (openTrim.startsWith("{")) {
          const rest = openTrim.slice(1);
          const closeOnSame = rest.indexOf("}");
          if (closeOnSame !== -1) {
            script = rest.slice(0, closeOnSame).trim();
            k = j + 1;
          } else {
            const scriptLines: string[] = [];
            const first = rest.trim();
            if (first) scriptLines.push(first);
            k = j + 1;
            while (k < lines.length) {
              const inner = lines[k].trim();
              if (inner === "}") {
                k++;
                break;
              }
              scriptLines.push(inner);
              k++;
            }
            script = scriptLines.join("\n").trim();
          }
        } else {
          errors.push(
            `Scene "${id}": 선택지 "${text}" -> 다음 줄은 '{' 로 시작해야 함 (${openTrim.slice(0, 40)})`,
          );
          i++;
          continue;
        }

        choices.push(choiceFromParts(text, script, undefined, id, errors));
        i = k;
        continue;
      }

      // "텍스트" -> {   (멀티라인 시작, 같은 줄에 {)
      const multiStart = /^"([^"]+)"\s*->\s*\{/.exec(line);
      if (multiStart) {
        const text = multiStart[1];
        // 같은 줄에서 닫히는지 확인
        const afterBrace = line.slice(multiStart[0].length);
        const closingIdx = afterBrace.indexOf("}");
        if (closingIdx !== -1) {
          // 한 줄에서 열고 닫힘 — 이미 singleLine에서 처리됐어야 하지만 안전망
          choices.push(
            choiceFromParts(
              text,
              afterBrace.slice(0, closingIdx).trim(),
              undefined,
              id,
              errors,
            ),
          );
          i++;
          continue;
        }

        // 여러 줄에 걸친 choice body 수집
        const scriptLines: string[] = [afterBrace];
        i++;
        while (i < lines.length) {
          const inner = lines[i].trim();
          if (inner === "}") {
            i++;
            break;
          }
          scriptLines.push(inner);
          i++;
        }
        choices.push(
          choiceFromParts(text, scriptLines.join("\n").trim(), undefined, id, errors),
        );
        continue;
      }

      // choices: 구역 안에 있지만 choice 패턴이 아니면 choices 구역 종료
      inChoices = false;
      continue;
    }

    // text step: "..."
    const textMatch = /^"((?:[^"\\]|\\.)*)"$/.exec(line);
    if (textMatch) {
      steps.push({ type: "text", content: unescapeString(textMatch[1]) });
      i++;
      continue;
    }

    // script step: 나머지 모든 것
    steps.push({ type: "script", code: line });
    i++;
  }

  if (inChoices && choices.length === 0) {
    errors.push(`Scene "${id}": choices: 선언은 있으나 선택지가 없음`);
  }

  return { id, steps, choices };
}

function choiceFromParts(
  text: string,
  script: string,
  enabledWhenRaw: string | undefined,
  sceneId: string,
  errors: string[],
): Choice {
  const w = enabledWhenRaw?.trim();
  if (!w) return { text, script };
  try {
    assertWhenExprParses(w);
    return { text, script, enabledWhen: w };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    errors.push(`Scene "${sceneId}": 선택 조건 파싱 실패 — ${msg}: ${w}`);
    return { text, script, enabledWhen: "false" };
  }
}

/** `if (조건) "레이블" -> { script }` 한 줄 (스크립트 본문은 같은 줄에서 닫힘). */
function matchIfChoiceLine(
  line: string,
  sceneId: string,
  errors: string[],
): Choice | null {
  const trimmed = line.trim();
  const ifHead = /^if\s*\(/i.exec(trimmed);
  if (!ifHead) return null;

  let pos = ifHead[0].length;
  let depth = 1;
  const condStart = pos;
  while (pos < trimmed.length && depth > 0) {
    const c = trimmed[pos];
    if (c === "(") depth++;
    else if (c === ")") depth--;
    pos++;
  }
  if (depth !== 0) {
    errors.push(`Scene "${sceneId}": if(…) 조건 괄호가 닫히지 않음`);
    return null;
  }

  const condition = trimmed.slice(condStart, pos - 1).trim();
  const rest = trimmed.slice(pos).trim();
  const tail = /^"([^"]+)"\s*->\s*\{([^}]*)\}\s*$/.exec(rest);
  if (!tail) {
    errors.push(
      `Scene "${sceneId}": if (…) 뒤에는 "텍스트" -> { 한 줄 스크립트 } 형식이 필요 (${rest.slice(0, 48)})`,
    );
    return null;
  }
  return choiceFromParts(tail[1], tail[2].trim(), condition, sceneId, errors);
}

/** `"텍스트" -> { script }` 한 줄 패턴 매칭 */
function matchChoiceSingleLine(
  line: string,
  sceneId: string,
  errors: string[],
): Choice | null {
  const re = /^"([^"]+)"\s*->\s*\{([^}]*)\}$/;
  const m = re.exec(line);
  if (!m) return null;
  return choiceFromParts(m[1], m[2].trim(), undefined, sceneId, errors);
}

function unescapeString(s: string): string {
  return s.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
}
