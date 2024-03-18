import { compoundWords } from "./internal/compound-words.js";

export const pathCase = (value: string): string | undefined =>
	compoundWords(value, (result: string, word: string, index: number) => result + (index ? "/" : "") + word);
