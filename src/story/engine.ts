import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  deleteSavedSnapshot,
  listSavedSnapshots,
  type SavedSnapshot,
  saveSnapshot,
} from "./snapshots";
import {
  applyStoryEvent,
  initialEngineState,
  type StoryEngineState,
  type StoryEvent,
} from "./storyReducer";
import type { Choice, Scene, Step, Story } from "./types";

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function emptyScene(id: string): Scene {
  return { id, steps: [], choices: [] };
}

function deriveFromState(story: Story, state: StoryEngineState) {
  const scene: Scene = story.scenes[state.sceneId] ?? emptyScene(state.sceneId);
  const steps = scene.steps;

  const at = steps[state.stepIndex];
  const currentStep: Extract<Step, { type: "text" }> | null =
    at?.type === "text" ? at : null;
  const isDone = state.stepIndex >= steps.length;

  const pastTexts: string[] = [];
  for (let i = 0; i < state.stepIndex; i++) {
    const s = steps[i];
    if (s.type === "text") pastTexts.push(s.content);
  }

  const choices: Choice[] = isDone ? scene.choices : [];

  return { scene, steps, currentStep, isDone, pastTexts, choices };
}

function firstTextInScene(story: Story, sceneId: string): string | null {
  const scene = story.scenes[sceneId];
  if (!scene) return null;
  for (const step of scene.steps) {
    if (step.type === "text" && step.content.trim() !== "") return step.content;
  }
  return null;
}

// ---------------------------------------------------------------------------
// hook
// ---------------------------------------------------------------------------

export function useStoryEngine(story: Story) {
  const stateRef = useRef<StoryEngineState>(initialEngineState(story));

  const [state, dispatchReducer] = useReducer(
    (s: StoryEngineState, e: StoryEvent) => applyStoryEvent(s, e, story),
    story,
    initialEngineState,
  );

  stateRef.current = state;

  const dispatch = useCallback((e: StoryEvent) => {
    dispatchReducer(e);
  }, []);

  const { scene, steps, currentStep, isDone, pastTexts, choices } =
    deriveFromState(story, state);

  // script step: 대사 뒤에 오는 `inc(...)` 등은 텍스트 스텝을 TAP_ADVANCE로 지난 뒤 이 인덱스에서 실행됨
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

  const save = useCallback((): SavedSnapshot => {
    const s = stateRef.current;
    const label =
      firstTextInScene(story, s.sceneId)?.slice(0, 40) ??
      `${s.sceneId} @${s.stepIndex}`;
    return saveSnapshot(label, s);
  }, [story]);

  const listSaves = useCallback((): SavedSnapshot[] => {
    return listSavedSnapshots();
  }, []);

  const load = useCallback(
    (entry: SavedSnapshot) => {
      dispatch({ type: "SET_SNAPSHOT", snapshot: entry.snapshot });
    },
    [dispatch],
  );

  const deleteSave = useCallback((id: string) => {
    deleteSavedSnapshot(id);
  }, []);

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
    save,
    listSaves,
    load,
    deleteSave,
  };
}
