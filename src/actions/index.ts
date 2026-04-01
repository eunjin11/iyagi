import type { VariableBag } from '../story/types';
import type { ActionContext } from './context';
import { createCustomActions, type CustomActions } from './customActions';

export type { NavigateFn, SetVarsFn, ActionContext } from './context';
export type { CustomActions } from './customActions';

function builtInActions(ctx: ActionContext) {
  const { setVars, navigate } = ctx;

  function jump(sceneId: string) {
    navigate(sceneId);
  }

  function set(key: string, value: number | string | boolean) {
    setVars((prev) => ({ ...prev, [key]: value }));
  }

  function inc(key: string, by = 1) {
    setVars((prev) => ({ ...prev, [key]: (Number(prev[key]) || 0) + by }));
  }

  function dec(key: string, by = 1) {
    setVars((prev) => ({ ...prev, [key]: (Number(prev[key]) || 0) - by }));
  }

  function setHeart(v: number) {
    set('heart', v);
  }
  function addHeart(n: number) {
    inc('heart', n);
  }
  function setGold(v: number) {
    set('gold', v);
  }
  function addGold(n: number) {
    inc('gold', n);
  }

  return { jump, set, inc, dec, setHeart, addHeart, setGold, addGold };
}

type BuiltInActions = ReturnType<typeof builtInActions>;

/** DSL 스크립트에서 사용할 수 있는 Action 함수 집합 */
export function createActions(ctx: ActionContext): CustomActions & BuiltInActions {
  const custom = createCustomActions(ctx);
  const builtIn = builtInActions(ctx);
  return { ...custom, ...builtIn };
}

export type Actions = CustomActions & BuiltInActions;

/**
 * DSL script 코드를 vars + actions 스코프에서 실행한다.
 * jump()는 ctx.navigate를 호출한다.
 */
export function runScript(code: string, vars: VariableBag, ctx: ActionContext): void {
  const actions = createActions(ctx);

  const keys = [...Object.keys(vars), ...Object.keys(actions)];
  const values = [...Object.values(vars), ...Object.values(actions)];

  // eslint-disable-next-line no-new-func
  const fn = new Function(...keys, code);
  fn(...values);
}
