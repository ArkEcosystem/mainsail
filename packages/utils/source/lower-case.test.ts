import { describe } from "../../core-test-framework";

import { lowerCase } from "./lower-case";

describe("lowerCase", async ({ assert, it, nock, loader }) => {
	it("should turn any string into lower case", () => {
		assert.is(lowerCase("string"), "string");
		assert.is(lowerCase("camelCase"), "camel case");
		assert.is(lowerCase("param-case"), "param case");
		assert.is(lowerCase("PascalCase"), "pascal case");
		assert.is(lowerCase("UPPER_CASE"), "upper case");
		assert.is(lowerCase("snake_case"), "snake case");
		assert.is(lowerCase("sentence case"), "sentence case");
		assert.is(lowerCase("Title Case"), "title case");
		assert.is(lowerCase("dot.case"), "dot case");
	});
});
