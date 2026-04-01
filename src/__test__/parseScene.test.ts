import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseDSL } from '../parser/parseScene';

const __dirname = dirname(fileURLToPath(import.meta.url));

function demoStorySource(): string {
  return readFileSync(join(__dirname, '../example/demo.story'), 'utf-8');
}

describe('parseDSL', () => {
  describe('vars:', () => {
    it('parses numeric·boolean·string 초기값', () => {
      const src = `
vars:
  hp = 10
  gold = 0
  alive = true
  tag = "x"

a {
  "hi"
}
`;
      const { story, errors } = parseDSL(src);
      expect(errors).toEqual([]);
      expect(story.init).toEqual({ hp: 10, gold: 0, alive: true, tag: 'x' });
    });

    it('opts.init이 DSL vars보다 우선 병합', () => {
      const src = `
vars:
  hp = 10
  gold = 0

s { "x" }
`;
      const { story } = parseDSL(src, { init: { gold: 99 } });
      expect(story.init).toEqual({ hp: 10, gold: 99 });
    });
  });

  describe('scenes', () => {
    it('씬 이름에 언더스코어 허용', () => {
      const { story, errors} = parseDSL(`
going_home {
  "끝"
}
`);
      expect(errors).toEqual([]);
      expect(story.scenes.going_home).toBeDefined();
      expect(story.scenes.going_home?.steps[0]).toEqual({ type: 'text', content: '끝' });
    });

    it('텍스트·스크립트·한 줄 선택지', () => {
      const { story, errors } = parseDSL(`
s {
  "대사"
  if (hp > 0) jump("t")
  choices:
    "가기" -> { jump("u") }
}
`);
      expect(errors).toEqual([]);
      const s = story.scenes.s!;
      expect(s.steps[0]).toEqual({ type: 'text', content: '대사' });
      expect(s.steps[1]).toEqual({ type: 'script', code: 'if (hp > 0) jump("t")' });
      expect(s.choices).toEqual([{ text: '가기', script: 'jump("u")' }]);
    });

    it('선택지: -> 다음 줄에 { … } 멀티라인', () => {
      const { story, errors } = parseDSL(`
s {
  choices:
    "도망" ->
      {
        set("hp", 5)
        jump("start")
      }
}
`);
      expect(errors).toEqual([]);
      expect(story.scenes.s?.choices[0]?.text).toBe('도망');
      expect(story.scenes.s?.choices[0]?.script).toBe('set("hp", 5)\njump("start")');
    });

    it('선택지: 같은 줄 { 멀티라인 본문', () => {
      const { story, errors } = parseDSL(`
s {
  choices:
    "a" -> {
      inc("gold", 1)
      jump("b")
    }
}
`);
      expect(errors).toEqual([]);
      expect(story.scenes.s?.choices[0]?.script).toContain('inc("gold", 1)');
      expect(story.scenes.s?.choices[0]?.script).toContain('jump("b")');
    });
  });

  describe('demo.story 통합', () => {
    it('예제 파일이 오류 없이 파싱되고 필수 씬·init 존재', () => {
      const { story, errors } = parseDSL(demoStorySource(), {
        title: '여행',
        start: 'start',
      });
      expect(errors).toEqual([]);
      expect(story.title).toBe('여행');
      expect(story.start).toBe('start');
      expect(story.init).toEqual({ hp: 10, gold: 0 });
      expect(story.scenes.start).toBeDefined();
      expect(story.scenes.village).toBeDefined();
      expect(story.scenes.deep?.choices).toHaveLength(2);
      const run = story.scenes.deep?.choices.find((c) => c.text === '도망친다');
      expect(run?.script).toContain('set("hp", 5)');
    });
  });

  describe('에러', () => {
    it('닫히지 않은 씬은 에러', () => {
      const { errors } = parseDSL(`
bad {
  "oops"
`);
      expect(errors.some((e) => e.includes('닫히지'))).toBe(true);
    });
  });
});
