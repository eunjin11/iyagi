import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseDSL } from "../parser/parseScene";
import { evalWhen } from "../story/evalWhen";

const __dirname = dirname(fileURLToPath(import.meta.url));

function demoStorySource(): string {
	return readFileSync(join(__dirname, "../scenarios/demo.iyagi"), "utf-8");
}

describe("parseDSL", () => {
	describe("vars:", () => {
		it("parses numeric·boolean·string 초기값", () => {
			const src = `
vars:
  hp = 10
  gold = 0
  alive = true
  tag = "x"

a {
  "hi"
}
`;
			const { story, errors } = parseDSL(src);
			expect(errors).toEqual([]);
			expect(story.init).toEqual({ hp: 10, gold: 0, alive: true, tag: "x" });
		});

		it("opts.init이 DSL vars보다 우선 병합", () => {
			const src = `
vars:
  hp = 10
  gold = 0

s { "x" }
`;
			const { story } = parseDSL(src, { init: { gold: 99 } });
			expect(story.init).toEqual({ hp: 10, gold: 99 });
		});
	});

	describe("scenes", () => {
		it("씬 이름에 언더스코어 허용", () => {
			const { story, errors } = parseDSL(`
going_home {
  "끝"
}
`);
			expect(errors).toEqual([]);
			expect(story.scenes.going_home).toBeDefined();
			expect(story.scenes.going_home?.steps[0]).toEqual({
				type: "text",
				content: "끝",
			});
		});

		it("텍스트·스크립트·한 줄 선택지", () => {
			const { story, errors } = parseDSL(`
s {
  "대사"
  if (hp > 0) jump("t")
  choices:
    "가기" -> { jump("u") }
}
`);
			expect(errors).toEqual([]);
			const s = story.scenes.s;
			expect(s).toBeDefined();
			if (!s) throw new Error('scene "s" not found');
			expect(s.steps[0]).toEqual({ type: "text", content: "대사" });
			expect(s.steps[1]).toEqual({
				type: "script",
				code: 'if (hp > 0) jump("t")',
			});
			expect(s.choices).toEqual([{ text: "가기", script: 'jump("u")' }]);
		});

		it('선택지 if (cond) "레이블" -> { } 한 줄 → enabledWhen', () => {
			const { story, errors } = parseDSL(`
s {
  choices:
    if ( gold>=1 ) "빵" -> { dec("gold", 1) }
    "길" -> { jump("x") }
}
`);
			expect(errors).toEqual([]);
			expect(story.scenes.s?.choices[0]).toMatchObject({
				text: "빵",
				enabledWhen: "gold>=1",
			});
			expect(story.scenes.s?.choices[1]).toEqual({
				text: "길",
				script: 'jump("x")',
			});
		});

		it("선택지: -> 다음 줄에 { … } 멀티라인", () => {
			const { story, errors } = parseDSL(`
s {
  choices:
    "도망" ->
      {
        set("hp", 5)
        jump("start")
      }
}
`);
			expect(errors).toEqual([]);
			expect(story.scenes.s?.choices[0]?.text).toBe("도망");
			expect(story.scenes.s?.choices[0]?.script).toBe(
				'set("hp", 5)\njump("start")',
			);
		});

		it("선택지: 같은 줄 { 멀티라인 본문", () => {
			const { story, errors } = parseDSL(`
s {
  choices:
    "a" -> {
      inc("gold", 1)
      jump("b")
    }
}
`);
			expect(errors).toEqual([]);
			expect(story.scenes.s?.choices[0]?.script).toContain('inc("gold", 1)');
			expect(story.scenes.s?.choices[0]?.script).toContain('jump("b")');
		});

		it("조건부 선택은 if 한 줄만", () => {
			const { story, errors } = parseDSL(`
s {
  choices:
    if (hp < 3) "도망" -> { jump("safe") }
}
`);
			expect(errors).toEqual([]);
			expect(story.scenes.s?.choices[0]).toMatchObject({
				text: "도망",
				enabledWhen: "hp < 3",
			});
			expect(story.scenes.s?.choices[0]?.script).toContain('jump("safe")');
		});
	});

	describe("demo.iyagi 통합", () => {
		it("예제 파일이 오류 없이 파싱되고 필수 씬·init 존재", () => {
			const { story, errors } = parseDSL(demoStorySource(), {
				title: "여행",
				start: "start",
			});
			expect(errors).toEqual([]);
			expect(story.title).toBe("여행");
			expect(story.start).toBe("start");
			expect(story.init).toEqual({ hp: 10, gold: 0 });
			expect(story.scenes.start).toBeDefined();
			expect(story.scenes.village).toBeDefined();
			expect(story.scenes.deep?.choices).toHaveLength(2);
			const run = story.scenes.deep?.choices.find((c) => c.text === "도망친다");
			expect(run?.script).toContain('set("hp", 5)');
		});

		it("after_fruit: 진입 스크립트 → 대사 → 대사 이후 inc 스크립트 순 스텝", () => {
			const { story, errors } = parseDSL(demoStorySource(), {
				title: "여행",
				start: "start",
			});
			expect(errors).toEqual([]);
			const steps = story.scenes.after_fruit?.steps;
			expect(steps?.[0]).toEqual({
				type: "script",
				code: 'if (hp <= 0) jump("gameover")',
			});
			expect(steps?.[1]?.type).toBe("text");
			expect(steps?.[1]).toMatchObject({
				type: "text",
				content: "맛있는 열매를 먹고 여행을 마치고 집으로 돌아간다.",
			});
			expect(steps?.[2]).toEqual({ type: "script", code: 'inc("hp", 1)' });
		});

		it("village: 빵은 if(gold>=1)·evalWhen·다른 선택지는 조건 없음", () => {
			const { story, errors } = parseDSL(demoStorySource(), {
				title: "여행",
				start: "start",
			});
			expect(errors).toEqual([]);
			const village = story.scenes.village;
			expect(village).toBeDefined();
			if (!village) throw new Error('scene "village" not found');
			expect(village.choices).toHaveLength(3);

			const bread = village.choices.find((c) => c.text === "빵을 산다");
			expect(bread?.enabledWhen).toBe("gold >= 1");
			if (!bread) throw new Error('choice "빵을 산다" not found');
			if (!bread.enabledWhen)
				throw new Error('choice "빵을 산다" has no enabledWhen');
			expect(bread.script).toContain('jump("going_home")');

			const varsPoor = { hp: 10, gold: 0 };
			const varsRich = { hp: 10, gold: 1 };
			expect(evalWhen(bread.enabledWhen, varsPoor)).toBe(false);
			expect(evalWhen(bread.enabledWhen, varsRich)).toBe(true);

			const road = village.choices.find((c) => c.text === "다시 길로 나온다");
			const end = village.choices.find(
				(c) => c.text === "여행을 마치고 집으로 돌아간다",
			);
			expect(road?.enabledWhen).toBeUndefined();
			expect(end?.enabledWhen).toBeUndefined();
		});
	});

	describe("에러", () => {
		it("닫히지 않은 씬은 에러", () => {
			const { errors } = parseDSL(`
bad {
  "oops"
`);
			expect(errors.some((e) => e.includes("닫히지"))).toBe(true);
		});
	});
});
