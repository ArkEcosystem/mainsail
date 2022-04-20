import { describe } from "../../core-test-framework";
import { at } from "./at";

describe("#at", ({ it, assert }) => {
	it("should work like lodash", () => {
		const object = {
			a: { b: { c: 3 } },
			x: { y: { z: 4 } },
		};

		assert.equal(at(object, ["a.b.c", "x.y.z"]), [3, 4]);
	});
});
