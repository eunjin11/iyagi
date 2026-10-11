import type { InventoryItem, Step, VariableBag } from "../story/types";

export type NavigateFn = (sceneId: string) => void;
export type SetVarsFn = (updater: (prev: VariableBag) => VariableBag) => void;
export type InjectStepsFn = (steps: Step[]) => void;
export type SetInventoryFn = (
  updater: (prev: InventoryItem[]) => InventoryItem[],
) => void;
export type UseInventoryItemFn = (id: string) => boolean;

export type ActionContext = {
  vars: VariableBag;
  setVars: SetVarsFn;
  navigate: NavigateFn;
  injectSteps?: InjectStepsFn;
  inventory?: InventoryItem[];
  setInventory?: SetInventoryFn;
  useItem?: UseInventoryItemFn;
};
