import { readFileSync } from "fs";

export const loader = {
	json: (path: string): Record<string, unknown> => JSON.parse(readFileSync(path, "utf8")),
};
