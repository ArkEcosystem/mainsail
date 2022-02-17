import "jest-extended";

import { snakeCase } from "./snake-case";

describe("#snakeCase", () => {
	it("should turn any string into snake case", () => {
		expect(snakeCase("string")).toBe("string");
		expect(snakeCase("camelCase")).toBe("camel_case");
		expect(snakeCase("param-case")).toBe("param_case");
		expect(snakeCase("PascalCase")).toBe("pascal_case");
		expect(snakeCase("UPPER_CASE")).toBe("upper_case");
		expect(snakeCase("snake_case")).toBe("snake_case");
		expect(snakeCase("sentence case")).toBe("sentence_case");
		expect(snakeCase("Title Case")).toBe("title_case");
		expect(snakeCase("dot.case")).toBe("dot_case");
	});
});
