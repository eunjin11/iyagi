import { runScript } from "../actions";
import type { ActionContext } from "../actions/context";
import type { InventoryItem, Step, VarDef, VariableBag } from "./types";

/** 스크립트 실행 후 최종 vars와 jump 여부를 한 번에 얻는다 (reducer에 넘기기용). */
export function runScriptWithResult(
  code: string,
  vars: VariableBag,
  varDefs?: VarDef[],
  localVars?: VariableBag,
  inventory?: InventoryItem[],
): {
  vars: VariableBag;
  localVars: VariableBag;
  inventory: InventoryItem[];
  jumpTo: string | null;
  injectedSteps: Step[];
} {
  let bag = { ...vars };
  // localVars는 runScript 내부에서 직접 변이되므로 shallow copy 전달
  const localBag: VariableBag = { ...(localVars ?? {}) };
  let inventoryBag = (inventory ?? []).map((item) => ({ ...item }));
  let jumpTo: string | null = null;
  const injectedSteps: Step[] = [];
  const useInventoryItem = (id: string): boolean => {
    const item = inventoryBag.find((candidate) => candidate.id === id);
    if (!item?.useCode?.trim()) return false;

    runScript(item.useCode, ctx.vars, ctx, varDefs, localBag);
    inventoryBag = inventoryBag
      .map((candidate) =>
        candidate.id === id
          ? { ...candidate, quantity: candidate.quantity - 1 }
          : candidate,
      )
      .filter((candidate) => candidate.quantity > 0);
    return true;
  };
  const ctx: ActionContext = {
    get vars() {
      return bag;
    },
    setVars(updater) {
      bag = updater({ ...bag });
    },
    navigate(id) {
      jumpTo = id;
    },
    get inventory() {
      return inventoryBag;
    },
    setInventory(updater) {
      inventoryBag = updater(inventoryBag.map((item) => ({ ...item })));
    },
    useItem: useInventoryItem,
    injectSteps(steps) {
      injectedSteps.push(...steps);
    },
  };
  runScript(code, ctx.vars, ctx, varDefs, localBag);
  return {
    vars: bag,
    localVars: localBag,
    inventory: inventoryBag,
    jumpTo,
    injectedSteps,
  };
}
