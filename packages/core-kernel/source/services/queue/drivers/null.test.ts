import { describe } from "../../../../../core-test-framework";

import { QueueJob } from "../../../contracts/kernel";
import { NullQueue } from "./null";

class MyQueueJob implements QueueJob {
	public async handle(): Promise<void> {}
}

describe("NullQueue", ({ assert, it }) => {
	it("should return instance itself", async () => {
		const driver = new NullQueue();
		const result = await driver.make();
		assert.is(result, driver);
	});

	it("should return undefined", async () => {
		const driver = new NullQueue();
		const result = await driver.start();
		assert.undefined(result);
	});

	it("should return undefined", async () => {
		const driver = new NullQueue();
		const result = await driver.stop();
		assert.undefined(result);
	});

	it("should return undefined", async () => {
		const driver = new NullQueue();
		const result = await driver.pause();
		assert.undefined(result);
	});

	it("should return undefined", async () => {
		const driver = new NullQueue();
		const result = await driver.resume();
		assert.undefined(result);
	});

	it("should return undefined", async () => {
		const driver = new NullQueue();
		const result = await driver.clear();
		assert.undefined(result);
	});

	it("should return undefined", async () => {
		const driver = new NullQueue();
		const result = await driver.push(new MyQueueJob());
		assert.undefined(result);
	});

	it("should return undefined", async () => {
		const driver = new NullQueue();
		const result = await driver.later(10, new MyQueueJob());
		assert.undefined(result);
	});

	it("should return undefined", async () => {
		const driver = new NullQueue();
		const result = await driver.bulk([new MyQueueJob(), new MyQueueJob()]);
		assert.undefined(result);
	});

	it("should return 0", async () => {
		const driver = new NullQueue();
		const result = await driver.size();
		assert.is(result, 0);
	});

	it("should return false", async () => {
		const driver = new NullQueue();
		const result = await driver.isStarted();
		assert.is(result, false);
	});

	it("should return false", async () => {
		const driver = new NullQueue();
		const result = await driver.isRunning();
		assert.is(result, false);
	});
});
