import { readFileSync } from "fs";
import { resolve } from "path";

// @TODO: turn this into a function that loads based on file extension
export const loader = {
	json: (path: string): Record<string, any> => JSON.parse(readFileSync(resolve(path)).toString()),
};
