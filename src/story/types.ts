export type VariableBag = Record<string, number | string | boolean>;

export type InventoryItem = {
  id: string;
  name: string;
  quantity: number;
  icon?: string;
  description?: string;
  /** 사용 시 스토리 엔진에서 실행할 iyagi 코드. */
  useAction?: string;
};

export type VarDef = {
  name: string;
  init: number | string | boolean;
};

// ---------------------------------------------------------------------------
// Step
// ---------------------------------------------------------------------------

export type Step =
  | { type: "text"; content: string }
  | { type: "script"; code: string }
  | { type: "choices"; choices: Choice[] }
  | { type: "conditional"; cond: string; thenSteps: Step[]; elseSteps: Step[] };

// ---------------------------------------------------------------------------
// Choice
// ---------------------------------------------------------------------------

export type Choice = {
  text: string;
  steps: Step[];
  /** 있으면 이 조건이 참일 때만 선택 가능. */
  enabledWhen?: string;
};

// ---------------------------------------------------------------------------
// Scene
// ---------------------------------------------------------------------------

export type Scene = {
  id: string;
  steps: Step[];
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
