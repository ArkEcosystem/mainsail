import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { ConsensusContractService } from "./consensus-contract-service.js";
import { AsyncValidatorRoundsIterator } from "./rounds-iterator.js";
import { AsyncValidatorsIterator } from "./validators-iterator.js";
import { AsyncVotesIterator } from "./votes-iterator.js";

describe<{
	app: Application;
	caller: any;
	calls: { functionName: string; arguments_?: readonly unknown[] }[];
	service: ConsensusContractService;
}>("ConsensusContractService", ({ it, beforeEach, assert }) => {
	const decoded = [
		{
			addr: "0xval",
			data: { blsPublicKey: "0xbeef", fee: 2n, isResigned: false, voteBalance: 10n, votersCount: 3n },
		},
	];

	beforeEach((context) => {
		context.calls = [];
		context.caller = {
			view: async (functionName: string, arguments_?: readonly unknown[]) => {
				context.calls.push({ arguments_, functionName });

				if (functionName === "getVotesCount") {
					return 7n;
				}

				return decoded;
			},
		};

		context.app = new Application();
		context.app.bind(Identifiers.EvmConsensus.ConsensusContractCaller).toConstantValue(context.caller);
		context.app.bind(Identifiers.BlockchainUtils.RoundCalculator).toConstantValue({});

		context.service = context.app.resolve(ConsensusContractService);
	});

	it("#getRoundValidators - should map decoded validators to wallets", async ({ service }) => {
		assert.equal(await service.getRoundValidators(), [
			{ address: "0xval", blsPublicKey: "beef", fee: 2n, isResigned: false, voteBalance: 10n, votersCount: 3 },
		]);
	});

	it("#getAllValidators - should map decoded validators to wallets", async ({ service }) => {
		assert.equal(await service.getAllValidators(), [
			{ address: "0xval", blsPublicKey: "beef", fee: 2n, isResigned: false, voteBalance: 10n, votersCount: 3 },
		]);
	});

	it("#getValidators - should return a validators iterator", ({ service }) => {
		assert.instance(service.getValidators(), AsyncValidatorsIterator);
	});

	it("#getValidatorsOf - should not call the contract without addresses", async ({ service, calls }) => {
		assert.equal(await service.getValidatorsOf([]), []);
		assert.equal(calls, []);
	});

	it("#getValidatorsOf - should look up the addresses in chunks of 1000 and deduplicate", async ({
		service,
		caller,
		calls,
	}) => {
		const addresses = Array.from({ length: 2001 }, (_, index) => `0x${index}`);
		caller.view = async (functionName: string, arguments_?: readonly unknown[]) => {
			calls.push({ arguments_, functionName });

			return [
				{
					addr: "0xa",
					data: {
						blsPublicKey: "0xaa",
						fee: 1n,
						isResigned: false,
						voteBalance: BigInt(calls.length),
						votersCount: 1n,
					},
				},
				{
					addr: `0x${calls.length}`,
					data: { blsPublicKey: "0xbb", fee: 1n, isResigned: true, voteBalance: 0n, votersCount: 0n },
				},
			];
		};

		const validators = await service.getValidatorsOf(addresses);

		assert.equal(
			calls.map(({ functionName, arguments_ }) => [functionName, (arguments_![0] as string[]).length]),
			[
				["getValidatorsOf", 1000],
				["getValidatorsOf", 1000],
				["getValidatorsOf", 1],
			],
		);
		assert.equal((calls[1].arguments_![0] as string[])[0], "0x1000");
		assert.equal(
			validators.map(({ address }) => address),
			["0xa", "0x1", "0x2", "0x3"],
		);
		assert.equal(validators[0], {
			address: "0xa",
			blsPublicKey: "aa",
			fee: 1n,
			isResigned: false,
			voteBalance: 3n,
			votersCount: 1,
		});
	});

	it("#getValidatorsOf - should look up exactly 1000 addresses in one call", async ({ service, calls }) => {
		await service.getValidatorsOf(Array.from({ length: 1000 }, (_, index) => `0x${index}`));

		assert.equal(
			calls.map(({ functionName, arguments_ }) => [functionName, (arguments_![0] as string[]).length]),
			[["getValidatorsOf", 1000]],
		);
	});

	it("#getValidatorsByBlsPublicKeys - should pass prefixed keys and map unknown keys to undefined", async ({
		service,
		caller,
		calls,
	}) => {
		caller.view = async (functionName: string, arguments_?: readonly unknown[]) => {
			calls.push({ arguments_, functionName });

			return [
				decoded[0],
				{
					addr: "0x0000000000000000000000000000000000000000",
					data: { blsPublicKey: "0x", fee: 0n, isResigned: false, voteBalance: 0n, votersCount: 0n },
				},
			];
		};

		assert.equal(await service.getValidatorsByBlsPublicKeys(["beef", "dead"]), [
			{ address: "0xval", blsPublicKey: "beef", fee: 2n, isResigned: false, voteBalance: 10n, votersCount: 3 },
			undefined,
		]);
		assert.equal(calls, [{ arguments_: [["0xbeef", "0xdead"]], functionName: "getValidatorsByBlsPublicKeys" }]);
	});

	it("#getVotesCount - should return the count as a number", async ({ service }) => {
		assert.equal(await service.getVotesCount(), 7);
	});

	it("#getValidatorRounds - should return a rounds iterator", ({ service }) => {
		assert.instance(service.getValidatorRounds(), AsyncValidatorRoundsIterator);
	});

	it("#getVotes - should return a votes iterator", ({ service }) => {
		assert.instance(service.getVotes(), AsyncVotesIterator);
	});
});
