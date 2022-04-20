import { describe } from "../../core-test-framework";
import { camelCase } from "./camel-case";

describe("#camelCase", ({ it, assert }) => {
	it("should turn any string into camel case", () => {
		assert.equal(camelCase("string"), "string");
		assert.equal(camelCase("camelCase"), "camelCase");
		assert.equal(camelCase("param-case"), "paramCase");
		assert.equal(camelCase("PascalCase"), "pascalCase");
		assert.equal(camelCase("UPPER_CASE"), "upperCase");
		assert.equal(camelCase("snake_case"), "snakeCase");
		assert.equal(camelCase("sentence case"), "sentenceCase");
		assert.equal(camelCase("Title Case"), "titleCase");
		assert.equal(camelCase("dot.case"), "dotCase");
	});
});
