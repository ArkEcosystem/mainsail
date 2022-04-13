import { describe } from "../../core-test-framework";

import { isNumber } from "./is-number";
import { pickBy } from "./pick-by";

describe("pickBy", async ({ assert, it, nock, loader }) => {
	it("should work with a function", () => {
		assert.equal(pickBy({ a: 1, b: "2", c: 3 }, isNumber), { a: 1, c: 3 });
	});
});
