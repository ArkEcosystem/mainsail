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
		return this.hasValidBlockNumberAndRound(message);
	}

	public inBounds(message: { round: number }): boolean {
		return this.isRoundInBounds(message);
	}
}

describe<{
	app: Application;
	processor: TestProcessor;
	configuration: any;
	consensus: any;
	logger: any;
	timestampCalculator: any;
}>("AbstractProcessor", ({ it, assert, beforeEach, spy, stub, clock }) => {
	const lastBlock = { hash: "last-block-hash", number: 4 };
	const tolerance = 100;

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

		context.configuration = {
			getMilestone: () => ({ timeouts: { tolerance } }),
		};

		context.app = new Application();
		context.app.bind(Identifiers.Consensus.Service).toConstantValue(context.consensus);
		context.app.bind(Identifiers.Consensus.CommitLock).toConstantValue({});
		context.app.bind(Identifiers.State.Store).toConstantValue({ getLastBlock: () => lastBlock });
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);
		context.app.bind(Identifiers.BlockchainUtils.TimestampCalculator).toConstantValue(context.timestampCalculator);
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);

		context.processor = context.app.resolve(TestProcessor);
	});

	it("#hasValidBlockNumberAndRound - should accept the current block number with the current or a later round", ({
		processor,
	}) => {
		assert.true(processor.isCurrent({ blockNumber: 5, round: 2 }));
		assert.true(processor.isCurrent({ blockNumber: 5, round: 3 }));
		assert.true(processor.isCurrent({ blockNumber: 5, round: 100 }));
	});

	it("#hasValidBlockNumberAndRound - should reject another block number or a past round", ({ processor }) => {
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

	it("#isRoundInBounds - should tolerate a time drift of just under the milestone tolerance", ({
		processor,
		timestampCalculator,
	}) => {
		const now = 1_000_000;
		clock({ now });
		const calculateMinimalTimestamp = stub(timestampCalculator, "calculateMinimalTimestamp");

		// The bound is exclusive: now must be strictly after (minimal timestamp - tolerance). A block stamped at
		// the minimal timestamp is then never more than the tolerance ahead, which is what the timestamp verifier
		// allows, so an accepted proposal cannot carry a block the verifier rejects as a future block.
		calculateMinimalTimestamp.returnValue(now + tolerance - 1);
		assert.true(processor.inBounds({ round: 1 }));

		calculateMinimalTimestamp.returnValue(now + tolerance);
		assert.false(processor.inBounds({ round: 1 }));
	});

	it("#isRoundInBounds - should take the tolerance from the current milestone", ({
		processor,
		configuration,
		timestampCalculator,
	}) => {
		const now = 1_000_000;
		clock({ now });
		const getMilestone = stub(configuration, "getMilestone").returnValue({ timeouts: { tolerance: 5000 } });
		stub(timestampCalculator, "calculateMinimalTimestamp").returnValue(now + 4999);

		assert.true(processor.inBounds({ round: 1 }));
		getMilestone.calledOnce();
		getMilestone.calledWith();
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

	it("#handleRoundState - should log a failing handler instead of letting the rejection escape", async ({
		processor,
		consensus,
		logger,
	}) => {
		// handle() is not awaited by the caller, so an uncaught rejection would surface as an unhandled
		// rejection, outside the logger and without naming the round state.
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

		spyLoggerError.calledOnce();
		assert.match(spyLoggerError.getCallArgs(0)[0], "Failed to handle round state 5/2:");
		assert.match(spyLoggerError.getCallArgs(0)[0], error.stack);
		assert.equal(spyLoggerError.getCallArgs(0)[1], "consensus");
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
