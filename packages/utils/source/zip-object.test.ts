import "jest-extended";
import { zipObject } from "./zip-object";

describe("#zipObject", () => {
	it("should create an object from the keys and values", () => {
		expect(zipObject(["a", "b"], [1, 2])).toEqual({ a: 1, b: 2 });
	});
});
