import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";

import { ValidatorSet } from "./validator-set.js";

describe<{
	app: Application;
	configuration: any;
	consensusContractService: any;
	roundCalculator: any;
	validatorSet: ValidatorSet;
}>("ValidatorSet", ({ it, beforeEach, assert, spy, stub }) => {
	const wallet = (address: string): Contracts.State.ValidatorWallet => ({
		address,
		blsPublicKey: "aa",
		fee: 1n,
		isResigned: false,
		voteBalance: 100n,
		votersCount: 1,
	});

	const validators = [wallet("0xa"), wallet("0xb"), wallet("0xc")];

	beforeEach((context) => {
		context.configuration = { getMilestone: () => ({ roundValidators: 3 }) };
		context.consensusContractService = {
			getRoundValidators: async () => validators,
		};
		context.roundCalculator = { isNewRound: () => false };

		context.app = new Application();
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);
		context.app.bind(Identifiers.Evm.ContractService.Consensus).toConstantValue(context.consensusContractService);
		context.app.bind(Identifiers.BlockchainUtils.RoundCalculator).toConstantValue(context.roundCalculator);

		context.validatorSet = context.app.resolve(ValidatorSet);
	});

	it("#restore - should build only the round validators", async ({ validatorSet, consensusContractService }) => {
		const build = spy(consensusContractService, "getRoundValidators");

		await validatorSet.restore();

		build.calledOnce();
		assert.equal(validatorSet.getRoundValidators(), validators);
	});

	it("#getRoundValidators - should throw when not yet restored", ({ validatorSet }) => {
		assert.throws(() => validatorSet.getRoundValidators(), "Expected 3 round validators, but got 0");
	});

	it("#getRoundValidators - should return exactly roundValidators", async ({ validatorSet }) => {
		await validatorSet.restore();

		assert.length(validatorSet.getRoundValidators(), 3);
	});

	it("#buildRoundValidators - should throw with the actual fetched count when not enough", async ({
		validatorSet,
		consensusContractService,
	}) => {
		consensusContractService.getRoundValidators = async () => [wallet("0xa"), wallet("0xb")];

		await assert.rejects(() => validatorSet.restore(), "Expected 3 round validators, but got 2");
	});

	it("#getValidator - should return the validator at the given index", async ({ validatorSet }) => {
		await validatorSet.restore();

		assert.equal(validatorSet.getValidator(1), validators[1]);
	});

	it("#getValidator - should throw for an out-of-range index", async ({ validatorSet }) => {
		await validatorSet.restore();

		assert.throws(() => validatorSet.getValidator(5), "Validator at index 5 not found.");
	});

	it("#getValidatorIndexByWalletAddress - should return the index", async ({ validatorSet }) => {
		await validatorSet.restore();

		assert.equal(validatorSet.getValidatorIndexByWalletAddress("0xb"), 1);
	});

	it("#getValidatorIndexByWalletAddress - should throw for an unknown address", async ({ validatorSet }) => {
		await validatorSet.restore();

		assert.throws(() => validatorSet.getValidatorIndexByWalletAddress("0xzzz"), "Validator 0xzzz not found.");
	});

	it("#onCommit - should rebuild round validators on a new round (blockNumber + 1)", async ({
		validatorSet,
		roundCalculator,
		consensusContractService,
	}) => {
		const isNewRound = stub(roundCalculator, "isNewRound").returnValue(true);
		const build = spy(consensusContractService, "getRoundValidators");

		await validatorSet.onCommit({ blockNumber: 9 } as unknown as Contracts.Processor.ProcessableUnit);

		isNewRound.calledWith(10);
		build.calledOnce();
	});

	it("#onCommit - should not rebuild when it is not a new round", async ({
		validatorSet,
		consensusContractService,
	}) => {
		const build = spy(consensusContractService, "getRoundValidators");

		await validatorSet.onCommit({ blockNumber: 9 } as unknown as Contracts.Processor.ProcessableUnit);

		build.neverCalled();
	});
});
