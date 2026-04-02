import type { ParseResult } from "langium";
import { EmptyFileSystem } from "langium";
import type { Document as IyagiDocumentAst } from "./__generated__/ast.js";
import { createIyagiServices } from "./services.js";

const { Iyagi } = createIyagiServices(EmptyFileSystem);

function formatChevrotainError(e: unknown): string {
	const anyE = e as Record<string, unknown> | null | undefined;
	const token =
		(anyE?.token as Record<string, unknown> | undefined) ??
		(anyE?.previousToken as Record<string, unknown> | undefined) ??
		((anyE?.resyncedTokens as unknown[] | undefined)?.[0] as
			| Record<string, unknown>
			| undefined);

	const line = (token?.startLine ?? token?.line) as number | undefined;
	const col = (token?.startColumn ?? token?.column) as number | undefined;
	const msg = String((anyE?.message as string | undefined) ?? "Parse error");
	if (
		msg.includes("EOF") &&
		(msg.includes("Expecting token of type '}'") ||
			msg.includes("token of type '}'") ||
			msg.includes("'}'") ||
			msg.includes(" } "))
	) {
		return "닫히지 않은 중괄호";
	}
	if (typeof line === "number" && typeof col === "number")
		return `L${line}:${col} ${msg}`;
	return msg;
}

export type ParseIyagiResult = {
	ast: IyagiDocumentAst;
	errors: string[];
};

export function parseIyagi(src: string): ParseIyagiResult {
	const parsed: ParseResult<IyagiDocumentAst> =
		Iyagi.parser.LangiumParser.parse(src);
	const errors: string[] = [
		...parsed.lexerErrors.map(formatChevrotainError),
		...parsed.parserErrors.map(formatChevrotainError),
	];
	return { ast: parsed.value, errors };
}
