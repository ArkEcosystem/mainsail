import { describe } from "@mainsail/test-runner";

import { dotSeparatedQuery } from "./dot-separated-query";

describe<{
	h: { continue: symbol };
}>("dotSeparatedQuery", ({ it, beforeEach, assert, spyFn }) => {
	beforeEach((context) => {
		context.h = { continue: Symbol("continue") };
	});

	it("should have name and version", () => {
		assert.is(dotSeparatedQuery.name, "dot-separated-query");
		assert.is(dotSeparatedQuery.version, "1.0.0");
	});

	it("should turn dotted keys into nested objects", ({ h }) => {
		const request: any = { query: { "a.b": "1", c: "2" } };

		const result = dotSeparatedQuery.onRequest(request as any, h as any);

		assert.is(result, h.continue);
		assert.equal(request.query, { a: { b: "1" }, c: "2" });
	});

	it("should register onRequest extension", ({ h }) => {
		const ext = spyFn();
		const server: any = { ext: ext.toFunction() };

		dotSeparatedQuery.register(server as any);

		ext.calledWith("onRequest", dotSeparatedQuery.onRequest);
	});
});
