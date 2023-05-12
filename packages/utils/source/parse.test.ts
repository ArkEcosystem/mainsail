import { describe } from "../../test-framework";
import { parse } from "./parse";

describe("parse", async ({ assert, it, nock, loader }) => {
	it("should parse valid json", () => {
		assert.equal(parse("{}"), {});
	});

	it("should fail to parse invalid json", () => {
		assert.throws(() => parse("{"), "Expected property name or '}' in JSON at position 1");
	});
});
