import * as vscode from 'vscode';

export default class CoverageUI {
	constructor(context) {
		this.tray = vscode.window.createStatusBarItem();
		this.tray.command = "ShowCoverage";
		this.tray.text = "Coverage $(eye)";
	
		this.highlight = vscode.window.createTextEditorDecorationType({
			backgroundColor: 'rgba(64,128,64,0.5)',
			isWholeLine: true
		});
	}
	dispose() {
		return vscode.Disposable.from(this.tray, this.highlight).dispose();
	}
	show(editor, lines) {
		if (!lines || lines.length === 0) {
			this.tray.hide();
			return;
		}
		this.tray.show();
		const ranges = lines.map(line => {
			return new vscode.Range(line, 0, line, 1);
		});
		editor.setDecorations(this.highlight, ranges);
		this.tray.command = 'HideCoverage';
	}
	hide(editor) {
		editor.setDecorations(this.highlight, []);
		this.tray.command = 'ShowCoverage';
	}
}