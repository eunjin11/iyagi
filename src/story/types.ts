export type VariableBag = Record<string, number | string | boolean>;

export type VarDef = {
  name: string;
  init: number | string | boolean;
};

// ---------------------------------------------------------------------------
// Step
// ---------------------------------------------------------------------------

export type Step =
  | { type: "text"; content: string }
  | { type: "script"; code: string };

// ---------------------------------------------------------------------------
// Choice
// ---------------------------------------------------------------------------

export type Choice = {
  text: string;
  /** 선택 시 실행할 JS 코드 (jump 포함) */
  script: string;
  /** 있으면 이 조건이 참일 때만 선택 가능(mathjs 식, `if (…) "…" -> …`에서 생성). */
  enabledWhen?: string;
};

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

export type Scene = {
  id: string;
  steps: Step[];
  choices: Choice[];
  /**
   * choices가 표시되는 stepIndex.
   * 정의된 경우 steps[choicesAt..] 는 선택지 이후에 실행되는 post-steps.
   * undefined이면 기존 동작: stepIndex >= steps.length 일 때 choices 표시.
   */
  choicesAt?: number;
};

// ---------------------------------------------------------------------------
// Story
// ---------------------------------------------------------------------------

export type Story = {
  title: string;
  start: string;
  scenes: Record<string, Scene>;
  init?: VariableBag;
  varDefs?: VarDef[];
};
