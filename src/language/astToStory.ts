import { assertWhenExprParses } from "../story/evalWhen";
import type {
  Choice,
  Scene,
  Step,
  Story,
  VarDef,
  VariableBag,
} from "../story/types";
import type {
  ChoiceAction,
  ChoiceLine,
  Document as IyagiDocumentAst,
  Scene as IyagiSceneAst,
} from "./__generated__/ast.js";
import {
  isActionTextLine,
  isBlockAction,
  isChoiceBlock,
  isIfChoice,
  isInlineAction,
  isInlineScene,
  isMultiLineScene,
  isPlainChoice,
  isScriptLine,
  isTextLine,
  isVarsBlock,
} from "./__generated__/ast.js";

export type AstToStoryResult = {
  story: Story;
  errors: string[];
};

function unquoteStringLiteral(raw: string): string {
  // raw is `"..."` with possible escapes
  if (raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"')) {
    const inner = raw.slice(1, -1);
    return inner.replace(/\\(.)/g, "$1");
  }
  return raw;
}

function cstLineTextAuto(
  node: { $cstNode?: { text: string } } | undefined,
): string {
  const text = node?.$cstNode?.text ?? "";
  const withoutNl = text.replace(/\r?\n$/, "");
  const m = /^ +/.exec(withoutNl);
  const indent = m ? m[0].length : 0;
  return withoutNl.slice(indent).trimEnd();
}

function cstBetween(
  node: { $cstNode?: { text: string } } | undefined,
  open: string,
  close: string,
): string {
  const text = node?.$cstNode?.text ?? "";
  const start = text.indexOf(open);
  const end = text.lastIndexOf(close);
  if (start === -1 || end === -1 || end <= start) return "";
  return text.slice(start + open.length, end).trim();
}

function parseVarValue(raw: string): number | string | boolean | undefined {
  if (typeof raw !== "string") return undefined;
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (/^-?\d+$/.test(raw)) return Number(raw);
  if (/^-?\d+\.\d+$/.test(raw) || /^-?\d*\.\d+$/.test(raw)) return Number(raw);
  // Langium value converter may already strip quotes from STRING.
  return raw.startsWith('"') && raw.endsWith('"')
    ? unquoteStringLiteral(raw)
    : raw;
}

function choiceScriptFromAction(
  action: ChoiceAction | undefined,
  anonScenes: Record<string, Scene>,
  anonCounter: { n: number },
): string {
  if (!action) return "";
  if (isInlineAction(action)) {
    return cstBetween(action, "{", "}");
  }
  if (!isBlockAction(action)) return "";

  const lines = action.lines;
  const hasText = lines.some((l) => isActionTextLine(l));

  if (!hasText) {
    return lines.map((l) => cstLineTextAuto(l)).join("\n").trim();
  }

  // 텍스트가 있으면 무명 씬으로 변환
  const anonId = `__anon_${anonCounter.n++}`;
  const steps: Step[] = [];
  for (const line of lines) {
    if (isActionTextLine(line)) {
      for (const t of line.texts) {
        steps.push({ type: "text", content: unquoteStringLiteral(t) });
      }
    } else {
      steps.push({ type: "script", code: cstLineTextAuto(line) });
    }
  }
  anonScenes[anonId] = { id: anonId, steps, choices: [] };
  return `jump("${anonId}")`;
}

function choiceFromLine(
  line: ChoiceLine,
  errors: string[],
  sceneId: string,
  anonScenes: Record<string, Scene>,
  anonCounter: { n: number },
): Choice {
  if (isIfChoice(line)) {
    const enabledWhen = (line.cond.$cstNode?.text ?? "").trim();
    try {
      assertWhenExprParses(enabledWhen);
    } catch {
      errors.push(`Scene "${sceneId}": 조건식 파싱 실패: ${enabledWhen}`);
    }
    return {
      text: unquoteStringLiteral(line.text),
      enabledWhen,
      script: choiceScriptFromAction(line.action, anonScenes, anonCounter),
    };
  }
  if (!isPlainChoice(line)) return { text: "", script: "" };
  return {
    text: unquoteStringLiteral(line.text),
    script: choiceScriptFromAction(line.action, anonScenes, anonCounter),
  };
}

function sceneFromAst(
  scene: IyagiSceneAst,
  errors: string[],
  anonScenes: Record<string, Scene>,
  anonCounter: { n: number },
): Scene {
  if (isInlineScene(scene)) {
    const steps: Step[] = scene.texts.map((t) => ({
      type: "text",
      content: unquoteStringLiteral(t),
    }));
    return { id: scene.name, steps, choices: [] };
  }

  if (!isMultiLineScene(scene)) {
    return {
      id: (scene as { name?: string }).name ?? "unknown",
      steps: [],
      choices: [],
    };
  }

  const steps: Step[] = [];
  const choices: Choice[] = [];
  let choicesAtCandidate: number | undefined;

  for (const item of scene.items) {
    if (isTextLine(item)) {
      for (const t of item.texts) {
        steps.push({ type: "text", content: unquoteStringLiteral(t) });
      }
      continue;
    }
    if (isScriptLine(item)) {
      steps.push({ type: "script", code: cstLineTextAuto(item) });
      continue;
    }
    if (isChoiceBlock(item)) {
      choicesAtCandidate = steps.length;
      for (const c of item.choices) {
        choices.push(
          choiceFromLine(c, errors, scene.name, anonScenes, anonCounter),
        );
      }
    }
  }

  const choicesAt =
    choicesAtCandidate !== undefined && steps.length > choicesAtCandidate
      ? choicesAtCandidate
      : undefined;

  return {
    id: scene.name,
    steps,
    choices,
    ...(choicesAt !== undefined ? { choicesAt } : {}),
  };
}

export function astToStory(
  ast: IyagiDocumentAst,
  parseErrors: string[],
  opts?: { title?: string; start?: string; init?: VariableBag },
): AstToStoryResult {
  const errors: string[] = [...parseErrors];
  const scenes: Record<string, Scene> = {};
  const anonScenes: Record<string, Scene> = {};
  const anonCounter = { n: 0 };

  const initFromVars: VariableBag = {};
  const varDefs: VarDef[] = [];
  if (isVarsBlock(ast)) {
    for (const v of ast.vars) {
      const parsed = parseVarValue(v.value);
      if (parsed === undefined) {
        errors.push(`vars: 초기값 형식을 알 수 없음: ${v.value}`);
        continue;
      }
      initFromVars[v.name] = parsed;
      varDefs.push({ name: v.name, init: parsed });
    }
  }

  for (const s of ast.scenes) {
    scenes[s.name] = sceneFromAst(s, errors, anonScenes, anonCounter);
  }
  Object.assign(scenes, anonScenes);

  const firstId = ast.scenes[0]?.name ?? "start";
  const titleFromDslRaw = typeof ast.title === "string" ? ast.title : "";
  const titleFromDsl =
    titleFromDslRaw.trim() !== ""
      ? unquoteStringLiteral(titleFromDslRaw)
      : undefined;
  const story: Story = {
    title: titleFromDsl ?? opts?.title ?? "Story",
    start: opts?.start ?? firstId,
    scenes,
    init: { ...initFromVars, ...opts?.init },
    varDefs: varDefs.length > 0 ? varDefs : undefined,
  };

  return { story, errors };
}
