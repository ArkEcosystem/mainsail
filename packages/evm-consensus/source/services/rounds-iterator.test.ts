import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { Identifiers as EvmConsensusIdentifiers } from "../identifiers.js";
import { AsyncValidatorRoundsIterator } from "./rounds-iterator.js";

describe<{
	app: Application;
	caller: any;
	offsets: number[];
	iterator: AsyncValidatorRoundsIterator;
}>("AsyncValidatorRoundsIterator", ({ it, beforeEach, assert }) => {
	beforeEach((context) => {
		context.offsets = [];
		context.caller = {
			view: async (_functionName: string, arguments_: readonly unknown[]) => {
				const offset = arguments_[0] as number;
				context.offsets.push(offset);

				if (offset === 0) {
					return [
						{ round: 1n, validators: [{ addr: "0xval1", voteBalance: 5n }] },
						{ round: 2n, validators: [] },
					];
				}

				return [];
			},
		};

		context.app = new Application();
		context.app.bind(EvmConsensusIdentifiers.Internal.ConsensusContractCaller).toConstantValue(context.caller);
		context.app.bind(Identifiers.BlockchainUtils.RoundCalculator).toConstantValue({
			calculateRoundInfoByRound: (round: number) => ({ roundHeight: round * 100 }),
		});

		context.iterator = context.app.resolve(AsyncValidatorRoundsIterator);
	});

	it("should iterate all rounds and map them", async ({ iterator }) => {
		const collected: any[] = [];
		for await (const round of iterator) {
			collected.push(round);
		}

		assert.equal(collected, [
			{ round: 1, roundHeight: 100, validators: [{ address: "0xval1", voteBalance: 5n }] },
			{ round: 2, roundHeight: 200, validators: [] },
		]);
	});

	it("should advance the offset by the page size and stop on an empty page", async ({ iterator, offsets }) => {
		// eslint-disable-next-line no-empty
		for await (const _round of iterator) {
		}

		// First page fetched at offset 0 (2 rounds), second page at offset 2 returns empty -> done.
		assert.equal(offsets, [0, 2]);
	});
});
