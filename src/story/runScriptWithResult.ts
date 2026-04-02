import { runScript } from "../actions";
import type { ActionContext } from "../actions/context";
import type { VariableBag } from "./types";

/** 스크립트 실행 후 최종 vars와 jump 여부를 한 번에 얻는다 (reducer에 넘기기용). */
export function runScriptWithResult(
	code: string,
	vars: VariableBag,
): { vars: VariableBag; jumpTo: string | null } {
	let bag = { ...vars };
	let jumpTo: string | null = null;
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
	};
	runScript(code, ctx.vars, ctx);
	return { vars: bag, jumpTo };
}
