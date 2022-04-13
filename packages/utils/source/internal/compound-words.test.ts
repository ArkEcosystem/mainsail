import { describe } from "../../../core-test-framework";

import { compoundWords } from "./compound-words";

describe("#compoundWords", ({ it, assert }) => {
	it("should return undefined if the given string is empty", () => {
		assert.undefined(compoundWords("", (word) => word));
	});

	it("should return undefined if the given string is empty", () => {
		assert.equal(
			compoundWords("fred, barney, & pebbles", (result: string, word: string) => `${result} ${word}`.trim()),
			"fred barney pebbles",
		);
	});
});
