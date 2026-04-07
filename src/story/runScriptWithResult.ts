import { runScript } from "../actions";
import type { ActionContext } from "../actions/context";
import type { Step, VarDef, VariableBag } from "./types";

/** 스크립트 실행 후 최종 vars와 jump 여부를 한 번에 얻는다 (reducer에 넘기기용). */
export function runScriptWithResult(
  code: string,
  vars: VariableBag,
  varDefs?: VarDef[],
  localVars?: VariableBag,
): {
  vars: VariableBag;
  localVars: VariableBag;
  jumpTo: string | null;
  injectedSteps: Step[];
} {
  let bag = { ...vars };
  // localVars는 runScript 내부에서 직접 변이되므로 shallow copy 전달
  const localBag: VariableBag = { ...(localVars ?? {}) };
  let jumpTo: string | null = null;
  const injectedSteps: Step[] = [];
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
    injectSteps(steps) {
      injectedSteps.push(...steps);
    },
  };
  runScript(code, ctx.vars, ctx, varDefs, localBag);
  return { vars: bag, localVars: localBag, jumpTo, injectedSteps };
}
