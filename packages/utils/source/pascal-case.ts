import { compoundWords } from "./internal/compound-words.js";
import { upperFirst } from "./upper-first.js";

export const pascalCase = (value: string): string | undefined =>
	compoundWords(value, (result: string, word: string) => result + upperFirst(word));
