import * as path from 'path';
import * as fs from 'fs';
import lcovParse from 'lcov-parse';
import perform from 'generator-runner';

function lcovFormat(dir, file, config, activeFile, mappings, obs) {
	const where = path.resolve(dir, file);
	perform(function* () {
		const lcovSrc = yield _ => fs.readFile(where, _);
		const data = yield _ => lcovParse.source(lcovSrc.toString(), _);
		matchSkippedLines(activeFile, dir, data, mappings, obs);
	}, (e, _) => e ? obs.throw(e) : _);
}
export default lcovFormat;

function matchSkippedLines(activeFile, rootPath, coverage, mappings, obs) {
	const found = new Set();
	for (const fileinfo of coverage) {
		const resolvedFile = path.resolve(rootPath, fileinfo.file);
		for (const branchinfo of fileinfo.branches.details) {
			if (branchinfo.taken === 0) {
				if (activeFile === resolvedFile) {
					const line = branchinfo.line - 1;
					if (found.has(line)) continue; 
					found.add(line);
					obs.next({type:'branch', line});
				}
				if (mappings.has(resolvedFile)) {
					for (const mapping of mappings.get(resolvedFile)) {
						if (mapping.originalLine === 21) {
						}
						if (mapping.generatedLine === branchinfo.line) {
							const line = mapping.originalLine - 1;
							if (found.has(line)) continue; 
							found.add(line);
							obs.next({type:'branch', line});
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
					obs.next({type:'line', line});
				}
				if (mappings.has(resolvedFile)) {
					for (const mapping of mappings.get(resolvedFile)) {
						if (mapping.generatedLine === lineinfo.line) {
							const line = mapping.originalLine - 1;
							if (found.has(line)) continue;
							found.add(line);
							obs.next({type:'line', line});
						}
					}
				}
			}
		}
	}
	obs.return();
}