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
  storyLog: StoryLogEntry[];
  advance: () => void;
  choose: (choice: Choice) => void;
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

  const { scene, steps, currentStep, isDone, pastTexts, choices } =
    deriveFromState(story, state);

  useEffect(() => {
    const step = steps[state.stepIndex];
    if (!step || step.type !== "script") return;

    dispatch({ type: "RUN_SCRIPT", context: "step", code: step.code });
  }, [dispatch, steps, state.stepIndex]);

  function advance() {
    dispatch({ type: "TAP_ADVANCE" });
  }

  function choose(choice: Choice) {
    dispatch({ type: "CHOOSE", choice });
  }

  return {
    story,
    scene,
    currentStep,
    pastTexts,
    isDone,
    choices,
    vars: state.vars,
    storyLog: state.storyLog,
    advance,
    choose,
    persistence: { dispatch, getEngineState },
  };
}
