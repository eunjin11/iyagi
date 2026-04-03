import type { VariableBag } from "./types";

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
    .replace(/===/g, "\x00EQ\x00")    // === 보호
    .replace(/!==/g, "\x00NEQ\x00")   // !== 보호
    .replace(/==/g, "===")            // == → ===
    .replace(/!=/g, "!==")            // != → !==
    .replace(/\x00EQ\x00/g, "===")    // 복원
    .replace(/\x00NEQ\x00/g, "!==")   // 복원
    .replace(/\band\b/g, "&&")        // and → &&
    .replace(/\bor\b/g, "||")         // or → ||
    .replace(/\bnot\b/g, "!");        // not → !
}

export function assertWhenExprParses(expr: string): void {
  const js = normalizeWhenExpr(expr);
  new Function("seq", `return (${js})`);
}

export function evalWhen(expr: string, vars: VariableBag): boolean {
  try {
    const js = normalizeWhenExpr(expr);
    const keys = Object.keys(vars);
    const values = Object.values(vars);
    return Boolean(new Function("seq", ...keys, `return (${js})`)(seq, ...values));
  } catch {
    return false;
  }
}
