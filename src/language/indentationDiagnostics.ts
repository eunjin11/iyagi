export type IyagiTextDiagnostic = {
  line: number; // 1-based
  col: number; // 1-based
  message: string;
};

const ALLOWED_INDENTS = new Set([0, 2, 4, 6, 8]);

function isBlankOrComment(line: string): boolean {
  const trimmed = line.trim();
  return trimmed === "" || trimmed.startsWith("//");
}

function countLeadingSpaces(line: string): number {
  let i = 0;
  while (i < line.length && line[i] === " ") i++;
  return i;
}

export function collectIndentationDiagnostics(
  src: string,
): IyagiTextDiagnostic[] {
  const lines = src.split(/\r?\n/);
  const diags: IyagiTextDiagnostic[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isBlankOrComment(line)) continue;

    const tabIdx = line.indexOf("\t");
    if (tabIdx !== -1) {
      diags.push({
        line: i + 1,
        col: tabIdx + 1,
        message:
          "탭(\\t)은 사용할 수 없습니다. 공백 2/4/6/8 스페이스만 허용합니다.",
      });
      continue;
    }

    const leading = countLeadingSpaces(line);
    if (!ALLOWED_INDENTS.has(leading)) {
      diags.push({
        line: i + 1,
        col: 1,
        message: `들여쓰기는 공백 2/4/6/8 스페이스만 허용합니다. (현재: ${leading} 스페이스)`,
      });
    }
  }

  return diags;
}
