import { randomNumber } from "./random-number";

describe("#randomNumber", () => {
	it("should return a random number within the given range", () => {
		const actual: number = randomNumber(1, 5);

		expect(actual).toBeGreaterThanOrEqual(1);
		expect(actual).toBeLessThanOrEqual(5);
	});
});
