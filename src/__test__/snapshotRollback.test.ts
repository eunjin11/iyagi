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
      choices: [],
    },
    b: {
      id: "b",
      steps: [{ type: "text", content: "bye" }],
      choices: [],
    },
  },
};

describe("snapshot rollback (SET_SNAPSHOT)", () => {
  it("다른 씬으로 간 뒤 SET_SNAPSHOT으로 sceneId/stepIndex/vars 복원이 된다", () => {
    const s0 = initialEngineState(story);
    // 초기 상태: a / 0 / init(vars 없음)
    expect(s0.sceneId).toBe("a");
    expect(s0.stepIndex).toBe(0);

    const snapshot = {
      sceneId: s0.sceneId,
      stepIndex: s0.stepIndex,
      vars: { ...s0.vars },
      storyLog: [...s0.storyLog],
    };

    // a(0) -> SCRIPT_DONE(jumpTo b)로 씬 이동 + vars 변경
    let s1 = { ...s0, sceneId: "a", stepIndex: 0 };
    s1 = storyReducer(
      s1,
      {
        type: "SCRIPT_DONE",
        context: "step",
        vars: { gold: 123 } satisfies VariableBag,
        jumpTo: "b",
      },
      story,
    );
    expect(s1.sceneId).toBe("b");
    expect(s1.stepIndex).toBe(0);
    expect(s1.vars.gold).toBe(123);

    // rollback
    const s2 = storyReducer(
      s1,
      {
        type: "SET_SNAPSHOT",
        snapshot,
      },
      story,
    );
    expect(s2.sceneId).toBe(snapshot.sceneId);
    expect(s2.stepIndex).toBe(snapshot.stepIndex);
    expect(s2.vars).toEqual(snapshot.vars);
  });

  it("rollback 후 TAP_ADVANCE는 스냅샷 stepIndex 기준으로 동작한다", () => {
    const s0 = initialEngineState(story);

    // s0: stepIndex 0
    const s1 = {
      ...s0,
      sceneId: "b",
      stepIndex: 1,
      vars: { gold: 1 },
    };

    const snapshot = {
      sceneId: s0.sceneId,
      stepIndex: s0.stepIndex,
      vars: { ...s0.vars },
      storyLog: [...s0.storyLog],
    };

    const rolledBack = storyReducer(
      s1,
      { type: "SET_SNAPSHOT", snapshot },
      story,
    );
    expect(rolledBack.sceneId).toBe("a");
    expect(rolledBack.stepIndex).toBe(0);

    const advanced = storyReducer(rolledBack, { type: "TAP_ADVANCE" }, story);
    expect(advanced.stepIndex).toBe(1);
  });
});
