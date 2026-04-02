import type { StoryEngineState } from "../story/storyReducer";
import type { Story } from "../story/types";
import { useSaveEngine } from "./useSaveEngine";
import { useStoryPlay } from "./useStoryPlay";

export type { SaveEngineApi } from "./useSaveEngine";
export type { StoryPlay } from "./useStoryPlay";

export function useStoryEngine(
  story: Story,
  resumeState: StoryEngineState | null = null,
) {
  const { persistence, ...play } = useStoryPlay(story, resumeState);
  const saves = useSaveEngine(story, persistence);
  return { play, saves };
}
