import { describe } from "@mainsail/test-runner";
import esmock from "esmock";

// `emit` talks to the worker_threads parentPort, which is null on the main thread (where
// tests run). esmock lets us substitute a fake parentPort so the postMessage call is observable.
describe<{
	load: (parentPort: unknown) => Promise<{ emit: (event: string, data: unknown) => void }>;
}>("Emit", ({ assert, beforeEach, it }) => {
	beforeEach((context) => {
		context.load = (parentPort) => esmock("./emit", { worker_threads: { parentPort } });
	});

	it("posts a {data, event} message to the parent port", async (context) => {
		const posted: unknown[] = [];
		const { emit } = await context.load({ postMessage: (message: unknown) => posted.push(message) });

		emit("block.applied", { height: 10 });

		assert.equal(posted, [{ data: { height: 10 }, event: "block.applied" }]);
	});

	it("is a no-op when there is no parent port", async (context) => {
		const { emit } = await context.load(null);

		assert.not.throws(() => emit("block.applied", { height: 10 }));
	});
});
