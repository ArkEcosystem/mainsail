import { describe } from "../../core-test-framework";
import { map } from "./map";

describe("map", async ({ assert, it, nock, loader }) => {
	it("should work like lodash", () => {
		assert.equal(
			map([4, 8], (n) => n * n),
			[16, 64],
		);
	});

	it("should work like lodash", () => {
		assert.equal(
			map({ a: 4, b: 8 }, (n) => n * n),
			[16, 64],
		);
	});
});
