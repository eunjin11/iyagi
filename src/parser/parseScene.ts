import type { Story, VariableBag } from "../story/types";
import { astToStory } from "../language/astToStory.js";
import { parseIyagi } from "../language/parseIyagi.js";

export type ParseResult = {
  story: Story;
  errors: string[];
};

/**
 * DSL 텍스트 전체를 파싱해 Story를 반환한다.
 *
 * `init`은 (DSL `vars:`로 만든 맵) 위에 `opts.init`을 얹어 병합한다 — 외부 옵션이 우선.
 */
export function parseDSL(
  src: string,
  opts?: { title?: string; start?: string; init?: VariableBag },
): ParseResult {
  const { ast, errors: parseErrors } = parseIyagi(src);
  const errors = [...parseErrors];
  if (!errors.some((e) => e.includes("닫히지"))) {
    // 간단 안전망: 입력 전체에서 중괄호 불균형이면 "닫히지" 에러를 추가한다.
    let depth = 0;
    let inString = false;
    for (let i = 0; i < src.length; i++) {
      const ch = src[i];
      if (ch === '"' && src[i - 1] !== "\\") inString = !inString;
      if (inString) continue;
      if (ch === "{") depth++;
      else if (ch === "}") depth = Math.max(0, depth - 1);
    }
    if (depth > 0) errors.push("닫히지 않은 중괄호");
  }
  return astToStory(ast, errors, opts);
}

