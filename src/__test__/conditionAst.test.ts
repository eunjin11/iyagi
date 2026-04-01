import { describe, expect, it } from 'vitest';
import { evalCondition } from '../story/conditionAst';

describe('evalCondition', () => {
  it('gold >= 1', () => {
    const ast = {
      kind: 'binary' as const,
      op: '>=' as const,
      left: { kind: 'var' as const, name: 'gold' },
      right: { kind: 'lit' as const, value: 1 },
    };
    expect(evalCondition(ast, { gold: 0, hp: 10 })).toBe(false);
    expect(evalCondition(ast, { gold: 1, hp: 10 })).toBe(true);
  });

  it('gold>=1 (공백 없이 파싱된 AST)', () => {
    const ast = {
      kind: 'binary' as const,
      op: '>=' as const,
      left: { kind: 'var' as const, name: 'gold' },
      right: { kind: 'lit' as const, value: 1 },
    };
    expect(evalCondition(ast, { gold: 0, hp: 10 })).toBe(false);
    expect(evalCondition(ast, { hp: 10, gold: 2 })).toBe(true);
  });

  it('(gold>=1) && (hp < 3)', () => {
    const ast = {
      kind: 'binary' as const,
      op: '&&' as const,
      left: {
        kind: 'binary' as const,
        op: '>=' as const,
        left: { kind: 'var' as const, name: 'gold' },
        right: { kind: 'lit' as const, value: 1 },
      },
      right: {
        kind: 'binary' as const,
        op: '<' as const,
        left: { kind: 'var' as const, name: 'hp' },
        right: { kind: 'lit' as const, value: 3 },
      },
    };
    expect(evalCondition(ast, { gold: 1, hp: 10 })).toBe(false);
    expect(evalCondition(ast, { gold: 1, hp: 2 })).toBe(true);
  });

  it('== 와 === (느슨·엄격)', () => {
    const loose = {
      kind: 'binary' as const,
      op: '==' as const,
      left: { kind: 'lit' as const, value: 1 },
      right: { kind: 'lit' as const, value: '1' },
    };
    const strict = { ...loose, op: '===' as const };
    expect(evalCondition(loose, {})).toBe(true);
    expect(evalCondition(strict, {})).toBe(false);
  });

  it('없는 변수는 참조 시 비교에서 NaN 취급', () => {
    const ast = {
      kind: 'binary' as const,
      op: '>' as const,
      left: { kind: 'var' as const, name: 'missing' },
      right: { kind: 'lit' as const, value: 0 },
    };
    expect(evalCondition(ast, { gold: 0 })).toBe(false);
  });
});
