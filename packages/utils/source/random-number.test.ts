import { describe } from "../../core-test-framework";
import { randomNumber } from "./random-number";

describe("randomNumber", async ({ assert, it, nock, loader }) => {
	it("should return a random number within the given range", () => {
		const actual = randomNumber(1, 5);

		assert.gte(actual, 1);
		assert.lte(actual, 5);
	});
});
