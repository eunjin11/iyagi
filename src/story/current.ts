import { parseDSL } from '../parser/parseScene';
import type { Story } from './types';

/** `src/scenarios/*.iyagi` — 로컬 시나리오 */
const scenarioRawStories = import.meta.glob('../scenarios/*.iyagi', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

/** `.iyagi` 파일 경로에서 표시용 제목 추론 (확장자·경로 제거) */
function titleFromStoryPath(path: string): string {
  const base = path.split('/').pop()?.replace(/\.iyagi$/i, '') ?? 'Iyagi';
  if (!base) return 'Story';
  return base.charAt(0).toUpperCase() + base.slice(1).replace(/_/g, ' ');
}

function storyFromRawFile(path: string, dsl: string, opts?: { title?: string; start?: string; init?: Story['init'] }): Story {
  const { story, errors } = parseDSL(dsl, {
    title: opts?.title ?? titleFromStoryPath(path),
    start: opts?.start,
    init: opts?.init,
  });
  if (errors.length > 0) {
    console.warn(`[current] parse errors in ${path}:`, errors);
  }
  return story;
}

function pickFirstRawStory(files: Record<string, string>, opts?: { title?: string; start?: string; init?: Story['init'] }): Story | undefined {
  const entries = Object.entries(files);
  if (entries.length === 0) return undefined;
  entries.sort(([a], [b]) => a.localeCompare(b));
  const [path, dsl] = entries[0]!;
  return storyFromRawFile(path, dsl, opts);
}

let resolved: Story | undefined;

if (Object.keys(scenarioRawStories).length > 0) {
  resolved = pickFirstRawStory(scenarioRawStories);
}

if (!resolved) {
  resolved = {
    title: 'Demo',
    start: 'start',
    init: {},
    scenes: {
      start: {
        id: 'start',
        steps: [
          { type: 'text', content: 'src/scenarios/ 에 .iyagi 파일을 추가하세요.' },
        ],
        choices: [],
      },
    },
  };
}

export const currentStory: Story = resolved;
