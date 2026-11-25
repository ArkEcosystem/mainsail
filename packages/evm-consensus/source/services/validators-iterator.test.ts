import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { AsyncValidatorsIterator } from "./validators-iterator.js";

describe<{
	app: Application;
	caller: any;
	calls: (readonly unknown[])[];
	iterator: AsyncValidatorsIterator;
}>("AsyncValidatorsIterator", ({ it, beforeEach, assert }) => {
	const validator = (index: number) => ({
		addr: `0x${index}`,
		data: {
			blsPublicKey: `0xbeef${index}`,
			fee: 1n,
			isResigned: index % 2 === 0,
			voteBalance: 5n,
			votersCount: 2n,
		},
	});

	beforeEach((context) => {
		context.calls = [];
		context.caller = {
			view: async (functionName: string, arguments_: readonly unknown[]) => {
				assert.is(functionName, "getValidators");
				context.calls.push(arguments_);

				const [offset, count] = arguments_ as [number, number];
				return Array.from({ length: Math.max(0, Math.min(count, 2500 - offset)) }, (_, index) =>
					validator(offset + index),
				);
			},
		};

		context.app = new Application();
		context.app.bind(Identifiers.EvmConsensus.ConsensusContractCaller).toConstantValue(context.caller);

		context.iterator = context.app.resolve(AsyncValidatorsIterator);
	});

	it("should iterate all validators in pages of 1000 and stop on an empty page", async ({ iterator, calls }) => {
		const collected: any[] = [];
		for await (const wallet of iterator) {
			collected.push(wallet);
		}

		assert.equal(calls, [
			[0, 1000],
			[1000, 1000],
			[2000, 1000],
			[2500, 1000],
		]);
		assert.length(collected, 2500);
		assert.equal(
			collected.map(({ address }) => address),
			Array.from({ length: 2500 }, (_, index) => `0x${index}`),
		);
	});

	it("should map validators to wallets", async ({ iterator }) => {
		const { value } = await iterator.next();

		assert.equal(value, {
			address: "0x0",
			blsPublicKey: "beef0",
			fee: 1n,
			isResigned: true,
			voteBalance: 5n,
			votersCount: 2,
		});
	});

	it("should finish without validators", async ({ iterator, caller, calls }) => {
		caller.view = async (_functionName: string, arguments_: readonly unknown[]) => {
			calls.push(arguments_);
			return [];
		};

		assert.equal(await iterator.next(), { done: true, value: undefined });
		assert.equal(calls, [[0, 1000]]);
	});
});
