import { describe } from "../../test-framework/source";
import { isSyncFunction } from "./is-sync-function";

describe("#isSyncFunction", ({ it, assert }) => {
	it("should pass", () => {
		assert.true(isSyncFunction(new Function()));
	});

	it("should fail", () => {
		assert.false(isSyncFunction(async () => ({})));
		assert.false(isSyncFunction([]));
	});
});
