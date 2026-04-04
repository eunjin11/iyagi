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
  PlainChoice,
} from "./__generated__/ast.js";
import {
  isActionTextLine,
  isBlockAction,
  isChoiceBlock,
  isIfChoice,
  isInlineAction,
  isInlineScene,
  isMultiLineScene,
  isScriptLine,
  isTextLine,
  isVarsBlock,
} from "./__generated__/ast.js";

export type AstToStoryResult = {
  story: Story;
  errors: string[];
};

function unquoteStringLiteral(raw: string): string {
  if (raw.length >= 2 && raw.startsWith('"') && raw.endsWith('"')) {
    const inner = raw.slice(1, -1);
    return inner.replace(/\\(.)/g, "$1");
  }
  return raw;
}

function cstLineText(
  node: { $cstNode?: { text: string } } | undefined,
  indent: number,
): string {
  const text = node?.$cstNode?.text ?? "";
  const withoutNl = text.replace(/\r?\n$/, "");
  return withoutNl.slice(indent).trimEnd();
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
  return raw.startsWith('"') && raw.endsWith('"')
    ? unquoteStringLiteral(raw)
    : raw;
}

/** choice action block → Step[] */
function choiceStepsFromAction(action: ChoiceAction | undefined): Step[] {
  if (!action) return [];
  if (isInlineAction(action)) {
    const code = cstBetween(action, "{", "}");
    return code ? [{ type: "script", code }] : [];
  }
  if (!isBlockAction(action)) return [];

  const steps: Step[] = [];
  for (const line of action.lines) {
    if (isActionTextLine(line)) {
      for (const t of line.texts) {
        steps.push({ type: "text", content: unquoteStringLiteral(t) });
      }
    } else {
      const code = cstLineTextAuto(line);
      if (code) steps.push({ type: "script", code });
    }
  }
  return steps;
}

function choiceFromLine(
  line: ChoiceLine,
  errors: string[],
  sceneId: string,
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
      steps: choiceStepsFromAction(line.action),
    };
  }
  const plain = line as PlainChoice;
  return {
    text: unquoteStringLiteral(plain.text),
    steps: choiceStepsFromAction(plain.action),
  };
}

function sceneFromAst(scene: IyagiSceneAst, errors: string[]): Scene {
  if (isInlineScene(scene)) {
    const steps: Step[] = scene.texts.map((t) => ({
      type: "text",
      content: unquoteStringLiteral(t),
    }));
    return { id: scene.name, steps };
  }

  if (!isMultiLineScene(scene)) {
    return { id: (scene as { name?: string }).name ?? "unknown", steps: [] };
  }

  const steps: Step[] = [];

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
      const choices: Choice[] = item.choices.map((c) =>
        choiceFromLine(c, errors, scene.name),
      );
      steps.push({ type: "choices", choices });
    }
  }

  return { id: scene.name, steps };
}

export function astToStory(
  ast: IyagiDocumentAst,
  parseErrors: string[],
  opts?: { title?: string; start?: string; init?: VariableBag },
): AstToStoryResult {
  const errors: string[] = [...parseErrors];
  const scenes: Record<string, Scene> = {};

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
    scenes[s.name] = sceneFromAst(s, errors);
  }

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
