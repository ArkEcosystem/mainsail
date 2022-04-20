import { describe } from "../../core-test-framework";
import { hasSomeProperty } from "./has-some-property";

describe("hasSomeProperty", async ({ assert, beforeEach, it, nock, loader }) => {
	beforeEach((context) => (context.object = { property: undefined }));

	it("should return true if the object has a given property", (context) => {
		assert.true(hasSomeProperty(context.object, ["property"]));
	});

	it("should return true if the object has any of the given properties", (context) => {
		assert.true(hasSomeProperty(context.object, ["not-present", "property"]));
	});

	it("should return false if the object doesn't have a given property", (context) => {
		assert.false(hasSomeProperty(context.object, ["not-present"]));
	});
});
