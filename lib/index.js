import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import minimatch from 'minimatch';
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

	function run(editor, showMsg, openning = false) {
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
		// ignore dotfiles
		if (path.basename(activeFile)[0] === '.') {
			return;
		}
		if (Array.isArray(c.config.ignore)) {
			for (const pattern of c.config.ignore) {
				if (minimatch(activeFile, pattern, { matchBase: true })) {
					return;
				}
			}
		}
		if (openning && c.config.automaticallyShow == false) {
			ui.show(vscode.window.activeTextEditor);	
			return;
		}
		getCoveredLines(activeFile, c, (e,coverage) => {
			if (e) {
				vscode.window.showErrorMessage(e.message);
				return;
			}
			ui.show(vscode.window.activeTextEditor, coverage);	
		});
	}

	vscode.window.onDidChangeActiveTextEditor(function (editor) {
		run(editor, false, true);
	});
	if (vscode.window.activeTextEditor) {
		run(vscode.window.activeTextEditor, false, true);
	}
}
exports.activate = activate;
