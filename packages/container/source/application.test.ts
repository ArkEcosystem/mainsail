import { injectable } from "./decorators";

import { describe } from "@mainsail/test-runner";
import { Application } from "./index";

@injectable()
class StubClass {}

describe<{
	app: Application;
}>("ActionFactory", ({ beforeEach, it, assert }) => {
	beforeEach((context) => {
		context.app = new Application();
	});

	it("should bind a value to the IoC container", ({ app }) => {
		assert.false(app.isBound("key"));

		app.bind("key").toConstantValue("value");

		assert.true(app.isBound("key"));
	});

	it("should rebind a value to the IoC container", ({ app }) => {
		assert.false(app.isBound("key"));

		app.rebind("key").toConstantValue("value");

		assert.equal(app.get("key"), "value");
		assert.true(app.isBound("key"));

		app.rebind("key").toConstantValue("value-new");

		assert.equal(app.get("key"), "value-new");
	});

	it("should unbind a value from the IoC container", ({ app }) => {
		app.bind("key").toConstantValue("value");

		assert.true(app.isBound("key"));

		app.unbind("key");

		assert.false(app.isBound("key"));
	});

	it("should get a value from the IoC container", ({ app }) => {
		app.bind("key").toConstantValue("value");

		assert.equal(app.get("key"), "value");
	});

	it("should resolve a value from the IoC container", ({ app }) => {
		assert.instance(app.resolve(StubClass), StubClass);
	});
});
