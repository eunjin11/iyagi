import type { MathNode } from "mathjs";
import {
	FunctionNode,
	isOperatorNode,
	OperatorNode,
	parse,
	SymbolNode,
} from "mathjs";
import type { VariableBag } from "./types";

/**
 * 스토리 조건식은 JS와 비슷하게 쓰고, mathjs 문법으로만 짧게 바꾼다 (`&&`→`and` 등).
 *
 * `==` / `!=` 는 평가 전에 AST에서 `seq` / `not(seq)` 로 바꿔, 문자열·숫자·불리언 모두
 * **엄격 동등(`===` / `!==`)** 으로 맞춘다 (mathjs 기본 `equal` 은 문자열에 부적합).
 */
const WHEN_SCOPE = {
	seq: (a: unknown, b: unknown) => a === b,
} as const;

const SEQ_SYM = new SymbolNode("seq");

function rewriteEqualityToStrictSeq(node: MathNode): MathNode {
	return node.transform((n) => {
		if (isOperatorNode(n) && n.op === "==") {
			return new FunctionNode(SEQ_SYM, [...n.args]);
		}
		if (isOperatorNode(n) && n.op === "!=") {
			const inner = new FunctionNode(SEQ_SYM, [...n.args]);
			return new OperatorNode("not", "not", [inner]);
		}
		return n;
	});
}

export function normalizeWhenExpr(src: string): string {
	const s = src.trim();
	if (!s) throw new SyntaxError("빈 조건");
	const t = s.replace(/===/g, "==").replace(/!==/g, "!=");
	let out = "";
	for (let i = 0; i < t.length; i++) {
		const c = t[i];
		if (c === "&" && t[i + 1] === "&") {
			out += " and ";
			i++;
			continue;
		}
		if (c === "|" && t[i + 1] === "|") {
			out += " or ";
			i++;
			continue;
		}
		if (c === "!" && t[i + 1] === "=") {
			out += "!=";
			i++;
			continue;
		}
		if (c === "!") {
			out += "not ";
			continue;
		}
		out += c;
	}
	return out;
}

function parseWhenTree(expr: string): MathNode {
	const tree = parse(normalizeWhenExpr(expr));
	return rewriteEqualityToStrictSeq(tree);
}

export function assertWhenExprParses(expr: string): void {
	parseWhenTree(expr);
}

export function evalWhen(expr: string, vars: VariableBag): boolean {
	try {
		const tree = parseWhenTree(expr);
		const scope = { ...vars, ...WHEN_SCOPE };
		return Boolean(tree.evaluate(scope));
	} catch {
		return false;
	}
}
