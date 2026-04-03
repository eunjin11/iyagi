import type { Story } from "./types";

/** `src/scenarios/*.iyagi` — 빌드 타임에 Story JSON으로 변환됨 */
const scenarioStories = import.meta.glob("../scenarios/*.iyagi", {
  eager: true,
  import: "default",
}) as Record<string, Story>;

let resolved: Story | undefined;

if (Object.keys(scenarioStories).length > 0) {
  const entries = Object.entries(scenarioStories);
  entries.sort(([a], [b]) => a.localeCompare(b));
  resolved = entries[0]?.[1];
}

if (!resolved) {
  resolved = {
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
        choices: [],
      },
    },
  };
}

export const currentStory: Story = resolved;
