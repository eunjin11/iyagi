import { useCallback, useEffect, useReducer, useRef } from "react";
import { deriveFromState } from "../story/engineDerived";
import type { StoryLogEntry } from "../story/storyLog";
import {
  applyStoryEvent,
  initialEngineState,
  type StoryEngineState,
  type StoryEvent,
} from "../story/storyReducer";
import type { Choice, Scene, Story } from "../story/types";

export type StoryPlayPersistence = {
  dispatch: (e: StoryEvent) => void;
  getEngineState: () => StoryEngineState;
};

export type StoryPlay = {
  story: Story;
  scene: Scene;
  currentStep: ReturnType<typeof deriveFromState>["currentStep"];
  pastTexts: string[];
  isDone: boolean;
  choices: Choice[];
  vars: StoryEngineState["vars"];
  localVars: StoryEngineState["localVars"];
  inventory: NonNullable<StoryEngineState["inventory"]>;
  storyLog: StoryLogEntry[];
  advance: () => void;
  choose: (choice: Choice) => void;
  useItem: (id: string) => void;
  dropItem: (id: string, quantity?: number) => void;
  persistence: StoryPlayPersistence;
};

type StoryPlayInit = { story: Story; resume: StoryEngineState | null };

function initStoryPlayState({
  story,
  resume,
}: StoryPlayInit): StoryEngineState {
  return resume ?? initialEngineState(story);
}

export function useStoryPlay(
  story: Story,
  resumeState: StoryEngineState | null = null,
): StoryPlay {
  const stateRef = useRef<StoryEngineState>(
    initStoryPlayState({ story, resume: resumeState }),
  );

  const [state, dispatchReducer] = useReducer(
    (s: StoryEngineState, e: StoryEvent) => applyStoryEvent(s, e, story),
    { story, resume: resumeState } satisfies StoryPlayInit,
    initStoryPlayState,
  );

  stateRef.current = state;

  const dispatch = useCallback((e: StoryEvent) => {
    dispatchReducer(e);
  }, []);

  const getEngineState = useCallback(() => stateRef.current, []);

  const { scene, currentStep, isDone, pastTexts, choices } = deriveFromState(
    story,
    state,
  );

  // script / conditional 스텝은 자동 실행
  useEffect(() => {
    const step = state.stepQueue[0];
    if (step?.type === "script") {
      dispatch({ type: "RUN_SCRIPT", code: step.code });
    } else if (step?.type === "conditional") {
      dispatch({ type: "EVAL_CONDITIONAL" });
    }
  }, [dispatch, state.stepQueue]);

  function advance() {
    dispatch({ type: "TAP_ADVANCE" });
  }

  function choose(choice: Choice) {
    dispatch({ type: "CHOOSE", choice });
  }

  function useItem(id: string) {
    dispatch({ type: "USE_ITEM", id });
  }

  function dropItem(id: string, quantity = 1) {
    dispatch({ type: "DROP_ITEM", id, quantity });
  }

  return {
    story,
    scene,
    currentStep,
    pastTexts,
    isDone,
    choices,
    vars: state.vars,
    localVars: state.localVars,
    inventory: state.inventory ?? [],
    storyLog: state.storyLog,
    advance,
    choose,
    useItem,
    dropItem,
    persistence: { dispatch, getEngineState },
  };
}
