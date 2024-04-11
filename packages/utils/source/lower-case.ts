import { compoundWords } from "./internal/compound-words.js";

export const lowerCase = (value: string): string | undefined =>
	compoundWords(
		value,
		(result: string, word: string, index: number) => result + (index ? " " : "") + word.toLowerCase(),
	);
