import { describe, expect, it, vi } from "vitest";
import type { ActionContext } from "../actions/context";
import { createActions, runScript } from "../actions/index";

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
		const a = createActions(ctx);
		expect(typeof a.heal).toBe("function");
		expect(typeof a.jump).toBe("function");
		expect(typeof a.addGold).toBe("function");
	});
});
