import * as vscode from "vscode";
import { formatText } from "./format-iyagi.mjs";

export function activate(context) {
	const selector = { language: "iyagi" };

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
