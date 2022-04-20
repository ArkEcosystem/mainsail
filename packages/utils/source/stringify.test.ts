import { describe } from "../../core-test-framework";
import { stringify } from "./stringify";

describe("stringify", async ({ assert, it, nock, loader }) => {
	it("should return the given value as JSON", () => {
		assert.is(stringify({ a: 0, b: 1 }), '{"a":0,"b":1}');
	});

	it("should return undefined if there are circular references", () => {
		const o = { a: 0, b: 1 };
		o.o = o;

		assert.undefined(stringify(o));
	});
});
