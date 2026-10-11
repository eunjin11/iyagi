import { createQueries } from "../actions/queries";
import type { StoryEngineState } from "./storyReducer";
import type { Choice, VariableBag } from "./types";

/** seq(a, b): 엄격 동등 비교 — 조건식에서 명시적으로 호출 가능 */
const seq = (a: unknown, b: unknown): boolean => a === b;

/**
 * DSL 조건식 → 유효한 JS 표현식으로 변환
 * - `==` / `!=`  →  `===` / `!==`  (이미 `===`/`!==`인 경우도 유지)
 * - `and` / `or` / `not`  →  `&&` / `||` / `!`
 */
export function normalizeWhenExpr(src: string): string {
  const s = src.trim();
  if (!s) throw new SyntaxError("빈 조건");

  return s
    .replace(/(?<![=!<>])==(?!=)/g, "===") // == → ===  (=== 는 그대로)
    .replace(/(?<![=!<>])!=(?!=)/g, "!==") // != → !==  (!== 는 그대로)
    .replace(/\band\b/g, "&&")
    .replace(/\bor\b/g, "||")
    .replace(/\bnot\b/g, "!");
}

export function assertWhenExprParses(expr: string): void {
  const js = normalizeWhenExpr(expr);
  new Function("seq", `return (${js})`);
}

export function evalWhen(
  expr: string,
  vars: VariableBag,
  queries: ReturnType<typeof createQueries> = createQueries(() => []),
): boolean {
  try {
    const js = normalizeWhenExpr(expr);
    const scope = { ...vars, seq, ...queries };
    const keys = Object.keys(scope);
    const values = Object.values(scope);
    return Boolean(new Function(...keys, `return (${js})`)(...values));
  } catch {
    return false;
  }
}

/** All runtime conditions receive the complete engine context here. */
export function evalStoryCondition(
  expr: string,
  state: StoryEngineState,
): boolean {
  return evalWhen(
    expr,
    { ...state.vars, ...state.localVars },
    createQueries(() => state.inventory ?? []),
  );
}

export function isChoiceEnabled(
  choice: Choice,
  state: StoryEngineState,
): boolean {
  return !choice.enabledWhen || evalStoryCondition(choice.enabledWhen, state);
}
