import { evalStoryCondition } from "./evalWhen";
import { runScriptWithResult } from "./runScriptWithResult";
import type { StoryLogEntry } from "./storyLog";
import type { Choice, InventoryItem, Step, Story, VariableBag } from "./types";

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
  /** scene-scoped 로컬 변수. scene jump 시 초기화된다. */
  localVars: VariableBag;
  inventory?: InventoryItem[];
  storyLog: StoryLogEntry[];
};

/** `useReducer`에만 넘기는 순수 전이 (스크립트 실행 없음). */
export type StoryReducerEvent =
  | { type: "TAP_ADVANCE" }
  | {
      type: "SCRIPT_DONE";
      code?: string;
      vars: VariableBag;
      localVars: VariableBag;
      inventory?: InventoryItem[];
      jumpTo: string | null;
      /** 스크립트 실행 중 액션이 주입한 스텝 (예: rollAttack 결과 텍스트). */
      injectedSteps?: Step[];
      /** 아이템 사용처럼 현재 스텝을 소비하지 않는 스크립트인지 여부. */
      consumeCurrentStep?: boolean;
    }
  /** 엔진 스냅샷을 그대로 덮어씌운다(롤백/리플레이용). */
  | { type: "SET_SNAPSHOT"; snapshot: StoryEngineState };

export type StoryEvent =
  | StoryReducerEvent
  | { type: "RUN_SCRIPT"; code: string }
  | { type: "CHOOSE"; choice: Choice }
  | { type: "USE_ITEM"; id: string }
  | { type: "DROP_ITEM"; id: string; quantity?: number }
  | { type: "EVAL_CONDITIONAL" };

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
        localVars: event.localVars,
        inventory: event.inventory ?? state.inventory ?? [],
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
          localVars: {},
          storyLog: [
            ...nextBase.storyLog,
            { kind: "enterScene", sceneId: event.jumpTo },
          ],
        };
      }

      const remaining =
        event.consumeCurrentStep === false
          ? state.stepQueue
          : state.stepQueue.slice(1);
      const newQueue = event.injectedSteps?.length
        ? [...event.injectedSteps, ...remaining]
        : remaining;
      return { ...nextBase, stepQueue: newQueue };
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
  if (event.type === "EVAL_CONDITIONAL") {
    const step = state.stepQueue[0];
    if (step?.type !== "conditional") return state;
    const chosen = evalStoryCondition(step.cond, state)
      ? step.thenSteps
      : step.elseSteps;
    return { ...state, stepQueue: [...chosen, ...state.stepQueue.slice(1)] };
  }
  if (event.type === "USE_ITEM") {
    const item = state.inventory?.find(
      (candidate) => candidate.id === event.id,
    );
    if (!item?.useAction?.trim()) return state;
    const { vars, localVars, inventory, jumpTo, injectedSteps } =
      runScriptWithResult(
        `useItem(${JSON.stringify(event.id)})`,
        state.vars,
        story.varDefs,
        state.localVars,
        state.inventory,
      );
    return storyReducer(
      state,
      {
        type: "SCRIPT_DONE",
        code: `useItem(${JSON.stringify(event.id)})`,
        vars,
        localVars,
        inventory,
        jumpTo,
        injectedSteps,
        consumeCurrentStep: false,
      },
      story,
    );
  }
  if (event.type === "DROP_ITEM") {
    const amount = Math.max(1, Math.floor(Number(event.quantity) || 1));
    const inventory = (state.inventory ?? [])
      .map((item) =>
        item.id === event.id
          ? { ...item, quantity: item.quantity - amount }
          : item,
      )
      .filter((item) => item.quantity > 0);
    return { ...state, inventory };
  }
  if (event.type === "RUN_SCRIPT") {
    const { vars, localVars, inventory, jumpTo, injectedSteps } =
      runScriptWithResult(
        event.code,
        state.vars,
        story.varDefs,
        state.localVars,
        state.inventory,
      );
    return storyReducer(
      state,
      {
        type: "SCRIPT_DONE",
        code: event.code,
        vars,
        localVars,
        inventory,
        jumpTo,
        injectedSteps,
      },
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
    localVars: {},
    inventory: [],
    storyLog: [{ kind: "enterScene", sceneId: story.start }],
  };
}
