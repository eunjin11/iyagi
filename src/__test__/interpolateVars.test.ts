import { describe, expect, it } from "vitest";
import { interpolateVars } from "../utils/interpolateVars";

describe("interpolateVars", () => {
  it("vars에 있는 키는 치환하고, 없는 키는 원문을 유지한다", () => {
    const out = interpolateVars("gold=$gold hp=$hp missing=$nope", {
      gold: 10,
      hp: 3,
    });
    expect(out).toBe("gold=10 hp=3 missing=$nope");
  });
});
