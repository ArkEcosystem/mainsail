import { describe } from "../../core-test-framework";

import { mapObject } from "./map-object";

describe("mapObject", async ({ assert, it, nock, loader }) => {
	it("should work like lodash", () => {
		assert.equal(
			mapObject({ a: 4, b: 8 }, (n) => n * n),
			[16, 64],
		);
	});
});
