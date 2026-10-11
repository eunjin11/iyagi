import { describe, expect, it } from "vitest";
import { runScriptWithResult } from "../story/runScriptWithResult";

describe("inventory actions", () => {
  it("addItem은 같은 아이템을 수량으로 합친다", () => {
    const result = runScriptWithResult(
      'addItem("potion", "회복 물약", "🧪", 2)',
      {},
      undefined,
      {},
      [],
    );
    const stacked = runScriptWithResult(
      'addItem("potion", "회복 물약", "🧪", 3)',
      result.vars,
      undefined,
      {},
      result.inventory,
    );

    expect(stacked.inventory).toEqual([
      {
        id: "potion",
        name: "회복 물약",
        icon: "🧪",
        quantity: 5,
        description: "",
      },
    ]);
  });

  it("hasItem과 removeItem은 스크립트에서 사용할 수 있다", () => {
    const result = runScriptWithResult(
      'if (hasItem("key")) removeItem("key")',
      {},
      undefined,
      {},
      [{ id: "key", name: "열쇠", quantity: 1 }],
    );

    expect(result.inventory).toEqual([]);
  });

  it("useItem은 아이템의 useCode를 실행하고 1개를 소비한다", () => {
    const result = runScriptWithResult(
      'useItem("potion")',
      { hp: 5 },
      [{ name: "hp", init: 5 }],
      {},
      [
        {
          id: "potion",
          name: "회복 물약",
          quantity: 2,
          useCode: "heal(3)",
        },
      ],
    );

    expect(result.vars.hp).toBe(8);
    expect(result.inventory[0]?.quantity).toBe(1);
  });
});
