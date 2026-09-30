import { describe } from "@mainsail/test-runner";

import { get, isTrue } from "./environment";

const KEY = "MAINSAIL_TEST_ENVIRONMENT";

describe<object>("environment", ({ afterEach, assert, it }) => {
	afterEach(() => {
		delete process.env[KEY];
	});

	it("isTrue should return true for 'true' or '1'", () => {
		process.env[KEY] = "true";
		assert.true(isTrue(KEY));

		process.env[KEY] = "1";
		assert.true(isTrue(KEY));
	});

	it("isTrue should return false for any other value or when unset", () => {
		assert.false(isTrue(KEY));

		process.env[KEY] = "false";
		assert.false(isTrue(KEY));

		process.env[KEY] = "0";
		assert.false(isTrue(KEY));

		process.env[KEY] = "yes";
		assert.false(isTrue(KEY));
	});

	it("get should return the environment variable when set", () => {
		process.env[KEY] = "hello";

		assert.equal(get(KEY), "hello");
		assert.equal(get(KEY, "fallback"), "hello");
	});

	it("get should return the default value when the variable is unset", () => {
		assert.equal(get(KEY, "fallback"), "fallback");
		assert.equal(get(KEY, 5), 5);
		assert.undefined(get(KEY));
	});
});
