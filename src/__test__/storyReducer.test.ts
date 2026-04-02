import { describe, expect, it } from "vitest";
import {
  applyStoryEvent,
  initialEngineState,
  storyReducer,
} from "../story/storyReducer";
import type { Story } from "../story/types";

const tinyStory: Story = {
  title: "t",
  start: "a",
  scenes: {
    a: {
      id: "a",
      steps: [{ type: "text", content: "hi" }],
      choices: [],
    },
  },
};

describe("storyReducer", () => {
  it("TAP_ADVANCE는 텍스트 스텝에서만 stepIndex 증가", () => {
    let s = initialEngineState(tinyStory);
    s = storyReducer(s, { type: "TAP_ADVANCE" }, tinyStory);
    expect(s.stepIndex).toBe(1);
    s = storyReducer(s, { type: "TAP_ADVANCE" }, tinyStory);
    expect(s.stepIndex).toBe(1);
  });

  it("SCRIPT_DONE + jump는 sceneId·stepIndex 리셋", () => {
    let s = initialEngineState({
      ...tinyStory,
      scenes: {
        a: { id: "a", steps: [], choices: [] },
        b: { id: "b", steps: [], choices: [] },
      },
    });
    s = { ...s, sceneId: "a", stepIndex: 2 };
    s = storyReducer(
      s,
      { type: "SCRIPT_DONE", context: "step", vars: { gold: 1 }, jumpTo: "b" },
      tinyStory,
    );
    expect(s.sceneId).toBe("b");
    expect(s.stepIndex).toBe(0);
    expect(s.vars.gold).toBe(1);
  });

  it("SCRIPT_DONE step + jump 없음이면 stepIndex만 증가", () => {
    let s = initialEngineState(tinyStory);
    s = { ...s, stepIndex: 0 };
    s = storyReducer(
      s,
      { type: "SCRIPT_DONE", context: "step", vars: { hp: 5 }, jumpTo: null },
      tinyStory,
    );
    expect(s.stepIndex).toBe(1);
    expect(s.vars.hp).toBe(5);
  });

  it("SCRIPT_DONE choice + jump 없음은 vars만 갱신", () => {
    let s = initialEngineState(tinyStory);
    s = { ...s, stepIndex: 99 };
    s = storyReducer(
      s,
      {
        type: "SCRIPT_DONE",
        context: "choice",
        vars: { x: true },
        jumpTo: null,
      },
      tinyStory,
    );
    expect(s.stepIndex).toBe(99);
    expect(s.vars.x).toBe(true);
  });
});

const afterFruitLike: Story = {
  title: "x",
  start: "after_fruit",
  scenes: {
    after_fruit: {
      id: "after_fruit",
      steps: [
        { type: "script", code: 'if (hp <= 0) jump("gameover")' },
        { type: "text", content: "열매 대사" },
        { type: "script", code: 'inc("hp", 1)' },
      ],
      choices: [],
    },
    gameover: { id: "gameover", steps: [], choices: [] },
  },
  init: { hp: 10, gold: 0 },
};

describe("applyStoryEvent + RUN_SCRIPT", () => {
  it("첫 스크립트(점프 없음) 후 텍스트까지 진행, 그 다음 RUN_SCRIPT에서 inc가 적용", () => {
    let s = initialEngineState(afterFruitLike);
    s = applyStoryEvent(
      s,
      {
        type: "RUN_SCRIPT",
        context: "step",
        code: 'if (hp <= 0) jump("gameover")',
      },
      afterFruitLike,
    );
    expect(s.stepIndex).toBe(1);
    expect(s.sceneId).toBe("after_fruit");
    expect(s.vars.hp).toBe(10);

    s = storyReducer(s, { type: "TAP_ADVANCE" }, afterFruitLike);
    expect(s.stepIndex).toBe(2);

    s = applyStoryEvent(
      s,
      { type: "RUN_SCRIPT", context: "step", code: 'inc("hp", 1)' },
      afterFruitLike,
    );
    expect(s.vars.hp).toBe(11);
    expect(s.stepIndex).toBe(3);

    const scene = afterFruitLike.scenes.after_fruit;
    expect(scene).toBeDefined();
    if (!scene) throw new Error('scene "after_fruit" not found');
    expect(s.stepIndex).toBeGreaterThanOrEqual(scene.steps.length);
  });

  it("RUN_SCRIPT가 jump면 SCRIPT_DONE과 동일하게 씬 이동", () => {
    let s = initialEngineState(afterFruitLike);
    s = { ...s, vars: { hp: 0, gold: 0 } };
    s = applyStoryEvent(
      s,
      {
        type: "RUN_SCRIPT",
        context: "step",
        code: 'if (hp <= 0) jump("gameover")',
      },
      afterFruitLike,
    );
    expect(s.sceneId).toBe("gameover");
    expect(s.stepIndex).toBe(0);
  });
});
