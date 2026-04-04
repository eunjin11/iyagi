import { runScriptWithResult } from "./runScriptWithResult";
import type { StoryLogEntry } from "./storyLog";
import type { Choice, Step, Story, VariableBag } from "./types";

// ---------------------------------------------------------------------------
// state / events
// ---------------------------------------------------------------------------

export type StoryEngineState = {
  sceneId: string;
  /** 처리할 남은 스텝 큐. 앞에서 꺼내며 진행한다. */
  stepQueue: Step[];
  /** 현재 씬(+주입된 choice steps)에서 이미 표시된 텍스트 목록. */
  pastTexts: string[];
  vars: VariableBag;
  storyLog: StoryLogEntry[];
};

/** `useReducer`에만 넘기는 순수 전이 (스크립트 실행 없음). */
export type StoryReducerEvent =
  | { type: "TAP_ADVANCE" }
  | {
      type: "SCRIPT_DONE";
      code?: string;
      vars: VariableBag;
      jumpTo: string | null;
    }
  /** 엔진 스냅샷을 그대로 덮어씌운다(롤백/리플레이용). */
  | { type: "SET_SNAPSHOT"; snapshot: StoryEngineState };

export type StoryEvent =
  | StoryReducerEvent
  | { type: "RUN_SCRIPT"; code: string }
  | { type: "CHOOSE"; choice: Choice };

// ---------------------------------------------------------------------------
// reducer
// ---------------------------------------------------------------------------

export function storyReducer(
  state: StoryEngineState,
  event: StoryReducerEvent,
  story: Story,
): StoryEngineState {
  switch (event.type) {
    case "SET_SNAPSHOT": {
      return event.snapshot;
    }
    case "TAP_ADVANCE": {
      const step = state.stepQueue[0];
      if (!step || step.type !== "text") return state;
      return {
        ...state,
        stepQueue: state.stepQueue.slice(1),
        pastTexts: [...state.pastTexts, step.content],
        storyLog: [
          ...state.storyLog,
          { kind: "text", sceneId: state.sceneId, content: step.content },
        ],
      };
    }
    case "SCRIPT_DONE": {
      const logs: StoryLogEntry[] = event.code
        ? [{ kind: "script", sceneId: state.sceneId, code: event.code }]
        : [];

      const nextBase: StoryEngineState = {
        ...state,
        vars: event.vars,
        storyLog:
          logs.length > 0 ? [...state.storyLog, ...logs] : state.storyLog,
      };

      if (event.jumpTo) {
        const nextScene = story.scenes[event.jumpTo];
        return {
          ...nextBase,
          sceneId: event.jumpTo,
          stepQueue: nextScene ? [...nextScene.steps] : [],
          pastTexts: [],
          storyLog: [
            ...nextBase.storyLog,
            { kind: "enterScene", sceneId: event.jumpTo },
          ],
        };
      }

      return { ...nextBase, stepQueue: state.stepQueue.slice(1) };
    }
  }
}

/** `RUN_SCRIPT`·`CHOOSE` 포함 — 스크립트 실행 후 reducer 한 번. */
export function applyStoryEvent(
  state: StoryEngineState,
  event: StoryEvent,
  story: Story,
): StoryEngineState {
  if (event.type === "CHOOSE") {
    return {
      ...state,
      stepQueue: [...event.choice.steps, ...state.stepQueue.slice(1)],
      storyLog: [
        ...state.storyLog,
        { kind: "choice", sceneId: state.sceneId, text: event.choice.text },
      ],
    };
  }
  if (event.type === "RUN_SCRIPT") {
    const { vars, jumpTo } = runScriptWithResult(
      event.code,
      state.vars,
      story.varDefs,
    );
    return storyReducer(
      state,
      { type: "SCRIPT_DONE", code: event.code, vars, jumpTo },
      story,
    );
  }
  return storyReducer(state, event, story);
}

export function initialEngineState(story: Story): StoryEngineState {
  const scene = story.scenes[story.start];
  return {
    sceneId: story.start,
    stepQueue: scene ? [...scene.steps] : [],
    pastTexts: [],
    vars: { ...(story.init ?? {}) },
    storyLog: [{ kind: "enterScene", sceneId: story.start }],
  };
}
