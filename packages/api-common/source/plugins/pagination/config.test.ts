import { describe } from "@mainsail/test-runner";

import { getConfig } from "./config.js";

const fakeH = () => ({ continue: Symbol("continue") });

const makeRoute = (plugins?: object) => ({
	route: { settings: plugins === undefined ? {} : { plugins } },
});

describe("getConfig", ({ it, assert }) => {
	it("should return config with default limit applied for valid options", () => {
		const { config, error } = getConfig({ query: { limit: { default: 100 } } });

		assert.undefined(error);
		assert.equal(config, { query: { limit: { default: 100 } } });
	});

	it("should apply default limit when not provided", () => {
		const { config, error } = getConfig({ query: { limit: {} } });

		assert.undefined(error);
		assert.equal(config, { query: { limit: { default: 100 } } });
	});

	it("should return an error for invalid options", () => {
		const { config, error } = getConfig({ query: { limit: { default: -5 } } });

		assert.undefined(config);
		assert.defined(error);
	});

	it("should return an error for non-integer default", () => {
		const { config, error } = getConfig({ query: { limit: { default: "abc" } } });

		assert.undefined(config);
		assert.defined(error);
	});
});
