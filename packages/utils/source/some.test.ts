import { describe } from "../../core-test-framework";
import { some } from "./some";

describe("some", async ({ assert, it, nock, loader }) => {
	it("should work with any function", () => {
		assert.true(some([null, 0, "yes", false], Boolean));

		assert.true(
			some(
				[
					{ active: true, user: "barney" },
					{ active: false, user: "fred" },
				],
				(currentValue) => currentValue.active,
			),
		);
	});
});
