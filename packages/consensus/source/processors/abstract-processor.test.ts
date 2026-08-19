import { Identifiers } from "@mainsail/constants";
import { injectable } from "@mainsail/container";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { AbstractProcessor } from "./abstract-processor";

@injectable()
class TestProcessor extends AbstractProcessor {
	public handle(roundState: any): void {
		this.handleRoundState(roundState);
	}
}

describe<{
	app: Application;
	processor: TestProcessor;
	consensus: any;
	logger: any;
}>("AbstractProcessor", ({ it, assert, beforeEach, spy, stub }) => {
	beforeEach((context) => {
		context.consensus = {
			handle: async () => {},
		};

		context.logger = {
			error: () => {},
		};

		context.app = new Application();
		context.app.bind(Identifiers.Consensus.Service).toConstantValue(context.consensus);
		context.app.bind(Identifiers.Consensus.CommitLock).toConstantValue({});
		context.app.bind(Identifiers.State.Store).toConstantValue({});
		context.app.bind(Identifiers.BlockchainUtils.TimestampCalculator).toConstantValue({});
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);

		context.processor = context.app.resolve(TestProcessor);
	});

	it("#handleRoundState - should report a failing handler and keep the node running", async ({
		app,
		processor,
		consensus,
		logger,
	}) => {
		// handle() is not awaited by the caller, so without this the rejection is left to the kernel's
		// global handler, which reports it outside the logger and without naming the round state.
		const spyTerminate = stub(app, "terminate").callsFake(() => new Promise(() => {}));
		const spyLoggerError = spy(logger, "error");
		const error = new Error("handler failed");
		stub(consensus, "handle").rejectedValue(error);

		const unhandled: unknown[] = [];
		const onUnhandledRejection = (reason: unknown) => unhandled.push(reason);
		process.on("unhandledRejection", onUnhandledRejection);

		try {
			processor.handle({ blockNumber: 5, round: 2 });
			await new Promise((resolve) => setImmediate(resolve));
			await new Promise((resolve) => setImmediate(resolve));

			assert.equal(unhandled, []);
		} finally {
			process.off("unhandledRejection", onUnhandledRejection);
		}

		spyTerminate.neverCalled();
		spyLoggerError.calledOnce();
		assert.match(spyLoggerError.getCallArgs(0)[0], "Failed to handle round state 5/2:");
		assert.match(spyLoggerError.getCallArgs(0)[0], error.stack);
	});

	it("#handleRoundState - should not report anything when handling the round state succeeds", async ({
		processor,
		consensus,
		logger,
	}) => {
		const spyLoggerError = spy(logger, "error");
		const spyHandle = stub(consensus, "handle").resolvedValue();

		processor.handle({});
		await new Promise((resolve) => setImmediate(resolve));

		spyHandle.calledOnce();
		spyLoggerError.neverCalled();
	});
});
