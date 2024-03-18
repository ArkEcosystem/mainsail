import { compoundWords } from "./internal/index.js";
import { upperFirst } from "./upper-first.js";

export const camelCase = (value: string): string | undefined =>
	compoundWords(value, (result: string, word: string, index: number) => result + (index ? upperFirst(word) : word));
