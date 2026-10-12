import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { GetMessagesController } from "./get-messages";

describe<{
	app: Application;
	controller: GetMessagesController;
	roundStates: Map<string, any>;
}>("GetMessagesController", ({ it, assert, beforeEach }) => {
	const consensus = { getBlockNumber: () => 2, getRound: () => 5 };

	// A round state holding serialized prevotes/precommits for the given validator indexes.
	const makeRoundState = (round: number, indexes: number[]) => ({
		getPrecommits: () => indexes.map((index) => ({ serialized: Buffer.from([20 + index]), validatorIndex: index })),
		getPrevotes: () => indexes.map((index) => ({ serialized: Buffer.from([10 + index]), validatorIndex: index })),
		round,
	});

	beforeEach((context) => {
		context.roundStates = new Map();

		context.app = new Application();
		context.app.bind(Identifiers.Consensus.Service).toConstantValue(consensus);
		context.app.bind(Identifiers.Consensus.RoundStateRepository).toConstantValue({
			getRoundState: (blockNumber: number, round: number) =>
				context.roundStates.get(`${blockNumber}-${round}`) ?? makeRoundState(round, []),
		});

		context.controller = context.app.resolve(GetMessagesController);
	});

	it("should serve the queried round even while consensus is on a later one", async (context) => {
		// Consensus sits on round 5; the requester asks for round 3, which is still retained.
		context.roundStates.set("2-3", makeRoundState(3, [0, 1]));

		const response = await context.controller.handle(
			{
				payload: {
					headers: { blockNumber: 2, round: 5, validatorsSignedPrecommit: [], validatorsSignedPrevote: [] },
					query: {
						blockNumber: 2,
						round: 3,
						validatorsSignedPrecommit: [false, false],
						validatorsSignedPrevote: [false, false],
					},
				},
			} as any,
			{} as any,
		);

		assert.equal(response.prevotes, [Buffer.from([10]), Buffer.from([11])]);
		assert.equal(response.precommits, [Buffer.from([20]), Buffer.from([21])]);
	});

	it("should return only what the query is missing", async (context) => {
		context.roundStates.set("2-3", makeRoundState(3, [0, 1]));

		const response = await context.controller.handle(
			{
				payload: {
					headers: { blockNumber: 2, round: 5, validatorsSignedPrecommit: [], validatorsSignedPrevote: [] },
					query: {
						blockNumber: 2,
						round: 3,
						validatorsSignedPrecommit: [true, false],
						validatorsSignedPrevote: [false, true],
					},
				},
			} as any,
			{} as any,
		);

		assert.equal(response.prevotes, [Buffer.from([10])]);
		assert.equal(response.precommits, [Buffer.from([21])]);
	});

	it("should serve the whole round for empty bitmaps", async (context) => {
		// A full download holds nothing of the round yet, so it sends no bitmap at all.
		context.roundStates.set("2-3", makeRoundState(3, [0, 1]));

		const response = await context.controller.handle(
			{
				payload: {
					headers: { blockNumber: 2, round: 5, validatorsSignedPrecommit: [], validatorsSignedPrevote: [] },
					query: {
						blockNumber: 2,
						round: 3,
						validatorsSignedPrecommit: [],
						validatorsSignedPrevote: [],
					},
				},
			} as any,
			{} as any,
		);

		assert.equal(response.prevotes, [Buffer.from([10]), Buffer.from([11])]);
		assert.equal(response.precommits, [Buffer.from([20]), Buffer.from([21])]);
	});

	it("should answer empty for a block it is not deciding", async (context) => {
		context.roundStates.set("3-0", makeRoundState(0, [0]));

		const response = await context.controller.handle(
			{
				payload: {
					headers: { blockNumber: 2, round: 5, validatorsSignedPrecommit: [], validatorsSignedPrevote: [] },
					query: {
						blockNumber: 3,
						round: 0,
						validatorsSignedPrecommit: [false, false],
						validatorsSignedPrevote: [false, false],
					},
				},
			} as any,
			{} as any,
		);

		assert.equal(response.prevotes, []);
		assert.equal(response.precommits, []);
	});

	it("should answer empty for a round it has not reached", async (context) => {
		const response = await context.controller.handle(
			{
				payload: {
					headers: { blockNumber: 2, round: 5, validatorsSignedPrecommit: [], validatorsSignedPrevote: [] },
					query: {
						blockNumber: 2,
						round: 7,
						validatorsSignedPrecommit: [false, false],
						validatorsSignedPrevote: [false, false],
					},
				},
			} as any,
			{} as any,
		);

		assert.equal(response.prevotes, []);
		assert.equal(response.precommits, []);
	});
});
