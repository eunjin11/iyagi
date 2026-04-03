import { afterEach, describe, expect, it, vi } from "vitest";
import type { ActionContext } from "../actions/context";
import { createActions, runScript } from "../actions/index";
import type { VarDef } from "../story/types";

function mockContext(initial: Record<string, number | string | boolean>): {
  ctx: ActionContext;
  get: () => Record<string, number | string | boolean>;
} {
  let bag: Record<string, number | string | boolean> = { ...initial };
  const ctx: ActionContext = {
    get vars() {
      return bag;
    },
    setVars: (updater) => {
      bag = updater({ ...bag });
    },
    navigate: vi.fn(),
  };
  return {
    ctx,
    get: () => ({ ...bag }),
  };
}

describe("createActions + runScript", () => {
  it("inc / dec / set 이 vars를 갱신", () => {
    const { ctx, get } = mockContext({ gold: 0, hp: 10 });
    runScript('inc("gold", 7)', { ...ctx.vars }, ctx);
    expect(get().gold).toBe(7);
    runScript('dec("hp", 3)', { ...get() }, ctx);
    expect(get().hp).toBe(7);
    runScript('set("hp", 1)', { ...get() }, ctx);
    expect(get().hp).toBe(1);
  });

  it("jump가 navigate를 호출", () => {
    const { ctx } = mockContext({});
    runScript('jump("forest")', { ...ctx.vars }, ctx);
    expect(ctx.navigate).toHaveBeenCalledWith("forest");
  });

  it("커스텀 heal이 hp를 올림", () => {
    const { ctx, get } = mockContext({ hp: 10 });
    runScript("heal(4)", { ...ctx.vars }, ctx);
    expect(get().hp).toBe(14);
  });

  it("스크립트에 없는 식별자는 ReferenceError", () => {
    const { ctx } = mockContext({});
    expect(() => runScript("unknownVar + 1", { ...ctx.vars }, ctx)).toThrow(
      ReferenceError,
    );
  });

  it("createActions에 heal·jump 등이 포함", () => {
    const { ctx } = mockContext({ hp: 10 });
    const a = createActions(ctx, [
      { name: "hp", init: 10 },
      { name: "gold", init: 0 },
    ]);
    expect(typeof a.heal).toBe("function");
    expect(typeof a.jump).toBe("function");
    expect(typeof a.addGold).toBe("function");
  });

  describe("rollAttack", () => {
    afterEach(() => vi.restoreAllMocks());

    it("random < chance → damage 적용", () => {
      vi.spyOn(Math, "random").mockReturnValue(0); // 0 < 0.7 → hit
      const { ctx, get } = mockContext({ enemyHp: 10 });
      runScript('rollAttack(0.7, 2, "enemyHp")', { ...ctx.vars }, ctx);
      expect(get().enemyHp).toBe(8);
    });

    it("random >= chance → damage 미적용", () => {
      vi.spyOn(Math, "random").mockReturnValue(0.9); // 0.9 >= 0.7 → miss
      const { ctx, get } = mockContext({ enemyHp: 10 });
      runScript('rollAttack(0.7, 2, "enemyHp")', { ...ctx.vars }, ctx);
      expect(get().enemyHp).toBe(10);
    });

    it("hp 대상으로도 동작", () => {
      vi.spyOn(Math, "random").mockReturnValue(0);
      const { ctx, get } = mockContext({ hp: 5 });
      runScript("rollAttack(0.7, 1, \"hp\")", { ...ctx.vars }, ctx);
      expect(get().hp).toBe(4);
    });
  });

  it("varDefs 기반 자동 헬퍼(add/sub/set/toggle)가 vars를 갱신", () => {
    const varDefs: VarDef[] = [
      { name: "hp", init: 10 },
      { name: "gold", init: 0 },
      { name: "alive", init: true },
      { name: "tag", init: "x" },
    ];
    const { ctx, get } = mockContext({
      hp: 10,
      gold: 0,
      alive: true,
      tag: "x",
    });

    runScript("addHp(2)", { ...ctx.vars }, ctx, varDefs);
    expect(get().hp).toBe(12);

    runScript("subGold(3)", { ...get() }, ctx, varDefs);
    expect(get().gold).toBe(-3);

    runScript('setTag("y")', { ...get() }, ctx, varDefs);
    expect(get().tag).toBe("y");

    runScript("toggleAlive()", { ...get() }, ctx, varDefs);
    expect(get().alive).toBe(false);
  });
});
