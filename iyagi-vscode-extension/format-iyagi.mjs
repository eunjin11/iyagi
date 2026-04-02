const MULTILINE_LINE_LEN = 100;
// 일반 `"text" -> { ... }` 선택지의 액션 본문이 아래 조건 중 하나면 멀티라인으로 내려준다.
const MULTILINE_STATEMENT_COUNT = 2;

const INDENT_SCENE = "  "; // 2 spaces
const INDENT_CHOICES = "    "; // 4 spaces
const INDENT_ACTION_BRACE = "      "; // 6 spaces (choices indent + 2)
const INDENT_ACTION_INNER = "        "; // 8 spaces (choices indent + 4)

function trimTrailingSemicolon(stmt) {
	return stmt.replace(/;\s*$/, "").trim();
}

function isIdentifierStart(ch) {
	return /[A-Za-z_$]/.test(ch);
}

function isIdentifierChar(ch) {
	return /[A-Za-z0-9_$]/.test(ch);
}

/**
 * JS-like action body를 "문장" 단위로 나눈다.
 * - 우선 최상위(top-level) `;`를 기준으로 분리
 * - `;`가 없더라도 `) <ident>(` 패턴이면 문장 경계로 분리 (heuristic)
 *
 * 주의: 이 DSL은 action body 안에서 JS 파싱을 완벽히 재현하지 않으므로,
 * 코드가 복잡해질 경우 휴리스틱이 덜 정확할 수 있다.
 */
function splitActionStatements(code) {
	const s = code.trim();
	if (!s) return [];

	const stmts = [];
	let start = 0;

	let depthParen = 0;
	let inString = false;
	let stringQuote = null;
	let isEscaped = false;

	const pushStmt = (endIdx) => {
		const raw = s.slice(start, endIdx).trim();
		if (raw) stmts.push(trimTrailingSemicolon(raw));
	};

	for (let i = 0; i < s.length; i++) {
		const ch = s[i];

		if (inString) {
			if (isEscaped) {
				isEscaped = false;
			} else if (ch === "\\") {
				isEscaped = true;
			} else if (ch === stringQuote) {
				inString = false;
				stringQuote = null;
			}
			continue;
		}

		if (ch === '"' || ch === "'") {
			inString = true;
			stringQuote = ch;
			continue;
		}

		if (ch === "(") depthParen++;
		else if (ch === ")") depthParen = Math.max(0, depthParen - 1);

		// top-level semicolon split
		if (ch === ";" && depthParen === 0) {
			pushStmt(i);
			start = i + 1;
			continue;
		}

		// top-level comma split (예: `dec(...), inc(...), jump(...)`)
		// depthParen === 0 이고, 직전이 `)` 이며, 직후가 식별자 시작이면 콤마를 문장 구분자로 본다.
		if (ch === "," && depthParen === 0) {
			let prev = i - 1;
			while (prev >= 0 && /\s/.test(s[prev])) prev--;
			let next = i + 1;
			while (next < s.length && /\s/.test(s[next])) next++;
			if (
				prev >= 0 &&
				s[prev] === ")" &&
				next < s.length &&
				isIdentifierStart(s[next])
			) {
				pushStmt(i);
				start = i + 1;
				continue;
			}
		}

		// Heuristic: `) <ident>(` at top-level -> split
		if (depthParen === 0 && ch === ")") {
			// lookahead: skip spaces/tabs
			let j = i + 1;
			// `\n` 같은 줄바꿈도 공백으로 취급해야,
			// 멀티라인 action에서 `set(...)\n jump(...)`처럼 `;` 없이도 분리된다.
			while (j < s.length && /\s/.test(s[j])) j++;
			if (j < s.length && isIdentifierStart(s[j])) {
				// read identifier
				let k = j + 1;
				while (k < s.length && isIdentifierChar(s[k])) k++;
				if (s[k] === "(") {
					pushStmt(i + 1);
					start = i + 1;
				}
			}
		}
	}

	pushStmt(s.length);

	// Normalize: drop empties (can happen due to heuristic splits)
	return stmts.map(trimTrailingSemicolon).filter(Boolean);
}

function formatInlineActionBody(body) {
	const stmts = splitActionStatements(body);
	if (stmts.length === 0) return "";
	if (stmts.length === 1) return stmts[0];
	// 세미콜론은 출력하지 않는다. (여러 호출은 comma-sequence로 묶으면 JS에서 동작한다)
	return stmts.join(", ");
}

function formatMultilineAction(stmts) {
	// 멀티라인 내부에서는 `;`를 강제하지 않고, 한 문장 = 한 줄로 내린다.
	// (parseScene.ts는 trim() 후 join("\n")으로 스크립트 실행한다.)
	const inner = stmts.map((st) => `${INDENT_ACTION_INNER}${st}`);
	return [`${INDENT_ACTION_BRACE}{`, ...inner, `${INDENT_ACTION_BRACE}}`];
}

function formatChoiceLineText(text) {
	// DSL의 text는 "..." 형태라서 여기서는 그대로 유지한다.
	// (포매터는 내부 escape를 다루지 않음)
	return `"${text}"`;
}

/**
 * 씬 본문(choices 밖)에서 `"..." "..."` 처럼 같은 라인에
 * 더블 쌍따옴표 문자열 리터럴이 연속으로 있는 경우를 처리한다.
 *
 * 결과가 배열이면: 라인 전체가 (whitespace로 구분된) 문자열 리터럴 시퀀스임을 의미.
 * 결과가 null이면: 라인 전체가 문자열 리터럴 시퀀스가 아님(기존 로직으로 처리).
 */
function splitDoubleQuotedStringsInLine(trimmed) {
	const parts = [];
	let i = 0;

	const len = trimmed.length;
	while (i < len) {
		while (i < len && /\s/.test(trimmed[i])) i++;
		if (i >= len) break;

		// Parser가 인식하는 text step은 반드시 "..." 형태이므로 여기서도 강제한다.
		if (trimmed[i] !== '"') return null;

		const start = i;
		i++; // consume opening quote
		let escaped = false;
		while (i < len) {
			const ch = trimmed[i];
			if (escaped) {
				escaped = false;
				i++;
				continue;
			}
			if (ch === "\\") {
				escaped = true;
				i++;
				continue;
			}
			if (ch === '"') {
				i++; // consume closing quote
				parts.push(trimmed.slice(start, i));
				break;
			}
			i++;
		}

		if (
			parts.length === 0 ||
			parts[parts.length - 1] === trimmed.slice(start, start + 1)
		) {
			// safety: couldn't find closing quote
			return null;
		}
	}

	return parts.length > 0 ? parts : null;
}

function formatFile(src) {
	const normalized = src.replace(/\r\n/g, "\n");
	const lines = normalized.split("\n");
	const out = [];

	let inScene = false;
	let inChoices = false;

	let i = 0;
	while (i < lines.length) {
		const raw = lines[i];
		const trimmed = raw.trim();

		// top-level vars normalization (very light)
		if (!inScene) {
			if (trimmed === "") {
				out.push("");
				i++;
				continue;
			}
			if (trimmed.startsWith("//")) {
				out.push(trimmed);
				i++;
				continue;
			}
			if (trimmed === "vars:") {
				out.push("vars:");
				i++;
				continue;
			}
			const mAssign = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/.exec(trimmed);
			if (mAssign) {
				out.push(`${INDENT_SCENE}${mAssign[1]} = ${mAssign[2].trim()}`);
				i++;
				continue;
			}
			// scene open
			const mSceneOpen = /^([a-zA-Z_][a-zA-Z0-9_]*)\s*\{\s*$/.exec(trimmed);
			if (mSceneOpen) {
				inScene = true;
				inChoices = false;
				out.push(`${mSceneOpen[1]} {`);
				i++;
				continue;
			}
			// scene open with extra inline tokens fallback
			if (/^[a-zA-Z_][a-zA-Z0-9_]*\s*\{\s*$/.test(trimmed)) {
				inScene = true;
				inChoices = false;
				out.push(trimmed.replace(/\s*\{\s*$/, " {"));
				i++;
				continue;
			}

			// unknown top-level line: keep as-is
			out.push(trimmed);
			i++;
			continue;
		}

		// inside scenes
		if (trimmed === "}") {
			inScene = false;
			inChoices = false;
			out.push("}");
			i++;
			continue;
		}
		if (trimmed === "") {
			out.push("");
			i++;
			continue;
		}
		if (trimmed.startsWith("//")) {
			out.push(`${INDENT_SCENE}${trimmed}`);
			i++;
			continue;
		}
		if (trimmed === "choices:") {
			inChoices = true;
			out.push(`${INDENT_SCENE}choices:`);
			i++;
			continue;
		}

		// --- choices area formatting ---
		if (inChoices) {
			// end of choices if line is not a choice pattern (parser's behavior)
			const choiceIfInline =
				/^if\s*\(([^)]*)\)\s*"([^"]+)"\s*->\s*\{([^}]*)\}\s*$/.exec(trimmed);
			if (choiceIfInline) {
				const cond = choiceIfInline[1].trim();
				const text = choiceIfInline[2];
				const body = choiceIfInline[3].trim();
				// if(...) 선택지 action도 무조건 `{ ... }` 멀티라인으로 내려준다.
				const stmts = splitActionStatements(body);
				if (stmts.length === 1) {
					out.push(
						`${INDENT_CHOICES}if (${cond}) ${formatChoiceLineText(text)} -> { ${stmts[0]} }`,
					);
				} else {
					out.push(
						`${INDENT_CHOICES}if (${cond}) ${formatChoiceLineText(text)} ->`,
					);
					out.push(...formatMultilineAction(stmts));
				}
				i++;
				continue;
			}

			const choiceIfArrowOnly = /^if\s*\(([^)]*)\)\s*"([^"]+)"\s*->\s*$/.exec(
				trimmed,
			);
			if (choiceIfArrowOnly) {
				const cond = choiceIfArrowOnly[1].trim();
				const text = choiceIfArrowOnly[2];

				let j = i + 1;
				// next non-empty/comment line should be `{` or `{ ... }`
				while (
					j < lines.length &&
					(lines[j].trim() === "" || lines[j].trim().startsWith("//"))
				) {
					j++;
				}
				if (j >= lines.length) break;

				const openTrim = lines[j].trim();
				let k;
				let script;

				if (openTrim === "{") {
					const scriptLines = [];
					j++;
					k = j;
					while (k < lines.length) {
						const innerTrim = lines[k].trim();
						if (innerTrim === "}") break;
						if (innerTrim !== "") scriptLines.push(innerTrim);
						k++;
					}
					script = scriptLines.join("\n").trim();
					// skip until the closing `}`
					while (k < lines.length && lines[k].trim() !== "}") k++;
					if (k < lines.length) k++;
				} else if (openTrim.startsWith("{")) {
					const rest = openTrim.slice(1);
					const closeOnSame = rest.indexOf("}");
					if (closeOnSame !== -1) {
						script = rest.slice(0, closeOnSame).trim();
						k = j + 1;
					} else {
						const scriptLines = [];
						const first = rest.trim();
						if (first) scriptLines.push(first);
						k = j + 1;
						while (k < lines.length) {
							const innerTrim = lines[k].trim();
							if (innerTrim === "}") break;
							if (innerTrim !== "") scriptLines.push(innerTrim);
							k++;
						}
						script = scriptLines.join("\n").trim();
						while (k < lines.length && lines[k].trim() !== "}") k++;
						if (k < lines.length) k++;
					}
				} else {
					// unexpected shape: keep current line and stop trying to normalize
					i++;
					continue;
				}

				const stmts = splitActionStatements(script);
				if (stmts.length === 1) {
					out.push(
						`${INDENT_CHOICES}if (${cond}) ${formatChoiceLineText(text)} -> { ${stmts[0]} }`,
					);
				} else {
					out.push(
						`${INDENT_CHOICES}if (${cond}) ${formatChoiceLineText(text)} ->`,
					);
					out.push(...formatMultilineAction(stmts));
				}
				i = k;
				continue;
			}

			const choiceInline = /^"([^"]+)"\s*->\s*\{([^}]*)\}\s*$/.exec(trimmed);
			if (choiceInline) {
				const text = choiceInline[1];
				const body = choiceInline[2];
				const stmts = splitActionStatements(body);
				const inlineBody = formatInlineActionBody(body);
				const inlineLine = `${INDENT_CHOICES}"${text}" -> { ${inlineBody} }`;
				if (stmts.length === 1) {
					out.push(`${INDENT_CHOICES}"${text}" -> { ${stmts[0]} }`);
				} else {
					const shouldDown =
						stmts.length >= MULTILINE_STATEMENT_COUNT ||
						inlineLine.length > MULTILINE_LINE_LEN;
					if (shouldDown) {
						out.push(`${INDENT_CHOICES}"${text}" ->`);
						out.push(...formatMultilineAction(stmts));
					} else {
						out.push(`${INDENT_CHOICES}"${text}" -> { ${inlineBody} }`);
					}
				}
				i++;
				continue;
			}

			const choiceArrowOnly = /^"([^"]+)"\s*->\s*$/.exec(trimmed);
			if (choiceArrowOnly) {
				// `"text" ->` 다음에 `{ ... }`가 온다 (기존 멀티라인 패턴)
				const text = choiceArrowOnly[1];

				// next non-empty/comment line should be `{` or `{ ... }`
				let j = i + 1;
				while (j < lines.length && lines[j].trim() === "") {
					// keep blank lines inside action region as blank lines (indented 6 spaces is also ok,
					// but keeping them blank keeps diffs small)
					out.push("");
					j++;
				}
				while (j < lines.length && lines[j].trim().startsWith("//")) {
					const c = lines[j].trim();
					out.push(`${INDENT_ACTION_INNER}${c}`);
					j++;
				}

				if (j >= lines.length) break;
				const openTrim = lines[j].trim();

				if (openTrim === "{") {
					// collect until matching `}`
					j++;
					const bodyLines = [];
					while (j < lines.length) {
						const innerTrim = lines[j].trim();
						if (innerTrim === "}") break;
						if (innerTrim !== "" && !innerTrim.startsWith("//")) {
							bodyLines.push(innerTrim);
						}
						j++;
					}
					const joined = bodyLines.join("\n").trim();
					const stmts = splitActionStatements(joined);
					if (stmts.length === 1) {
						out.push(`${INDENT_CHOICES}"${text}" -> { ${stmts[0]} }`);
					} else {
						out.push(`${INDENT_CHOICES}"${text}" ->`);
						out.push(...formatMultilineAction(stmts));
					}
					// skip closing `}`
					while (j < lines.length && lines[j].trim() !== "}") j++;
					if (j < lines.length) j++;
					i = j;
					continue;
				}

				// `{ ... }` on the same line (rare, but supported by parseScene)
				if (openTrim.startsWith("{")) {
					const rest = openTrim.slice(1);
					const closeIdx = rest.indexOf("}");
					if (closeIdx !== -1) {
						const inside = rest.slice(0, closeIdx).trim();
						const stmts = splitActionStatements(inside);
						if (stmts.length === 1) {
							out.push(`${INDENT_CHOICES}"${text}" -> { ${stmts[0]} }`);
						} else {
							out.push(`${INDENT_CHOICES}"${text}" ->`);
							out.push(...formatMultilineAction(stmts));
						}
						j++; // consume that line
						i = j;
						continue;
					}
				}

				// fallback: keep original line for `{ ...` shape
				out.push(`${INDENT_ACTION_BRACE}${openTrim}`);
				i = j + 1;
				continue;
			}

			// not a recognized choice line: end choices section for formatting
			inChoices = false;
			out.push(`${INDENT_SCENE}${trimmed}`);
			i++;
			continue;
		}

		// --- inside scene but outside choices ---
		const quotedParts = splitDoubleQuotedStringsInLine(trimmed);
		if (quotedParts) {
			// `"a" "b"` 형태면 각각을 별도 줄로 내려준다.
			for (const q of quotedParts) {
				out.push(`${INDENT_SCENE}${q}`);
			}
			i++;
			continue;
		}

		// script lines: keep trimmed but re-indent to 2 spaces
		if (/^(if\s*\()/i.test(trimmed)) {
			// normalize `if (` spacing slightly
			const normalizedIf = trimmed
				.replace(/^if\s*\(/i, "if (")
				.replace(/\s*\)/, ")");
			out.push(`${INDENT_SCENE}${normalizedIf}`);
			i++;
			continue;
		}

		// unknown line: re-indent to scene indent
		out.push(`${INDENT_SCENE}${trimmed}`);
		i++;
	}

	// Ensure exactly one trailing newline (idempotent on save)
	const body = out.join("\n").replace(/[ \t]+$/gm, "");
	return `${body.replace(/\r?\n+$/g, "")}\n`;
}

/**
 * VSCode 확장/스크립트에서 문서 문자열을 받아 포맷된 문자열을 반환하기 위한 API.
 */
export function formatText(src) {
	return formatFile(src);
}
