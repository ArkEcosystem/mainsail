import { describe } from "../../../test-framework/source";
import { ClassManager } from "./class-manager";

class MyMemoryDriver {}

class MyRemoteDriver {}

class MyManager extends ClassManager {
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

describe("ClassManager", ({ assert, it }) => {
	it("should return default driver instance", async () => {
		const manager = new MyManager();
		const memoryDriver = await manager.driver();

		assert.instance(memoryDriver, MyMemoryDriver);
	});

	it("should return new default driver instance after default driver change", async () => {
		const manager = new MyManager();
		manager.setDefaultDriver("remote");
		const remoteDriver = await manager.driver();

		assert.instance(remoteDriver, MyRemoteDriver);
	});

	it("should return driver instance", async () => {
		const manager = new MyManager();
		const remoteDriver = await manager.driver("remote");

		assert.instance(remoteDriver, MyRemoteDriver);
	});

	it("should throw when attempting to create unknown driver instance", async () => {
		const manager = new MyManager();
		const promise = manager.driver("some");

		await assert.rejects(() => promise);
	});
});
