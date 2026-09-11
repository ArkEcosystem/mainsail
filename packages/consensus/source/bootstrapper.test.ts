import type { Contracts } from "@mainsail/contracts";

import { Enums, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { Bootstrapper } from "./bootstrapper";

const { Prevote, Precommit } = Enums.Crypto.MessageType;

describe<{
	app: Application;
	bootstrapper: Bootstrapper;
	configuration: any;
	logger: any;
	proposal: any;
	roundState: any;
	roundStateRepository: any;
	stateStore: any;
	storage: any;
}>("Bootstrapper", ({ it, assert, beforeEach, stub, spy }) => {
	// The database holds block 2, so consensus starts at block 3.
	const blockNumber = 3;
	const totalRound = 7;

	const initialState = { blockNumber, round: 0, step: Enums.Consensus.Step.Propose };
	const discarding = (reason: string) => `Discarding stored consensus state for 3: ${reason}`;

	const makeProposal = (number: number, round: number): Contracts.Crypto.Proposal =>
		({ blockHeader: { number }, round }) as unknown as Contracts.Crypto.Proposal;

	const makeMessage = (
		type: Contracts.Crypto.MessageType,
		number: number,
		round: number,
		validatorIndex: number,
	): Contracts.Crypto.Message =>
		({ blockNumber: number, round, type, validatorIndex }) as unknown as Contracts.Crypto.Message;

	const makeState = (overrides: Partial<Contracts.Consensus.StateData> = {}): Contracts.Consensus.StateData => ({
		blockNumber,
		round: 2,
		step: Enums.Consensus.Step.Prevote,
		...overrides,
	});

	beforeEach((context) => {
		context.proposal = { deserializePayload: async () => {} };
		context.roundState = {
			addMessage: () => {},
			addProposal: () => {},
			blockNumber,
			getProposal: () => context.proposal,
			hasMajorityPrevotes: () => true,
			round: 1,
		};
		context.roundStateRepository = {
			clear: () => {},
			getRoundState: () => context.roundState,
			getRoundStates: () => [],
		};
		context.storage = {
			getMessages: async () => [],
			getProposals: async () => [],
			getState: async () => undefined,
		};
		context.stateStore = { getLastBlock: () => ({ number: blockNumber - 1 }), getTotalRound: () => totalRound };
		context.configuration = { getHeight: () => blockNumber };
		context.logger = { error: () => {}, info: () => {}, warn: () => {} };

		context.app = new Application();
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);
		context.app.bind(Identifiers.Consensus.RoundStateRepository).toConstantValue(context.roundStateRepository);
		context.app.bind(Identifiers.ConsensusStorage.Service).toConstantValue(context.storage);
		context.app.bind(Identifiers.State.Store).toConstantValue(context.stateStore);
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);

		context.bootstrapper = context.app.resolve(Bootstrapper);
	});

	it("#bootstrap - should throw when the database disagrees with the crypto configuration", async ({
		bootstrapper,
		configuration,
		storage,
	}) => {
		// Not a store issue, so no fallback: the node is misconfigured and has to stop.
		configuration.getHeight = () => 7;
		const getProposals = spy(storage, "getProposals");

		await assert.rejects(
			() => bootstrapper.bootstrap(),
			"bootstrapped block number 3 does not match configuration block number 7",
		);
		getProposals.neverCalled();
	});

	it("#bootstrap - should start at round 0 when nothing is stored", async ({
		bootstrapper,
		logger,
		roundStateRepository,
	}) => {
		const clear = spy(roundStateRepository, "clear");
		const info = spy(logger, "info");
		const warn = spy(logger, "warn");
		const error = spy(logger, "error");

		assert.equal(await bootstrapper.bootstrap(), initialState);

		clear.neverCalled();
		info.calledTimes(3);
		info.calledNthWith(0, "Consensus Bootstrap - Proposals: 0", "consensus");
		info.calledNthWith(1, "Consensus Bootstrap - Prevotes: 0, Precommits: 0", "consensus");
		info.calledNthWith(2, `Completed consensus bootstrap for 3/0 with total round ${totalRound}`, "consensus");
		warn.neverCalled();
		error.neverCalled();
	});

	it("#bootstrap - should start at round 0 with a warning when the stored state is older than the database", async ({
		bootstrapper,
		logger,
		roundStateRepository,
		storage,
	}) => {
		// Expected after a crash: the state is persisted on a clean shutdown only. Whatever rounds were loaded
		// belong to that older block and go.
		stub(storage, "getState").resolvedValue(makeState({ blockNumber: 2 }));
		const clear = spy(roundStateRepository, "clear");
		const warn = spy(logger, "warn");
		const error = spy(logger, "error");

		assert.equal(await bootstrapper.bootstrap(), initialState);

		clear.calledOnce();
		warn.calledOnce();
		warn.calledWith("Skipping state restore, because stored block number is 2, but should be 3", "consensus");
		error.neverCalled();
	});

	it("#bootstrap - should return the stored state when it references no round", async ({
		bootstrapper,
		logger,
		roundStateRepository,
		storage,
	}) => {
		const state = makeState();
		stub(storage, "getState").resolvedValue(state);
		const getRoundState = spy(roundStateRepository, "getRoundState");
		const info = spy(logger, "info");

		const result = await bootstrapper.bootstrap();

		assert.equal(result, { ...state });
		assert.undefined(result.validValue);
		assert.undefined(result.lockedValue);
		getRoundState.neverCalled();
		info.calledWith(`Completed consensus bootstrap for 3/2 with total round ${totalRound}`, "consensus");
	});

	it("#bootstrap - should load every stored proposal into the round state of its block number and round", async ({
		bootstrapper,
		logger,
		roundState,
		roundStateRepository,
		storage,
	}) => {
		const proposals = [makeProposal(blockNumber, 0), makeProposal(blockNumber, 1)];
		stub(storage, "getState").resolvedValue(makeState());
		stub(storage, "getProposals").resolvedValue(proposals);
		const info = spy(logger, "info");
		const getRoundState = spy(roundStateRepository, "getRoundState");
		const addProposal = spy(roundState, "addProposal");

		await bootstrapper.bootstrap();

		info.calledWith("Consensus Bootstrap - Proposals: 2", "consensus");
		getRoundState.calledTimes(2);
		getRoundState.calledNthWith(0, blockNumber, 0);
		getRoundState.calledNthWith(1, blockNumber, 1);
		addProposal.calledTimes(2);
		for (const [index, proposal] of proposals.entries()) {
			addProposal.calledNthWith(index, proposal);
		}
	});

	it("#bootstrap - should load every stored message into the round state of its block number and round", async ({
		bootstrapper,
		logger,
		roundState,
		roundStateRepository,
		storage,
	}) => {
		const messages = [
			makeMessage(Prevote, blockNumber, 0, 0),
			makeMessage(Prevote, blockNumber, 1, 1),
			makeMessage(Precommit, blockNumber, 1, 0),
		];
		stub(storage, "getState").resolvedValue(makeState());
		stub(storage, "getMessages").resolvedValue(messages);
		const info = spy(logger, "info");
		const getRoundState = spy(roundStateRepository, "getRoundState");
		const addMessage = spy(roundState, "addMessage");

		await bootstrapper.bootstrap();

		info.calledWith("Consensus Bootstrap - Prevotes: 2, Precommits: 1", "consensus");
		getRoundState.calledTimes(3);
		getRoundState.calledNthWith(0, blockNumber, 0);
		getRoundState.calledNthWith(1, blockNumber, 1);
		getRoundState.calledNthWith(2, blockNumber, 1);
		addMessage.calledTimes(3);
		for (const [index, message] of messages.entries()) {
			addMessage.calledNthWith(index, message);
		}
	});

	it("#bootstrap - should load proposals before messages", async ({ bootstrapper, roundState, storage }) => {
		stub(storage, "getState").resolvedValue(makeState());
		stub(storage, "getProposals").resolvedValue([makeProposal(blockNumber, 0)]);
		stub(storage, "getMessages").resolvedValue([
			makeMessage(Prevote, blockNumber, 0, 0),
			makeMessage(Precommit, blockNumber, 0, 0),
		]);

		// Messages are matched against the proposal of their round, so the proposal has to be in place first.
		const calls: string[] = [];
		roundState.addProposal = () => calls.push("proposal");
		roundState.addMessage = () => calls.push("message");

		await bootstrapper.bootstrap();

		assert.equal(calls, ["proposal", "message", "message"]);
	});

	it("#bootstrap - should attach the round state of the valid round as valid value", async ({
		bootstrapper,
		proposal,
		roundState,
		roundStateRepository,
		storage,
	}) => {
		stub(storage, "getState").resolvedValue(makeState({ validRound: 1 }));
		const getRoundState = spy(roundStateRepository, "getRoundState");
		// The valid value gets re-proposed, which needs its block; a stored proposal still holds it serialized.
		const deserializePayload = spy(proposal, "deserializePayload");

		const result = await bootstrapper.bootstrap();

		getRoundState.calledOnce();
		getRoundState.calledWith(blockNumber, 1);
		deserializePayload.calledOnce();
		assert.is(result.validValue, roundState);
		assert.equal(result.validRound, 1);
		assert.undefined(result.lockedValue);
	});

	it("#bootstrap - should attach the round state of the locked round as locked value", async ({
		bootstrapper,
		proposal,
		roundState,
		roundStateRepository,
		storage,
	}) => {
		stub(storage, "getState").resolvedValue(makeState({ lockedRound: 1 }));
		const getRoundState = spy(roundStateRepository, "getRoundState");
		const deserializePayload = spy(proposal, "deserializePayload");

		const result = await bootstrapper.bootstrap();

		getRoundState.calledOnce();
		getRoundState.calledWith(blockNumber, 1);
		deserializePayload.calledOnce();
		assert.is(result.lockedValue, roundState);
		assert.equal(result.lockedRound, 1);
		assert.undefined(result.validValue);
	});

	it("#bootstrap - should treat round 0 as a referenced round", async ({
		bootstrapper,
		roundState,
		roundStateRepository,
		storage,
	}) => {
		// Round 0 is falsy; the bootstrapper must check for undefined rather than truthiness.
		stub(storage, "getState").resolvedValue(makeState({ lockedRound: 0, validRound: 0 }));
		const getRoundState = spy(roundStateRepository, "getRoundState");

		const result = await bootstrapper.bootstrap();

		getRoundState.calledTimes(2);
		getRoundState.calledNthWith(0, blockNumber, 0);
		getRoundState.calledNthWith(1, blockNumber, 0);
		assert.is(result.validValue, roundState);
		assert.is(result.lockedValue, roundState);
	});

	it("#bootstrap - should keep the remaining state data when attaching values", async ({ bootstrapper, storage }) => {
		stub(storage, "getState").resolvedValue(makeState({ lockedRound: 1, validRound: 2 }));

		const result = await bootstrapper.bootstrap();

		assert.equal(result.blockNumber, blockNumber);
		assert.equal(result.round, 2);
		assert.equal(result.step, Enums.Consensus.Step.Prevote);
		assert.equal(result.validRound, 2);
		assert.equal(result.lockedRound, 1);
	});

	// Everything below leaves the store unusable. Nothing of it is kept: a lock without the round state that proves
	// it could neither be re-proposed nor verified, so consensus starts at round 0 and the rounds are dropped.

	it("#bootstrap - should discard the store when the state cannot be read", async ({
		bootstrapper,
		logger,
		roundStateRepository,
		storage,
	}) => {
		stub(storage, "getState").rejectedValue(new Error("lmdb is gone"));
		const clear = spy(roundStateRepository, "clear");
		const error = spy(logger, "error");

		assert.equal(await bootstrapper.bootstrap(), initialState);

		clear.calledOnce();
		error.calledOnce();
		error.calledWith(discarding("lmdb is gone"), "consensus");
	});

	it("#bootstrap - should discard a stored state that is ahead of the database", async ({
		bootstrapper,
		logger,
		roundStateRepository,
		storage,
	}) => {
		stub(storage, "getState").resolvedValue(makeState({ blockNumber: 5 }));
		const clear = spy(roundStateRepository, "clear");
		const error = spy(logger, "error");

		assert.equal(await bootstrapper.bootstrap(), initialState);

		clear.calledOnce();
		error.calledOnce();
		error.calledWith(discarding("stored block number 5 is ahead of the database"), "consensus");
	});

	it("#bootstrap - should discard proposals or messages that are stored without a state", async ({
		bootstrapper,
		logger,
		roundState,
		roundStateRepository,
		storage,
	}) => {
		// State and rounds are stored in one transaction; rounds on their own mean the store is inconsistent.
		stub(storage, "getProposals").resolvedValue([makeProposal(blockNumber, 0)]);
		roundStateRepository.getRoundStates = () => [roundState];
		const clear = spy(roundStateRepository, "clear");
		const error = spy(logger, "error");

		assert.equal(await bootstrapper.bootstrap(), initialState);

		clear.calledOnce();
		error.calledWith(discarding("proposals or messages are stored without a state"), "consensus");
	});

	it("#bootstrap - should discard the store when a loaded round state belongs to another block", async ({
		bootstrapper,
		logger,
		roundState,
		roundStateRepository,
		storage,
	}) => {
		stub(storage, "getState").resolvedValue(makeState());
		roundStateRepository.getRoundStates = () => [
			roundState,
			{ ...roundState, blockNumber: blockNumber + 1, round: 0 },
		];
		const clear = spy(roundStateRepository, "clear");
		const error = spy(logger, "error");

		assert.equal(await bootstrapper.bootstrap(), initialState);

		clear.calledOnce();
		error.calledWith(discarding("round state 4/0 belongs to another block"), "consensus");
	});

	it("#bootstrap - should discard the store when the proposal of the valid round is not stored", async ({
		bootstrapper,
		logger,
		roundState,
		roundStateRepository,
		storage,
	}) => {
		// State and proposals are stored in one transaction, so a missing proposal means the store is inconsistent.
		stub(storage, "getState").resolvedValue(makeState({ validRound: 1 }));
		roundState.getProposal = () => undefined;
		const clear = spy(roundStateRepository, "clear");
		const error = spy(logger, "error");

		assert.equal(await bootstrapper.bootstrap(), initialState);

		clear.calledOnce();
		error.calledWith(discarding("the proposal of valid round 1 is not stored"), "consensus");
	});

	it("#bootstrap - should discard the store when the +2/3 prevotes of the valid round are not stored", async ({
		bootstrapper,
		logger,
		roundState,
		storage,
	}) => {
		// A valid value comes from rule 36, which needs the proposal and +2/3 prevotes for it.
		stub(storage, "getState").resolvedValue(makeState({ validRound: 1 }));
		roundState.hasMajorityPrevotes = () => false;
		const error = spy(logger, "error");

		assert.equal(await bootstrapper.bootstrap(), initialState);

		error.calledWith(discarding("the +2/3 prevotes of valid round 1 are not stored"), "consensus");
	});

	it("#bootstrap - should discard the whole store when the proposal of the locked round is not stored", async ({
		bootstrapper,
		logger,
		roundState,
		roundStateRepository,
		storage,
	}) => {
		stub(storage, "getState").resolvedValue(makeState({ lockedRound: 1, validRound: 1 }));
		roundState.getProposal = () => undefined;
		const clear = spy(roundStateRepository, "clear");
		const error = spy(logger, "error");

		const result = await bootstrapper.bootstrap();

		assert.equal(result, initialState);
		assert.undefined(result.lockedRound);
		assert.undefined(result.lockedValue);
		clear.calledOnce();
		error.calledOnce();
	});

	it("#bootstrap - should discard the store when a proposal payload does not deserialize", async ({
		bootstrapper,
		logger,
		proposal,
		roundStateRepository,
		storage,
	}) => {
		stub(storage, "getState").resolvedValue(makeState({ validRound: 1 }));
		stub(proposal, "deserializePayload").rejectedValue(new Error("corrupt payload"));
		const clear = spy(roundStateRepository, "clear");
		const error = spy(logger, "error");

		assert.equal(await bootstrapper.bootstrap(), initialState);

		clear.calledOnce();
		error.calledWith(discarding("corrupt payload"), "consensus");
	});

	it("#bootstrap - should discard the store when the proposals cannot be read", async ({
		bootstrapper,
		logger,
		roundStateRepository,
		storage,
	}) => {
		stub(storage, "getProposals").rejectedValue(new Error("storage failure"));
		const clear = spy(roundStateRepository, "clear");
		const error = spy(logger, "error");

		assert.equal(await bootstrapper.bootstrap(), initialState);

		clear.calledOnce();
		error.calledWith(discarding("storage failure"), "consensus");
	});

	it("#bootstrap - should discard the store when a round state rejects an entry", async ({
		bootstrapper,
		logger,
		roundState,
		roundStateRepository,
		storage,
	}) => {
		stub(storage, "getProposals").resolvedValue([makeProposal(blockNumber, 0)]);
		stub(roundState, "addProposal").callsFake(() => {
			throw new Error("Proposal already exists.");
		});
		const clear = spy(roundStateRepository, "clear");
		const error = spy(logger, "error");

		assert.equal(await bootstrapper.bootstrap(), initialState);

		clear.calledOnce();
		error.calledWith(discarding("Proposal already exists."), "consensus");
	});

	it("#bootstrap - should report the completed bootstrap after discarding the store", async ({
		bootstrapper,
		logger,
		storage,
	}) => {
		stub(storage, "getState").resolvedValue(makeState({ blockNumber: 5 }));
		const info = spy(logger, "info");

		await bootstrapper.bootstrap();

		info.calledWith(`Completed consensus bootstrap for 3/0 with total round ${totalRound}`, "consensus");
	});
});
