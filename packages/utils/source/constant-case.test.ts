import { describe } from "../../core-test-framework";
import { constantCase } from "./constant-case";

describe("#constantCase", ({ it, assert }) => {
	it("should turn any string into constant case", () => {
		assert.equal(constantCase("string"), "STRING");
		assert.equal(constantCase("camelCase"), "CAMEL_CASE");
		assert.equal(constantCase("param-case"), "PARAM_CASE");
		assert.equal(constantCase("PascalCase"), "PASCAL_CASE");
		assert.equal(constantCase("UPPER_CASE"), "UPPER_CASE");
		assert.equal(constantCase("snake_case"), "SNAKE_CASE");
		assert.equal(constantCase("sentence case"), "SENTENCE_CASE");
		assert.equal(constantCase("Title Case"), "TITLE_CASE");
		assert.equal(constantCase("dot.case"), "DOT_CASE");
	});
});
