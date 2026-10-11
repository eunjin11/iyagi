import { useCallback } from "react";
import { defaultStoryEntry } from "../story/current";
import { firstTextInScene } from "../story/engineDerived";
import {
  deleteSavedSnapshot,
  listSavedSnapshots,
  type SavedSnapshot,
  saveSnapshot,
} from "../story/snapshots";
import type { Story } from "../story/types";
import type { StoryPlayPersistence } from "./useStoryPlay";

export type SaveEngineApi = {
  save: () => SavedSnapshot;
  listSaves: () => SavedSnapshot[];
  load: (entry: SavedSnapshot) => void;
  deleteSave: (id: string) => void;
};

export function useSaveEngine(
  story: Story,
  persistence: StoryPlayPersistence,
  storyId: string,
): SaveEngineApi {
  const { dispatch, getEngineState } = persistence;

  const save = useCallback((): SavedSnapshot => {
    const s = getEngineState();
    const label =
      firstTextInScene(story, s.sceneId)?.slice(0, 40) ??
      `${s.sceneId} @${s.stepQueue.length}`;
    return saveSnapshot(label, s, storyId);
  }, [story, storyId, getEngineState]);

  const listSaves = useCallback(
    (): SavedSnapshot[] =>
      listSavedSnapshots().filter(
        (entry) => (entry.storyId ?? defaultStoryEntry.id) === storyId,
      ),
    [storyId],
  );

  const load = useCallback(
    (entry: SavedSnapshot) => {
      const entryStoryId = entry.storyId ?? defaultStoryEntry.id;
      if (entryStoryId !== storyId) return;
      dispatch({ type: "SET_SNAPSHOT", snapshot: entry.snapshot });
    },
    [dispatch, storyId],
  );

  const deleteSave = useCallback((id: string) => {
    deleteSavedSnapshot(id);
  }, []);

  return { save, listSaves, load, deleteSave };
}
