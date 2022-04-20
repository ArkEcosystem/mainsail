import { describe } from "../../core-test-framework";
import { snakeCase } from "./snake-case";

describe("snakeCase", async ({ assert, it, nock, loader }) => {
	it("should turn any string into snake case", () => {
		assert.is(snakeCase("string"), "string");
		assert.is(snakeCase("camelCase"), "camel_case");
		assert.is(snakeCase("param-case"), "param_case");
		assert.is(snakeCase("PascalCase"), "pascal_case");
		assert.is(snakeCase("UPPER_CASE"), "upper_case");
		assert.is(snakeCase("snake_case"), "snake_case");
		assert.is(snakeCase("sentence case"), "sentence_case");
		assert.is(snakeCase("Title Case"), "title_case");
		assert.is(snakeCase("dot.case"), "dot_case");
	});
});
