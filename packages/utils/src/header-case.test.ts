import "jest-extended";

import { headerCase } from "./header-case";

describe("#headerCase", () => {
	it("should turn any string into header case", () => {
		expect(headerCase("string")).toBe("String");
		expect(headerCase("camelCase")).toBe("Camel-Case");
		expect(headerCase("param-case")).toBe("Param-Case");
		expect(headerCase("PascalCase")).toBe("Pascal-Case");
		expect(headerCase("UPPER_CASE")).toBe("Upper-Case");
		expect(headerCase("snake_case")).toBe("Snake-Case");
		expect(headerCase("sentence case")).toBe("Sentence-Case");
		expect(headerCase("Title Case")).toBe("Title-Case");
		expect(headerCase("dot.case")).toBe("Dot-Case");
	});
});
