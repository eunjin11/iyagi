import { describe, expect, it } from "vitest";
import { assertWhenExprParses, evalWhen } from "../story/evalWhen";

describe("evalWhen", () => {
	it("리터럴 true / false / 0 / 1", () => {
		expect(evalWhen("true", {})).toBe(true);
		expect(evalWhen("false", {})).toBe(false);
		expect(evalWhen("1", {})).toBe(true);
		expect(evalWhen("0", {})).toBe(false);
	});

	it("변수·비교·단항", () => {
		const v = { gold: 1, flag: true, z: 0 };
		expect(evalWhen("gold == 1", v)).toBe(true);
		expect(evalWhen("z == 0", v)).toBe(true);
		expect(evalWhen("flag == true", v)).toBe(true);
		expect(evalWhen("!flag", v)).toBe(false);
		expect(evalWhen("!false", {})).toBe(true);
	});

	it("문자열 == / != (AST에서 seq 로 치환)", () => {
		assertWhenExprParses('tag == "x"');
		expect(evalWhen('tag == "x"', { tag: "x" })).toBe(true);
		expect(evalWhen('tag == "x"', { tag: "y" })).toBe(false);
		expect(evalWhen('tag != "x"', { tag: "x" })).toBe(false);
		expect(evalWhen('tag == "x" and gold >= 1', { tag: "x", gold: 2 })).toBe(
			true,
		);
	});

	it("명시적 seq(...) 도 동작", () => {
		expect(evalWhen('seq(tag, "x")', { tag: "x" })).toBe(true);
	});

	it("gold >= 1", () => {
		assertWhenExprParses("gold >= 1");
		expect(evalWhen("gold >= 1", { gold: 0, hp: 10 })).toBe(false);
		expect(evalWhen("gold >= 1", { gold: 1, hp: 10 })).toBe(true);
	});

	it("논리·괄호 (JS && → mathjs)", () => {
		assertWhenExprParses("(gold >= 1) && hp < 3");
		expect(evalWhen("(gold >= 1) && hp < 3", { gold: 1, hp: 10 })).toBe(false);
		expect(evalWhen("(gold >= 1) && hp < 3", { gold: 1, hp: 2 })).toBe(true);
	});

	it("빈 조건은 파싱 단계에서 거부", () => {
		expect(() => assertWhenExprParses("   ")).toThrow();
	});
});
