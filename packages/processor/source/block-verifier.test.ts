import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { BlockVerifier } from "./block-verifier.js";

describe<{
	app: Application;
	handlers: any[];
	verifier: BlockVerifier;
}>("BlockVerifier", ({ it, beforeEach, assert, spy, stub }) => {
	const unit = { blockNumber: 3 } as Contracts.Processor.ProcessableUnit;

	beforeEach((context) => {
		context.handlers = [{ execute: async () => {} }, { execute: async () => {} }, { execute: async () => {} }];

		context.app = new Application();
		for (const handler of context.handlers) {
			context.app.bind(Identifiers.Processor.BlockVerifierHandlers).toConstantValue(handler);
		}

		context.verifier = context.app.resolve(BlockVerifier);
	});

	it("should run every handler with the unit in the registered order", async ({ handlers, verifier }) => {
		const executed: number[] = [];
		for (const [index, handler] of handlers.entries()) {
			handler.execute = async (executedUnit: unknown) => {
				assert.is(executedUnit, unit);
				executed.push(index);
			};
		}

		await verifier.verify(unit);

		assert.equal(executed, [0, 1, 2]);
	});

	it("should wait for a handler to finish before running the next one", async ({ handlers, verifier }) => {
		const executed: string[] = [];
		handlers[0].execute = async () => {
			await new Promise((resolve) => setImmediate(resolve));
			executed.push("first");
		};
		handlers[1].execute = async () => {
			executed.push("second");
		};

		await verifier.verify(unit);

		assert.equal(executed, ["first", "second"]);
	});

	it("should stop at the first failing handler and rethrow its error", async ({ handlers, verifier }) => {
		const first = spy(handlers[0], "execute");
		stub(handlers[1], "execute").rejectedValue(new Error("second handler failed"));
		const third = spy(handlers[2], "execute");

		await assert.rejects(() => verifier.verify(unit), "second handler failed");

		first.calledOnce();
		third.neverCalled();
	});
});
