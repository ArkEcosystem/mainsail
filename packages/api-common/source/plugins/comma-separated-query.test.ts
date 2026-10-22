import { describe } from "@mainsail/test-runner";

import { commaArrayQuery } from "./comma-separated-query";

describe<{
	h: { continue: symbol };
}>("commaArrayQuery", ({ it, beforeEach, assert, spyFn }) => {
	beforeEach((context) => {
		context.h = { continue: Symbol("continue") };
	});

	it("should have name and version", () => {
		assert.is(commaArrayQuery.name, "comma-array-query");
		assert.is(commaArrayQuery.version, "1.0.0");
	});

	it("should split comma-separated values into arrays and leave others unchanged", ({ h }) => {
		const request: any = { query: { a: "1,2,3", b: "x" } };

		const result = commaArrayQuery.onRequest(request as any, h as any);

		assert.is(result, h.continue);
		assert.equal(request.query.a, ["1", "2", "3"]);
		assert.is(request.query.b, "x");
	});

	it("should handle repeated (array) query values without throwing and split them consistently", ({ h }) => {
		// Hapi turns a repeated query key into an array (e.g. ?id=1,2&id=3 -> ["1,2", "3"]).
		const request: any = { query: { id: ["1,2", "3"], tags: ["a", "b"] } };

		const result = commaArrayQuery.onRequest(request as any, h as any);

		assert.is(result, h.continue);
		// Each array entry is split individually, so it matches the single-value ?id=1,2,3 result.
		assert.equal(request.query.id, ["1", "2", "3"]);
		// Array entries without a separator are left as-is.
		assert.equal(request.query.tags, ["a", "b"]);
	});

	it("should not throw when an array entry is exactly the separator", ({ h }) => {
		// Previously value.split(",") ran on the array itself and threw a TypeError -> HTTP 500.
		const request: any = { query: { x: [",", "a"] } };

		const result = commaArrayQuery.onRequest(request as any, h as any);

		assert.is(result, h.continue);
		assert.equal(request.query.x, ["", "", "a"]);
	});

	it("should reject a parameter with more than 50 values, whether comma-separated or repeated", ({ h }) => {
		const values = Array.from({ length: 51 }, (_, index) => String(index));

		for (const query of [
			{ nonce: values.join(",") },
			{ nonce: values },
			{ nonce: [values.slice(0, 30).join(","), ...values.slice(30)] },
		]) {
			assert.throws(
				() => commaArrayQuery.onRequest({ query } as any, h as any),
				"'nonce' takes at most 50 values",
			);
		}

		const request: any = { query: { nonce: values.slice(0, 50).join(",") } };
		assert.is(commaArrayQuery.onRequest(request, h as any), h.continue);
		assert.length(request.query.nonce, 50);
	});

	it("should register onRequest extension", ({ h }) => {
		const ext = spyFn();
		const server: any = { ext: ext.toFunction() };

		commaArrayQuery.register(server as any);

		ext.calledWith("onRequest", commaArrayQuery.onRequest);
	});
});
