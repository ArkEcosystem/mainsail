import type { Contracts } from "@mainsail/contracts";

import { Enums, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { ProposalProcessor } from "./proposal-processor";

const { Accepted, Invalid, Skipped } = Enums.Consensus.ProcessorResult;

describe<{
	app: Application;
	processor: ProposalProcessor;
	aggregator: any;
	broadcaster: any;
	commitLock: any;
	configuration: any;
	consensus: any;
	consensusSignature: any;
	logger: any;
	messageSerializer: any;
	proposalSerializer: any;
	proposerCalculator: any;
	roundState: any;
	roundStateRepository: any;
	stateStore: any;
	timestampCalculator: any;
	validatorSet: any;
}>("ProposalProcessor", ({ it, assert, beforeEach, stub, spy }) => {
	const blockNumber = 1;
	const round = 2;
	const proposerIndex = 3;
	const roundValidators = 4;
	const blockHash = "block-hash";
	const genesisBlockHash = "genesis-hash";
	const previousBlockHash = "previous-hash";
	const blsPublicKey = "aa".repeat(48);
	const serializedUnsigned = Buffer.from("serialized-unsigned-proposal");
	const serializedPrevote = Buffer.from("serialized-prevote");
	const lockProof = { signature: "cc".repeat(96), validators: [true, true, true, false] };

	const makeProposal = (overrides: Record<string, unknown> = {}): Contracts.Crypto.Proposal => {
		const data = {
			payloadSerialized: "payload",
			round,
			signature: "bb".repeat(96),
			validRound: undefined,
			validatorIndex: proposerIndex,
			...overrides,
		};

		return {
			...data,
			blockHeader: { hash: blockHash, number: blockNumber },
			toSerializableData: () => data,
		} as unknown as Contracts.Crypto.Proposal;
	};

	// The processor defers handling with setTimeout(0); a 1ms timer queued afterwards runs behind it.
	const flushTimers = () => new Promise((resolve) => setTimeout(resolve, 1));

	beforeEach((context) => {
		context.consensus = { getBlockNumber: () => blockNumber, getRound: () => round, handle: async () => {} };
		context.commitLock = { runNonExclusive: async (callback: () => Promise<unknown>) => callback() };
		context.stateStore = {
			getGenesisCommit: () => ({ block: { hash: genesisBlockHash } }),
			getLastBlock: () => ({ hash: previousBlockHash }),
		};
		// Rounds are in bounds by default; individual tests move the minimal timestamp into the future.
		context.timestampCalculator = { calculateMinimalTimestamp: () => Date.now() - 10_000 };
		context.logger = { debug: () => {}, error: () => {} };
		context.proposalSerializer = { serializeProposalUnsigned: async () => serializedUnsigned };
		context.messageSerializer = { serializeMessageForSignature: async () => serializedPrevote };
		context.consensusSignature = { verify: async () => true };
		context.configuration = { getMilestone: () => ({ roundValidators }) };
		context.aggregator = { verify: async () => true };
		context.proposerCalculator = { getValidatorIndex: () => proposerIndex };
		context.validatorSet = { getValidator: () => ({ blsPublicKey }) };
		context.roundState = { addProposal: () => {}, blockNumber, hasProposal: () => false, round };
		context.roundStateRepository = { getRoundState: () => context.roundState };
		context.broadcaster = { broadcastProposal: async () => {} };

		context.app = new Application();
		context.app.bind(Identifiers.Consensus.Service).toConstantValue(context.consensus);
		context.app.bind(Identifiers.Consensus.CommitLock).toConstantValue(context.commitLock);
		context.app.bind(Identifiers.State.Store).toConstantValue(context.stateStore);
		context.app.bind(Identifiers.BlockchainUtils.TimestampCalculator).toConstantValue(context.timestampCalculator);
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);
		context.app.bind(Identifiers.Cryptography.Proposal.Serializer).toConstantValue(context.proposalSerializer);
		context.app.bind(Identifiers.Cryptography.Message.Serializer).toConstantValue(context.messageSerializer);
		context.app
			.bind(Identifiers.Cryptography.Signature.Instance)
			.toConstantValue(context.consensusSignature)
			.whenTagged("type", "consensus");
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);
		context.app.bind(Identifiers.Consensus.Aggregator).toConstantValue(context.aggregator);
		context.app.bind(Identifiers.BlockchainUtils.ProposerCalculator).toConstantValue(context.proposerCalculator);
		context.app.bind(Identifiers.ValidatorSet.Service).toConstantValue(context.validatorSet);
		context.app.bind(Identifiers.Consensus.RoundStateRepository).toConstantValue(context.roundStateRepository);
		context.app.bind(Identifiers.P2P.Broadcaster).toConstantValue(context.broadcaster);

		context.processor = context.app.resolve(ProposalProcessor);
	});

	it("#process - should run under the non-exclusive commit lock", async ({ processor, commitLock }) => {
		const runNonExclusive = spy(commitLock, "runNonExclusive");

		await processor.process(makeProposal());
		await flushTimers();

		runNonExclusive.calledOnce();
	});

	it("#process - should skip a proposal for another block number", async ({
		processor,
		proposerCalculator,
		roundStateRepository,
	}) => {
		const getValidatorIndex = spy(proposerCalculator, "getValidatorIndex");
		const getRoundState = spy(roundStateRepository, "getRoundState");

		const futureProposal = makeProposal();
		(futureProposal.blockHeader as any).number = blockNumber + 1;
		const pastProposal = makeProposal();
		(pastProposal.blockHeader as any).number = blockNumber - 1;

		assert.equal(await processor.process(futureProposal), Skipped);
		assert.equal(await processor.process(pastProposal), Skipped);
		getValidatorIndex.neverCalled();
		getRoundState.neverCalled();
	});

	it("#process - should skip a proposal for a past round", async ({ processor, proposerCalculator }) => {
		const getValidatorIndex = spy(proposerCalculator, "getValidatorIndex");

		assert.equal(await processor.process(makeProposal({ round: round - 1 })), Skipped);
		getValidatorIndex.neverCalled();
	});

	it("#process - should accept a proposal for a future round of the current block", async ({
		processor,
		proposerCalculator,
		roundStateRepository,
	}) => {
		const getValidatorIndex = spy(proposerCalculator, "getValidatorIndex");
		const getRoundState = spy(roundStateRepository, "getRoundState");

		assert.equal(await processor.process(makeProposal({ round: round + 3 })), Accepted);
		await flushTimers();

		getValidatorIndex.calledWith(round + 3);
		getRoundState.calledWith(blockNumber, round + 3);
	});

	it("#process - should reject a proposal whose round is not in bounds yet", async ({
		processor,
		proposerCalculator,
		stateStore,
		timestampCalculator,
	}) => {
		const calculateMinimalTimestamp = stub(timestampCalculator, "calculateMinimalTimestamp").returnValue(
			Date.now() + 60_000,
		);
		const getValidatorIndex = spy(proposerCalculator, "getValidatorIndex");

		assert.equal(await processor.process(makeProposal()), Invalid);

		calculateMinimalTimestamp.calledWith(stateStore.getLastBlock(), round);
		getValidatorIndex.neverCalled();
	});

	it("#process - should reject a proposal from the wrong proposer without verifying its signature", async ({
		processor,
		consensusSignature,
		proposerCalculator,
	}) => {
		const getValidatorIndex = spy(proposerCalculator, "getValidatorIndex");
		const verify = spy(consensusSignature, "verify");

		assert.equal(await processor.process(makeProposal({ validatorIndex: proposerIndex - 1 })), Invalid);

		getValidatorIndex.calledWith(round);
		verify.neverCalled();
	});

	it("#process - should verify the proposal signature of the proposer", async ({
		processor,
		consensusSignature,
		proposalSerializer,
		validatorSet,
	}) => {
		const proposal = makeProposal();
		const serializeProposalUnsigned = spy(proposalSerializer, "serializeProposalUnsigned");
		const getValidator = spy(validatorSet, "getValidator");
		const verify = spy(consensusSignature, "verify");

		await processor.process(proposal);
		await flushTimers();

		serializeProposalUnsigned.calledOnce();
		serializeProposalUnsigned.calledWith(proposal.toSerializableData());
		getValidator.calledWith(proposerIndex);
		verify.calledOnce();
		verify.calledWith(Buffer.from(proposal.signature, "hex"), serializedUnsigned, Buffer.from(blsPublicKey, "hex"));
	});

	it("#process - should reject a proposal with an invalid signature", async ({
		processor,
		consensusSignature,
		roundStateRepository,
	}) => {
		stub(consensusSignature, "verify").resolvedValue(false);
		const getRoundState = spy(roundStateRepository, "getRoundState");

		assert.equal(await processor.process(makeProposal()), Invalid);

		getRoundState.neverCalled();
	});

	it("#process - should skip a proposal when the round state already has one", async ({
		processor,
		roundState,
		broadcaster,
		consensus,
	}) => {
		roundState.hasProposal = () => true;
		const addProposal = spy(roundState, "addProposal");
		const broadcastProposal = spy(broadcaster, "broadcastProposal");
		const handle = spy(consensus, "handle");

		assert.equal(await processor.process(makeProposal()), Skipped);
		await flushTimers();

		addProposal.neverCalled();
		broadcastProposal.neverCalled();
		handle.neverCalled();
	});

	it("#process - should add and broadcast an accepted proposal and handle the round state deferred", async ({
		processor,
		roundState,
		broadcaster,
		consensus,
	}) => {
		const proposal = makeProposal();
		const addProposal = spy(roundState, "addProposal");
		const broadcastProposal = spy(broadcaster, "broadcastProposal");
		const handle = spy(consensus, "handle");

		assert.equal(await processor.process(proposal), Accepted);

		addProposal.calledOnce();
		addProposal.calledWith(proposal);
		broadcastProposal.calledOnce();
		broadcastProposal.calledWith(proposal);
		// Handling is deferred so the broadcast can go out before the block is processed.
		handle.neverCalled();

		await flushTimers();

		handle.calledOnce();
		handle.calledWith(roundState);
	});

	it("#process - should not broadcast when broadcasting is disabled", async ({
		processor,
		roundState,
		broadcaster,
		consensus,
	}) => {
		const addProposal = spy(roundState, "addProposal");
		const broadcastProposal = spy(broadcaster, "broadcastProposal");
		const handle = spy(consensus, "handle");

		assert.equal(await processor.process(makeProposal(), false), Accepted);
		await flushTimers();

		addProposal.calledOnce();
		broadcastProposal.neverCalled();
		handle.calledOnce();
	});

	it("#hasValidLockProof - should accept a proposal without a valid round", async ({
		processor,
		aggregator,
		logger,
		messageSerializer,
	}) => {
		const verify = spy(aggregator, "verify");
		const serializeMessageForSignature = spy(messageSerializer, "serializeMessageForSignature");
		const debug = spy(logger, "debug");

		assert.true(await processor.hasValidLockProof(makeProposal({ lockProof })));

		verify.neverCalled();
		serializeMessageForSignature.neverCalled();
		debug.neverCalled();
	});

	it("#hasValidLockProof - should reject a valid round that is not lower than the proposal round", async ({
		processor,
		aggregator,
		logger,
	}) => {
		const verify = spy(aggregator, "verify");
		const debug = spy(logger, "debug");

		assert.false(await processor.hasValidLockProof(makeProposal({ lockProof, validRound: round })));
		assert.false(await processor.hasValidLockProof(makeProposal({ lockProof, validRound: round + 1 })));

		verify.neverCalled();
		debug.calledTimes(2);
		debug.calledNthWith(
			0,
			`Received proposal ${blockNumber}/${round} has validRound ${round} >= round ${round}`,
			"consensus",
		);
		debug.calledNthWith(
			1,
			`Received proposal ${blockNumber}/${round} has validRound ${round + 1} >= round ${round}`,
			"consensus",
		);
	});

	it("#hasValidLockProof - should accept a proposal without a lock proof and log it", async ({
		processor,
		aggregator,
		logger,
	}) => {
		const verify = spy(aggregator, "verify");
		const debug = spy(logger, "debug");

		assert.true(await processor.hasValidLockProof(makeProposal({ validRound: round - 1 })));

		verify.neverCalled();
		debug.calledOnce();
		debug.calledWith(`Received proposal ${blockNumber}/${round} with missing lock proof`, "consensus");
	});

	it("#hasValidLockProof - should verify the lock proof against the prevote of the valid round", async ({
		processor,
		aggregator,
		configuration,
		logger,
		messageSerializer,
	}) => {
		const verify = stub(aggregator, "verify").resolvedValue(true);
		const serializeMessageForSignature = spy(messageSerializer, "serializeMessageForSignature");
		const getMilestone = spy(configuration, "getMilestone");
		const debug = spy(logger, "debug");

		assert.true(await processor.hasValidLockProof(makeProposal({ lockProof, validRound: round - 1 })));

		serializeMessageForSignature.calledOnce();
		serializeMessageForSignature.calledWith(
			{ blockHash, blockNumber, round: round - 1, type: Enums.Crypto.MessageType.Prevote },
			{ genesisBlockHash, previousBlockHash },
		);
		getMilestone.calledWith(blockNumber);
		verify.calledOnce();
		verify.calledWith(lockProof, serializedPrevote, roundValidators);
		debug.neverCalled();
	});

	it("#hasValidLockProof - should reject an invalid lock proof and log it", async ({
		processor,
		aggregator,
		logger,
	}) => {
		stub(aggregator, "verify").resolvedValue(false);
		const debug = spy(logger, "debug");

		assert.false(await processor.hasValidLockProof(makeProposal({ lockProof, validRound: 0 })));

		debug.calledOnce();
		debug.calledWith(`Received proposal ${blockNumber}/${round} with invalid lock proof`, "consensus");
	});
});
