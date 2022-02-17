import "jest-extended";

import { lowerCase } from "./lower-case";

describe("#lowerCase", () => {
	it("should turn any string into lower case", () => {
		expect(lowerCase("string")).toBe("string");
		expect(lowerCase("camelCase")).toBe("camel case");
		expect(lowerCase("param-case")).toBe("param case");
		expect(lowerCase("PascalCase")).toBe("pascal case");
		expect(lowerCase("UPPER_CASE")).toBe("upper case");
		expect(lowerCase("snake_case")).toBe("snake case");
		expect(lowerCase("sentence case")).toBe("sentence case");
		expect(lowerCase("Title Case")).toBe("title case");
		expect(lowerCase("dot.case")).toBe("dot case");
	});
});
