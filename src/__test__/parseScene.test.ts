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
      expect(s.choices).toEqual([{ text: "가기", script: 'jump("u")' }]);
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
      expect(story.scenes.s?.choices[0]?.text).toBe("도망");
      expect(story.scenes.s?.choices[0]?.script).toBe(
        'set("hp", 5)\njump("start")',
      );
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
      expect(story.scenes.s?.choices[0]?.script).toContain('inc("gold", 1)');
      expect(story.scenes.s?.choices[0]?.script).toContain('jump("b")');
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
        start: "start",
      });
      expect(errors).toEqual([]);
      expect(story.title).toBe("여행");
      expect(story.start).toBe("start");
      expect(story.init).toEqual({ hp: 10, gold: 0, enemyHp: 10 });
      expect(story.scenes.start).toBeDefined();
      expect(story.scenes.village).toBeDefined();
      expect(story.scenes.deep?.choices).toHaveLength(2);
      const run = story.scenes.deep?.choices.find((c) => c.text === "도망친다");
      expect(run?.script).toContain('set("hp", 5)');
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
      expect(village.choices).toHaveLength(4);

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

      const heal = village.choices.find((c) => c.text === "치유사에게 간다");
      expect(heal?.enabledWhen).toBeUndefined();

      const road = village.choices.find((c) => c.text === "다시 길로 나온다");
      const end = village.choices.find(
        (c) => c.text === "여행을 마치고 집으로 돌아간다",
      );
      expect(road?.enabledWhen).toBeUndefined();
      expect(end?.enabledWhen).toBeUndefined();
    });
  });

  describe("무명 씬 (익명 블록)", () => {
    it("블록 안에 텍스트 라인이 있으면 무명 씬을 생성하고 choice.script 는 jump()", () => {
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
      const choice = story.scenes.s?.choices[0];
      expect(choice?.text).toBe("공격");

      // script 는 jump("__anon_0") 형태
      const anonId = choice?.script.match(/jump\("([^"]+)"\)/)?.[1];
      expect(anonId).toMatch(/^__anon_/);

      const anon = anonId ? story.scenes[anonId] : undefined;
      expect(anon).toBeDefined();
      expect(anon?.steps[0]).toEqual({ type: "script", code: 'set("x", 1)' });
      expect(anon?.steps[1]).toEqual({ type: "text", content: "공격했다!" });
      expect(anon?.steps[2]).toEqual({ type: "script", code: 'jump("next")' });
    });

    it("텍스트 없는 블록은 무명 씬을 만들지 않고 기존 script 문자열 반환", () => {
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
      const choice = story.scenes.s?.choices[0];
      expect(choice?.script).toContain('set("x", 0)');
      expect(choice?.script).toContain('jump("out")');
      // 무명 씬 없음
      expect(Object.keys(story.scenes).every((k) => !k.startsWith("__anon_"))).toBe(true);
    });

    it("여러 선택지에 각각 무명 씬 — ID가 순서대로 증가", () => {
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
      const [c0, c1] = story.scenes.s?.choices ?? [];
      const id0 = c0?.script.match(/jump\("([^"]+)"\)/)?.[1];
      const id1 = c1?.script.match(/jump\("([^"]+)"\)/)?.[1];
      expect(id0).toMatch(/^__anon_/);
      expect(id1).toMatch(/^__anon_/);
      expect(id0).not.toBe(id1);
      expect(story.scenes[id0!]?.steps[0]).toMatchObject({ type: "text", content: "A 결과" });
      expect(story.scenes[id1!]?.steps[0]).toMatchObject({ type: "text", content: "B 결과" });
    });

    it("무명 씬과 engine 통합: 텍스트 스텝 진행 후 jump 실행", () => {
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
      // isDone → choices 표시 → choose "go"
      const choice = story.scenes.s!.choices[0]!;
      state = applyStoryEvent(state, { type: "CHOOSE", choice }, story);

      // 무명 씬에서 "중간" 텍스트
      expect(state.sceneId).toMatch(/^__anon_/);
      expect(state.stepIndex).toBe(0);

      state = applyStoryEvent(state, { type: "TAP_ADVANCE" }, story);
      // jump("t") 스크립트 자동 실행은 useEffect에서 하지만 여기선 수동
      state = applyStoryEvent(
        state,
        { type: "RUN_SCRIPT", context: "step", code: 'jump("t")' },
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
