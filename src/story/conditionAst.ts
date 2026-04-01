/**
 * 선택지 활성 조건용 소형 표현식 AST (new Function / eval 없이 평가).
 */

export type ConditionBinaryOp =
  | '=='
  | '==='
  | '!='
  | '!=='
  | '<'
  | '>'
  | '<='
  | '>='
  | '&&'
  | '||';

export type ConditionAst =
  | { kind: 'lit'; value: number | string | boolean }
  | { kind: 'var'; name: string }
  | { kind: 'unary'; op: '!'; expr: ConditionAst }
  | {
      kind: 'binary';
      op: ConditionBinaryOp;
      left: ConditionAst;
      right: ConditionAst;
    };

function cmpNum(a: unknown, b: unknown): { an: number; bn: number } {
  const an = typeof a === 'number' ? (Number.isFinite(a) ? a : NaN) : Number(a);
  const bn = typeof b === 'number' ? (Number.isFinite(b) ? b : NaN) : Number(b);
  return { an, bn };
}

/** 비교·산술 없이 "값"만 (논리·비교 하위식은 불리언 값으로). */
function evalOperand(
  ast: ConditionAst,
  vars: Record<string, number | string | boolean | undefined>,
): unknown {
  const bag: Record<string, unknown> = { ...vars };
  switch (ast.kind) {
    case 'lit':
      return ast.value;
    case 'var':
      return bag[ast.name];
    case 'unary':
      if (ast.op === '!') return !evalCondition(ast.expr, vars);
      return undefined;
    case 'binary':
      if (ast.op === '&&' || ast.op === '||') {
        return evalCondition(ast, vars);
      }
      return evalCondition(ast, vars);
    default:
      return undefined;
  }
}

function evalComparison(
  op: Exclude<ConditionBinaryOp, '&&' | '||'>,
  L: unknown,
  R: unknown,
): boolean {
  switch (op) {
    case '==':
      return L == R;
    case '===':
      return L === R;
    case '!=':
      return L != R;
    case '!==':
      return L !== R;
    case '<': {
      const { an, bn } = cmpNum(L, R);
      return an < bn;
    }
    case '>': {
      const { an, bn } = cmpNum(L, R);
      return an > bn;
    }
    case '<=': {
      const { an, bn } = cmpNum(L, R);
      return an <= bn;
    }
    case '>=': {
      const { an, bn } = cmpNum(L, R);
      return an >= bn;
    }
    default:
      return false;
  }
}

/** 조건식 전체를 불리언으로. */
export function evalCondition(
  ast: ConditionAst,
  vars: Record<string, number | string | boolean | undefined>,
): boolean {
  switch (ast.kind) {
    case 'lit':
      return Boolean(ast.value);
    case 'var': {
      const v = vars[ast.name];
      if (typeof v === 'boolean') return v;
      if (typeof v === 'number') return v !== 0;
      if (typeof v === 'string') return v.length > 0;
      return false;
    }
    case 'unary':
      if (ast.op === '!') return !evalCondition(ast.expr, vars);
      return false;
    case 'binary': {
      if (ast.op === '&&') {
        return evalCondition(ast.left, vars) && evalCondition(ast.right, vars);
      }
      if (ast.op === '||') {
        return evalCondition(ast.left, vars) || evalCondition(ast.right, vars);
      }
      const L = evalOperand(ast.left, vars);
      const R = evalOperand(ast.right, vars);
      return evalComparison(ast.op, L, R);
    }
    default:
      return false;
  }
}

/** 디버그·툴팁용 짧은 문자열 (실행용 아님). */
export function formatConditionAst(ast: ConditionAst): string {
  switch (ast.kind) {
    case 'lit':
      return typeof ast.value === 'string' ? JSON.stringify(ast.value) : String(ast.value);
    case 'var':
      return ast.name;
    case 'unary':
      return `!(${formatConditionAst(ast.expr)})`;
    case 'binary':
      return `(${formatConditionAst(ast.left)} ${ast.op} ${formatConditionAst(ast.right)})`;
    default:
      return '?';
  }
}
