import type { Story } from './types';

// scenarios/ 폴더 내 .ts 파일을 모두 즉시 로드
const scenarioModules = import.meta.glob('../scenarios/*.ts', { eager: true }) as Record<string, unknown>;

function asStory(value: unknown): Story | undefined {
  if (
    value &&
    typeof value === 'object' &&
    typeof (value as Story).title === 'string' &&
    typeof (value as Story).start === 'string' &&
    (value as Story).scenes &&
    typeof (value as Story).scenes === 'object'
  ) {
    return value as Story;
  }
  return undefined;
}

function pickFirstStory(mods: Record<string, unknown>): Story | undefined {
  for (const mod of Object.values(mods)) {
    if (asStory((mod as Record<string, unknown>)?.['story'])) {
      return (mod as Record<string, unknown>)['story'] as Story;
    }
  }
  for (const mod of Object.values(mods)) {
    for (const exported of Object.values(mod as Record<string, unknown>)) {
      const s = asStory(exported);
      if (s) return s;
    }
  }
  return undefined;
}

let resolved: Story | undefined = pickFirstStory(scenarioModules);

// Fallback: example 폴더
if (!resolved) {
  const exampleModules = import.meta.glob('../example/*.ts', { eager: true }) as Record<string, unknown>;
  const preferred = exampleModules['../example/demo.story.ts'];
  if (preferred && asStory((preferred as Record<string, unknown>)['story'])) {
    resolved = (preferred as Record<string, unknown>)['story'] as Story;
  } else {
    resolved = pickFirstStory(exampleModules);
  }
}

// 최후 fallback: 인라인 최소 스토리
if (!resolved) {
  resolved = {
    title: 'Demo',
    start: 'start',
    init: {},
    scenes: {
      start: {
        id: 'start',
        steps: [
          { type: 'text', content: 'scenarios 폴더에 스토리 파일을 추가하세요.' },
        ],
        choices: [],
      },
    },
  };
}

export const currentStory: Story = resolved;
