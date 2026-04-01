import type { VariableBag } from '../story/types';
import type { ActionContext } from './context';
import { createCustomActions } from './customActions';

export type { NavigateFn, SetVarsFn, ActionContext } from './context';

/** DSL 스크립트에서 사용할 수 있는 Action 함수 집합 */
export function createActions(ctx: ActionContext) {
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

  const builtIn = { jump, set, inc, dec, setHeart, addHeart, setGold, addGold };
  const custom = createCustomActions(ctx);

  // 커스텀을 먼저 두고 내장을 덮어써 — jump/set 등 내장이 항상 우선
  return { ...custom, ...builtIn };
}

export type Actions = ReturnType<typeof createActions>;

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
