import * as vscode from 'vscode';

export default class CoverageUI {
	constructor(context) {
		this.tray = vscode.window.createStatusBarItem();
		this.tray.command = "ShowCoverage";
		this.tray.text = "Coverage $(eye)";
	
		this.highlight = vscode.window.createTextEditorDecorationType({
			backgroundColor: 'rgba(128,64,64,0.5)',
			isWholeLine: true
		});
		this.branch = vscode.window.createTextEditorDecorationType({
			backgroundColor: 'rgba(128,128,64,0.5)',
			isWholeLine: true
		});
	}
	dispose() {
		return vscode.Disposable.from(this.tray, this.highlight).dispose();
	}
	show(editor, {skippedLines=[],skippedBranches=[]} = {}) {
		this.tray.show();
		decorateLines(editor, this.highlight, skippedLines, "Line not covered");
		decorateLines(editor, this.branch, skippedBranches, "Branch not covered");
		this.tray.command = 'HideCoverage';
	}
	hide(editor) {
		editor.setDecorations(this.highlight, []);
		editor.setDecorations(this.branch, []);
		this.tray.command = 'ShowCoverage';
	}
}

function decorateLines(editor, style, lines, msg) {
	const ranges = [];
	for (const line of lines) {
		const options = {
			hoverMessage: msg,
			range: new vscode.Range(line, 0, line, 1)
		};
		ranges.push(options);
	}
	editor.setDecorations(style, ranges);
}