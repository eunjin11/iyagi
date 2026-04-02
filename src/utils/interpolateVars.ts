import type { VariableBag } from "../story/types";

export const interpolateVars = (src: string, vars: VariableBag): string => {
	return src.replace(/\$([a-zA-Z0-9_]+)/g, (_m, key) => {
		const v = (vars as Record<string, unknown>)[key];
		return typeof v === "undefined" ? _m : String(v);
	});
};
