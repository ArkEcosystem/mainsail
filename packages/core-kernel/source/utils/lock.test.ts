import { describe } from "../../../core-test-framework";
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
});
