import type { ActionContext } from './context';

/** 호스트가 추가한 DSL 액션 — 함수를 늘리면 이 타입에 시그니처를 적어 주세요. */
export type CustomActions = {
  heal: (amount: number) => void;
};

/**
 * 여기에 선언한 함수가 `createActions`와 합쳐져 DSL 스크립트에서 호출 가능해집니다.
 * 내장 이름(jump, set, inc …)과 겹치면 내장이 우선합니다.
 *
 * 예 (demo.iyagi): `heal(3)`
 */
export function createCustomActions(ctx: ActionContext): CustomActions {
  function heal(amount: number) {
    ctx.setVars((prev) => ({
      ...prev,
      hp: (Number(prev['hp']) || 0) + amount,
    }));
  }

  return { heal };
}
