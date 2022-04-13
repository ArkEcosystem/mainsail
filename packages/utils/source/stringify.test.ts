import { describe } from "../../core-test-framework";

import { stringify } from "./stringify";

describe("stringify", async ({ assert, it, nock, loader }) => {
	it("should return the given value as JSON", () => {
		assert.is(stringify({ b: 1, a: 0 }), '{"b":1,"a":0}');
	});

	it("should return undefined if there are circular references", () => {
		const o = { b: 1, a: 0 };
		o.o = o;

		assert.undefined(stringify(o));
	});
});
