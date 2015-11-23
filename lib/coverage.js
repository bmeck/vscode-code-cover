import * as fs from 'fs';
import * as path from 'path';
import lcovParse from 'lcov-parse';
import glob from 'glob';
import {SourceMapConsumer} from 'source-map';
import source_map_url from 'source-map-url';
import {readJSONFileSync} from './util';
import perform from 'generator-runner';

export default function getCoveredLines(activeFile, {dir,config}, cb) {
	perform(function *() {
		const lines = [];
		if (!config || !config.coverage) {
			return lines;
		}
		const mappings = new Map();
		if (config.sourcemapped) {
			const sourcemapped = config.sourcemapped;
			const mappedfiles = [];
			for (const generatedPattern of sourcemapped) {
				const generatedFiles = yield* findFiles(dir, generatedPattern);
				mappedfiles.push(...generatedFiles);
			}
			for (const generatedFile of mappedfiles) {
				const src = (
					yield _ => fs.readFile(generatedFile, _)
				).toString();
				if (!source_map_url.existsIn(src)) {
					continue;
				}
				const filedir = path.dirname(generatedFile);
				const srcmapurl = source_map_url.getFrom(src);
				const srcmapfile = path.resolve(filedir, srcmapurl);
				const sourcemap = readJSONFileSync(srcmapfile);
				
				for (const source of sourcemap.sources) {
					let origin = source;
					if (sourcemap.sourceRoot) {
						origin = path.resolve(sourcemap.sourceRoot, source);
					}
					const resolvedOrigin = path.resolve(filedir, origin);
					if (resolvedOrigin === activeFile) {
						const srcmapconsumer = new SourceMapConsumer(sourcemap);
						srcmapconsumer.eachMapping(processMapping);
						function processMapping(mapping) {
							if (mapping.source === source) {
								if (!mappings.has(generatedFile)) {
									mappings.set(generatedFile, []);
								}
								mappings.get(generatedFile).push(mapping);
							}
						}
					}
				};
			}
		}
		for (const file of config.coverage) {
			const where = path.resolve(dir, file);
			const lcovSrc = yield _ => fs.readFile(where, _);
			const d = (
				yield _ => lcovParse.source(lcovSrc.toString(), _)
			);
			lines.push(...mappedLines(activeFile, dir, d, mappings));
		}
		return lines;
	}, cb);
}
function* findFiles(cwd, generatedPattern) {
	const found = yield _ => glob(generatedPattern, {
		cwd,
		matchBase: true,
		nodir: true
	}, _);
	if (found) {
		return found.map(file => path.resolve(cwd, file));
	}
	return [];
}

function* mappedLines(activeFile, rootPath, coverage, mappings) {
	for (const fileinfo of coverage) {
		const resolvedFile = path.resolve(rootPath, fileinfo.file);
		if (activeFile === resolvedFile) {
			for (const lineinfo of fileinfo.lines.details) {
				// vscode is 0 based
				yield lineinfo.line - 1;
			}
		}
		if (mappings.has(resolvedFile)) {
			for (const mapping of mappings.get(resolvedFile)) {
				for (const lineinfo of fileinfo.lines.details) {
					// vscode is 0 based
					const line = lineinfo.line - 1;
					if (mapping.generatedLine === line) {
						yield mapping.originalLine - 1;
					}
				}
			}
		}
	}
}