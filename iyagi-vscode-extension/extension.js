import * as vscode from "vscode";
import { formatText } from "./format-iyagi.mjs";

const ALLOWED_INDENTS = new Set([0, 2, 4, 6, 8]);

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
