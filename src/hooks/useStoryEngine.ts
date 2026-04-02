import type { Story } from "../story/types";
import { useSaveEngine } from "./useSaveEngine";
import { useStoryPlay } from "./useStoryPlay";

export type { SaveEngineApi } from "./useSaveEngine";
export type { StoryPlay } from "./useStoryPlay";

export function useStoryEngine(story: Story) {
  const { persistence, ...play } = useStoryPlay(story);
  const saves = useSaveEngine(story, persistence);
  return { play, saves };
}
