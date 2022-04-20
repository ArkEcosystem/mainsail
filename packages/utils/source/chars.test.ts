import { describe } from "../../core-test-framework";
import { chars } from "./chars";

describe("#chars", ({ it, assert }) => {
	it("should return all characters of the string as an array", () => {
		assert.equal(chars("Hello World"), ["H", "e", "l", "l", "o", " ", "W", "o", "r", "l", "d"]);
	});
});
