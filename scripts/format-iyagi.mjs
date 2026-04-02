import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { formatText } from "../vscode-extension/iyagi-lang/format-iyagi.mjs";

function formatPathOrFail(p) {
  const abs = path.resolve(p);
  const src = fs.readFileSync(abs, "utf8");
  const formatted = formatText(src);
  if (formatted !== src.replace(/\r\n/g, "\n")) {
    fs.writeFileSync(abs, formatted, "utf8");
  }
}

function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error("Usage: node scripts/format-iyagi.mjs <file.iyagi>");
    process.exit(1);
  }
  for (const p of args) {
    formatPathOrFail(p);
  }
}

// `import ... from "scripts/format-iyagi.mjs"`로 로드될 때는 main()이 실행되지 않게 가드
const isMain = (() => {
  const scriptPath = process.argv[1];
  if (!scriptPath) return false;
  const absScript = path.resolve(scriptPath);
  return pathToFileURL(absScript).href === import.meta.url;
})();

if (isMain) main();
