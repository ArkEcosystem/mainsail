import "jest-extended";

import { upperCase } from "./upper-case";

describe("#upperCase", () => {
	it("should turn any string into upper case", () => {
		expect(upperCase("string")).toBe("STRING");
		expect(upperCase("camelCase")).toBe("CAMEL CASE");
		expect(upperCase("param-case")).toBe("PARAM CASE");
		expect(upperCase("PascalCase")).toBe("PASCAL CASE");
		expect(upperCase("UPPER_CASE")).toBe("UPPER CASE");
		expect(upperCase("snake_case")).toBe("SNAKE CASE");
		expect(upperCase("sentence case")).toBe("SENTENCE CASE");
		expect(upperCase("Title Case")).toBe("TITLE CASE");
		expect(upperCase("dot.case")).toBe("DOT CASE");
	});
});
