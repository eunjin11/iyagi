/**
 * 스토리 DSL + `StoryEngineState`만으로 UI에 필요한 값을 만든다.
 * 리듀서/훅과 분리해 순수 함수로 두어 테스트·재사용하기 쉽게 함.
 */
import type { StoryEngineState } from "./storyReducer";
import type { Choice, Scene, Story } from "./types";

export function deriveFromState(story: Story, state: StoryEngineState) {
  const scene: Scene = story.scenes[state.sceneId] ?? {
    id: state.sceneId,
    steps: [],
  };
  const cur = state.stepQueue[0];
  const isDone = state.stepQueue.length === 0;
  const choices: Choice[] = cur?.type === "choices" ? cur.choices : [];
  const currentStep =
    cur?.type === "text"
      ? (cur as Extract<typeof cur, { type: "text" }>)
      : null;

  return { scene, currentStep, isDone, pastTexts: state.pastTexts, choices };
}

export function firstTextInScene(story: Story, sceneId: string): string | null {
  const scene = story.scenes[sceneId];
  if (!scene) return null;
  for (const step of scene.steps) {
    if (step.type === "text" && step.content.trim() !== "") return step.content;
  }
  return null;
}
