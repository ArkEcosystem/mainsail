import { describe, Sandbox } from "../../../test-framework/source";
import { InstanceManager } from "./instance-manager";

interface MyDriver {}

class MyMemoryDriver implements MyDriver {}

class MyRemoteDriver implements MyDriver {
	name: "remote";
}

class MyManager extends InstanceManager<MyDriver> {
	protected getDefaultDriver(): string {
		return "memory";
	}

	protected async createMemoryDriver(): Promise<MyMemoryDriver> {
		return new MyMemoryDriver();
	}

	protected async createRemoteDriver(): Promise<MyRemoteDriver> {
		return new MyRemoteDriver();
	}
}

class MyInvalidManager extends InstanceManager<MyDriver> {
	protected getDefaultDriver(): string {
		return "memory";
	}
}

describe<{
	sandbox: Sandbox;
}>("ClassManager", ({ beforeEach, assert, it }) => {
	beforeEach((context) => {
		context.sandbox = new Sandbox();
	});

	it("should throw when default driver cannot be created", async ({ sandbox }) => {
		const invalidManager = sandbox.app.resolve(MyInvalidManager);
		invalidManager.init();
		const promise = invalidManager.boot();

		await assert.rejects(() => promise);
	});

	it("should return default driver instance", async ({ sandbox }) => {
		const manager = sandbox.app.resolve(MyManager);
		manager.init();

		await manager.boot();
		const memoryDriver = manager.driver();

		assert.instance(memoryDriver, MyMemoryDriver);
	});

	it("should return set driver instance", async ({ sandbox }) => {
		const manager = sandbox.app.resolve(MyManager);
		manager.init();

		await manager.boot();
		await manager.extend("remote", async () => new MyRemoteDriver());
		manager.setDefaultDriver("remote");
		const remoteDriver = manager.driver();

		assert.instance(remoteDriver, MyRemoteDriver);
	});

	it("should return driver instance", async ({ sandbox }) => {
		const manager = sandbox.app.resolve(MyManager);
		manager.init();

		await manager.boot();
		await manager.extend("remote", async () => new MyRemoteDriver());
		const remoteDriver = manager.driver("remote");

		assert.instance(remoteDriver, MyRemoteDriver);
	});

	it("should throw when attempting to get unknown driver instance", async ({ sandbox }) => {
		const manager = sandbox.app.resolve(MyManager);
		manager.init();

		const check = () => manager.driver("some");

		assert.rejects(check);
	});

	it("should return driver instances", async ({ sandbox }) => {
		const manager = sandbox.app.resolve(MyManager);
		manager.init();

		await manager.boot();
		await manager.extend("remote", async () => new MyRemoteDriver());
		const drivers = manager.getDrivers();

		assert.true(drivers.some((d) => d instanceof MyMemoryDriver));
		assert.true(drivers.some((d) => d instanceof MyRemoteDriver));
	});
});
