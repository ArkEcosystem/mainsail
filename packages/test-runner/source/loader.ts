import { readFileSync } from "fs";
import { resolve } from "path";

export const loader = {
	json: (path: string): Record<string, unknown> => JSON.parse(readFileSync(resolve(path)).toString()),
};
