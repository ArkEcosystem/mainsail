import { describe } from "@mainsail/test-runner";
import { camelCase, pascalCase } from "./string-case";

describe("#stringCase", ({ it, assert }) => {
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

	it("should turn any string into pascal case", () => {
		assert.is(pascalCase("string"), "String");
		assert.is(pascalCase("camelCase"), "CamelCase");
		assert.is(pascalCase("param-case"), "ParamCase");
		assert.is(pascalCase("PascalCase"), "PascalCase");
		assert.is(pascalCase("UPPER_CASE"), "UpperCase");
		assert.is(pascalCase("snake_case"), "SnakeCase");
		assert.is(pascalCase("sentence case"), "SentenceCase");
		assert.is(pascalCase("Title Case"), "TitleCase");
		assert.is(pascalCase("dot.case"), "DotCase");
	});
});
