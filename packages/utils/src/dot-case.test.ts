import "jest-extended";

import { dotCase } from "./dot-case";

describe("#dotCase", () => {
	it("should turn any string into dot case", () => {
		expect(dotCase("string")).toBe("string");
		expect(dotCase("camelCase")).toBe("camel.case");
		expect(dotCase("param-case")).toBe("param.case");
		expect(dotCase("PascalCase")).toBe("pascal.case");
		expect(dotCase("UPPER_CASE")).toBe("upper.case");
		expect(dotCase("snake_case")).toBe("snake.case");
		expect(dotCase("sentence case")).toBe("sentence.case");
		expect(dotCase("Title Case")).toBe("title.case");
		expect(dotCase("dot.case")).toBe("dot.case");
	});
});
