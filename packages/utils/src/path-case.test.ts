import "jest-extended";

import { pathCase } from "./path-case";

describe("#pathCase", () => {
	it("should turn any string into path case", () => {
		expect(pathCase("string")).toBe("string");
		expect(pathCase("camelCase")).toBe("camel/case");
		expect(pathCase("param-case")).toBe("param/case");
		expect(pathCase("PascalCase")).toBe("pascal/case");
		expect(pathCase("UPPER_CASE")).toBe("upper/case");
		expect(pathCase("snake_case")).toBe("snake/case");
		expect(pathCase("sentence case")).toBe("sentence/case");
		expect(pathCase("Title Case")).toBe("title/case");
		expect(pathCase("dot.case")).toBe("dot/case");
	});
});
