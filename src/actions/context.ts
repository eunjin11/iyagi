import type { VariableBag } from "../story/types";

export type NavigateFn = (sceneId: string) => void;
export type SetVarsFn = (updater: (prev: VariableBag) => VariableBag) => void;

export type ActionContext = {
  vars: VariableBag;
  setVars: SetVarsFn;
  navigate: NavigateFn;
};
