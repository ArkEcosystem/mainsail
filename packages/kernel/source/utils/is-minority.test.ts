import { describe } from "../../../test-framework/source";
import { isMinority } from "./is-minority";

describe("isMajority", ({ assert, it }) => {
	it("should be ok for n = 3f + 1", () => {
		for (let f = 1; f < 10; f++) {
			const n = 3 * f + 1; // n = active validators
			const minority = f + 1; // minority = f + 1

			assert.true(isMinority(minority, n));
			assert.true(isMinority(minority + 1, n));
			assert.false(isMinority(minority - 1, n));
		}
	});

	it("should be ok for prime numbers", () => {
		const primeNumbers = [5, 7, 11, 13, 17, 19, 23, 29, 53];

		for (const n of primeNumbers) {
			const f = n / 3;

			const minority = Math.ceil(f);
			assert.true(isMinority(minority, n));
			assert.true(isMinority(minority + 1, n));
			assert.false(isMinority(minority - 1, n));
		}
	});

	it("should be ok for 53 active validators", () => {
		const n = 53;
		const minority = 18;
		assert.true(isMinority(minority, n));
		assert.true(isMinority(minority + 1, n));
		assert.false(isMinority(minority - 1, n));
	});

	it("should be ok for random numbers", () => {
		for (let n = 5; n < 100; n++) {
			const f = n / 3;

			const minority = Number.isInteger(f) ? f + 1 : Math.ceil(f);
			console.log(minority, n);

			assert.true(isMinority(minority, n));
			assert.true(isMinority(minority + 1, n));
			assert.false(isMinority(minority - 1, n));
		}
	});
});
