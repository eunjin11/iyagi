import type { Scene, Story, VariableBag } from './types';
import { runScriptWithResult } from './runScriptWithResult';

// ---------------------------------------------------------------------------
// state / events
// ---------------------------------------------------------------------------

export type StoryEngineState = {
  sceneId: string;
  stepIndex: number;
  vars: VariableBag;
};

/** `useReducer`에만 넘기는 순수 전이 (스크립트 실행 없음). */
export type StoryReducerEvent =
  | { type: 'TAP_ADVANCE' }
  | {
      type: 'SCRIPT_DONE';
      context: 'step' | 'choice';
      vars: VariableBag;
      jumpTo: string | null;
    };

/**
 * 엔진·테스트용 입력. `RUN_SCRIPT`는 실행 외부에서 `runScriptWithResult`로
 * `SCRIPT_DONE`으로 접힌 뒤 reducer에 들어간다.
 */
export type StoryEvent =
  | StoryReducerEvent
  | { type: 'RUN_SCRIPT'; context: 'step' | 'choice'; code: string };

function emptyScene(id: string): Scene {
  return { id, steps: [], choices: [] };
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
    case 'TAP_ADVANCE': {
      const scene = story.scenes[state.sceneId] ?? emptyScene(state.sceneId);
      const step = scene.steps[state.stepIndex];
      if (!step || step.type !== 'text') return state;
      return { ...state, stepIndex: state.stepIndex + 1 };
    }

    case 'SCRIPT_DONE': {
      const next: StoryEngineState = { ...state, vars: event.vars };
      if (event.jumpTo) {
        return { ...next, sceneId: event.jumpTo, stepIndex: 0 };
      }
      if (event.context === 'step') {
        return { ...next, stepIndex: state.stepIndex + 1 };
      }
      return next;
    }
  }
}

/** `RUN_SCRIPT` 포함 — 스크립트 실행 후 reducer 한 번. */
export function applyStoryEvent(
  state: StoryEngineState,
  event: StoryEvent,
  story: Story,
): StoryEngineState {
  if (event.type === 'RUN_SCRIPT') {
    const { vars, jumpTo } = runScriptWithResult(event.code, state.vars);
    return storyReducer(
      state,
      { type: 'SCRIPT_DONE', context: event.context, vars, jumpTo },
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
  };
}
