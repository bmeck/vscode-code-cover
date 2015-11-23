import {readFileSync} from 'fs';
export function readJSONFileSync(file) {
	return JSON.parse(readFileSync(file).toString());
}