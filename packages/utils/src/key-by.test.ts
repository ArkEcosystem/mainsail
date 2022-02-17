import "jest-extended";

import { keyBy } from "./key-by";

const array = [
	{ dir: "left", code: 97 },
	{ dir: "right", code: 100 },
];

describe("#keyBy", () => {
	it("should work with a function", () => {
		expect(keyBy(array, (o) => String.fromCharCode(o.code))).toEqual({
			a: { dir: "left", code: 97 },
			d: { dir: "right", code: 100 },
		});
	});
});
