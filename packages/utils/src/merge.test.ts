import "jest-extended";

import { merge } from "./merge";

describe("#merge", () => {
	it("should merge the given objects", () => {
		expect(
			merge(
				{
					a: [{ b: 2 }, { d: 4 }],
				},
				{
					a: [{ c: 3 }, { e: 5 }],
				},
			),
		).toEqual({ a: [{ b: 2 }, { d: 4 }, { c: 3 }, { e: 5 }] });
	});
});
