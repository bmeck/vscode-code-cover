import * as path from 'path';
import * as fs from 'fs';
import * as child_process from 'child_process';
import * as vscode from 'vscode';
import lcovParse from 'lcov-parse';
import glob from 'glob';
import {SourceMapConsumer} from 'source-map';
import source_map_url from 'source-map-url';

function activate(context) {

	const tray = vscode.window.createStatusBarItem();
	tray.command = "ShowCoverage";
	tray.text = "Coverage $(eye)";
	context.subscriptions.push(tray);

	const highlight = vscode.window.createTextEditorDecorationType({
		backgroundColor: 'rgba(64,128,64,0.5)',
		isWholeLine: true
	});
	context.subscriptions.push(highlight);

	function run(showMsg) {
		const c = findLcovConfig(vscode.window.activeTextEditor.document);
		if (!c || !c.config) {
			if (showMsg) {
				vscode.window.showErrorMessage('unable to find coverage config');
			}
			tray.hide();
			return;
		}
		tray.show();
		tray.command = 'HideCoverage';
		const activeFile = vscode.window.activeTextEditor.document.fileName;
		if (c.config.coverage) {
			const mappings = new Map();
			if (c.config.sourcemapped) {
				const sourcemaps = c.config.sourcemapped;
				const mapfiles = [];
				for (const map of sourcemaps) {
					const found = glob.sync(map, {
						cwd: c.dir,
						matchBase: true,
						nodir: true
					});
					if (found) {
						mapfiles.push(...found.map(_ =>
							path.resolve(c.dir, _)));
					}
				}
				
				for (const file of mapfiles) {
					const src = fs.readFileSync(file) + '';
					const filedir = path.dirname(file);
					if (!source_map_url.existsIn(src)) {
						continue;
					}
					const srcmapfile = path.resolve(
						filedir,
							source_map_url.getFrom(src)
					);
					const sourcemap = JSON.parse(fs.readFileSync(srcmapfile)+'');
					
					for (const source of sourcemap.sources) {
						const origin = sourcemap.sourceRoot ? path.resolve(sourcemap.sourceRoot, source) : source;
						var resolvedOrigin = path.resolve(filedir, origin);
						if (resolvedOrigin === activeFile) {
							new SourceMapConsumer(sourcemap).eachMapping(function (m) {
								if (m.source === source) {
									if (!mappings.has(file)) {
										mappings.set(file, []);
									}
									mappings.get(file).push(m);
								}
							});
						}
					};
				}
			}
			for (const file of c.config.coverage) {
				const where = path.resolve(c.dir, file);
				lcovParse.source(fs.readFileSync(where).toString(), (e, d) => {
					decorate(c.dir, d, mappings);
				});
			}
		}
		return;
		function decorate(rootPath, coverage, mappings) {
			var activeFile = vscode.window.activeTextEditor.document.fileName;
			var ranges = [];
			for (const fileinfo of coverage) {
				const resolvedFile = path.resolve(rootPath, fileinfo.file);
				if (activeFile === resolvedFile) {
					for (const lineinfo of fileinfo.lines.details) {
						// vscode is 0 based
						const line = lineinfo.line - 1;
						showLine(line);
					}
				}
				if (mappings.has(resolvedFile)) {
					for (const mapping of mappings.get(resolvedFile)) {
						for (const lineinfo of fileinfo.lines.details) {
							// vscode is 0 based
							const line = lineinfo.line - 1;
							if (mapping.generatedLine === line) {
								showLine(mapping.originalLine - 1);
							}
						}
					}
				}
			}

			vscode.window.activeTextEditor.setDecorations(highlight, ranges);
			return;
			function showLine(line) {
				tray.show();
				const range = new vscode.Range(line, 0, line, 1);
				ranges.push(range);
			}
		}
	}
	const hide = vscode.commands.registerCommand('HideCoverage', function (_) {
		vscode.window.activeTextEditor.setDecorations(highlight, []);
		tray.command = 'ShowCoverage';
	});
	context.subscriptions.push(hide);
	const show = vscode.commands.registerCommand('ShowCoverage', function (_) {
		run(true);
	});
	context.subscriptions.push(show);

	vscode.window.onDidChangeActiveTextEditor(function (editor) {
		run(true);
	});
	run(true);
}
exports.activate = activate;

function findLcovConfig(doc) {
	if (doc.uri.scheme !== 'file') {
		return null;
	}
	let dir = path.dirname(doc.fileName);
	while (true) {
		var possibleConfig = path.join(dir, 'coverageconfig.json');
		if (fs.existsSync(possibleConfig)) {
			return {
				dir: dir,
				config: JSON.parse(fs.readFileSync(possibleConfig)+'')
			};
		}
		if (dir === vscode.workspace.rootPath) {
			return null;
		}
		dir = path.dirname(dir);
	}
}