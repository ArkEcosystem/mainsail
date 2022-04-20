import { describe } from "../../core-test-framework";
import { keyBy } from "./key-by";

describe("keyBy", async ({ assert, it, nock, loader }) => {
	it("should work with a function", () => {
		const array = [
			{ code: 97, dir: "left" },
			{ code: 100, dir: "right" },
		];

		assert.equal(
			keyBy(array, (o) => String.fromCharCode(o.code)),
			{
				a: { code: 97, dir: "left" },
				d: { code: 100, dir: "right" },
			},
		);
	});
});
