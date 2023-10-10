import { Contracts, Identifiers } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";

import { ProposerSelector } from "./proposer-selector";

type Context = {
	sandbox: Sandbox;
	stateStore: any;
	stateService: any;
	validatorSet: any;
	proposerPicker: ProposerSelector;
	logger: any;
};

describe<Context>("ProposerSelector", ({ it, beforeEach, assert, stub }) => {
	beforeEach((context) => {
		context.stateStore = {
			getLastBlock: () => {},
			getTotalRound: () => 0,
		};

		context.stateService = {
			getStateStore: () => context.stateStore,
		};

		context.validatorSet = {
			getActiveValidators: () => {},
		};

		context.logger = {
			info: () => {},
		};

		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.StateService).toConstantValue(context.stateService);
		context.sandbox.app.bind(Identifiers.Consensus.ProposerPicker).toConstantValue(context.proposerPicker);
		context.sandbox.app.bind(Identifiers.LogService).toConstantValue(context.logger);

		const milestone = {
			activeValidators: 53,
			height: 0,
		};

		const config = {
			get: () => [milestone],
			getMilestone: () => milestone,
		};

		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(config);

		context.proposerPicker = context.sandbox.app.resolve(ProposerSelector);
	});

	// Calculated indexes seeded from height 1 for the first 51 validators
	const expectedIndexesRound1 = [
		12, 30, 4, 39, 16, 7, 31, 52, 44, 47, 13, 46, 19, 29, 6, 28, 14, 17, 0, 3, 38, 25, 9, 20, 37, 40, 11, 33, 10,
		43, 45, 50, 22, 5, 36, 8, 21, 26, 18, 23, 15, 48, 1, 49, 32, 51, 34, 35, 42, 24, 27, 2, 41,
	];

	const expectedIndexesRound2 = [
		16, 12, 2, 8, 17, 15, 41, 28, 38, 43, 7, 19, 51, 1, 9, 11, 22, 40, 18, 30, 3, 47, 46, 42, 27, 13, 35, 4, 29, 6,
		5, 31, 50, 21, 44, 25, 32, 33, 20, 24, 48, 37, 23, 26, 49, 0, 10, 14, 39, 52, 36, 45, 34,
	];

	it("#validatorIndexMatrix - should return empty matrix", async ({ proposerPicker }) => {
		assert.equal(validatorIndexMatrix(proposerPicker), []);
	});

	it("#getValidatorIndex - should return validator index for round", async ({ proposerPicker, sandbox }) => {
		const { activeValidators } = sandbox.app
			.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration)
			.getMilestone();

		await proposerPicker.onCommit({
			getCommittedBlock: async () => ({ block: { header: { height: 0 } } }),
		} as Contracts.BlockProcessor.IProcessableUnit);

		for (let index = 0; index < activeValidators; index++) {
			assert.equal(proposerPicker.getValidatorIndex(index), expectedIndexesRound1[index]);
		}

		assert.equal(proposerPicker.getValidatorIndex(activeValidators), expectedIndexesRound1[0]);
	});

	it("#getValidatorIndex - should wrap around", async ({ proposerPicker, sandbox }) => {
		const { activeValidators } = sandbox.app
			.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration)
			.getMilestone();

		for (let index = 1; index < activeValidators; index++) {
			await proposerPicker.onCommit({
				getCommittedBlock: async () => ({ block: { header: { height: index } } }),
			} as Contracts.BlockProcessor.IProcessableUnit);

			assert.equal(validatorIndexMatrix(proposerPicker), expectedIndexesRound1);
		}
	});

	it("#handleCommittedBlock - builds validator matrix based on round height", async ({
		proposerPicker,
		sandbox,
		stateStore: state,
	}) => {
		const { activeValidators } = sandbox.app
			.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration)
			.getMilestone();

		await proposerPicker.onCommit({
			getCommittedBlock: async () => ({ block: { header: { height: 5 } } }),
		} as Contracts.BlockProcessor.IProcessableUnit);

		assert.equal(validatorIndexMatrix(proposerPicker), expectedIndexesRound1);

		const spyOnGetTotalRound = stub(state, "getTotalRound").returnValue(51);

		await proposerPicker.onCommit({
			getCommittedBlock: async () => ({ block: { header: { height: activeValidators } } }),
		} as Contracts.BlockProcessor.IProcessableUnit);
		assert.equal(validatorIndexMatrix(proposerPicker), expectedIndexesRound2);

		spyOnGetTotalRound.calledOnce();
	});

	it("#handleCommittedBlock - should shuffle validator matrix on full round", async ({ proposerPicker, sandbox }) => {
		const { activeValidators } = sandbox.app
			.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration)
			.getMilestone();

		await proposerPicker.onCommit({
			getCommittedBlock: async () => ({ block: { header: { height: 1 } } }),
		} as Contracts.BlockProcessor.IProcessableUnit);
		assert.equal(validatorIndexMatrix(proposerPicker), expectedIndexesRound1);

		// shuffled index wraps around (e.g. prolonged rounds)
		for (let index = 0; index < 51 * 4; index++) {
			assert.equal(proposerPicker.getValidatorIndex(index), expectedIndexesRound1[index % activeValidators]);
		}
	});

	const validatorIndexMatrix = (proposalPicker: ProposerSelector): ReadonlyArray<number> =>
		(proposalPicker as any).validatorIndexMatrix;
});
