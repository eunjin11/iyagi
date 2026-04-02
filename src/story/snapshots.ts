import type { StoryEngineState } from "./storyReducer";

export type SavedSnapshot = {
  id: string;
  createdAt: number;
  label: string;
  snapshot: StoryEngineState;
};

const STORAGE_KEY = "iyagi:snapshots:v1";

function safeParseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function listSavedSnapshots(): SavedSnapshot[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  const parsed = safeParseJson<unknown>(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed as SavedSnapshot[];
}

function writeAll(next: SavedSnapshot[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function saveSnapshot(
  label: string,
  snapshot: StoryEngineState,
): SavedSnapshot {
  if (typeof window === "undefined") {
    throw new Error("saveSnapshot: window is undefined");
  }
  const prev = listSavedSnapshots();
  const entry: SavedSnapshot = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: Date.now(),
    label,
    snapshot,
  };
  writeAll([entry, ...prev]);
  return entry;
}

export function deleteSavedSnapshot(id: string): void {
  if (typeof window === "undefined") return;
  const prev = listSavedSnapshots();
  writeAll(prev.filter((s) => s.id !== id));
}
