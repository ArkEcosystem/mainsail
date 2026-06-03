const isSeparator = (char: string): boolean => char === "-" || char === "_" || char === "." || char.trim() === "";

const isUpper = (char: string): boolean => char >= "A" && char <= "Z";

const isLower = (char: string): boolean => char >= "a" && char <= "z";

const capitalizeWord = (word: string): string => {
	const first = word.at(0);

	if (first === undefined) {
		return "";
	}

	return first.toUpperCase() + word.slice(1).toLowerCase();
};

const splitWords = (value: string): string[] => {
	const words: string[] = [];
	let word = "";

	for (let index = 0; index < value.length; index++) {
		const char = value.at(index);

		if (char === undefined) {
			continue;
		}

		if (isSeparator(char)) {
			if (word.length > 0) {
				words.push(word);
				word = "";
			}

			continue;
		}

		const previous = word.at(-1);
		const next = value.at(index + 1);

		const startsCamelWord =
			word.length > 0 &&
			previous !== undefined &&
			isUpper(char) &&
			(isLower(previous) || (isUpper(previous) && next !== undefined && isLower(next)));

		if (startsCamelWord) {
			words.push(word);
			word = char;
			continue;
		}

		word += char;
	}

	if (word.length > 0) {
		words.push(word);
	}

	return words;
};

export const camelCase = (value: string): string => {
	const words = splitWords(value);

	return words.map((word, index) => (index === 0 ? word.toLowerCase() : capitalizeWord(word))).join("");
};

export const pascalCase = (value: string): string =>
	splitWords(value)
		.map((element) => capitalizeWord(element))
		.join("");
