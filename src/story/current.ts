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

function resolveStory(): Story {
  const entries = Object.entries(scenarioStories);
  if (entries.length === 0) return fallback;
  entries.sort(([a], [b]) => a.localeCompare(b));
  return entries[0]?.[1] ?? fallback;
}

export const currentStory: Story = resolveStory();
