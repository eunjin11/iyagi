/**
 * 스토리 DSL + `StoryEngineState`만으로 UI에 필요한 값을 만든다.
 * 리듀서/훅과 분리해 순수 함수로 두어 테스트·재사용하기 쉽게 함.
 */
import type { StoryEngineState } from "./storyReducer";
import type { Choice, Scene, Step, Story } from "./types";

export function emptyScene(id: string): Scene {
  return { id, steps: [], choices: [] };
}

export function deriveFromState(story: Story, state: StoryEngineState) {
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

export function firstTextInScene(story: Story, sceneId: string): string | null {
  const scene = story.scenes[sceneId];
  if (!scene) return null;
  for (const step of scene.steps) {
    if (step.type === "text" && step.content.trim() !== "") return step.content;
  }
  return null;
}
