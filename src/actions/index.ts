import type { VarDef, VariableBag } from "../story/types";
import type { ActionContext } from "./context";
import { type CustomActions, createCustomActions } from "./customActions";

export type { ActionContext, NavigateFn, SetVarsFn } from "./context";
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
				setVars((prev) => ({ ...prev, [name]: (Number(prev[name]) || 0) + Number(n) }));
			};
			helpers[`sub${Name}`] = (n: unknown) => {
				setVars((prev) => ({ ...prev, [name]: (Number(prev[name]) || 0) - Number(n) }));
			};
			continue;
		}

		if (typeof def.init === "boolean") {
			helpers[`set${Name}`] = (v: unknown) => {
				setVars((prev) => ({ ...prev, [name]: Boolean(v) }));
			};
			helpers[`toggle${Name}`] = () => {
				setVars((prev) => ({ ...prev, [name]: !Boolean(prev[name]) }));
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

	const auto = autoHelpersFromVarDefs(ctx, varDefs);
	return { jump, set, inc, dec, ...auto };
}

export type BuiltInActions = {
	jump: (sceneId: string) => void;
	set: (key: string, value: number | string | boolean) => void;
	inc: (key: string, by?: number) => void;
	dec: (key: string, by?: number) => void;
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
export function runScript(
	code: string,
	vars: VariableBag,
	ctx: ActionContext,
	varDefs?: VarDef[],
): void {
	const actions = createActions(ctx, varDefs);

	const keys = [...Object.keys(vars), ...Object.keys(actions)];
	const values = [...Object.values(vars), ...Object.values(actions)];

	// eslint-disable-next-line no-new-func
	const fn = new Function(...keys, code);
	fn(...values);
}
