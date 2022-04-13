import { describe } from "../../core-test-framework";

import { isSyncFunction } from "./is-sync-function";

describe("isSyncFunction", async ({ assert, it, nock, loader }) => {
	it("should pass", () => {
		assert.true(isSyncFunction(new Function()));
	});

	it("should fail", () => {
		assert.false(isSyncFunction(async () => ({})));
		assert.false(isSyncFunction([]));
	});
});
