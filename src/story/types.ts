export type VariableBag = Record<string, number | string | boolean>;

export type ChoiceEffect =
  | { type: 'set'; key: string; value: number | string | boolean }
  | { type: 'inc'; key: string; by: number }
  | { type: 'dec'; key: string; by: number };

export type ChoiceCondition = {
  key: string;
  op: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'truthy' | 'falsy';
  value?: number | string | boolean;
};

export type Choice = {
  text: string;
  goto: string;
  if?: ChoiceCondition[];
  // Any-of groups: visible if ANY group fully matches
  ifAny?: ChoiceCondition[][];
  do?: ChoiceEffect[];
};

export type Passage = {
  id: string;
  text: string;
  choices: Choice[];
  enter?: ChoiceEffect[];
};

export type Story = {
  title: string;
  start: string;
  passages: Record<string, Passage>;
  init?: VariableBag;
};


