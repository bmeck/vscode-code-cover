import {join,dirname} from 'path';
import {existsSync,readFileSync} from 'fs';
import {readJSONFileSync} from './util';
import {workspace} from 'vscode';

class CoverageConfig {
	constructor({
		sourcemapped=null,
		coverage=null,
		automaticallyShow=false,
		showCovered=false,
		ignore
	}) {
		if (Array.isArray(coverage)) {
			this.coverage = coverage;
		}
		else {
			this.coverage = null;
		}
		if (Array.isArray(sourcemapped)) {
			this.sourcemapped = sourcemapped;
		}
		else {
			this.sourcemapped = null;
		}
		this.automaticallyShow = Boolean(automaticallyShow);
		this.showCovered = Boolean(showCovered);
		this.ignore = Array.isArray(ignore) ? ignore : null;
		return null;
	}
	/**
	 * Recursively crawl up the directory tree from our active file.
	 * Once we encounter a `coverageconfig.json` stop and use that as
	 * our config.
	 */
	static fromDocument(doc, rootPath = workspace.rootPath) {
		if (doc.uri.scheme !== 'file') {
			return null;
		}
		let dir = dirname(doc.fileName);
		while (true) {
			const possibleConfig = join(dir, 'coverageconfig.json');
			if (existsSync(possibleConfig)) {
				const config = new CoverageConfig(
					readJSONFileSync(possibleConfig)
				);
				return {
					dir,
					config
				};
			}
			if (dir === rootPath) {
				return null;
			}
			dir = dirname(dir);
		}
	}
}
export default CoverageConfig.fromDocument;