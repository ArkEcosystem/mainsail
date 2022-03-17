import { Container, injectable } from "@arkecosystem/core-container";

import { describe } from "../../core-test-framework";
import { container } from "./container";

@injectable()
class StubClass {}

describe<{
	container: Container;
}>("Container", ({ afterEach, assert, beforeEach, it }) => {
	beforeEach(() => container.snapshot());
	afterEach(() => container.restore());

	it("should be an inversify container", async () => {
		assert.instance(container, Container);
	});

	it("should bind a value to the IoC container", () => {
		assert.false(container.isBound("key"));

		container.bind("key").toConstantValue("value");

		assert.true(container.isBound("key"));
	});

	it("should rebind a value to the IoC container", () => {
		assert.false(container.isBound("key"));

		container.bind("key").toConstantValue("value");

		assert.is(container.get("key"), "value");
		assert.true(container.isBound("key"));

		container.rebind("key").toConstantValue("value-new");

		assert.is(container.get("key"), "value-new");
	});

	it("should unbind a value from the IoC container", () => {
		container.bind("key").toConstantValue("value");

		assert.true(container.isBound("key"));

		container.unbind("key");

		assert.false(container.isBound("key"));
	});

	it("should get a value from the IoC container", () => {
		container.bind("key").toConstantValue("value");

		assert.is(container.get("key"), "value");
	});

	it("should resolve a value from the IoC container", () => {
		assert.instance(container.resolve(StubClass), StubClass);
	});
});
