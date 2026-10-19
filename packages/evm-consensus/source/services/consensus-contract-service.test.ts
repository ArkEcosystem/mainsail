import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { ConsensusContractService } from "./consensus-contract-service.js";
import { AsyncValidatorRoundsIterator } from "./rounds-iterator.js";
import { AsyncVotesIterator } from "./votes-iterator.js";

describe<{
	app: Application;
	caller: any;
	service: ConsensusContractService;
}>("ConsensusContractService", ({ it, beforeEach, assert }) => {
	const decoded = [
		{
			addr: "0xval",
			data: { blsPublicKey: "0xbeef", fee: 2n, isResigned: false, voteBalance: 10n, votersCount: 3n },
		},
	];

	beforeEach((context) => {
		context.caller = {
			view: async (functionName: string) => {
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
