import { describe } from "../../test-framework/source";
import { chunk } from "./chunk";

describe("#chunk", ({ it, assert }) => {
	it("should chunk the given array", () => {
		assert.equal(chunk(["a", "b", "c", "d"], 2), [
			["a", "b"],
			["c", "d"],
		]);
		assert.equal(chunk(["a", "b", "c", "d"], 3), [["a", "b", "c"], ["d"]]);
	});

	it("should not chunk if 0 is passed in", () => {
		assert.equal(chunk(["a", "b", "c", "d"], 0), []);
	});

	it("should not chunk if a negative number is passed in", () => {
		assert.equal(chunk(["a", "b", "c", "d"], -1), []);
	});
});
