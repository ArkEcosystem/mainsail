import { describe } from "@mainsail/test-runner";

// worker-script.ts is the worker thread entrypoint: importing it wires an Ipc.Handler to a
// WorkerScriptHandler. On the main thread parentPort is null, so the handler registers no
// listener — the import should simply complete without throwing.
describe("WorkerScript", ({ assert, it }) => {
	it("loads without throwing", async () => {
		await assert.resolves(() => import("./worker-script.js"));
	});
});
