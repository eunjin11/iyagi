import type { StoryV2 } from './types';

// scenarios/ 폴더 내 .ts 파일을 모두 즉시 로드
const scenarioModules = import.meta.glob('../scenarios/*.ts', { eager: true }) as Record<string, unknown>;

function asStory(value: unknown): StoryV2 | undefined {
  if (
    value &&
    typeof value === 'object' &&
    typeof (value as StoryV2).title === 'string' &&
    typeof (value as StoryV2).start === 'string' &&
    (value as StoryV2).scenes &&
    typeof (value as StoryV2).scenes === 'object'
  ) {
    return value as StoryV2;
  }
  return undefined;
}

function pickFirstStory(mods: Record<string, unknown>): StoryV2 | undefined {
  for (const mod of Object.values(mods)) {
    if (asStory((mod as Record<string, unknown>)?.['story'])) {
      return (mod as Record<string, unknown>)['story'] as StoryV2;
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

let resolved: StoryV2 | undefined = pickFirstStory(scenarioModules);

// Fallback: example 폴더
if (!resolved) {
  const exampleModules = import.meta.glob('../example/*.ts', { eager: true }) as Record<string, unknown>;
  const preferred = exampleModules['../example/demo.story.ts'];
  if (preferred && asStory((preferred as Record<string, unknown>)['story'])) {
    resolved = (preferred as Record<string, unknown>)['story'] as StoryV2;
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

export const currentStory: StoryV2 = resolved;
