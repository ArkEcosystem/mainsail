import { Enums, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { CommitProcessor } from "./commit-processor";

describe<{
	app: Application;
	processor: CommitProcessor;
	aggregator: any;
	configuration: any;
	consensus: any;
	commitState: any;
	commitStateFactory: any;
	serializer: any;
}>("CommitProcessor", ({ it, assert, beforeEach, stub, stubFn, spy }) => {
	const roundValidators = 4;
	const genesisBlockHash = "genesis-hash";
	const previousBlockHash = "previous-hash";
	const serializedPrecommit = Buffer.from("serialized-precommit");

	const makeCommit = (blockNumber: number) => ({
		block: { hash: `hash${blockNumber}`, number: blockNumber },
		proof: { round: 0, signature: "cc".repeat(96), validators: [true, true, true, false] },
	});

	beforeEach((context) => {
		context.consensus = {
			getBlockNumber: () => 1,
			handleCommitState: async () => {},
		};
		context.commitState = {
			getProcessorResult: () => ({ success: true }),
		};
		context.commitStateFactory = stubFn().callsFake(() => context.commitState);
		context.aggregator = { verify: async () => true };
		context.configuration = { getMilestone: () => ({ roundValidators }) };
		context.serializer = { serializeMessageForSignature: async () => serializedPrecommit };

		context.app = new Application();
		context.app.bind(Identifiers.Consensus.Service).toConstantValue(context.consensus);
		context.app
			.bind(Identifiers.Consensus.CommitState.Factory)
			.toConstantValue(context.commitStateFactory.toFunction());
		context.app.bind(Identifiers.Consensus.CommitLock).toConstantValue({});
		context.app.bind(Identifiers.Consensus.Aggregator).toConstantValue(context.aggregator);
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);
		context.app.bind(Identifiers.Cryptography.Message.Serializer).toConstantValue(context.serializer);
		context.app
			.bind(Identifiers.State.Store)
			.toConstantValue({ getGenesisCommit: () => ({ block: { hash: genesisBlockHash } }) });
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

	it("#process - should build the commit state from the commit and hand it to consensus", async ({
		processor,
		consensus,
		commitState,
		commitStateFactory,
	}) => {
		const commit = makeCommit(1);
		const handleCommitState = spy(consensus, "handleCommitState");

		await processor.process(commit);

		commitStateFactory.calledOnce();
		commitStateFactory.calledWith(commit);
		handleCommitState.calledOnce();
		handleCommitState.calledWith(commitState);
	});

	it("#hasValidSignature - should verify the proof against the precommit of the committed block", async ({
		processor,
		aggregator,
		configuration,
		serializer,
	}) => {
		const commit = makeCommit(1);
		const serializeMessageForSignature = spy(serializer, "serializeMessageForSignature");
		const getMilestone = spy(configuration, "getMilestone");
		const verify = stub(aggregator, "verify").resolvedValue(true);

		assert.true(await processor.hasValidSignature(commit as any, previousBlockHash));

		serializeMessageForSignature.calledOnce();
		serializeMessageForSignature.calledWith(
			{
				blockHash: commit.block.hash,
				blockNumber: commit.block.number,
				round: commit.proof.round,
				type: Enums.Crypto.MessageType.Precommit,
			},
			{ genesisBlockHash, previousBlockHash },
		);
		getMilestone.calledWith(commit.block.number);
		verify.calledOnce();
		verify.calledWith(commit.proof, serializedPrecommit, roundValidators);
	});

	it("#hasValidSignature - should return false when the aggregator rejects the proof", async ({
		processor,
		aggregator,
	}) => {
		stub(aggregator, "verify").resolvedValue(false);

		assert.false(await processor.hasValidSignature(makeCommit(1) as any, previousBlockHash));
	});

	it("#hasValidSignature - should use the round of the proof", async ({ processor, serializer }) => {
		const serializeMessageForSignature = spy(serializer, "serializeMessageForSignature");
		const commit = makeCommit(1);
		commit.proof.round = 7;

		await processor.hasValidSignature(commit as any, previousBlockHash);

		assert.equal(serializeMessageForSignature.getCallArgs(0)[0].round, 7);
	});
});
