import type { StoryEngineState } from "../story/storyReducer";
import type { Story } from "../story/types";
import { useSaveEngine } from "./useSaveEngine";
import { useStoryPlay } from "./useStoryPlay";

export type { SaveEngineApi } from "./useSaveEngine";
export type { StoryPlay } from "./useStoryPlay";

export function useStoryEngine(
  story: Story,
  resumeState: StoryEngineState | null = null,
  storyId: string,
) {
  const { persistence, ...play } = useStoryPlay(story, resumeState);
  const saves = useSaveEngine(story, persistence, storyId);
  return { play, saves };
}
