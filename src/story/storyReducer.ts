import { runScriptWithResult } from "./runScriptWithResult";
import type { StoryLogEntry } from "./storyLog";
import type { Choice, Scene, Step, Story, VariableBag } from "./types";

// ---------------------------------------------------------------------------
// state / events
// ---------------------------------------------------------------------------

export type StoryEngineState = {
  sceneId: string;
  stepIndex: number;
  vars: VariableBag;
  storyLog: StoryLogEntry[];
};

/** `useReducer`에만 넘기는 순수 전이 (스크립트 실행 없음). */
export type StoryReducerEvent =
  | { type: "TAP_ADVANCE" }
  | {
      type: "SCRIPT_DONE";
      context: "step" | "choice";
      code?: string;
      vars: VariableBag;
      jumpTo: string | null;
    }
  /** 엔진 스냅샷을 그대로 덮어씌운다(롤백/리플레이용). */
  | { type: "SET_SNAPSHOT"; snapshot: StoryEngineState };

/**
 * 엔진·테스트용 입력. `RUN_SCRIPT`는 실행 외부에서 `runScriptWithResult`로
 * `SCRIPT_DONE`으로 접힌 뒤 reducer에 들어간다.
 */
export type StoryEvent =
  | StoryReducerEvent
  | { type: "RUN_SCRIPT"; context: "step" | "choice"; code: string }
  | { type: "CHOOSE"; choice: Choice };

function emptyScene(id: string): Scene {
  return { id, steps: [], choices: [] };
}

function resolveStep(scene: Scene, stepIndex: number): Step | undefined {
  const { steps, choicesAt } = scene;
  if (choicesAt === undefined) return steps[stepIndex];
  if (stepIndex < choicesAt) return steps[stepIndex];
  if (stepIndex === choicesAt) return undefined;
  return steps[stepIndex - 1];
}

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
      const scene = story.scenes[state.sceneId] ?? emptyScene(state.sceneId);
      const step = resolveStep(scene, state.stepIndex);
      if (!step || step.type !== "text") return state;
      const nextLog: StoryLogEntry = {
        kind: "text",
        sceneId: state.sceneId,
        content: step.content,
      };
      return {
        ...state,
        stepIndex: state.stepIndex + 1,
        storyLog: [...state.storyLog, nextLog],
      };
    }

    case "SCRIPT_DONE": {
      const logs: StoryLogEntry[] = [];
      if (event.context === "step" && event.code) {
        logs.push({ kind: "script", sceneId: state.sceneId, code: event.code });
      }

      const nextBase: StoryEngineState = {
        ...state,
        vars: event.vars,
        storyLog:
          logs.length > 0 ? [...state.storyLog, ...logs] : state.storyLog,
      };
      if (event.jumpTo) {
        return {
          ...nextBase,
          sceneId: event.jumpTo,
          stepIndex: 0,
          storyLog: [
            ...nextBase.storyLog,
            { kind: "enterScene", sceneId: event.jumpTo },
          ],
        };
      }
      if (event.context === "step") {
        return { ...nextBase, stepIndex: state.stepIndex + 1 };
      }
      // choice context: advance into post-steps if scene has choicesAt
      const scene = story.scenes[state.sceneId] ?? emptyScene(state.sceneId);
      if (scene.choicesAt !== undefined) {
        return { ...nextBase, stepIndex: state.stepIndex + 1 };
      }
      return nextBase;
    }
  }
}

/** `RUN_SCRIPT` 포함 — 스크립트 실행 후 reducer 한 번. */
export function applyStoryEvent(
  state: StoryEngineState,
  event: StoryEvent,
  story: Story,
): StoryEngineState {
  if (event.type === "CHOOSE") {
    const next: StoryEngineState = {
      ...state,
      storyLog: [
        ...state.storyLog,
        {
          kind: "choice",
          sceneId: state.sceneId,
          text: event.choice.text,
          script: event.choice.script,
        },
      ],
    };
    return applyStoryEvent(
      next,
      { type: "RUN_SCRIPT", context: "choice", code: event.choice.script },
      story,
    );
  }
  if (event.type === "RUN_SCRIPT") {
    const { vars, jumpTo } = runScriptWithResult(
      event.code,
      state.vars,
      story.varDefs,
    );
    return storyReducer(
      state,
      {
        type: "SCRIPT_DONE",
        context: event.context,
        code: event.code,
        vars,
        jumpTo,
      },
      story,
    );
  }
  return storyReducer(state, event, story);
}

export function initialEngineState(story: Story): StoryEngineState {
  return {
    sceneId: story.start,
    stepIndex: 0,
    vars: { ...(story.init ?? {}) },
    storyLog: [{ kind: "enterScene", sceneId: story.start }],
  };
}
