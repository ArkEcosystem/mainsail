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

	public isCurrent(message: { blockNumber: number; round: number }): boolean {
		return this.hasValidBlockNumberOrRound(message);
	}

	public inBounds(message: { round: number }): boolean {
		return this.isRoundInBounds(message);
	}
}

describe<{
	app: Application;
	processor: TestProcessor;
	consensus: any;
	logger: any;
	timestampCalculator: any;
}>("AbstractProcessor", ({ it, assert, beforeEach, spy, stub, clock }) => {
	const lastBlock = { hash: "last-block-hash", number: 4 };

	beforeEach((context) => {
		context.consensus = {
			getBlockNumber: () => 5,
			getRound: () => 2,
			handle: async () => {},
		};

		context.logger = {
			error: () => {},
		};

		context.timestampCalculator = {
			calculateMinimalTimestamp: () => 0,
		};

		context.app = new Application();
		context.app.bind(Identifiers.Consensus.Service).toConstantValue(context.consensus);
		context.app.bind(Identifiers.Consensus.CommitLock).toConstantValue({});
		context.app.bind(Identifiers.State.Store).toConstantValue({ getLastBlock: () => lastBlock });
		context.app.bind(Identifiers.BlockchainUtils.TimestampCalculator).toConstantValue(context.timestampCalculator);
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);

		context.processor = context.app.resolve(TestProcessor);
	});

	it("#hasValidBlockNumberOrRound - should accept the current block number with the current or a later round", ({
		processor,
	}) => {
		assert.true(processor.isCurrent({ blockNumber: 5, round: 2 }));
		assert.true(processor.isCurrent({ blockNumber: 5, round: 3 }));
		assert.true(processor.isCurrent({ blockNumber: 5, round: 100 }));
	});

	it("#hasValidBlockNumberOrRound - should reject another block number or a past round", ({ processor }) => {
		assert.false(processor.isCurrent({ blockNumber: 4, round: 2 }));
		assert.false(processor.isCurrent({ blockNumber: 6, round: 2 }));
		assert.false(processor.isCurrent({ blockNumber: 5, round: 1 }));
		assert.false(processor.isCurrent({ blockNumber: 5, round: 0 }));
	});

	it("#isRoundInBounds - should ask the calculator for the minimal timestamp of the round after the last block", ({
		processor,
		timestampCalculator,
	}) => {
		const calculateMinimalTimestamp = spy(timestampCalculator, "calculateMinimalTimestamp");

		processor.inBounds({ round: 3 });

		calculateMinimalTimestamp.calledOnce();
		calculateMinimalTimestamp.calledWith(lastBlock, 3);
	});

	it("#isRoundInBounds - should accept a round once its minimal timestamp has passed", ({
		processor,
		timestampCalculator,
	}) => {
		const now = 1_000_000;
		clock({ now });
		stub(timestampCalculator, "calculateMinimalTimestamp").returnValue(now - 1);

		assert.true(processor.inBounds({ round: 1 }));
	});

	it("#isRoundInBounds - should tolerate a time drift of just under 500ms", ({ processor, timestampCalculator }) => {
		const now = 1_000_000;
		clock({ now });
		const calculateMinimalTimestamp = stub(timestampCalculator, "calculateMinimalTimestamp");

		// The bound is exclusive: now must be strictly after (minimal timestamp - 500).
		calculateMinimalTimestamp.returnValue(now + 499);
		assert.true(processor.inBounds({ round: 1 }));

		calculateMinimalTimestamp.returnValue(now + 500);
		assert.false(processor.inBounds({ round: 1 }));
	});

	it("#isRoundInBounds - should reject a round whose minimal timestamp is still ahead", ({
		processor,
		timestampCalculator,
	}) => {
		const now = 1_000_000;
		clock({ now });
		stub(timestampCalculator, "calculateMinimalTimestamp").returnValue(now + 60_000);

		assert.false(processor.inBounds({ round: 1 }));
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
