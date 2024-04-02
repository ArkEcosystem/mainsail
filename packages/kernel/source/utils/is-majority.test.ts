import { describe } from "../../../test-framework/source";
import { isMajority } from "./is-majority";

describe("isMajority", ({ assert, it }) => {
	it("should be ok for n = 3f + 1", () => {
		for (let f = 1; f < 10; f++) {
			const n = 3 * f + 1; // n = active validators
			const majority = 2 * f + 1; // majority = 2f + 1

			assert.true(isMajority(majority, n));
			assert.true(isMajority(majority + 1, n));
			assert.false(isMajority(majority - 1, n));
		}
	});

	it("should be ok for prime numbers", () => {
		const primeNumbers = [5, 7, 11, 13, 17, 19, 23, 29, 53];

		for (const n of primeNumbers) {
			const f = (n - 1) / 3;

			const majority = Math.ceil(2 * f + 1);
			assert.true(isMajority(majority, n));
			assert.true(isMajority(majority + 1, n));
			assert.false(isMajority(majority - 1, n));
		}
	});

	it("should be ok for 53 active validators", () => {
		const n = 53;
		const majority = 36;
		assert.true(isMajority(majority, n));
		assert.true(isMajority(majority + 1, n));
		assert.false(isMajority(majority - 1, n));
	});

	it("should be ok for random numbers", () => {
		for (let n = 5; n < 100; n++) {
			const third = n / 3;

			const majority = Number.isInteger(third) ? 2 * third + 1 : Math.ceil(2 * third);
			assert.true(isMajority(majority, n));
			assert.true(isMajority(majority + 1, n));
			assert.false(isMajority(majority - 1, n));
		}
	});
});
