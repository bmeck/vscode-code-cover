import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import findLcovConfig from './config';
import getCoveredLines from './coverage';
import UI from './ui';

function activate(context) {
	const ui = new UI(context);
	context.subscriptions.push(ui);
	const hide = vscode.commands.registerCommand('HideCoverage', _ => {
		ui.hide(vscode.window.activeTextEditor);
	});
	context.subscriptions.push(hide);
	const show = vscode.commands.registerCommand('ShowCoverage', _ => {
		run(vscode.window.activeTextEditor, true);
	});
	context.subscriptions.push(show);

	function run(editor, showMsg) {
		const activeDocument = editor.document;
		const activeFile = activeDocument.fileName;
		const c = findLcovConfig(activeDocument);
		if (!c || !c.config) {
			if (showMsg) {
				vscode.window.showErrorMessage('unable to find coverage config');
			}
			ui.show(vscode.window.activeTextEditor);
			return;
		}
		getCoveredLines(activeFile, c, (e,lines) => {
			if (e) {
				vscode.window.showErrorMessage(e.message);
				return;
			}
			ui.show(vscode.window.activeTextEditor, lines);	
		});
	}

	vscode.window.onDidChangeActiveTextEditor(function (editor) {
		run(editor);
	});
	run(vscode.window.activeTextEditor);
}
exports.activate = activate;
