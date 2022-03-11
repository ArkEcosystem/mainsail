import { describe } from "../../../core-test-framework";

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

describe("ClassManager", ({ assert, it }) => {
	it("should throw when default driver cannot be created", async () => {
		const invalidManager = new MyInvalidManager();
		const promise = invalidManager.boot();

		await assert.rejects(() => promise);
	});

	it("should return default driver instance", async () => {
		const manager = new MyManager();
		await manager.boot();
		const memoryDriver = manager.driver();

		assert.instance(memoryDriver, MyMemoryDriver);
	});

	it("should return set driver instance", async () => {
		const manager = new MyManager();
		await manager.boot();
		await manager.extend("remote", async () => new MyRemoteDriver());
		manager.setDefaultDriver("remote");
		const remoteDriver = manager.driver();

		assert.instance(remoteDriver, MyRemoteDriver);
	});

	it("should return driver instance", async () => {
		const manager = new MyManager();
		await manager.boot();
		await manager.extend("remote", async () => new MyRemoteDriver());
		const remoteDriver = manager.driver("remote");

		assert.instance(remoteDriver, MyRemoteDriver);
	});

	it("should throw when attempting to get unknown driver instance", async () => {
		const manager = new MyManager();
		const check = () => manager.driver("some");

		assert.rejects(check);
	});

	it("should return driver instances", async () => {
		const manager = new MyManager();
		await manager.boot();
		await manager.extend("remote", async () => new MyRemoteDriver());
		const drivers = manager.getDrivers();

		assert.true(drivers.some((d) => d instanceof MyMemoryDriver));
		assert.true(drivers.some((d) => d instanceof MyRemoteDriver));
	});
});
