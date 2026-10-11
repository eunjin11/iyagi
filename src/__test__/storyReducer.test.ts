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
    },
  },
};

describe("storyReducer", () => {
  it("TAP_ADVANCE는 텍스트 스텝을 큐에서 제거하고 pastTexts에 추가", () => {
    let s = initialEngineState(tinyStory);
    expect(s.stepQueue).toHaveLength(1);
    s = storyReducer(s, { type: "TAP_ADVANCE" }, tinyStory);
    expect(s.stepQueue).toHaveLength(0);
    expect(s.pastTexts).toEqual(["hi"]);
    // 큐가 비었으면 TAP_ADVANCE 무시
    s = storyReducer(s, { type: "TAP_ADVANCE" }, tinyStory);
    expect(s.stepQueue).toHaveLength(0);
  });

  it("SCRIPT_DONE + jump는 sceneId·stepQueue 리셋", () => {
    const story: Story = {
      ...tinyStory,
      scenes: {
        a: { id: "a", steps: [] },
        b: { id: "b", steps: [{ type: "text", content: "bye" }] },
      },
    };
    let s = initialEngineState(story);
    s = storyReducer(
      s,
      { type: "SCRIPT_DONE", vars: { gold: 1 }, localVars: {}, jumpTo: "b" },
      story,
    );
    expect(s.sceneId).toBe("b");
    expect(s.stepQueue).toEqual([{ type: "text", content: "bye" }]);
    expect(s.pastTexts).toEqual([]);
    expect(s.vars.gold).toBe(1);
  });

  it("SCRIPT_DONE jump 없음이면 stepQueue 앞 제거", () => {
    const story: Story = {
      ...tinyStory,
      scenes: {
        a: {
          id: "a",
          steps: [
            { type: "script", code: "inc" },
            { type: "text", content: "hi" },
          ],
        },
      },
    };
    let s = initialEngineState(story);
    s = storyReducer(
      s,
      { type: "SCRIPT_DONE", vars: { hp: 5 }, localVars: {}, jumpTo: null },
      story,
    );
    expect(s.stepQueue).toEqual([{ type: "text", content: "hi" }]);
    expect(s.vars.hp).toBe(5);
  });

  it("USE_ITEM은 현재 choices 스텝을 소비하지 않는다", () => {
    const story: Story = {
      title: "item",
      start: "a",
      scenes: {
        a: {
          id: "a",
          steps: [
            {
              type: "choices",
              choices: [{ text: "끝내기", steps: [] }],
            },
          ],
        },
      },
      init: { hp: 3 },
    };
    let s = initialEngineState(story);
    s = {
      ...s,
      inventory: [
        {
          id: "potion",
          name: "회복 물약",
          quantity: 1,
          useCode: "heal(3)",
        },
      ],
    };

    s = applyStoryEvent(s, { type: "USE_ITEM", id: "potion" }, story);

    expect(s.vars.hp).toBe(6);
    expect(s.inventory).toEqual([]);
    expect(s.stepQueue[0]?.type).toBe("choices");
  });

  it("CHOOSE는 choice.steps를 큐 앞에 주입(choices 스텝 대체)", () => {
    const story: Story = {
      title: "t",
      start: "a",
      scenes: {
        a: {
          id: "a",
          steps: [
            {
              type: "choices",
              choices: [
                {
                  text: "go",
                  steps: [
                    { type: "text", content: "중간" },
                    { type: "script", code: 'jump("b")' },
                  ],
                },
              ],
            },
            { type: "text", content: "after" },
          ],
        },
        b: { id: "b", steps: [] },
      },
    };
    let s = initialEngineState(story);
    const choice = story.scenes.a?.steps[0] as Extract<
      (typeof story.scenes.a.steps)[0],
      { type: "choices" }
    >;
    s = applyStoryEvent(
      s,
      { type: "CHOOSE", choice: choice.choices[0] },
      story,
    );
    // choices 스텝이 choice.steps로 교체되고 "after" 스텝은 유지
    expect(s.stepQueue[0]).toEqual({ type: "text", content: "중간" });
    expect(s.stepQueue[1]).toEqual({ type: "script", code: 'jump("b")' });
    expect(s.stepQueue[2]).toEqual({ type: "text", content: "after" });
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
    },
    gameover: { id: "gameover", steps: [] },
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
        code: 'if (hp <= 0) jump("gameover")',
      },
      afterFruitLike,
    );
    // 스크립트 pop → 텍스트가 큐 앞
    expect(s.stepQueue[0]).toEqual({ type: "text", content: "열매 대사" });
    expect(s.sceneId).toBe("after_fruit");
    expect(s.vars.hp).toBe(10);

    s = storyReducer(s, { type: "TAP_ADVANCE" }, afterFruitLike);
    expect(s.stepQueue[0]).toEqual({ type: "script", code: 'inc("hp", 1)' });

    s = applyStoryEvent(
      s,
      { type: "RUN_SCRIPT", code: 'inc("hp", 1)' },
      afterFruitLike,
    );
    expect(s.vars.hp).toBe(11);
    expect(s.stepQueue).toHaveLength(0);
  });

  it("RUN_SCRIPT가 jump면 SCRIPT_DONE과 동일하게 씬 이동", () => {
    let s = initialEngineState(afterFruitLike);
    s = { ...s, vars: { hp: 0, gold: 0 } };
    s = applyStoryEvent(
      s,
      {
        type: "RUN_SCRIPT",
        code: 'if (hp <= 0) jump("gameover")',
      },
      afterFruitLike,
    );
    expect(s.sceneId).toBe("gameover");
    expect(s.stepQueue).toHaveLength(0);
  });
});
