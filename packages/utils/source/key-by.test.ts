import { describe } from "../../core-test-framework";

import { keyBy } from "./key-by";

describe("keyBy", async ({ assert, it, nock, loader }) => {
	it("should work with a function", () => {
		const array = [
			{ dir: "left", code: 97 },
			{ dir: "right", code: 100 },
		];

		assert.equal(
			keyBy(array, (o) => String.fromCharCode(o.code)),
			{
				a: { dir: "left", code: 97 },
				d: { dir: "right", code: 100 },
			},
		);
	});
});
