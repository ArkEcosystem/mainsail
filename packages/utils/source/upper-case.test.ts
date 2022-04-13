import { describe } from "../../core-test-framework";

import { upperCase } from "./upper-case";

describe("upperCase", async ({ assert, it, nock, loader }) => {
	it("should turn any string into upper case", () => {
		assert.is(upperCase("string"), "STRING");
		assert.is(upperCase("camelCase"), "CAMEL CASE");
		assert.is(upperCase("param-case"), "PARAM CASE");
		assert.is(upperCase("PascalCase"), "PASCAL CASE");
		assert.is(upperCase("UPPER_CASE"), "UPPER CASE");
		assert.is(upperCase("snake_case"), "SNAKE CASE");
		assert.is(upperCase("sentence case"), "SENTENCE CASE");
		assert.is(upperCase("Title Case"), "TITLE CASE");
		assert.is(upperCase("dot.case"), "DOT CASE");
	});
});
