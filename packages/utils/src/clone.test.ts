import "jest-extended";

import { clone } from "./clone";

describe("#clone", () => {
	it("should work with an array", () => {
		const objects = [{ a: 1 }, { b: 2 }];

		expect(clone(objects)).toEqual(objects);
	});

	it("should work with an object", () => {
		const objects = { a: 1 };

		expect(clone(objects)).toEqual(objects);
	});
});
