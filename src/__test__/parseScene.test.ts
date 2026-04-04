import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { parseDSL } from "../parser/parseScene";
import { evalWhen } from "../story/evalWhen";
import {
  applyStoryEvent,
  initialEngineState,
} from "../story/storyReducer";

const __dirname = dirname(fileURLToPath(import.meta.url));

function demoStorySource(): string {
  return readFileSync(join(__dirname, "../scenarios/demo.iyagi"), "utf-8");
}

/** scene.steps에서 choices 스텝을 찾아 반환 */
function findChoicesStep(steps: ReturnType<typeof parseDSL>["story"]["scenes"][string]["steps"]) {
  return steps.find((s) => s.type === "choices") as
    | Extract<(typeof steps)[number], { type: "choices" }>
    | undefined;
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
      expect(story.varDefs).toEqual([
        { name: "hp", init: 10 },
        { name: "gold", init: 0 },
        { name: "alive", init: true },
        { name: "tag", init: "x" },
      ]);
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
      expect(story.varDefs).toEqual([
        { name: "hp", init: 10 },
        { name: "gold", init: 0 },
      ]);
    });
  });

  describe("title:", () => {
    it('title: "..." 를 Story.title로 사용 (opts.title보다 우선)', () => {
      const { story, errors } = parseDSL(
        `
title: "여행"

a { "hi" }
`,
        { title: "경로에서_추론된_제목" },
      );
      expect(errors).toEqual([]);
      expect(story.title).toBe("여행");
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
  choices: {
    "가기" -> { jump("u") }
  }
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
      const choicesStep = findChoicesStep(s.steps);
      expect(choicesStep?.choices[0]).toEqual({
        text: "가기",
        steps: [{ type: "script", code: 'jump("u")' }],
      });
    });

    it('선택지 if (cond) "레이블" -> { } 한 줄 → enabledWhen', () => {
      const { story, errors } = parseDSL(`
s {
  choices: {
    if ( gold>=1 ) "빵" -> { dec("gold", 1) }
    "길" -> { jump("x") }
  }
}
`);
      expect(errors).toEqual([]);
      const choicesStep = findChoicesStep(story.scenes.s?.steps ?? []);
      expect(choicesStep?.choices[0]).toMatchObject({
        text: "빵",
        enabledWhen: "gold>=1",
      });
      expect(choicesStep?.choices[1]).toEqual({
        text: "길",
        steps: [{ type: "script", code: 'jump("x")' }],
      });
    });

    it("선택지: -> 다음 줄에 { … } 멀티라인", () => {
      const { story, errors } = parseDSL(`
s {
  choices: {
    "도망" ->
      {
        set("hp", 5)
        jump("start")
      }
  }
}
`);
      expect(errors).toEqual([]);
      const choicesStep = findChoicesStep(story.scenes.s?.steps ?? []);
      const choice = choicesStep?.choices[0];
      expect(choice?.text).toBe("도망");
      expect(choice?.steps).toEqual([
        { type: "script", code: 'set("hp", 5)' },
        { type: "script", code: 'jump("start")' },
      ]);
    });

    it("선택지: 같은 줄 { 멀티라인 본문", () => {
      const { story, errors } = parseDSL(`
s {
  choices: {
    "a" -> {
      inc("gold", 1)
      jump("b")
    }
  }
}
`);
      expect(errors).toEqual([]);
      const choicesStep = findChoicesStep(story.scenes.s?.steps ?? []);
      const steps = choicesStep?.choices[0]?.steps ?? [];
      expect(steps.some((s) => s.type === "script" && s.code.includes('inc("gold", 1)'))).toBe(true);
      expect(steps.some((s) => s.type === "script" && s.code.includes('jump("b")'))).toBe(true);
    });

    it("조건부 선택은 if 한 줄만", () => {
      const { story, errors } = parseDSL(`
s {
  choices: {
    if (hp < 3) "도망" -> { jump("safe") }
  }
}
`);
      expect(errors).toEqual([]);
      const choicesStep = findChoicesStep(story.scenes.s?.steps ?? []);
      expect(choicesStep?.choices[0]).toMatchObject({
        text: "도망",
        enabledWhen: "hp < 3",
      });
      expect(choicesStep?.choices[0]?.steps).toEqual([
        { type: "script", code: 'jump("safe")' },
      ]);
    });
  });

  describe("demo.iyagi 통합", () => {
    it("예제 파일이 오류 없이 파싱되고 필수 씬·init 존재", () => {
      const { story, errors } = parseDSL(demoStorySource(), {
        start: "start",
      });
      expect(errors).toEqual([]);
      expect(story.title).toBe("여행");
      expect(story.start).toBe("start");
      expect(story.init).toEqual({ hp: 10, gold: 0, enemyHp: 10 });
      expect(story.scenes.start).toBeDefined();
      expect(story.scenes.village).toBeDefined();
      const deepChoicesStep = findChoicesStep(story.scenes.deep?.steps ?? []);
      expect(deepChoicesStep?.choices).toHaveLength(2);
      const run = deepChoicesStep?.choices.find((c) => c.text === "도망친다");
      expect(run?.steps.some((s) => s.type === "script" && s.code.includes('set("hp", 5)'))).toBe(true);
    });

    it("after_fruit: 진입 스크립트 → 대사 → 대사 이후 inc 스크립트 순 스텝", () => {
      const { story, errors } = parseDSL(demoStorySource(), {
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
        start: "start",
      });
      expect(errors).toEqual([]);
      const village = story.scenes.village;
      expect(village).toBeDefined();
      if (!village) throw new Error('scene "village" not found');

      const choicesStep = findChoicesStep(village.steps);
      expect(choicesStep?.choices).toHaveLength(4);

      const bread = choicesStep?.choices.find((c) => c.text === "빵을 산다");
      expect(bread?.enabledWhen).toBe("gold >= 1");
      if (!bread) throw new Error('choice "빵을 산다" not found');
      if (!bread.enabledWhen) throw new Error('choice "빵을 산다" has no enabledWhen');
      expect(bread.steps.some((s) => s.type === "script" && s.code.includes('jump("going_home")'))).toBe(true);

      const varsPoor = { hp: 10, gold: 0 };
      const varsRich = { hp: 10, gold: 1 };
      expect(evalWhen(bread.enabledWhen, varsPoor)).toBe(false);
      expect(evalWhen(bread.enabledWhen, varsRich)).toBe(true);

      const heal = choicesStep?.choices.find((c) => c.text === "치유사에게 간다");
      expect(heal?.enabledWhen).toBeUndefined();

      const road = choicesStep?.choices.find((c) => c.text === "다시 길로 나온다");
      const end = choicesStep?.choices.find((c) => c.text === "여행을 마치고 집으로 돌아간다");
      expect(road?.enabledWhen).toBeUndefined();
      expect(end?.enabledWhen).toBeUndefined();
    });
  });

  describe("choice 블록 내 텍스트", () => {
    it("블록 안에 텍스트 라인이 있으면 choice.steps에 text 스텝 포함", () => {
      const { story, errors } = parseDSL(`
s {
  choices: {
    "공격" ->
      {
        set("x", 1)
        "공격했다!"
        jump("next")
      }
  }
}
`);
      expect(errors).toEqual([]);
      const choicesStep = findChoicesStep(story.scenes.s?.steps ?? []);
      const choice = choicesStep?.choices[0];
      expect(choice?.text).toBe("공격");
      expect(choice?.steps).toEqual([
        { type: "script", code: 'set("x", 1)' },
        { type: "text", content: "공격했다!" },
        { type: "script", code: 'jump("next")' },
      ]);
      // 무명 씬 없음
      expect(Object.keys(story.scenes).every((k) => !k.startsWith("__anon_"))).toBe(true);
    });

    it("텍스트 없는 블록도 정상 파싱", () => {
      const { story, errors } = parseDSL(`
s {
  choices: {
    "도망" ->
      {
        set("x", 0)
        jump("out")
      }
  }
}
`);
      expect(errors).toEqual([]);
      const choicesStep = findChoicesStep(story.scenes.s?.steps ?? []);
      const steps = choicesStep?.choices[0]?.steps ?? [];
      expect(steps).toEqual([
        { type: "script", code: 'set("x", 0)' },
        { type: "script", code: 'jump("out")' },
      ]);
    });

    it("여러 선택지 각각 독립적인 steps", () => {
      const { story, errors } = parseDSL(`
s {
  choices: {
    "A" ->
      {
        "A 결과"
        jump("end")
      }
    "B" ->
      {
        "B 결과"
        jump("end")
      }
  }
}
`);
      expect(errors).toEqual([]);
      const choicesStep = findChoicesStep(story.scenes.s?.steps ?? []);
      const [c0, c1] = choicesStep?.choices ?? [];
      expect(c0?.steps[0]).toMatchObject({ type: "text", content: "A 결과" });
      expect(c1?.steps[0]).toMatchObject({ type: "text", content: "B 결과" });
    });

    it("choice steps + engine 통합: 텍스트 스텝 진행 후 jump 실행", () => {
      const { story, errors } = parseDSL(`
s {
  "시작"
  choices: {
    "go" ->
      {
        "중간"
        jump("t")
      }
  }
}

t { "끝" }
`);
      expect(errors).toEqual([]);

      let state = initialEngineState(story);

      // "시작" 텍스트 → TAP_ADVANCE
      state = applyStoryEvent(state, { type: "TAP_ADVANCE" }, story);
      // choices 스텝 → CHOOSE
      const choicesStep = state.stepQueue[0] as Extract<typeof state.stepQueue[0], { type: "choices" }>;
      expect(choicesStep.type).toBe("choices");
      const choice = choicesStep.choices[0]!;
      state = applyStoryEvent(state, { type: "CHOOSE", choice }, story);

      // choice.steps 주입: "중간" 텍스트
      expect(state.stepQueue[0]).toEqual({ type: "text", content: "중간" });

      state = applyStoryEvent(state, { type: "TAP_ADVANCE" }, story);
      // jump("t") 스크립트 자동 실행
      state = applyStoryEvent(
        state,
        { type: "RUN_SCRIPT", code: 'jump("t")' },
        story,
      );
      expect(state.sceneId).toBe("t");
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
