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
	const wallet = (
		address: string,
		overrides: Partial<Contracts.State.ValidatorWallet> = {},
	): Contracts.State.ValidatorWallet => ({
		address,
		blsPublicKey: "aa",
		fee: 1n,
		isResigned: false,
		voteBalance: 100n,
		votersCount: 1,
		...overrides,
	});

	const validators = [wallet("0xa"), wallet("0xb"), wallet("0xc")];

	beforeEach((context) => {
		context.configuration = { getMilestone: () => ({ roundValidators: 3 }) };
		context.consensusContractService = {
			getAllValidators: async () => validators,
			getRoundValidators: async () => validators,
		};
		context.roundCalculator = { isNewRound: () => false };

		context.app = new Application();
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);
		context.app.bind(Identifiers.Evm.ContractService.Consensus).toConstantValue(context.consensusContractService);
		context.app.bind(Identifiers.BlockchainUtils.RoundCalculator).toConstantValue(context.roundCalculator);

		context.validatorSet = context.app.resolve(ValidatorSet);
	});

	it("#restore - should build round validators and load all validators", async ({ validatorSet }) => {
		await validatorSet.restore();

		assert.equal(validatorSet.getRoundValidators(), validators);
		assert.equal(validatorSet.getAllValidators(), validators);
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

	it("#onCommit - should skip dirty calculation when ApiSync is not bound", async ({
		validatorSet,
		consensusContractService,
	}) => {
		const all = spy(consensusContractService, "getAllValidators");

		await validatorSet.onCommit({ blockNumber: 9 } as unknown as Contracts.Processor.ProcessableUnit);

		all.neverCalled();
	});

	it("#onCommit - should mark new and changed validators dirty when ApiSync is bound", async ({
		app,
		validatorSet,
		consensusContractService,
	}) => {
		app.bind(Identifiers.ApiSync.Service).toConstantValue({});
		await validatorSet.restore();

		consensusContractService.getAllValidators = async () => [
			wallet("0xa"),
			wallet("0xb", { voteBalance: 999n }),
			wallet("0xc"),
			wallet("0xd"),
		];

		await validatorSet.onCommit({ blockNumber: 9 } as unknown as Contracts.Processor.ProcessableUnit);

		assert.equal(
			validatorSet.getDirtyValidators().map((validator) => validator.address),
			["0xb", "0xd"],
		);
	});
});
