import type { Story } from "./types";

/** `src/scenarios/*.iyagi` — 빌드 타임에 Story JSON으로 변환됨 */
const scenarioStories = import.meta.glob("../scenarios/*.iyagi", {
  eager: true,
  import: "default",
}) as Record<string, Story>;

const fallback: Story = {
  title: "Demo",
  start: "start",
  init: {},
  scenes: {
    start: {
      id: "start",
      steps: [
        {
          type: "text",
          content: "src/scenarios/ 에 .iyagi 파일을 추가하세요.",
        },
      ],
    },
  },
};

export type StoryEntry = {
  id: string;
  story: Story;
};

function storyIdFromPath(path: string): string {
  return (
    path
      .split("/")
      .pop()
      ?.replace(/\.iyagi$/i, "") ?? path
  );
}

function resolveStoryEntries(): StoryEntry[] {
  const entries = Object.entries(scenarioStories);
  if (entries.length === 0) return [{ id: "fallback", story: fallback }];
  entries.sort(([a], [b]) => a.localeCompare(b));
  return entries.map(([path, story]) => ({
    id: storyIdFromPath(path),
    story,
  }));
}

export const storyCatalog: StoryEntry[] = resolveStoryEntries();

/** 기존 단일 스토리 사용처와의 호환을 위한 기본 스토리. */
export const defaultStoryEntry =
  storyCatalog.find((entry) => entry.id === "demo") ?? storyCatalog[0];
export const currentStory: Story = defaultStoryEntry.story;

export function getStoryEntry(id: string | undefined): StoryEntry {
  return storyCatalog.find((entry) => entry.id === id) ?? defaultStoryEntry;
}
