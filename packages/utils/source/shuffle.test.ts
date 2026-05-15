import { describe } from "@mainsail/test-runner";
import { shuffle } from "./shuffle";

describe("shuffle", async ({ assert, it, nock, loader }) => {
	it("should return a new array with items in random order", () => {
		const possibleValues = numberArray(100);
		const shuffledValues = shuffle(possibleValues);

		assert.includeAllMembers(shuffledValues, possibleValues);
		assert.not.equal(shuffledValues, possibleValues);
	});
});

const numberArray = (length: number): number[] => Array.from({ length }, (_, i) => i);
