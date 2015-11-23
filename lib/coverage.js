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
		const branches = [];
		
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
			const lcovSrc = yield _ => fs.readFile(where, _);
			const d = (
				yield _ => lcovParse.source(lcovSrc.toString(), _)
			);
			for (const line of matchSkippedLines(activeFile, dir, d, mappings)) {
				if (line.type === 'line') {
					lines.push(line.line);
				}
				if (line.type === 'branch') {
					branches.push(line.line);
				}
			}
		}
		return {skippedLines:lines,skippedBranches:branches};
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

function* matchSkippedLines(activeFile, rootPath, coverage, mappings) {
	const found = new Set();
	for (const fileinfo of coverage) {
		const resolvedFile = path.resolve(rootPath, fileinfo.file);
		for (const branchinfo of fileinfo.branches.details) {
			if (branchinfo.taken === 0) {
				console.log('BRANCH SKIP', branchinfo.line)
				if (activeFile === resolvedFile) {
					const line = branchinfo.line - 1;
					if (found.has(line)) continue; 
					found.add(line);
					yield {type:'branch', line};
				}
				if (mappings.has(resolvedFile)) {
					for (const mapping of mappings.get(resolvedFile)) {
						if (mapping.originalLine === 21) {
							console.log(mapping)
						}
						if (mapping.generatedLine === branchinfo.line) {
							const line = mapping.originalLine - 1;
							console.log('bs', branchinfo.line, '=>', line);
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
							console.log('ls', lineinfo.line, '=>', line);
							if (found.has(line)) continue;
							found.add(line);
							yield {type:'line', line};
						}
					}
				}
			}
		}
	}
}