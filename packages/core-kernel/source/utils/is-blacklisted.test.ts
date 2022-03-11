import { describe } from "../../../core-test-framework";

import { isBlacklisted } from "./is-blacklisted";

describe("isBlacklisted", ({ assert, it }) => {
	it("should allow everyone if there is no blacklist", () => {
		assert.false(isBlacklisted(null, "127.0.0.1"));
		assert.false(isBlacklisted(undefined, "192.168.1.1"));
		assert.false(isBlacklisted([], "168.1.1.1"));

		assert.false(isBlacklisted([], "::1"));
		assert.false(isBlacklisted([], "2001:3984:3989::104"));
	});

	it("should block everyone", () => {
		assert.true(isBlacklisted(["*"], "127.0.0.1"));
		assert.true(isBlacklisted(["*"], "192.168.1.1"));
		assert.true(isBlacklisted(["*"], "168.1.1.1"));

		assert.true(isBlacklisted(["*"], "::1"));
		assert.true(isBlacklisted(["*"], "2001:3984:3989::104"));
	});

	it("should block addresses with prefixes", () => {
		assert.true(isBlacklisted(["127.*"], "127.0.0.1"));
		assert.true(isBlacklisted(["127.*"], "127.0.0.2"));
		assert.false(isBlacklisted(["127.*"], "128.0.0.1"));

		assert.false(isBlacklisted(["2001:*"], "::1"));
		assert.true(isBlacklisted(["2001:*"], "2001:3984:3989::104"));
		assert.false(isBlacklisted(["2001:*"], "2002:3984:3989::104"));
	});

	it("should block addresses with suffixes", () => {
		assert.true(isBlacklisted(["*.127"], "1.1.1.127"));
		assert.true(isBlacklisted(["*.127"], "1.1.1.127"));
		assert.false(isBlacklisted(["*.127"], "1.1.1.128"));

		assert.false(isBlacklisted(["*:104"], "::1"));
		assert.true(isBlacklisted(["*:104"], "2001:3984:3989::104"));
		assert.false(isBlacklisted(["*:104"], "2001:3984:3989::105"));
	});
});
