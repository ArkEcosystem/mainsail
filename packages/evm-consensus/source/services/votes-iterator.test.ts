import { Application } from "@mainsail/kernel";
import { Identifiers } from "@mainsail/constants";
import { describe } from "@mainsail/test-runner";

import { AsyncVotesIterator } from "./votes-iterator.js";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

describe<{
	app: Application;
	caller: any;
	cursors: string[];
	iterator: AsyncVotesIterator;
}>("AsyncVotesIterator", ({ it, beforeEach, assert }) => {
	beforeEach((context) => {
		context.cursors = [];
		context.caller = {
			view: async (_functionName: string, arguments_: readonly unknown[]) => {
				const cursor = arguments_[0] as string;
				context.cursors.push(cursor);

				if (cursor === ZERO_ADDRESS) {
					return [
						{ validator: "0xv1", voter: "0xA" },
						{ validator: "0xv1", voter: "0xB" },
					];
				}

				return [];
			},
		};

		context.app = new Application();
		context.app.bind(Identifiers.EvmConsensus.ConsensusContractCaller).toConstantValue(context.caller);

		context.iterator = context.app.resolve(AsyncVotesIterator);
	});

	it("should iterate all votes and map them", async ({ iterator }) => {
		const collected: any[] = [];
		for await (const vote of iterator) {
			collected.push(vote);
		}

		assert.equal(collected, [
			{ validatorAddress: "0xv1", voterAddress: "0xA" },
			{ validatorAddress: "0xv1", voterAddress: "0xB" },
		]);
	});

	it("should resume from the last voter (exclusive cursor) and stop on an empty page", async ({
		iterator,
		cursors,
	}) => {
		// eslint-disable-next-line no-empty
		for await (const _vote of iterator) {
		}

		// First page from the zero address, second page from the last voter of the previous page.
		assert.equal(cursors, [ZERO_ADDRESS, "0xB"]);
	});
});
