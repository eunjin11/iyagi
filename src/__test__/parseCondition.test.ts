import { describe, expect, it } from "vitest";
import { parseCondition } from "../parser/parseCondition";

describe("parseCondition", () => {
  it("gold>=1", () => {
    const r = parseCondition("gold>=1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ast).toEqual({
      kind: "binary",
      op: ">=",
      left: { kind: "var", name: "gold" },
      right: { kind: "lit", value: 1 },
    });
  });

  it("공백·괄호·논리", () => {
    const r = parseCondition("( gold >= 1 ) && hp < 3");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ast.kind).toBe("binary");
    if (r.ast.kind !== "binary") return;
    expect(r.ast.op).toBe("&&");
  });

  it("=== 는 AST 에 === 로 유지", () => {
    const r = parseCondition('gold === 1');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.ast).toEqual({
      kind: "binary",
      op: "===",
      left: { kind: "var", name: "gold" },
      right: { kind: "lit", value: 1 },
    });
  });

  it("빈 문자열은 실패", () => {
    const r = parseCondition("   ");
    expect(r.ok).toBe(false);
  });
});
