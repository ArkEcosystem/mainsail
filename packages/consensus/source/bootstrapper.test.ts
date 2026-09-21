import type { Contracts } from "@mainsail/contracts";

import { Enums, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { Bootstrapper } from "./bootstrapper";

const { Prevote, Precommit } = Enums.Crypto.MessageType;

type Context = {
	app: Application;
	bootstrapper: Bootstrapper;
	configuration: any;
	logger: any;
	proposal: any;
	roundState: any;
	roundStateRepository: any;
	stateStore: any;
	storage: any;
};

describe<Context>("Bootstrapper", ({ it, assert, beforeEach, stub, spy, each }) => {
	// The database holds block 2, so consensus starts at block 3.
	const blockNumber = 3;
	const totalRound = 7;

	const initialState = { blockNumber, round: 0, step: Enums.Consensus.Step.Propose };
	const completed = `Completed consensus bootstrap for 3/0 with total round ${totalRound}`;
	const loaded = (proposals: number, prevotes: number, precommits: number, dropped = 0) =>
		`Consensus Bootstrap - Proposals: ${proposals}, Prevotes: ${prevotes}, Precommits: ${precommits}` +
		(dropped > 0 ? `, dropped ${dropped} records of another block` : "");
	const refusing = (reason: string) => `refusing to start on an inconsistent consensus store: ${reason}`;

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
		context.roundStateRepository = { getRoundState: () => context.roundState };
		context.storage = {
			clear: async () => {},
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

	it("#bootstrap - should throw before reading the store when the database disagrees with the crypto configuration", async ({
		bootstrapper,
		configuration,
		storage,
	}) => {
		configuration.getHeight = () => 7;
		const getMessages = spy(storage, "getMessages");

		await assert.rejects(
			() => bootstrapper.bootstrap(),
			"bootstrapped block number 3 does not match configuration block number 7",
		);
		getMessages.neverCalled();
	});

	it("#bootstrap - should start at round 0 when nothing is stored", async ({ bootstrapper, logger, storage }) => {
		const clear = spy(storage, "clear");
		const info = spy(logger, "info");
		const warn = spy(logger, "warn");
		const error = spy(logger, "error");

		assert.equal(await bootstrapper.bootstrap(), initialState);

		clear.neverCalled();
		info.calledTimes(2);
		info.calledNthWith(0, loaded(0, 0, 0), "consensus");
		info.calledNthWith(1, completed, "consensus");
		warn.neverCalled();
		error.neverCalled();
	});

	it("#bootstrap - should start at round 0 and drop the records of an older block", async ({
		bootstrapper,
		logger,
		roundState,
		storage,
	}) => {
		// The normal case after a commit: nothing is written when a block is committed, so the store still holds
		// the previous block until the first record of the new one.
		stub(storage, "getState").resolvedValue(makeState({ blockNumber: 2 }));
		stub(storage, "getProposals").resolvedValue([makeProposal(2, 0)]);
		stub(storage, "getMessages").resolvedValue([makeMessage(Prevote, 2, 0, 0), makeMessage(Precommit, 2, 0, 0)]);
		const addProposal = spy(roundState, "addProposal");
		const addMessage = spy(roundState, "addMessage");
		const clear = spy(storage, "clear");
		const info = spy(logger, "info");
		const warn = spy(logger, "warn");
		const error = spy(logger, "error");

		assert.equal(await bootstrapper.bootstrap(), initialState);

		addProposal.neverCalled();
		addMessage.neverCalled();
		clear.neverCalled();
		info.calledWith(loaded(0, 0, 0, 3), "consensus");
		warn.neverCalled();
		error.neverCalled();
	});

	it("#bootstrap - should keep the loaded round states and start at round 0 when no state is stored", async ({
		bootstrapper,
		logger,
		roundState,
		storage,
	}) => {
		// The state is written before an own signature and on a lock only. Without one, nothing of this node's
		// is at stake, and round 0 is safe; the stored messages of the others are in the round states already.
		const proposal = makeProposal(blockNumber, 0);
		const message = makeMessage(Prevote, blockNumber, 0, 0);
		stub(storage, "getProposals").resolvedValue([proposal]);
		stub(storage, "getMessages").resolvedValue([message]);
		const addProposal = spy(roundState, "addProposal");
		const addMessage = spy(roundState, "addMessage");
		const info = spy(logger, "info");
		const warn = spy(logger, "warn");

		assert.equal(await bootstrapper.bootstrap(), initialState);

		addProposal.calledOnce();
		addProposal.calledWith(proposal);
		addMessage.calledOnce();
		addMessage.calledWith(message);
		info.calledWith(loaded(1, 1, 0), "consensus");
		warn.neverCalled();
	});

	it("#bootstrap - should start at round 0 when the stored state names no block", async ({
		bootstrapper,
		roundStateRepository,
		storage,
	}) => {
		// A damaged state must not reach run(); only a state of this very block is restored.
		stub(storage, "getState").resolvedValue(makeState({ blockNumber: "garbage" as unknown as number }));
		const getRoundState = spy(roundStateRepository, "getRoundState");
		const clear = spy(storage, "clear");

		assert.equal(await bootstrapper.bootstrap(), initialState);

		getRoundState.neverCalled();
		clear.neverCalled();
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

	it("#bootstrap - should load every stored proposal of the block into the round state of its round", async ({
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

		info.calledWith(loaded(2, 0, 0), "consensus");
		getRoundState.calledTimes(2);
		getRoundState.calledNthWith(0, blockNumber, 0);
		getRoundState.calledNthWith(1, blockNumber, 1);
		addProposal.calledTimes(2);
		for (const [index, proposal] of proposals.entries()) {
			addProposal.calledNthWith(index, proposal);
		}
	});

	it("#bootstrap - should load every stored message of the block into the round state of its round", async ({
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

		info.calledWith(loaded(0, 2, 1), "consensus");
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

	it("#bootstrap - should drop the records of other blocks while loading the block's own", async ({
		bootstrapper,
		logger,
		roundState,
		storage,
	}) => {
		const proposal = makeProposal(blockNumber, 0);
		const message = makeMessage(Prevote, blockNumber, 0, 0);
		stub(storage, "getState").resolvedValue(makeState());
		stub(storage, "getProposals").resolvedValue([proposal, makeProposal(blockNumber + 1, 0)]);
		stub(storage, "getMessages").resolvedValue([message, makeMessage(Precommit, blockNumber - 1, 1, 1)]);
		const addProposal = spy(roundState, "addProposal");
		const addMessage = spy(roundState, "addMessage");
		const info = spy(logger, "info");

		await bootstrapper.bootstrap();

		addProposal.calledOnce();
		addProposal.calledWith(proposal);
		addMessage.calledOnce();
		addMessage.calledWith(message);
		info.calledWith(loaded(1, 1, 0, 2), "consensus");
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

	each(
		"#bootstrap - should clear an unreadable store and start at round 0",
		async ({
			context: { bootstrapper, logger, roundState, storage },
			dataset: method,
		}: {
			context: Context;
			dataset: string;
		}) => {
			// Records an earlier version wrote, for example. Left in place, every later start at this block would
			// fail on them and lose what was stored since.
			stub(storage, method).rejectedValue(new Error(`${method} failed`));
			const addProposal = spy(roundState, "addProposal");
			const clear = spy(storage, "clear");
			const error = spy(logger, "error");
			const info = spy(logger, "info");

			assert.equal(await bootstrapper.bootstrap(), initialState);

			addProposal.neverCalled();
			clear.calledOnce();
			error.calledOnce();
			assert.equal(error.getCallArgs(0), [
				`Clearing the unreadable consensus store: ${method} failed`,
				"consensus",
			]);
			info.calledWith(completed, "consensus");
		},
		["getMessages", "getProposals", "getState"],
	);

	it("#bootstrap - should clear a stored state that is ahead of the database and start at round 0", async ({
		bootstrapper,
		logger,
		roundState,
		storage,
	}) => {
		// The database was reset to an earlier block. What was signed at the later ones goes with the store.
		stub(storage, "getState").resolvedValue(makeState({ blockNumber: 5 }));
		stub(storage, "getProposals").resolvedValue([makeProposal(5, 0)]);
		const addProposal = spy(roundState, "addProposal");
		const clear = spy(storage, "clear");
		const warn = spy(logger, "warn");
		const error = spy(logger, "error");
		const info = spy(logger, "info");

		assert.equal(await bootstrapper.bootstrap(), initialState);

		addProposal.neverCalled();
		clear.calledOnce();
		warn.calledOnce();
		warn.calledWith("Clearing the stored consensus state of 5, which is ahead of the database at 3", "consensus");
		error.neverCalled();
		info.calledWith(completed, "consensus");
	});

	// Every message is stored before the rules run on it, so the proof of a stored lock or valid value is always
	// stored with it. A missing proof means the store is damaged, and nothing else keeps the node from signing the
	// block again, so it refuses to start rather than guess.

	it("#bootstrap - should refuse to start when the proposal of the valid round is not stored", async ({
		bootstrapper,
		roundState,
		storage,
	}) => {
		stub(storage, "getState").resolvedValue(makeState({ validRound: 1 }));
		roundState.getProposal = () => undefined;
		const clear = spy(storage, "clear");

		await assert.rejects(() => bootstrapper.bootstrap(), refusing("the proposal of valid round 3/1 is not stored"));
		clear.neverCalled();
	});

	it("#bootstrap - should refuse to start when the +2/3 prevotes of the valid round are not stored", async ({
		bootstrapper,
		roundState,
		storage,
	}) => {
		stub(storage, "getState").resolvedValue(makeState({ validRound: 1 }));
		roundState.hasMajorityPrevotes = () => false;

		await assert.rejects(
			() => bootstrapper.bootstrap(),
			refusing("the +2/3 prevotes of valid round 3/1 are not stored"),
		);
	});

	it("#bootstrap - should refuse to start when the proposal of the locked round is not stored", async ({
		bootstrapper,
		roundState,
		storage,
	}) => {
		stub(storage, "getState").resolvedValue(makeState({ lockedRound: 1 }));
		roundState.getProposal = () => undefined;
		const clear = spy(storage, "clear");

		await assert.rejects(
			() => bootstrapper.bootstrap(),
			refusing("the proposal of locked round 3/1 is not stored"),
		);
		clear.neverCalled();
	});

	it("#bootstrap - should refuse to start when the proposal of the locked round does not deserialize", async ({
		bootstrapper,
		proposal,
		storage,
	}) => {
		// The payload was deserialized before the lock was taken, so a payload that fails now is damage.
		stub(storage, "getState").resolvedValue(makeState({ lockedRound: 1 }));
		stub(proposal, "deserializePayload").rejectedValue(new Error("corrupt payload"));

		await assert.rejects(() => bootstrapper.bootstrap(), "corrupt payload");
	});

	it("#bootstrap - should let a round state that rejects a stored record stop the start", async ({
		bootstrapper,
		roundState,
		storage,
	}) => {
		// Keys are unique per round, validator and type, so a rejected record is damage as well.
		stub(storage, "getProposals").resolvedValue([makeProposal(blockNumber, 0)]);
		stub(roundState, "addProposal").callsFake(() => {
			throw new Error("Proposal already exists.");
		});
		const clear = spy(storage, "clear");

		await assert.rejects(() => bootstrapper.bootstrap(), "Proposal already exists.");
		clear.neverCalled();
	});
});
