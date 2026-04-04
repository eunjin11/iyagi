import { describe, expect, it } from "vitest";
import { initialEngineState, storyReducer } from "../story/storyReducer";
import type { Story, VariableBag } from "../story/types";

const story: Story = {
  title: "t",
  start: "a",
  scenes: {
    a: {
      id: "a",
      steps: [{ type: "text", content: "hi" }],
    },
    b: {
      id: "b",
      steps: [{ type: "text", content: "bye" }],
    },
  },
};

describe("snapshot rollback (SET_SNAPSHOT)", () => {
  it("다른 씬으로 간 뒤 SET_SNAPSHOT으로 sceneId/stepQueue/vars 복원이 된다", () => {
    const s0 = initialEngineState(story);
    expect(s0.sceneId).toBe("a");
    expect(s0.stepQueue).toEqual([{ type: "text", content: "hi" }]);

    const snapshot = {
      sceneId: s0.sceneId,
      stepQueue: [...s0.stepQueue],
      pastTexts: [...s0.pastTexts],
      vars: { ...s0.vars },
      storyLog: [...s0.storyLog],
    };

    // a -> SCRIPT_DONE(jumpTo b)로 씬 이동 + vars 변경
    const s1 = storyReducer(
      s0,
      {
        type: "SCRIPT_DONE",
        vars: { gold: 123 } satisfies VariableBag,
        jumpTo: "b",
      },
      story,
    );
    expect(s1.sceneId).toBe("b");
    expect(s1.stepQueue).toEqual([{ type: "text", content: "bye" }]);
    expect(s1.vars.gold).toBe(123);

    // rollback
    const s2 = storyReducer(s1, { type: "SET_SNAPSHOT", snapshot }, story);
    expect(s2.sceneId).toBe(snapshot.sceneId);
    expect(s2.stepQueue).toEqual(snapshot.stepQueue);
    expect(s2.vars).toEqual(snapshot.vars);
  });

  it("rollback 후 TAP_ADVANCE는 스냅샷 stepQueue 기준으로 동작한다", () => {
    const s0 = initialEngineState(story);

    const snapshot = {
      sceneId: s0.sceneId,
      stepQueue: [...s0.stepQueue],
      pastTexts: [...s0.pastTexts],
      vars: { ...s0.vars },
      storyLog: [...s0.storyLog],
    };

    // 씬 이동 후 롤백
    const s1 = storyReducer(
      s0,
      { type: "SCRIPT_DONE", vars: { gold: 1 }, jumpTo: "b" },
      story,
    );
    const rolledBack = storyReducer(
      s1,
      { type: "SET_SNAPSHOT", snapshot },
      story,
    );
    expect(rolledBack.sceneId).toBe("a");
    expect(rolledBack.stepQueue).toHaveLength(1);

    const advanced = storyReducer(rolledBack, { type: "TAP_ADVANCE" }, story);
    expect(advanced.stepQueue).toHaveLength(0);
    expect(advanced.pastTexts).toEqual(["hi"]);
  });
});
