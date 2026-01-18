import type { Story } from './types';

// Eagerly import any modules under scenarios
const scenarioModules = import.meta.glob('../scenarios/*.ts', { eager: true }) as Record<string, any>;

function asStory(value: unknown): Story | undefined {
  if (
    value &&
    typeof value === 'object' &&
    typeof (value as any).title === 'string' &&
    typeof (value as any).start === 'string' &&
    (value as any).passages &&
    typeof (value as any).passages === 'object'
  ) {
    return value as Story;
  }
  return undefined;
}

function pickFirstStory(mods: Record<string, any>): Story | undefined {
  for (const mod of Object.values(mods)) {
    // Prefer named export "story" if present
    if (asStory((mod as any).story)) return (mod as any).story as Story;
  }
  // Otherwise, find any export that looks like a Story
  for (const mod of Object.values(mods)) {
    for (const exported of Object.values(mod as Record<string, unknown>)) {
      const s = asStory(exported);
      if (s) return s;
    }
  }
  return undefined;
}

let resolved: Story | undefined = pickFirstStory(scenarioModules);

// Fallback: try any examples
if (!resolved) {
  const exampleModules = import.meta.glob('../example/*.ts', { eager: true }) as Record<string, any>;
  // Prefer demo.story.ts "story"
  const preferred = exampleModules['../example/demo.story.ts'];
  if (preferred && asStory((preferred as any).story)) {
    resolved = (preferred as any).story as Story;
  } else {
    resolved = pickFirstStory(exampleModules);
  }
}

// Ultimate fallback: minimal inline demo to avoid runtime crash
if (!resolved) {
  resolved = {
    title: 'Demo',
    start: 'start',
    init: {},
    passages: {
      start: {
        id: 'start',
        text: '시나리오 파일을 찾지 못했습니다. scenarios 폴더에 스토리를 추가하세요.',
        choices: []
      }
    }
  };
}

export const currentStory: Story = resolved;
