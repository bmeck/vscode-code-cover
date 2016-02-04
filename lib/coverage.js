import "babel-polyfill";
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
		const linesCovered = [];
		const branches = [];
		const branchesCovered = [];
		
		if (!config || !config.coverage) {
			throw new Error('no coverage information');
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
			const ext = path.extname(file);
			if (ext === '.info') {
				const lcovSrc = yield _ => fs.readFile(where, _);
				const d = (
					yield _ => lcovParse.source(lcovSrc.toString(), _)
				);
				for (const line of matchLCOV(activeFile, dir, d, mappings, config.showCovered)) {
					if (line.type === 'line') {
						lines.push(line.line);
					}
					if (line.type === 'lineCovered') {
						linesCovered.push(line.line);
					}
					if (line.type === 'branch') {
						branches.push(line.line);
					}
					if (line.type === 'branchCovered') {
						branchesCovered.push(line.line);
					}
				}
			}
			else if (ext === '.json') {
				const json = JSON.parse(yield _ => fs.readFile(where, _));
				for (const line of matchJSON(activeFile, dir, json, mappings, config.showCovered)) {
					if (line.type === 'line') {
						lines.push(line.line);
					}
					if (line.type === 'lineCovered') {
						linesCovered.push(line.line);
					}
					if (line.type === 'branch') {
						branches.push(line.line);
					}
					if (line.type === 'branchCovered') {
						branchesCovered.push(line.line);
					}
				}
			}
			else {
				throw new Error(`unknown coverage file type for ${where}`)
			}
		}
		return {skippedLines:lines,coveredLines:linesCovered,skippedBranches:branches,coveredBranches:branchesCovered};
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

function* matchJSON(activeFile, rootPath, coverage, mappings, showCovered) {
	const found = new Set();
	for (const file of Object.keys(coverage)) {
		const resolvedFile = path.resolve(rootPath, file);
		if (activeFile !== resolvedFile && !mappings.has(resolvedFile)) {
			continue;
		}
		const fileinfo = coverage[file];
		for (const id in fileinfo.s) {
			const smap = fileinfo.statementMap[id];
			const isCovered = fileinfo.s[id] !== 0; 
			if (isCovered) continue;
			if (activeFile === resolvedFile) {
				for (let i = smap.start.line; i <= smap.end.line; i++) {
					yield {type:"line", line: i}
				}
			}
			if (mappings.has(resolvedFile)) {
				for (const mapping of mappings.get(resolvedFile)) {
					const gline = mapping.generatedLine;
					if (gline >= smap.start.line && gline <= smap.end.line) {
						const line = mapping.originalLine - 1;
						if (found.has(line)) continue; 
						found.add(line);
						yield {type:"line", line};
					}
				}
			}
		}
		for (const id in fileinfo.b) {
			const smap = fileinfo.branchMap[id];
			const isCovered = fileinfo.b[id].indexOf(0) === -1; 
			if (isCovered) continue;
			if (activeFile === resolvedFile) {
				yield {type:'branch', line: smap.line};
			}
			if (mappings.has(resolvedFile)) {
				for (const mapping of mappings.get(resolvedFile)) {
					const gline = mapping.generatedLine;
					if (gline === smap.line) {
						const line = mapping.originalLine - 1;
						if (found.has(line)) continue; 
						found.add(line);
						yield {type:'branch', line};
					}
				}
			}
		}
		if (showCovered) {
			for (const id in fileinfo.s) {
				const smap = fileinfo.statementMap[id];
				const isCovered = fileinfo.s[id] !== 0; 
				if (!isCovered) continue;
				if (activeFile === resolvedFile) {
					for (let i = smap.start.line; i <= smap.end.line; i++) {
						yield {type:"lineCovered", line: i}
					}
				}
				if (mappings.has(resolvedFile)) {
					for (const mapping of mappings.get(resolvedFile)) {
						const gline = mapping.generatedLine;
						if (gline >= smap.start.line && gline <= smap.end.line) {
							const line = mapping.originalLine - 1;
							if (found.has(line)) continue; 
							found.add(line);
							yield {type:"lineCovered", line};
						}
					}
				}
			}
			for (const id in fileinfo.b) {
				const smap = fileinfo.branchMap[id];
				const isCovered = fileinfo.b[id].indexOf(0) === -1; 
				if (!isCovered) continue;
				if (activeFile === resolvedFile) {
					yield {type:'branchCovered', line: smap.line};
				}
				if (mappings.has(resolvedFile)) {
					for (const mapping of mappings.get(resolvedFile)) {
						const gline = mapping.generatedLine;
						if (gline === smap.line) {
							const line = mapping.originalLine - 1;
							if (found.has(line)) continue; 
							found.add(line);
							yield {type:'branchCovered', line};
						}
					}
				}
			}
		}
	}
}

function* matchLCOV(activeFile, rootPath, coverage, mappings, showCovered) {
	const found = new Set();
	for (const fileinfo of coverage) {
		const resolvedFile = path.resolve(rootPath, fileinfo.file);
		if (activeFile !== resolvedFile && !mappings.has(resolvedFile)) {
			continue;
		}
		for (const branchinfo of fileinfo.branches.details) {
			if (branchinfo.taken === 0) {
				if (activeFile === resolvedFile) {
					const line = branchinfo.line - 1;
					if (found.has(line)) continue; 
					found.add(line);
					yield {type:'branch', line};
				}
				if (mappings.has(resolvedFile)) {
					for (const mapping of mappings.get(resolvedFile)) {
						if (mapping.generatedLine === branchinfo.line) {
							const line = mapping.originalLine - 1;
							if (found.has(line)) continue; 
							found.add(line);
							yield {type:'branch', line};
						}
					}
				}
			}
		}
		for (const lineinfo of fileinfo.lines.details) {
			if (lineinfo.hit === 0) {
				if (activeFile === resolvedFile) {
					const line = lineinfo.line - 1;
					if (found.has(line)) continue; 
					found.add(line);
					yield {type:'line', line};
				}
				if (mappings.has(resolvedFile)) {
					for (const mapping of mappings.get(resolvedFile)) {
						if (mapping.generatedLine === lineinfo.line) {
							const line = mapping.originalLine - 1;
							if (found.has(line)) continue;
							found.add(line);
							yield {type:'line', line};
						}
					}
				}
			}
		}
		if (showCovered) {
			for (const branchinfo of fileinfo.branches.details) {
				if (branchinfo.taken !== 0) {
					if (activeFile === resolvedFile) {
						const line = branchinfo.line - 1;
						if (found.has(line)) continue; 
						found.add(line);
						yield {type:'branchCovered', line};
					}
					if (mappings.has(resolvedFile)) {
						for (const mapping of mappings.get(resolvedFile)) {
							if (mapping.generatedLine === branchinfo.line) {
								const line = mapping.originalLine - 1;
								if (found.has(line)) continue; 
								found.add(line);
								yield {type:'branchCovered', line};
							}
						}
					}
				}
			}
			for (const lineinfo of fileinfo.lines.details) {
				if (lineinfo.hit !== 0) {
					if (activeFile === resolvedFile) {
						const line = lineinfo.line - 1;
						if (found.has(line)) continue; 
						found.add(line);
						yield {type:'lineCovered', line};
					}
					if (mappings.has(resolvedFile)) {
						for (const mapping of mappings.get(resolvedFile)) {
							if (mapping.generatedLine === lineinfo.line) {
								const line = mapping.originalLine - 1;
								if (found.has(line)) continue;
								found.add(line);
								yield {type:'lineCovered', line};
							}
						}
					}
				}
			}
		}
	}
}