import { describe } from "@mainsail/test-runner";
import { InstanceManager } from "./instance-manager";
import { Container, injectable } from "@mainsail/container";
import { Application } from "../application";

interface MyDriver { }

@injectable()
class MyMemoryDriver implements MyDriver { }

@injectable()
class MyRemoteDriver implements MyDriver {
	name: "remote";
}

@injectable()
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
	app: Application;
}>("ClassManager", ({ beforeEach, assert, it }) => {
	beforeEach((context) => {
		context.app = new Application(new Container());
	});

	it("should throw when default driver cannot be created", async ({ app }) => {
		const invalidManager = app.resolve(MyInvalidManager);
		const promise = invalidManager.boot();

		await assert.rejects(() => promise);
	});

	it("should return default driver instance", async ({ app }) => {
		const manager = app.resolve(MyManager);
		await manager.boot();
		const memoryDriver = manager.driver();

		assert.instance(memoryDriver, MyMemoryDriver);
	});

	it("should return set driver instance", async ({ app }) => {
		const manager = app.resolve(MyManager);
		await manager.boot();
		await manager.extend("remote", async () => new MyRemoteDriver());
		manager.setDefaultDriver("remote");
		const remoteDriver = manager.driver();

		assert.instance(remoteDriver, MyRemoteDriver);
	});

	it("should return driver instance", async ({ app }) => {
		const manager = app.resolve(MyManager);
		await manager.boot();
		await manager.extend("remote", async () => new MyRemoteDriver());
		const remoteDriver = manager.driver("remote");

		assert.instance(remoteDriver, MyRemoteDriver);
	});

	it("should throw when attempting to get unknown driver instance", async ({ app }) => {
		const manager = app.resolve(MyManager);

		const check = () => manager.driver("some");

		assert.rejects(check);
	});

	it("should return driver instances", async ({ app }) => {
		const manager = app.resolve(MyManager);
		await manager.boot();
		await manager.extend("remote", async () => new MyRemoteDriver());
		const drivers = manager.getDrivers();

		assert.true(drivers.some((d) => d instanceof MyMemoryDriver));
		assert.true(drivers.some((d) => d instanceof MyRemoteDriver));
	});
});
