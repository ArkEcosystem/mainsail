import { lowerFirst } from "./lower-first";

const dummies = {
	Fred: "fred",
	FRED: "fRED",
	"Test Space": "test Space",
};

describe("#lowerFirst", () => {
	it("should uncapitalize the given input", () => {
		Object.keys(dummies).forEach((key) => {
			expect(lowerFirst(key)).toEqual(dummies[key]);
		});
	});
});
