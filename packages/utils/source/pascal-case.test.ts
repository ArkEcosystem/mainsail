import { describe } from "../../core-test-framework";
import { pascalCase } from "./pascal-case";

describe("pascalCase", async ({ assert, it, nock, loader }) => {
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
