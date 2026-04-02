import { useCallback } from "react";
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
): SaveEngineApi {
  const { dispatch, getEngineState } = persistence;

  const save = useCallback((): SavedSnapshot => {
    const s = getEngineState();
    const label =
      firstTextInScene(story, s.sceneId)?.slice(0, 40) ??
      `${s.sceneId} @${s.stepIndex}`;
    return saveSnapshot(label, s);
  }, [story, getEngineState]);

  const listSaves = useCallback(
    (): SavedSnapshot[] => listSavedSnapshots(),
    [],
  );

  const load = useCallback(
    (entry: SavedSnapshot) => {
      dispatch({ type: "SET_SNAPSHOT", snapshot: entry.snapshot });
    },
    [dispatch],
  );

  const deleteSave = useCallback((id: string) => {
    deleteSavedSnapshot(id);
  }, []);

  return { save, listSaves, load, deleteSave };
}
