import { describe } from "../../core-test-framework";

import { dotCase } from "./dot-case";

describe("#dotCase", ({ it, assert }) => {
	it("should turn any string into dot case", () => {
		assert.equal(dotCase("string"), "string");
		assert.equal(dotCase("camelCase"), "camel.case");
		assert.equal(dotCase("param-case"), "param.case");
		assert.equal(dotCase("PascalCase"), "pascal.case");
		assert.equal(dotCase("UPPER_CASE"), "upper.case");
		assert.equal(dotCase("snake_case"), "snake.case");
		assert.equal(dotCase("sentence case"), "sentence.case");
		assert.equal(dotCase("Title Case"), "title.case");
		assert.equal(dotCase("dot.case"), "dot.case");
	});
});
