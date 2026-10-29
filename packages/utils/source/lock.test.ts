import { describe } from "@mainsail/test-runner";
import { Lock } from "./lock";

describe("Lock", ({ assert, it }) => {
	it("should run exclusive executions in series", async () => {
		let resolve: () => void;
		const promise = new Promise<void>((r) => (resolve = r));

		let executions = 0;
		const function_ = async () => {
			executions++;
			await promise;
			return executions;
		};

		const lock = new Lock();
		const promises = [lock.runExclusive(function_), lock.runExclusive(function_), lock.runExclusive(function_)];
		resolve();

		assert.equal(await Promise.all(promises), [1, 2, 3]);
	});

	it("should run non-exclusive executions in parallel", async () => {
		let resolve: () => void;
		const promise = new Promise<void>((r) => (resolve = r));

		let executions = 0;
		const function_ = async () => {
			executions++;
			await promise;
			return executions;
		};

		const lock = new Lock();
		const promises = [
			lock.runNonExclusive(function_),
			lock.runNonExclusive(function_),
			lock.runNonExclusive(function_),
		];
		resolve();

		assert.equal(await Promise.all(promises), [3, 3, 3]);
	});

	it("should run exclusive execution after non-exclusive had finished", async () => {
		let resolve: () => void;
		const promise = new Promise<void>((r) => (resolve = r));

		let executions = 0;
		const function_ = async () => {
			executions++;
			await promise;
			return executions;
		};

		const lock = new Lock();
		const promises = [
			lock.runNonExclusive(function_),
			lock.runNonExclusive(function_),
			lock.runExclusive(function_),
		];
		resolve();

		assert.equal(await Promise.all(promises), [2, 2, 3]);
	});

	it("should run non-exclusive execution after exclusive had finished", async () => {
		let resolve: () => void;
		const promise = new Promise<void>((r) => (resolve = r));

		let executions = 0;
		const function_ = async () => {
			executions++;
			await promise;
			return executions;
		};

		const lock = new Lock();
		const promises = [
			lock.runExclusive(function_),
			lock.runNonExclusive(function_),
			lock.runNonExclusive(function_),
		];
		resolve();

		assert.equal(await Promise.all(promises), [1, 3, 3]);
	});

	it("should let a non-exclusive execution run after a rejected exclusive one", async () => {
		const lock = new Lock();
		const error = new Error("boom");

		const exclusive = lock.runExclusive(async () => {
			throw error;
		});
		const nonExclusive = lock.runNonExclusive(async () => "ok");

		await assert.rejects(() => exclusive, "boom");
		assert.equal(await nonExclusive, "ok");
	});

	it("should let an exclusive execution run after a rejected exclusive one", async () => {
		const lock = new Lock();

		const first = lock.runExclusive(async () => {
			throw new Error("boom");
		});
		const second = lock.runExclusive(async () => "ok");

		await assert.rejects(() => first, "boom");
		assert.equal(await second, "ok");
	});

	it("should let an exclusive execution run after a rejected non-exclusive one", async () => {
		const lock = new Lock();

		const nonExclusive = lock.runNonExclusive(async () => {
			throw new Error("boom");
		});
		const exclusive = lock.runExclusive(async () => "ok");

		await assert.rejects(() => nonExclusive, "boom");
		assert.equal(await exclusive, "ok");
	});
});
