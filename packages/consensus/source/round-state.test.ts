import type { Contracts } from "@mainsail/contracts";

import { Enums, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { RoundState } from "./round-state";

const { Prevote, Precommit } = Enums.Crypto.MessageType;

describe<{
	app: Application;
	roundState: RoundState;
	aggregator: any;
	commitSerializer: any;
	configuration: any;
	logger: any;
	proposerCalculator: any;
	validatorSet: any;
}>("RoundState", ({ it, assert, beforeEach, stub, spy }) => {
	const blockNumber = 5;
	const round = 1;
	// With 4 validators a majority needs more than 2/3 (3 votes) and a minority more than 1/3 (2 votes).
	const roundValidators = 4;
	const proposerIndex = 2;
	const blockHash = "block-hash";
	const otherBlockHash = "other-block-hash";

	const validators: Contracts.State.ValidatorWallet[] = Array.from({ length: roundValidators }, (_, index) => ({
		address: `address-${index}`,
		blsPublicKey: `bls-${index}`,
		fee: 0n,
		isResigned: false,
		voteBalance: 0n,
		votersCount: 0,
	}));

	const block = { hash: blockHash, number: blockNumber } as unknown as Contracts.Crypto.Block;

	const makeProposal = (overrides: Partial<Contracts.Crypto.Proposal> = {}): Contracts.Crypto.Proposal =>
		({
			blockHeader: { hash: blockHash, number: blockNumber },
			getPayload: () => ({ block, serialized: "" }),
			isDataDeserialized: true,
			round,
			validatorIndex: proposerIndex,
			...overrides,
		}) as unknown as Contracts.Crypto.Proposal;

	const makeMessage = (
		type: Contracts.Crypto.MessageType,
		validatorIndex: number,
		hash: string | undefined,
	): Contracts.Crypto.Message =>
		({
			blockHash: hash,
			blockNumber,
			round,
			signature: `signature-${validatorIndex}`,
			type,
			validatorIndex,
		}) as unknown as Contracts.Crypto.Message;

	const prevote = (validatorIndex: number, hash: string = blockHash) => makeMessage(Prevote, validatorIndex, hash);
	const nullPrevote = (validatorIndex: number) => makeMessage(Prevote, validatorIndex, undefined);
	const precommit = (validatorIndex: number, hash: string = blockHash) =>
		makeMessage(Precommit, validatorIndex, hash);
	const nullPrecommit = (validatorIndex: number) => makeMessage(Precommit, validatorIndex, undefined);

	beforeEach((context) => {
		context.aggregator = { aggregate: async () => ({ signature: "aggregated", validators: [] }) };
		context.commitSerializer = { serializeCommit: async () => Buffer.from("serialized-commit") };
		context.configuration = { getMilestone: () => ({ roundValidators }) };
		context.logger = { debug: () => {} };
		context.proposerCalculator = { getValidatorIndex: () => proposerIndex };
		context.validatorSet = {
			getRoundValidators: () => validators,
			getValidator: (index: number) => validators[index],
		};

		context.app = new Application();
		context.app.bind(Identifiers.Consensus.Aggregator).toConstantValue(context.aggregator);
		context.app.bind(Identifiers.Cryptography.Commit.Serializer).toConstantValue(context.commitSerializer);
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);
		context.app.bind(Identifiers.BlockchainUtils.ProposerCalculator).toConstantValue(context.proposerCalculator);
		context.app.bind(Identifiers.ValidatorSet.Service).toConstantValue(context.validatorSet);

		context.roundState = context.app.resolve(RoundState).configure(blockNumber, round);
	});

	it("#configure - should set block number, round, validators and proposer", ({ roundState }) => {
		assert.instance(roundState, RoundState);
		assert.equal(roundState.blockNumber, blockNumber);
		assert.equal(roundState.round, round);
		assert.equal(roundState.validators, ["bls-0", "bls-1", "bls-2", "bls-3"]);
		assert.is(roundState.proposer, validators[proposerIndex]);
		assert.equal(roundState.getValidatorsSignedPrevote(), [false, false, false, false]);
		assert.equal(roundState.getValidatorsSignedPrecommit(), [false, false, false, false]);
	});

	it("#configure - should pick the proposer for the configured round", ({ app, proposerCalculator }) => {
		// A fresh instance is needed here because the shared one is already configured in beforeEach.
		const getValidatorIndex = stub(proposerCalculator, "getValidatorIndex").returnValue(3);

		const roundState = app.resolve(RoundState).configure(9, 4);

		getValidatorIndex.calledOnce();
		getValidatorIndex.calledWith(4);
		assert.equal(roundState.blockNumber, 9);
		assert.equal(roundState.round, 4);
		assert.is(roundState.proposer, validators[3]);
	});

	it("#getValidator - should return the validator by consensus public key", ({ roundState }) => {
		assert.is(roundState.getValidator("bls-1"), validators[1]);
	});

	it("#getValidator - should throw for an unknown consensus public key", ({ roundState }) => {
		assert.throws(() => roundState.getValidator("unknown"));
	});

	it("#addProposal - should store the proposal", ({ roundState }) => {
		const proposal = makeProposal();

		assert.false(roundState.hasProposal());
		assert.undefined(roundState.getProposal());

		roundState.addProposal(proposal);

		assert.true(roundState.hasProposal());
		assert.is(roundState.getProposal(), proposal);
	});

	it("#addProposal - should throw when a proposal already exists", ({ roundState }) => {
		roundState.addProposal(makeProposal());

		assert.throws(() => roundState.addProposal(makeProposal()), "Proposal already exists.");
	});

	it("#getBlock - should return the block of a deserialized proposal", ({ roundState }) => {
		roundState.addProposal(makeProposal());

		assert.is(roundState.getBlock(), block);
	});

	it("#getBlock - should throw when there is no proposal", ({ roundState }) => {
		assert.throws(
			() => roundState.getBlock(),
			"Block is not available, because proposal is not set or deserialized",
		);
	});

	it("#getBlock - should throw when the proposal is not deserialized", ({ roundState }) => {
		roundState.addProposal(makeProposal({ isDataDeserialized: false }));

		assert.throws(
			() => roundState.getBlock(),
			"Block is not available, because proposal is not set or deserialized",
		);
	});

	it("#addPrevote - should store the prevote and mark the validator as signed", ({ roundState }) => {
		const message = prevote(1);

		assert.false(roundState.hasPrevote(1));

		roundState.addPrevote(message);

		assert.true(roundState.hasPrevote(1));
		assert.is(roundState.getPrevote(1), message);
		assert.undefined(roundState.getPrevote(0));
		assert.equal(roundState.getPrevotes(), [message]);
		assert.equal(roundState.getValidatorsSignedPrevote(), [false, true, false, false]);
		assert.equal(roundState.getValidatorsSignedPrecommit(), [false, false, false, false]);
	});

	it("#addPrevote - should throw when the validator already prevoted", ({ roundState }) => {
		roundState.addPrevote(prevote(1));

		assert.throws(() => roundState.addPrevote(prevote(1, otherBlockHash)), "Prevote already exists.");
		assert.equal(roundState.getPrevotes(), [prevote(1)]);
	});

	it("#addPrecommit - should store the precommit and mark the validator as signed", ({ roundState }) => {
		const message = precommit(3);

		assert.false(roundState.hasPrecommit(3));

		roundState.addPrecommit(message);

		assert.true(roundState.hasPrecommit(3));
		assert.is(roundState.getPrecommit(3), message);
		assert.undefined(roundState.getPrecommit(0));
		assert.equal(roundState.getPrecommits(), [message]);
		assert.equal(roundState.getValidatorsSignedPrecommit(), [false, false, false, true]);
		assert.equal(roundState.getValidatorsSignedPrevote(), [false, false, false, false]);
	});

	it("#addPrecommit - should throw when the validator already precommitted", ({ roundState }) => {
		roundState.addPrecommit(precommit(3));

		assert.throws(() => roundState.addPrecommit(nullPrecommit(3)), "Precommit already exists.");
		assert.equal(roundState.getPrecommits(), [precommit(3)]);
	});

	it("#addMessage - should route the message by its type", ({ roundState }) => {
		const prevoteMessage = prevote(0);
		const precommitMessage = precommit(1);

		roundState.addMessage(prevoteMessage);
		roundState.addMessage(precommitMessage);

		assert.is(roundState.getPrevote(0), prevoteMessage);
		assert.is(roundState.getPrecommit(1), precommitMessage);
		assert.false(roundState.hasPrecommit(0));
		assert.false(roundState.hasPrevote(1));
	});

	it("#addMessage - should throw for an unknown message type", ({ roundState }) => {
		assert.throws(() => roundState.addMessage(makeMessage(99 as any, 0, blockHash)), "Invalid message type: 99");
	});

	it("#hasMessage - should check the store matching the message type", ({ roundState }) => {
		const prevoteMessage = prevote(0);
		const precommitMessage = precommit(0);

		assert.false(roundState.hasMessage(prevoteMessage));
		assert.false(roundState.hasMessage(precommitMessage));

		roundState.addMessage(prevoteMessage);

		assert.true(roundState.hasMessage(prevoteMessage));
		assert.false(roundState.hasMessage(precommitMessage));
	});

	it("#hasMessage - should throw for an unknown message type", ({ roundState }) => {
		assert.throws(() => roundState.hasMessage(makeMessage(99 as any, 0, blockHash)), "Invalid message type: 99");
	});

	it("#getMessage - should return the message of the validator for the given type", ({ roundState }) => {
		const prevoteMessage = prevote(2);
		const precommitMessage = precommit(2);

		roundState.addMessage(prevoteMessage);
		roundState.addMessage(precommitMessage);

		assert.is(roundState.getMessage(2, Prevote), prevoteMessage);
		assert.is(roundState.getMessage(2, Precommit), precommitMessage);
		assert.undefined(roundState.getMessage(0, Prevote));
		assert.undefined(roundState.getMessage(0, Precommit));
	});

	it("#getMessage - should throw for an unknown message type", ({ roundState }) => {
		assert.throws(() => roundState.getMessage(0, 99 as any), "Invalid message type: 99");
	});

	it("#getMessages - should list prevotes before precommits", ({ roundState }) => {
		const messages = [precommit(0), prevote(1), precommit(2), prevote(3)];
		for (const message of messages) {
			roundState.addMessage(message);
		}

		assert.equal(roundState.getMessages(), [messages[1], messages[3], messages[0], messages[2]]);
	});

	it("#hasMajorityPrevotes - should be false without a proposal", ({ roundState }) => {
		for (const index of [0, 1, 2, 3]) {
			roundState.addPrevote(prevote(index));
		}

		assert.false(roundState.hasMajorityPrevotes());
	});

	it("#hasMajorityPrevotes - should be false when the proposal is not deserialized", ({ roundState }) => {
		roundState.addProposal(makeProposal({ isDataDeserialized: false }));
		for (const index of [0, 1, 2, 3]) {
			roundState.addPrevote(prevote(index));
		}

		assert.false(roundState.hasMajorityPrevotes());
	});

	it("#hasMajorityPrevotes - should require more than 2/3 prevotes for the proposed block", ({ roundState }) => {
		roundState.addProposal(makeProposal());

		roundState.addPrevote(prevote(0));
		roundState.addPrevote(prevote(1));
		assert.false(roundState.hasMajorityPrevotes());

		// Votes for another block or for null do not count towards the proposal.
		roundState.addPrevote(prevote(2, otherBlockHash));
		assert.false(roundState.hasMajorityPrevotes());

		roundState.addPrevote(prevote(3));
		assert.true(roundState.hasMajorityPrevotes());
	});

	it("#hasMajorityPrevotesAny - should count prevotes regardless of their block hash", ({ roundState }) => {
		roundState.addPrevote(prevote(0));
		roundState.addPrevote(nullPrevote(1));
		assert.false(roundState.hasMajorityPrevotesAny());

		roundState.addPrevote(prevote(2, otherBlockHash));
		assert.true(roundState.hasMajorityPrevotesAny());
	});

	it("#hasMajorityPrevotesNull - should count only null prevotes", ({ roundState }) => {
		roundState.addPrevote(nullPrevote(0));
		roundState.addPrevote(nullPrevote(1));
		roundState.addPrevote(prevote(2));
		assert.false(roundState.hasMajorityPrevotesNull());

		roundState.addPrevote(nullPrevote(3));
		assert.true(roundState.hasMajorityPrevotesNull());
	});

	it("#hasMajorityPrecommits - should be false without a proposal", ({ roundState }) => {
		for (const index of [0, 1, 2, 3]) {
			roundState.addPrecommit(precommit(index));
		}

		assert.false(roundState.hasMajorityPrecommits());
	});

	it("#hasMajorityPrecommits - should be false when the proposal is not deserialized", ({ roundState }) => {
		roundState.addProposal(makeProposal({ isDataDeserialized: false }));
		for (const index of [0, 1, 2, 3]) {
			roundState.addPrecommit(precommit(index));
		}

		assert.false(roundState.hasMajorityPrecommits());
	});

	it("#hasMajorityPrecommits - should require more than 2/3 precommits for the proposed block", ({ roundState }) => {
		roundState.addProposal(makeProposal());

		roundState.addPrecommit(precommit(0));
		roundState.addPrecommit(precommit(1));
		assert.false(roundState.hasMajorityPrecommits());

		roundState.addPrecommit(nullPrecommit(2));
		assert.false(roundState.hasMajorityPrecommits());

		roundState.addPrecommit(precommit(3));
		assert.true(roundState.hasMajorityPrecommits());
	});

	it("#hasMajorityPrecommitsAny - should count precommits regardless of their block hash", ({ roundState }) => {
		roundState.addPrecommit(precommit(0));
		roundState.addPrecommit(nullPrecommit(1));
		assert.false(roundState.hasMajorityPrecommitsAny());

		roundState.addPrecommit(precommit(2, otherBlockHash));
		assert.true(roundState.hasMajorityPrecommitsAny());
	});

	it("#hasMinorityPrevotesOrPrecommits - should require more than 1/3 prevotes", ({ roundState }) => {
		roundState.addPrevote(prevote(0));
		assert.false(roundState.hasMinorityPrevotesOrPrecommits());

		roundState.addPrevote(nullPrevote(1));
		assert.true(roundState.hasMinorityPrevotesOrPrecommits());
	});

	it("#hasMinorityPrevotesOrPrecommits - should require more than 1/3 precommits", ({ roundState }) => {
		roundState.addPrecommit(precommit(0));
		assert.false(roundState.hasMinorityPrevotesOrPrecommits());

		roundState.addPrecommit(precommit(1, otherBlockHash));
		assert.true(roundState.hasMinorityPrevotesOrPrecommits());
	});

	it("#hasMinorityPrevotesOrPrecommits - should not add prevotes and precommits together", ({ roundState }) => {
		roundState.addPrevote(prevote(0));
		roundState.addPrecommit(precommit(1));

		// One of each is two messages in total but neither type reaches the threshold on its own.
		assert.false(roundState.hasMinorityPrevotesOrPrecommits());
	});

	it("#aggregatePrevotes - should aggregate only the prevotes for the proposed block", async ({
		roundState,
		aggregator,
		configuration,
	}) => {
		const proof = { signature: "aggregated", validators: [true, false, false, true] };
		const aggregate = stub(aggregator, "aggregate").resolvedValue(proof);
		const getMilestone = spy(configuration, "getMilestone");

		roundState.addProposal(makeProposal());
		const first = prevote(0);
		const last = prevote(3);
		roundState.addPrevote(first);
		roundState.addPrevote(prevote(1, otherBlockHash));
		roundState.addPrevote(nullPrevote(2));
		roundState.addPrevote(last);

		const result = await roundState.aggregatePrevotes();

		assert.is(result, proof);
		aggregate.calledOnce();
		const [signatures, milestoneValidators] = aggregate.getCallArgs(0);
		assert.equal([...signatures.keys()], [0, 3]);
		assert.is(signatures.get(0), first);
		assert.is(signatures.get(3), last);
		assert.equal(milestoneValidators, roundValidators);
		getMilestone.calledWith(blockNumber);
	});

	it("#aggregatePrevotes - should throw without a proposal", async ({ roundState, aggregator }) => {
		const aggregate = spy(aggregator, "aggregate");
		roundState.addPrevote(prevote(0));

		await assert.rejects(() => roundState.aggregatePrevotes());
		aggregate.neverCalled();
	});

	it("#aggregatePrecommits - should aggregate only the precommits for the proposed block", async ({
		roundState,
		aggregator,
		configuration,
	}) => {
		const proof = { signature: "aggregated", validators: [false, true, true, false] };
		const aggregate = stub(aggregator, "aggregate").resolvedValue(proof);
		const getMilestone = spy(configuration, "getMilestone");

		roundState.addProposal(makeProposal());
		const first = precommit(1);
		const second = precommit(2);
		roundState.addPrecommit(precommit(0, otherBlockHash));
		roundState.addPrecommit(first);
		roundState.addPrecommit(second);
		roundState.addPrecommit(nullPrecommit(3));

		const result = await roundState.aggregatePrecommits();

		assert.is(result, proof);
		aggregate.calledOnce();
		const [signatures, milestoneValidators] = aggregate.getCallArgs(0);
		assert.equal([...signatures.keys()], [1, 2]);
		assert.is(signatures.get(1), first);
		assert.is(signatures.get(2), second);
		assert.equal(milestoneValidators, roundValidators);
		getMilestone.calledWith(blockNumber);
	});

	it("#aggregatePrecommits - should throw without a proposal", async ({ roundState, aggregator }) => {
		const aggregate = spy(aggregator, "aggregate");
		roundState.addPrecommit(precommit(0));

		await assert.rejects(() => roundState.aggregatePrecommits());
		aggregate.neverCalled();
	});

	it("#getCommit - should build the commit from the proposal and the aggregated precommits", async ({
		roundState,
		aggregator,
		commitSerializer,
	}) => {
		const proof = { signature: "aggregated", validators: [true, true, false, true] };
		const serialized = Buffer.from("serialized-commit");
		const aggregate = stub(aggregator, "aggregate").resolvedValue(proof);
		const serializeCommit = stub(commitSerializer, "serializeCommit").resolvedValue(serialized);

		roundState.addProposal(makeProposal());
		roundState.addPrecommit(precommit(0));
		roundState.addPrecommit(precommit(1));
		roundState.addPrecommit(precommit(2, otherBlockHash));
		roundState.addPrecommit(precommit(3));

		const commit = await roundState.getCommit();

		assert.equal(commit, {
			block,
			proof: { round, ...proof },
			serialized: serialized.toString("hex"),
		});
		assert.is(commit.block, block);
		const [signatures] = aggregate.getCallArgs(0);
		assert.equal([...signatures.keys()], [0, 1, 3]);
		serializeCommit.calledOnce();
		serializeCommit.calledWith({ block, proof: { round, ...proof } });
	});

	it("#getCommit - should use the round of the proposal for the proof", async ({ roundState, aggregator }) => {
		stub(aggregator, "aggregate").resolvedValue({ signature: "aggregated", validators: [true, true, true, true] });

		roundState.addProposal(makeProposal({ round: 7 }));
		for (const index of [0, 1, 2, 3]) {
			roundState.addPrecommit(precommit(index));
		}

		const commit = await roundState.getCommit();

		assert.equal(commit.proof.round, 7);
	});

	it("#getCommit - should build the commit only once", async ({ roundState, aggregator, commitSerializer }) => {
		const aggregate = stub(aggregator, "aggregate").resolvedValue({
			signature: "aggregated",
			validators: [true, true, true, false],
		});
		const serializeCommit = spy(commitSerializer, "serializeCommit");

		roundState.addProposal(makeProposal());
		for (const index of [0, 1, 2]) {
			roundState.addPrecommit(precommit(index));
		}

		const commit = await roundState.getCommit();

		assert.is(await roundState.getCommit(), commit);
		aggregate.calledOnce();
		serializeCommit.calledOnce();
	});

	it("#getCommit - should throw without a proposal", async ({ roundState, commitSerializer }) => {
		const serializeCommit = spy(commitSerializer, "serializeCommit");
		roundState.addPrecommit(precommit(0));

		await assert.rejects(() => roundState.getCommit());
		serializeCommit.neverCalled();
	});

	it("#hasProcessorResult - should be false until a result is set", ({ roundState }) => {
		assert.false(roundState.hasProcessorResult());

		roundState.setProcessorResult({ feeUsed: 0n, gasUsed: 0, receipts: new Map(), success: true });

		assert.true(roundState.hasProcessorResult());
	});

	it("#getProcessorResult - should throw when no result is set", ({ roundState }) => {
		assert.throws(() => roundState.getProcessorResult(), "Processor result is undefined.");
	});

	it("#getProcessorResult - should return the stored result", ({ roundState }) => {
		const processorResult = { feeUsed: 10n, gasUsed: 21_000, receipts: new Map(), success: true };

		roundState.setProcessorResult(processorResult);

		assert.is(roundState.getProcessorResult(), processorResult);
	});

	it("#getAccountUpdates - should be empty by default", ({ roundState }) => {
		assert.equal(roundState.getAccountUpdates(), []);
	});

	it("#setAccountUpdates - should store the account updates", ({ roundState }) => {
		const accountUpdates = [{ address: "address-0", nonce: 1n }] as unknown as Contracts.Evm.AccountUpdate[];

		roundState.setAccountUpdates(accountUpdates);

		assert.is(roundState.getAccountUpdates(), accountUpdates);
	});

	it("#logPrevotes - should log the voters grouped by block hash", ({ roundState, logger, validatorSet }) => {
		const debug = spy(logger, "debug");
		const getValidator = spy(validatorSet, "getValidator");

		roundState.addPrevote(prevote(0));
		roundState.addPrevote(nullPrevote(1));
		roundState.addPrevote(prevote(2));

		roundState.logPrevotes();

		debug.calledTimes(2);
		debug.calledNthWith(0, `Block ${blockHash} prevoted by: address-0, address-2`, "consensus");
		debug.calledNthWith(1, "Block null prevoted by: address-1", "consensus");
		getValidator.calledTimes(3);
	});

	it("#logPrevotes - should not log without prevotes", ({ roundState, logger }) => {
		const debug = spy(logger, "debug");

		roundState.addPrecommit(precommit(0));
		roundState.logPrevotes();

		debug.neverCalled();
	});

	it("#logPrecommits - should log the voters grouped by block hash", ({ roundState, logger, validatorSet }) => {
		const debug = spy(logger, "debug");
		const getValidator = spy(validatorSet, "getValidator");

		roundState.addPrecommit(nullPrecommit(3));
		roundState.addPrecommit(precommit(1));
		roundState.addPrecommit(precommit(2, otherBlockHash));

		roundState.logPrecommits();

		debug.calledTimes(3);
		debug.calledNthWith(0, "Block null precommitted by: address-3", "consensus");
		debug.calledNthWith(1, `Block ${blockHash} precommitted by: address-1`, "consensus");
		debug.calledNthWith(2, `Block ${otherBlockHash} precommitted by: address-2`, "consensus");
		getValidator.calledTimes(3);
	});

	it("#logPrecommits - should not log without precommits", ({ roundState, logger }) => {
		const debug = spy(logger, "debug");

		roundState.addPrevote(prevote(0));
		roundState.logPrecommits();

		debug.neverCalled();
	});
});
