import * as vscode from "vscode";
import { formatText } from "./format-iyagi.mjs";

const ALLOWED_INDENTS = new Set([0, 2, 4, 6, 8]);
const COMPLETION_TRIGGER_CHARS = [
  ..."abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_",
];

function parseVarsBlock(src) {
  const lines = src.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();
    if (trimmed === "" || trimmed.startsWith("//")) {
      i++;
      continue;
    }
    if (trimmed === "vars:") break;
    return [];
  }
  if (i >= lines.length) return [];
  i++; // next line after vars:

  /** @type {{name: string, init: number|string|boolean}[]} */
  const defs = [];
  for (; i < lines.length; i++) {
    const raw = lines[i];
    if (raw.trim() === "" || raw.trim().startsWith("//")) continue;

    // vars lines are exactly 2-space indented in grammar, but be lenient.
    const m = /^\s{2}([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+?)\s*$/.exec(raw);
    if (!m) break;

    const name = m[1];
    const valueRaw = m[2];

    let init;
    if (valueRaw === "true") init = true;
    else if (valueRaw === "false") init = false;
    else if (/^-?\d+(\.\d+)?$/.test(valueRaw)) init = Number(valueRaw);
    else if (
      valueRaw.length >= 2 &&
      valueRaw.startsWith('"') &&
      valueRaw.endsWith('"')
    ) {
      init = valueRaw.slice(1, -1).replace(/\\(.)/g, "$1");
    } else {
      // fallback: treat as string (keeps completion useful)
      init = String(valueRaw);
    }

    defs.push({ name, init });
  }
  return defs;
}

function capFirst(s) {
  if (!s) return s;
  return s[0].toUpperCase() + s.slice(1);
}

function isProbablyInScriptContext(linePrefix) {
  // Avoid suggesting functions in dialogue lines like:   "text ..."
  const t = linePrefix.trimStart();
  if (t.startsWith('"')) return false;
  return true;
}

function isBlankOrComment(line) {
  const trimmed = line.trim();
  return trimmed === "" || trimmed.startsWith("//");
}

function countLeadingSpaces(line) {
  let i = 0;
  while (i < line.length && line[i] === " ") i++;
  return i;
}

function collectIndentationDiagnostics(src) {
  const lines = src.split(/\r?\n/);
  /** @type {vscode.Diagnostic[]} */
  const diags = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isBlankOrComment(line)) continue;

    const tabIdx = line.indexOf("\t");
    if (tabIdx !== -1) {
      diags.push(
        new vscode.Diagnostic(
          new vscode.Range(i, tabIdx, i, tabIdx + 1),
          "탭(\\t)은 사용할 수 없습니다. 공백 2/4/6/8 스페이스만 허용합니다.",
          vscode.DiagnosticSeverity.Error,
        ),
      );
      continue;
    }

    const leading = countLeadingSpaces(line);
    if (!ALLOWED_INDENTS.has(leading)) {
      diags.push(
        new vscode.Diagnostic(
          new vscode.Range(i, 0, i, 0),
          `들여쓰기는 공백 2/4/6/8 스페이스만 허용합니다. (현재: ${leading} 스페이스)`,
          vscode.DiagnosticSeverity.Error,
        ),
      );
    }
  }

  return diags;
}

function refreshDiagnostics(collection, document) {
  if (document.languageId !== "iyagi") return;
  const diags = collectIndentationDiagnostics(document.getText());
  collection.set(document.uri, diags);
}

export function activate(context) {
  const selector = { language: "iyagi" };

  const diagnostics = vscode.languages.createDiagnosticCollection("iyagi");
  context.subscriptions.push(diagnostics);

  for (const doc of vscode.workspace.textDocuments) {
    refreshDiagnostics(diagnostics, doc);
  }

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((doc) => {
      refreshDiagnostics(diagnostics, doc);
    }),
    vscode.workspace.onDidChangeTextDocument((e) => {
      refreshDiagnostics(diagnostics, e.document);
    }),
    vscode.workspace.onDidCloseTextDocument((doc) => {
      diagnostics.delete(doc.uri);
    }),
  );

  const provider = vscode.languages.registerDocumentFormattingEditProvider(
    selector,
    {
      async provideDocumentFormattingEdits(document) {
        const src = document.getText();
        const formatted = formatText(src);

        if (formatted === src) return [];

        const start = document.positionAt(0);
        const end = document.positionAt(src.length);
        return [
          vscode.TextEdit.replace(new vscode.Range(start, end), formatted),
        ];
      },
    },
  );

  context.subscriptions.push(provider);

  // Completion: vars 기반 자동 헬퍼 + 기본 액션
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      selector,
      {
        provideCompletionItems(document, position) {
          const line = document.lineAt(position.line);
          const prefix = line.text.slice(0, position.character);
          if (!isProbablyInScriptContext(prefix)) return [];

          const builtins = [
            { name: "jump", snippet: 'jump("${1:sceneId}")' },
            { name: "set", snippet: 'set("${1:key}", ${2:value})' },
            { name: "inc", snippet: 'inc("${1:key}", ${2:1})' },
            { name: "dec", snippet: 'dec("${1:key}", ${2:1})' },
          ];

          const vars = parseVarsBlock(document.getText());
          /** @type {vscode.CompletionItem[]} */
          const items = [];

          for (const b of builtins) {
            const it = new vscode.CompletionItem(
              b.name,
              vscode.CompletionItemKind.Function,
            );
            it.insertText = new vscode.SnippetString(b.snippet);
            it.detail = "iyagi built-in action";
            items.push(it);
          }

          for (const def of vars) {
            const Name = capFirst(def.name);
            if (typeof def.init === "number") {
              for (const { n, s } of [
                { n: `set${Name}`, s: `set${Name}($1)` },
                { n: `add${Name}`, s: `add${Name}($1)` },
                { n: `sub${Name}`, s: `sub${Name}($1)` },
              ]) {
                const it = new vscode.CompletionItem(
                  n,
                  vscode.CompletionItemKind.Function,
                );
                it.insertText = new vscode.SnippetString(s);
                it.detail = `vars helper (${def.name}: number)`;
                items.push(it);
              }
            } else if (typeof def.init === "boolean") {
              for (const { n, s } of [
                { n: `set${Name}`, s: `set${Name}($1)` },
                { n: `toggle${Name}`, s: `toggle${Name}()` },
              ]) {
                const it = new vscode.CompletionItem(
                  n,
                  vscode.CompletionItemKind.Function,
                );
                it.insertText = new vscode.SnippetString(s);
                it.detail = `vars helper (${def.name}: boolean)`;
                items.push(it);
              }
            } else {
              const it = new vscode.CompletionItem(
                `set${Name}`,
                vscode.CompletionItemKind.Function,
              );
              it.insertText = new vscode.SnippetString(`set${Name}($1)`);
              it.detail = `vars helper (${def.name}: string)`;
              items.push(it);
            }
          }

          return items;
        },
      },
      ...COMPLETION_TRIGGER_CHARS,
    ),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("iyagi.formatDocument", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) return;
      if (editor.document.languageId !== "iyagi") return;
      await vscode.commands.executeCommand("editor.action.formatDocument");
    }),
  );
}

export function deactivate() {}
