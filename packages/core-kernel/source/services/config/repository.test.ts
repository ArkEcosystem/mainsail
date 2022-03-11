import { describe } from "../../../../core-test-framework";

import { ConfigRepository } from "./repository";

describe<{
	configRepository: ConfigRepository;
}>("ConfigRepository", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.configRepository = new ConfigRepository();
	});

	it("should set, get and unset the given key-value", (context) => {
		assert.false(context.configRepository.has("key"));

		context.configRepository.set("key", "value");

		assert.equal(context.configRepository.all(), { key: "value" });
		assert.is(context.configRepository.get("key"), "value");
		assert.true(context.configRepository.has("key"));

		context.configRepository.unset("key");

		assert.is(context.configRepository.get("key", "defaultValue"), "defaultValue");
		assert.false(context.configRepository.has("key"));
	});

	it("should determine if all of the given values are present", (context) => {
		context.configRepository.set("key1", "value");

		assert.false(context.configRepository.hasAll(["key1", "key2"]));

		context.configRepository.set("key2", "value");

		assert.true(context.configRepository.hasAll(["key1", "key2"]));
	});
});
