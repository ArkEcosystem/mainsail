import { Enums, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { CommitProcessor } from "./commit-processor";

describe<{
	app: Application;
	processor: CommitProcessor;
	consensus: any;
	commitState: any;
}>("CommitProcessor", ({ it, assert, beforeEach, stub, spy }) => {
	const makeCommit = (blockNumber: number) => ({
		block: { hash: `hash${blockNumber}`, number: blockNumber },
		proof: { round: 0, validators: [] },
	});

	beforeEach((context) => {
		context.consensus = {
			getBlockNumber: () => 1,
			handleCommitState: async () => {},
		};
		context.commitState = {
			getProcessorResult: () => ({ success: true }),
		};

		context.app = new Application();
		context.app.bind(Identifiers.Consensus.Service).toConstantValue(context.consensus);
		context.app.bind(Identifiers.Consensus.CommitState.Factory).toConstantValue(() => context.commitState);
		context.app.bind(Identifiers.Consensus.CommitLock).toConstantValue({});
		context.app.bind(Identifiers.Consensus.Aggregator).toConstantValue({});
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue({});
		context.app.bind(Identifiers.Cryptography.Message.Serializer).toConstantValue({});
		context.app.bind(Identifiers.ValidatorSet.Service).toConstantValue({});
		context.app.bind(Identifiers.State.Store).toConstantValue({});
		context.app.bind(Identifiers.BlockchainUtils.TimestampCalculator).toConstantValue({});
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue({ error: () => {} });

		context.processor = context.app.resolve(CommitProcessor);
	});

	it("#process - should accept a commit that applies cleanly", async ({ processor, consensus, commitState }) => {
		// Applying the commit advances the block number — via our own commit, not a race.
		stub(consensus, "handleCommitState").callsFake(async () => {
			consensus.getBlockNumber = () => 2;
			commitState.getProcessorResult = () => ({ success: true });
		});

		assert.equal(await processor.process(makeCommit(1)), Enums.Consensus.ProcessorResult.Accepted);
	});

	it("#process - should skip a commit for a block consensus has moved past", async ({ processor, consensus }) => {
		const handleCommitState = spy(consensus, "handleCommitState");
		consensus.getBlockNumber = () => 5;

		assert.equal(await processor.process(makeCommit(1)), Enums.Consensus.ProcessorResult.Skipped);
		handleCommitState.neverCalled();
	});

	it("#process - should report an invalid block as invalid", async ({ processor, commitState }) => {
		commitState.getProcessorResult = () => ({ success: false });

		assert.equal(await processor.process(makeCommit(1)), Enums.Consensus.ProcessorResult.Invalid);
	});

	it("#process - should skip, not invalidate, a block that consensus committed while the unit waited on the handler lock", async ({
		processor,
		consensus,
		commitState,
	}) => {
		// Live gossip commits block 1 while this unit waits on the handler lock; the stale
		// unit then fails verification (BlockNotChained). That is a lost race, not evidence
		// of a bad block — reporting Invalid here makes the downloader ban an honest peer.
		stub(consensus, "handleCommitState").callsFake(async () => {
			consensus.getBlockNumber = () => 2;
			commitState.getProcessorResult = () => ({ success: false });
		});

		assert.equal(await processor.process(makeCommit(1)), Enums.Consensus.ProcessorResult.Skipped);
	});
});
