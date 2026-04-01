import type { ConditionAst } from './conditionAst';

export type VariableBag = Record<string, number | string | boolean>;

// ---------------------------------------------------------------------------
// Step
// ---------------------------------------------------------------------------

export type Step =
  | { type: 'text'; content: string }
  | { type: 'script'; code: string };

// ---------------------------------------------------------------------------
// Choice
// ---------------------------------------------------------------------------

export type Choice = {
  text: string;
  /** 선택 시 실행할 JS 코드 (jump 포함) */
  script: string;
  /** 있으면 이 조건이 참일 때만 선택 가능(AST, 파서가 `if (…) "…" -> …`에서 생성). */
  enabledWhenAst?: ConditionAst;
};

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

export type Scene = {
  id: string;
  steps: Step[];
  choices: Choice[];
};

// ---------------------------------------------------------------------------
// Story
// ---------------------------------------------------------------------------

export type Story = {
  title: string;
  start: string;
  scenes: Record<string, Scene>;
  init?: VariableBag;
};
