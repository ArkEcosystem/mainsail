import { readFileSync } from "fs";
import { resolve } from "path";

export const loader = {
	json: (path: string): Record<string, any> => JSON.parse(readFileSync(resolve(path)).toString()),
};
