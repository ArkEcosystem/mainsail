import { describe } from "./describe";
import { runHook } from "./hooks";

describe("runHook", ({ assert, it, stub }) => {
	it("should run the hook", async () => {
		let x = 1;

		await runHook(() => (x += 1))({});

		assert.equal(x, 2);
	});

	it("should forward the context to the hook", async () => {
		let received: unknown;

		await runHook((context) => {
			received = context;
		})({ hello: "world" });

		assert.equal(received, { hello: "world" });
	});

	it("should support asynchronous hooks", async () => {
		let x = 1;

		await runHook(async () => {
			await Promise.resolve();

			x += 1;
		})({});

		assert.equal(x, 2);
	});

	it("should log to stderr and bubble up the error if the hook throws", async () => {
		const error = stub(console, "error");

		await assert.rejects(
			async () =>
				runHook(() => {
					throw new Error("hook died");
				})({}),
			"hook died",
		);

		error.calledOnce();
	});

	it("should fall back to the message when the error has no stack", async () => {
		const error = stub(console, "error");
		const stackless = new Error("no stack");
		delete stackless.stack;

		await assert.rejects(
			async () =>
				runHook(() => {
					throw stackless;
				})({}),
			"no stack",
		);

		error.calledOnce();
	});
});
