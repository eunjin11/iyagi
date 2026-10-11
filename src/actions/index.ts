import type { VarDef, VariableBag } from "../story/types";
import type { ActionContext } from "./context";
import { type CustomActions, createCustomActions } from "./customActions";

export type {
  ActionContext,
  NavigateFn,
  SetInventoryFn,
  SetVarsFn,
  UseInventoryItemFn,
} from "./context";
export type { CustomActions } from "./customActions";

function capFirst(s: string): string {
  if (!s) return s;
  return s[0].toUpperCase() + s.slice(1);
}

function autoHelpersFromVarDefs(
  ctx: ActionContext,
  varDefs: VarDef[] | undefined,
) {
  if (!varDefs || varDefs.length === 0) return {};

  const { setVars } = ctx;

  const helpers: Record<string, (...args: unknown[]) => void> = {};
  for (const def of varDefs) {
    const name = def.name;
    const Name = capFirst(name);

    if (typeof def.init === "number") {
      helpers[`set${Name}`] = (v: unknown) => {
        setVars((prev) => ({ ...prev, [name]: Number(v) }));
      };
      helpers[`add${Name}`] = (n: unknown) => {
        setVars((prev) => ({
          ...prev,
          [name]: (Number(prev[name]) || 0) + Number(n),
        }));
      };
      helpers[`sub${Name}`] = (n: unknown) => {
        setVars((prev) => ({
          ...prev,
          [name]: (Number(prev[name]) || 0) - Number(n),
        }));
      };
      continue;
    }

    if (typeof def.init === "boolean") {
      helpers[`set${Name}`] = (v: unknown) => {
        setVars((prev) => ({ ...prev, [name]: Boolean(v) }));
      };
      helpers[`toggle${Name}`] = () => {
        setVars((prev) => ({ ...prev, [name]: !prev[name] }));
      };
      continue;
    }

    // string
    helpers[`set${Name}`] = (v: unknown) => {
      setVars((prev) => ({ ...prev, [name]: String(v) }));
    };
  }
  return helpers;
}

function builtInActions(ctx: ActionContext, varDefs?: VarDef[]) {
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

  function addItem(
    id: string,
    name: string,
    icon = "📦",
    quantity = 1,
    description = "",
    useCode = "",
  ) {
    if (!ctx.setInventory) {
      throw new Error("addItem is unavailable outside the story engine");
    }
    const amount = Math.max(1, Math.floor(Number(quantity) || 1));
    ctx.setInventory((prev) => {
      const existing = prev.find((item) => item.id === id);
      if (existing) {
        return prev.map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + amount } : item,
        );
      }
      return [
        ...prev,
        {
          id,
          name,
          icon,
          quantity: amount,
          description,
          ...(useCode ? { useCode } : {}),
        },
      ];
    });
  }

  function removeItem(id: string, quantity = 1) {
    if (!ctx.setInventory) {
      throw new Error("removeItem is unavailable outside the story engine");
    }
    const amount = Math.max(1, Math.floor(Number(quantity) || 1));
    ctx.setInventory((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity - amount } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  }

  function hasItem(id: string): boolean {
    return (ctx.inventory ?? []).some((item) => item.id === id);
  }

  function useItem(id: string): boolean {
    if (!ctx.useItem) {
      throw new Error("useItem is unavailable outside the story engine");
    }
    return ctx.useItem(id);
  }

  const auto = autoHelpersFromVarDefs(ctx, varDefs);
  return {
    jump,
    set,
    inc,
    dec,
    addItem,
    removeItem,
    hasItem,
    useItem,
    ...auto,
  };
}

export type BuiltInActions = {
  jump: (sceneId: string) => void;
  set: (key: string, value: number | string | boolean) => void;
  inc: (key: string, by?: number) => void;
  dec: (key: string, by?: number) => void;
  addItem: (
    id: string,
    name: string,
    icon?: string,
    quantity?: number,
    description?: string,
    useCode?: string,
  ) => void;
  removeItem: (id: string, quantity?: number) => void;
  hasItem: (id: string) => boolean;
  useItem: (id: string) => boolean;
} & Record<string, unknown>;

/** DSL 스크립트에서 사용할 수 있는 Action 함수 집합 */
export function createActions(
  ctx: ActionContext,
  varDefs?: VarDef[],
): CustomActions & BuiltInActions {
  const custom = createCustomActions(ctx);
  const builtIn = builtInActions(ctx, varDefs);
  return { ...custom, ...builtIn };
}

export type Actions = CustomActions & BuiltInActions;

/**
 * DSL script 코드를 vars + actions 스코프에서 실행한다.
 * jump()는 ctx.navigate를 호출한다.
 */
/**
 * `const x = expr` / `let x = expr` → `__local__.x = (expr)`
 * 이미 localVars에 있는 키에 대한 bare 대입(`x = expr`)도 같이 변환한다.
 * 단, 프로퍼티 접근(`obj.x =`)이나 비교 연산(`x == ...`)은 변환하지 않는다.
 */
function transformLocalDecls(
  code: string,
  existingLocalKeys: string[],
): string {
  // 1) const/let 선언 변환
  let result = code.replace(
    /\b(?:const|let)\s+([a-zA-Z_$][\w$]*)\s*=/g,
    (_, name) => `__local__.${name} =`,
  );
  // 2) 이미 선언된 로컬 키에 대한 bare 재할당 변환
  //    앞에 `.` 또는 `\w`가 없는 단독 식별자의 `=` (비교 연산 `==` 제외)
  for (const key of existingLocalKeys) {
    result = result.replace(
      new RegExp(`(?<![.\\w])\\b${key}\\s*=(?!=)`, "g"),
      `__local__.${key} =`,
    );
  }
  return result;
}

export function runScript(
  code: string,
  vars: VariableBag,
  ctx: ActionContext,
  varDefs?: VarDef[],
  localVars?: VariableBag,
): void {
  const actions = createActions(ctx, varDefs);
  const local = localVars ?? {};

  // 이전 스텝에서 선언된 로컬 변수를 읽을 수 있도록 병합 (local 우선)
  const readVars = { ...vars, ...local };
  const transformed = transformLocalDecls(code, Object.keys(local));

  const keys = [...Object.keys(readVars), ...Object.keys(actions), "__local__"];
  const values = [...Object.values(readVars), ...Object.values(actions), local];

  const fn = new Function(...keys, transformed);
  fn(...values);
}
