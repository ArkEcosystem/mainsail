import { describe } from "../../core-test-framework";

import { some } from "./some";

describe("some", async ({ assert, it, nock, loader }) => {
	it("should work with any function", () => {
		assert.true(some([null, 0, "yes", false], Boolean));

		assert.true(
			some(
				[
					{ user: "barney", active: true },
					{ user: "fred", active: false },
				],
				(currentValue) => currentValue.active,
			),
		);
	});
});
