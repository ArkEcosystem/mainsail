import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";

import { describe } from "@mainsail/test-runner";
import { GetProposalController } from "./get-proposal";

describe<{
	app: Application;
	controller: GetProposalController;
	roundStates: Map<string, any>;
}>("GetProposalController", ({ it, assert, beforeEach }) => {
	const consensus = { getBlockNumber: () => 2, getRound: () => 5 };

	const makeRoundState = (round: number, proposal?: Buffer) => ({
		getProposal: () => (proposal ? { serialized: proposal } : undefined),
		round,
	});

	beforeEach((context) => {
		context.roundStates = new Map();

		context.app = new Application();
		context.app.bind(Identifiers.Consensus.Service).toConstantValue(consensus);
		context.app.bind(Identifiers.Consensus.RoundStateRepository).toConstantValue({
			getRoundState: (blockNumber: number, round: number) =>
				context.roundStates.get(`${blockNumber}-${round}`) ?? makeRoundState(round),
		});

		context.controller = context.app.resolve(GetProposalController);
	});

	it("should serve the queried round even while consensus is on a later one", async (context) => {
		// Consensus sits on round 5; the requester asks for round 3, which is still retained.
		context.roundStates.set("2-3", makeRoundState(3, Buffer.from([3])));

		const response = await context.controller.handle(
			{
				payload: {
					headers: { blockNumber: 2, round: 5 },
					query: { blockNumber: 2, round: 3 },
				},
			} as any,
			{} as any,
		);

		assert.equal(response.proposal, Buffer.from([3]));
	});

	it("should answer empty for a block it is not deciding", async (context) => {
		context.roundStates.set("3-0", makeRoundState(0, Buffer.from([1])));

		const response = await context.controller.handle(
			{
				payload: {
					headers: { blockNumber: 2, round: 5 },
					query: { blockNumber: 3, round: 0 },
				},
			} as any,
			{} as any,
		);

		assert.equal(response.proposal, Buffer.alloc(0));
	});

	it("should answer empty for a round it has not reached", async (context) => {
		const response = await context.controller.handle(
			{
				payload: {
					headers: { blockNumber: 2, round: 5 },
					query: { blockNumber: 2, round: 7 },
				},
			} as any,
			{} as any,
		);

		assert.equal(response.proposal, Buffer.alloc(0));
	});

	it("should answer empty when the queried round holds no proposal", async (context) => {
		const response = await context.controller.handle(
			{
				payload: {
					headers: { blockNumber: 2, round: 5 },
					query: { blockNumber: 2, round: 4 },
				},
			} as any,
			{} as any,
		);

		assert.equal(response.proposal, Buffer.alloc(0));
	});
});
