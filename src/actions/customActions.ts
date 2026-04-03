import type { ActionContext } from "./context";

/** 호스트가 추가한 DSL 액션 — 함수를 늘리면 이 타입에 시그니처를 적어 주세요. */
export type CustomActions = {
  heal: (amount: number) => void;
  rollAttack: (chance: number, damage: number, target: string) => void;
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
      hp: (Number(prev.hp) || 0) + amount,
    }));
  }

  /**
   * 확률(chance)로 대상 변수(target)의 값을 damage만큼 줄인다.
   * 예: rollAttack(0.7, 2, "enemyHp") → 70% 확률로 enemyHp -= 2
   */
  function rollAttack(chance: number, damage: number, target: string) {
    if (Math.random() < chance) {
      ctx.setVars((prev) => ({
        ...prev,
        [target]: (Number(prev[target]) || 0) - damage,
        _shakeTick: (Number(prev._shakeTick) || 0) + 1,
      }));
    }
  }

  return { heal, rollAttack };
}
