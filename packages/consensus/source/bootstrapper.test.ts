import type { Contracts } from "@mainsail/contracts";

import { Enums, Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { Bootstrapper } from "./bootstrapper";

const { Prevote, Precommit } = Enums.Crypto.MessageType;

describe<{
	app: Application;
	bootstrapper: Bootstrapper;
	logger: any;
	roundState: any;
	roundStateRepository: any;
	storage: any;
}>("Bootstrapper", ({ it, assert, beforeEach, stub, spy }) => {
	const makeProposal = (blockNumber: number, round: number): Contracts.Crypto.Proposal =>
		({ blockHeader: { number: blockNumber }, round }) as unknown as Contracts.Crypto.Proposal;

	const makeMessage = (
		type: Contracts.Crypto.MessageType,
		blockNumber: number,
		round: number,
		validatorIndex: number,
	): Contracts.Crypto.Message =>
		({ blockNumber, round, type, validatorIndex }) as unknown as Contracts.Crypto.Message;

	const makeState = (
		overrides: Partial<Contracts.Consensus.StateData> = {},
	): Contracts.Consensus.StateData & { validValue?: unknown; lockedValue?: unknown } => ({
		blockNumber: 3,
		round: 2,
		step: Enums.Consensus.Step.Prevote,
		...overrides,
	});

	beforeEach((context) => {
		context.roundState = { addMessage: () => {}, addProposal: () => {} };
		context.roundStateRepository = { getRoundState: () => context.roundState };
		context.storage = {
			getMessages: async () => [],
			getProposals: async () => [],
			getState: async () => undefined,
		};
		context.logger = { info: () => {} };

		context.app = new Application();
		context.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);
		context.app.bind(Identifiers.Consensus.RoundStateRepository).toConstantValue(context.roundStateRepository);
		context.app.bind(Identifiers.ConsensusStorage.Service).toConstantValue(context.storage);

		context.bootstrapper = context.app.resolve(Bootstrapper);
	});

	it("#run - should return undefined and log empty counts when nothing is stored", async ({
		bootstrapper,
		logger,
		roundStateRepository,
	}) => {
		const info = spy(logger, "info");
		const getRoundState = spy(roundStateRepository, "getRoundState");

		assert.undefined(await bootstrapper.run());

		info.calledTimes(2);
		info.calledNthWith(0, "Consensus Bootstrap - Proposals: 0", "consensus");
		info.calledNthWith(1, "Consensus Bootstrap - Prevotes: 0, Precommits: 0", "consensus");
		getRoundState.neverCalled();
	});

	it("#run - should add every stored proposal to the round state of its block number and round", async ({
		bootstrapper,
		logger,
		roundState,
		roundStateRepository,
		storage,
	}) => {
		const proposals = [makeProposal(3, 0), makeProposal(3, 1), makeProposal(4, 0)];
		stub(storage, "getProposals").resolvedValue(proposals);
		const info = spy(logger, "info");
		const getRoundState = spy(roundStateRepository, "getRoundState");
		const addProposal = spy(roundState, "addProposal");

		await bootstrapper.run();

		info.calledWith("Consensus Bootstrap - Proposals: 3", "consensus");
		getRoundState.calledTimes(3);
		getRoundState.calledNthWith(0, 3, 0);
		getRoundState.calledNthWith(1, 3, 1);
		getRoundState.calledNthWith(2, 4, 0);
		addProposal.calledTimes(3);
		for (const [index, proposal] of proposals.entries()) {
			addProposal.calledNthWith(index, proposal);
		}
	});

	it("#run - should add every stored message to the round state of its block number and round", async ({
		bootstrapper,
		logger,
		roundState,
		roundStateRepository,
		storage,
	}) => {
		const messages = [
			makeMessage(Prevote, 3, 0, 0),
			makeMessage(Prevote, 3, 1, 1),
			makeMessage(Precommit, 4, 0, 0),
		];
		stub(storage, "getMessages").resolvedValue(messages);
		const info = spy(logger, "info");
		const getRoundState = spy(roundStateRepository, "getRoundState");
		const addMessage = spy(roundState, "addMessage");

		await bootstrapper.run();

		info.calledWith("Consensus Bootstrap - Prevotes: 2, Precommits: 1", "consensus");
		getRoundState.calledTimes(3);
		getRoundState.calledNthWith(0, 3, 0);
		getRoundState.calledNthWith(1, 3, 1);
		getRoundState.calledNthWith(2, 4, 0);
		addMessage.calledTimes(3);
		for (const [index, message] of messages.entries()) {
			addMessage.calledNthWith(index, message);
		}
	});

	it("#run - should restore proposals before messages", async ({ bootstrapper, roundState, storage }) => {
		stub(storage, "getProposals").resolvedValue([makeProposal(3, 0)]);
		stub(storage, "getMessages").resolvedValue([makeMessage(Prevote, 3, 0, 0), makeMessage(Precommit, 3, 0, 0)]);

		// Messages are matched against the proposal of their round, so the proposal has to be in place first.
		const calls: string[] = [];
		roundState.addProposal = () => calls.push("proposal");
		roundState.addMessage = () => calls.push("message");

		await bootstrapper.run();

		assert.equal(calls, ["proposal", "message", "message"]);
	});

	it("#run - should return the stored state untouched when it references no round", async ({
		bootstrapper,
		roundStateRepository,
		storage,
	}) => {
		const state = makeState();
		stub(storage, "getState").resolvedValue(state);
		const getRoundState = spy(roundStateRepository, "getRoundState");

		const result = await bootstrapper.run();

		assert.is(result, state);
		assert.undefined(result?.validValue);
		assert.undefined(result?.lockedValue);
		getRoundState.neverCalled();
	});

	it("#run - should attach the round state of the valid round as valid value", async ({
		bootstrapper,
		roundState,
		roundStateRepository,
		storage,
	}) => {
		stub(storage, "getState").resolvedValue(makeState({ validRound: 1 }));
		const getRoundState = spy(roundStateRepository, "getRoundState");

		const result = await bootstrapper.run();

		getRoundState.calledOnce();
		getRoundState.calledWith(3, 1);
		assert.is(result?.validValue, roundState);
		assert.undefined(result?.lockedValue);
	});

	it("#run - should attach the round state of the locked round as locked value", async ({
		bootstrapper,
		roundState,
		roundStateRepository,
		storage,
	}) => {
		stub(storage, "getState").resolvedValue(makeState({ lockedRound: 1 }));
		const getRoundState = spy(roundStateRepository, "getRoundState");

		const result = await bootstrapper.run();

		getRoundState.calledOnce();
		getRoundState.calledWith(3, 1);
		assert.is(result?.lockedValue, roundState);
		assert.undefined(result?.validValue);
	});

	it("#run - should treat round 0 as a referenced round", async ({
		bootstrapper,
		roundState,
		roundStateRepository,
		storage,
	}) => {
		// Round 0 is falsy; the bootstrapper must check for undefined rather than truthiness.
		stub(storage, "getState").resolvedValue(makeState({ lockedRound: 0, validRound: 0 }));
		const getRoundState = spy(roundStateRepository, "getRoundState");

		const result = await bootstrapper.run();

		getRoundState.calledTimes(2);
		getRoundState.calledNthWith(0, 3, 0);
		getRoundState.calledNthWith(1, 3, 0);
		assert.is(result?.validValue, roundState);
		assert.is(result?.lockedValue, roundState);
	});

	it("#run - should keep the remaining state data when attaching values", async ({ bootstrapper, storage }) => {
		stub(storage, "getState").resolvedValue(makeState({ lockedRound: 1, validRound: 2 }));

		const result = await bootstrapper.run();

		assert.equal(result?.blockNumber, 3);
		assert.equal(result?.round, 2);
		assert.equal(result?.step, Enums.Consensus.Step.Prevote);
		assert.equal(result?.validRound, 2);
		assert.equal(result?.lockedRound, 1);
	});

	it("#run - should propagate storage errors", async ({ bootstrapper, storage }) => {
		stub(storage, "getProposals").rejectedValue(new Error("storage failure"));

		await assert.rejects(() => bootstrapper.run(), "storage failure");
	});

	it("#run - should propagate round state errors instead of skipping the entry", async ({
		bootstrapper,
		roundState,
		storage,
	}) => {
		stub(storage, "getProposals").resolvedValue([makeProposal(3, 0)]);
		stub(roundState, "addProposal").callsFake(() => {
			throw new Error("Proposal already exists.");
		});

		await assert.rejects(() => bootstrapper.run(), "Proposal already exists.");
	});
});
