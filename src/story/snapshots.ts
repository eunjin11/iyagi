import type { StoryEngineState } from "./storyReducer";
import type { Choice, Step } from "./types";

export type SavedSnapshot = {
  id: string;
  createdAt: number;
  label: string;
  /** 어떤 .iyagi 스토리에서 만든 저장인지 식별한다. */
  storyId?: string;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isVariableBag(value: unknown): boolean {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (item) =>
        typeof item === "number" ||
        typeof item === "string" ||
        typeof item === "boolean",
    )
  );
}

function isStoryLogEntry(value: unknown): boolean {
  if (!isRecord(value) || typeof value.sceneId !== "string") return false;
  if (value.kind === "enterScene") return true;
  if (value.kind === "text") return typeof value.content === "string";
  if (value.kind === "script") return typeof value.code === "string";
  return value.kind === "choice" && typeof value.text === "string";
}

function isStepList(value: unknown): boolean {
  return Array.isArray(value) && value.every(isStep);
}

type FieldValidators<T> = {
  [K in keyof T]-?: (value: unknown) => boolean;
};

function validateFields(
  value: Record<string, unknown>,
  validators: Record<string, (value: unknown) => boolean>,
): boolean {
  return Object.entries(validators).every(([key, validate]) =>
    validate(value[key]),
  );
}

const choiceValidators = {
  text: (value) => typeof value === "string",
  steps: isStepList,
  enabledWhen: (value) => value === undefined || typeof value === "string",
} satisfies FieldValidators<Choice>;

function isChoice(value: unknown): boolean {
  return isRecord(value) && validateFields(value, choiceValidators);
}

// New step kinds or fields require a validator at compile time.
type StepValidators = {
  [K in Step["type"]]: FieldValidators<
    Omit<Extract<Step, { type: K }>, "type">
  >;
};

const stepValidators = {
  text: { content: (value) => typeof value === "string" },
  script: { code: (value) => typeof value === "string" },
  choices: {
    choices: (value) => Array.isArray(value) && value.every(isChoice),
  },
  conditional: {
    cond: (value) => typeof value === "string",
    thenSteps: isStepList,
    elseSteps: isStepList,
  },
} satisfies StepValidators;

function isStep(value: unknown): boolean {
  if (!isRecord(value) || typeof value.type !== "string") return false;
  if (!Object.keys(stepValidators).includes(value.type)) return false;
  return validateFields(value, stepValidators[value.type as Step["type"]]);
}

function isSavedSnapshot(value: unknown): value is SavedSnapshot {
  if (!isRecord(value)) return false;
  if (
    typeof value.id !== "string" ||
    typeof value.createdAt !== "number" ||
    !Number.isFinite(value.createdAt) ||
    typeof value.label !== "string" ||
    (value.storyId !== undefined && typeof value.storyId !== "string")
  ) {
    return false;
  }

  const snapshot = value.snapshot;
  if (!isRecord(snapshot)) return false;
  return (
    typeof snapshot.sceneId === "string" &&
    isStepList(snapshot.stepQueue) &&
    Array.isArray(snapshot.pastTexts) &&
    snapshot.pastTexts.every((text) => typeof text === "string") &&
    isVariableBag(snapshot.vars) &&
    isVariableBag(snapshot.localVars) &&
    Array.isArray(snapshot.storyLog) &&
    snapshot.storyLog.every(isStoryLogEntry)
  );
}

export function listSavedSnapshots(): SavedSnapshot[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  const parsed = safeParseJson<unknown>(raw);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isSavedSnapshot);
}

function writeAll(next: SavedSnapshot[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function saveSnapshot(
  label: string,
  snapshot: StoryEngineState,
  storyId: string,
): SavedSnapshot {
  if (typeof window === "undefined") {
    throw new Error("saveSnapshot: window is undefined");
  }
  const prev = listSavedSnapshots();
  const entry: SavedSnapshot = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    createdAt: Date.now(),
    label,
    storyId,
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
