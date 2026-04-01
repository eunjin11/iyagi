import jsep from 'jsep';
import type { ConditionAst, ConditionBinaryOp } from '../story/conditionAst';

export type ParseConditionOk = { ok: true; ast: ConditionAst };
export type ParseConditionErr = { ok: false; error: string };

/** jsep.parse 결과와 맞춘 최소 노드 형태 (ConditionAst 로 쓰는 부분만). */
type JsepExpression =
  | { type: 'Identifier'; name: string }
  | { type: 'Literal'; value: boolean | number | string | RegExp | null; raw?: string }
  | { type: 'UnaryExpression'; operator: string; argument: JsepExpression; prefix: boolean }
  | { type: 'BinaryExpression'; operator: string; left: JsepExpression; right: JsepExpression };

type JsepNode = JsepExpression | undefined;

const ALLOWED_UNARY = new Set(['!']);

const ALLOWED_BINARY = new Set<string>([
  '==',
  '===',
  '!=',
  '!==',
  '<',
  '>',
  '<=',
  '>=',
  '&&',
  '||',
]);

/** 허용: 변수, 숫자·불리언·문자열 리터럴, (), !, 비교, && || (jsep 로 파싱 후 AST 변환). */
export function parseCondition(source: string): ParseConditionOk | ParseConditionErr {
  const trimmed = source.trim();
  if (!trimmed) {
    return { ok: false, error: '빈 조건' };
  }

  let root: JsepExpression;
  try {
    root = jsep(trimmed) as JsepExpression;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg.split('\n')[0] };
  }

  try {
    const ast = jsepToCondition(root);
    return { ok: true, ast };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg.split('\n')[0] };
  }
}

function jsepToCondition(node: JsepNode): ConditionAst {
  if (!node || !('type' in node)) {
    throw new Error('잘못된 식');
  }

  switch (node.type) {
    case 'Identifier':
      return { kind: 'var', name: node.name };

    case 'Literal': {
      const lit = node;
      const v = lit.value;
      if (v === null) throw new Error('조건식에서는 null 을 쓸 수 없습니다');
      if (typeof v === 'object') throw new Error('지원하지 않는 리터럴입니다');
      if (typeof v === 'number' && !Number.isFinite(v)) {
        throw new Error('유효한 숫자가 아닙니다');
      }
      return { kind: 'lit', value: v as number | string | boolean };
    }

    case 'UnaryExpression': {
      const u = node;
      if (!u.prefix || !ALLOWED_UNARY.has(u.operator)) {
        throw new Error(`지원하지 않는 단항 연산자: ${u.operator}`);
      }
      return { kind: 'unary', op: '!', expr: jsepToCondition(u.argument) };
    }

    case 'BinaryExpression': {
      const b = node;
      if (!ALLOWED_BINARY.has(b.operator)) {
        throw new Error(`지원하지 않는 이항 연산자: ${b.operator}`);
      }
      return {
        kind: 'binary',
        op: b.operator as ConditionBinaryOp,
        left: jsepToCondition(b.left),
        right: jsepToCondition(b.right),
      };
    }

    default:
      throw new Error(`지원하지 않는 식 종류: ${(node as { type: string }).type}`);
  }
}
