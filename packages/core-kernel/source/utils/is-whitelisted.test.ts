import { describe } from "../../../core-test-framework";

import { isWhitelisted } from "./is-whitelisted";

describe("isWhitelisted", ({ assert, it }) => {
	it("should allow everyone if there is whitelist", () => {
		assert.true(isWhitelisted(null, "127.0.0.1"));
		assert.true(isWhitelisted(null, "::1"));

		assert.true(isWhitelisted(undefined, "192.168.1.1"));
		assert.true(isWhitelisted(undefined, "::1"));

		assert.true(isWhitelisted([], "168.1.1.1"));
		assert.true(isWhitelisted([], "::1"));
		assert.true(isWhitelisted([], "2001:3984:3989::104"));
	});

	it("should allow everyone", () => {
		assert.true(isWhitelisted(["*"], "127.0.0.1"));
		assert.true(isWhitelisted(["*"], "192.168.1.1"));
		assert.true(isWhitelisted(["*"], "168.1.1.1"));

		assert.true(isWhitelisted(["*"], "::1"));
		assert.true(isWhitelisted(["*"], "2001:3984:3989::104"));
	});

	it("should allow addresses with prefixes", () => {
		assert.true(isWhitelisted(["127.*"], "127.0.0.1"));
		assert.true(isWhitelisted(["127.*"], "127.0.0.2"));
		assert.false(isWhitelisted(["127.*"], "128.0.0.1"));
	});

	it("should allow addresses with suffixes", () => {
		assert.true(isWhitelisted(["*.127"], "1.1.1.127"));
		assert.true(isWhitelisted(["*.127"], "1.1.1.127"));
		assert.false(isWhitelisted(["*.127"], "1.1.1.128"));
	});
});
