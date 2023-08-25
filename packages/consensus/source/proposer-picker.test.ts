import { Contracts, Identifiers } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";

import { ProposerPicker } from "./proposer-picker";

type Context = {
	sandbox: Sandbox;
	state: any;
	validatorSet: any;
	proposerPicker: ProposerPicker;
	logger: any;
};

describe<Context>("ProposerPicker", ({ it, beforeEach, assert }) => {
	beforeEach((context) => {
		context.state = {
			getLastBlock: () => {},
			getLastCommittedRound: () => 0,
		};
		context.validatorSet = {
			getActiveValidators: () => {},
		};

		context.logger = {
			info: () => {},
		};

		context.sandbox = new Sandbox();

		context.sandbox.app.bind(Identifiers.StateStore).toConstantValue(context.state);
		context.sandbox.app.bind(Identifiers.Consensus.ProposerPicker).toConstantValue(context.proposerPicker);
		context.sandbox.app.bind(Identifiers.LogService).toConstantValue(context.logger);

		const config = {
			getMilestone: () => ({
				activeValidators: 53,
			}),
		};
		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(config);

		context.proposerPicker = context.sandbox.app.resolve(ProposerPicker);
	});

	// Calculated indexes seeded from height 1 for the first 51 validators
	const expectedIndexesRound1 = [
		17, 18, 16, 49, 20, 29, 11, 47, 6, 3, 37, 30, 27, 31, 4, 33, 7, 42, 10, 40, 43, 28, 45, 21, 8, 41, 2, 51, 46,
		48, 38, 50, 32, 13, 15, 25, 36, 34, 23, 1, 52, 39, 5, 0, 19, 9, 35, 24, 26, 12, 44, 22, 14,
	];

	const expectedIndexesRound2 = [
		48, 18, 50, 47, 33, 39, 38, 22, 9, 43, 16, 0, 30, 12, 37, 34, 46, 44, 23, 27, 45, 3, 19, 40, 42, 31, 49, 7, 26,
		17, 20, 51, 13, 21, 32, 28, 8, 4, 24, 14, 11, 6, 2, 1, 35, 25, 15, 10, 29, 41, 36, 52, 5,
	];

	it("#validatorIndexMatrix - should return empty matrix", async ({ proposerPicker }) => {
		assert.equal(validatorIndexMatrix(proposerPicker), []);
	});

	it("#getValidatorIndex - should return validator index for round", async ({ proposerPicker, sandbox }) => {
		const { activeValidators } = sandbox.app
			.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration)
			.getMilestone();

		await proposerPicker.onCommit({ block: { data: { height: 0 } } });

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
			await proposerPicker.onCommit({ block: { data: { height: index } } });
			assert.equal(validatorIndexMatrix(proposerPicker), expectedIndexesRound1);
		}
	});

	it("#handleCommittedBlock - builds validator matrix based on round height", async ({ proposerPicker, sandbox }) => {
		const { activeValidators } = sandbox.app
			.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration)
			.getMilestone();

		await proposerPicker.onCommit({ block: { data: { height: 5 } } });
		assert.equal(validatorIndexMatrix(proposerPicker), expectedIndexesRound1);

		await proposerPicker.onCommit({ block: { data: { height: activeValidators } } });
		assert.equal(validatorIndexMatrix(proposerPicker), expectedIndexesRound2);
	});

	it("#handleCommittedBlock - should shuffle validator matrix on full round", async ({ proposerPicker, sandbox }) => {
		const { activeValidators } = sandbox.app
			.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration)
			.getMilestone();

		await proposerPicker.onCommit({ block: { data: { height: 1 } } });
		assert.equal(validatorIndexMatrix(proposerPicker), expectedIndexesRound1);

		// shuffled index wraps around (e.g. prolonged rounds)
		for (let index = 0; index < 51 * 4; index++) {
			assert.equal(proposerPicker.getValidatorIndex(index), expectedIndexesRound1[index % activeValidators]);
		}
	});

	const validatorIndexMatrix = (proposalPicker: ProposerPicker): ReadonlyArray<number> =>
		(proposalPicker as any).validatorIndexMatrix;
});
