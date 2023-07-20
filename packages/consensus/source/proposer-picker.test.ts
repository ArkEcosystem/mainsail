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
				activeValidators: 51,
			}),
		};
		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(config);

		context.proposerPicker = context.sandbox.app.resolve(ProposerPicker);
	});

	// Calculated indexes seeded from height 1 for the first 51 validators
	const expectedIndexesRound1 = [
		13, 33, 43, 25, 9, 38, 7, 21, 47, 35, 30, 19, 16, 34, 6, 24, 5, 26, 10, 44, 39, 23, 3, 37, 28, 1, 4, 27, 46, 15,
		22, 48, 20, 2, 12, 8, 0, 11, 49, 17, 29, 41, 45, 50, 40, 32, 31, 42, 14, 18, 36,
	];

	const expectedIndexesRound2 = [
		5, 11, 33, 10, 0, 22, 30, 4, 25, 13, 28, 15, 21, 27, 36, 38, 18, 42, 6, 41, 34, 9, 50, 39, 26, 37, 45, 29, 3,
		46, 12, 47, 16, 31, 2, 49, 20, 7, 44, 24, 1, 48, 8, 43, 17, 14, 32, 23, 35, 19, 40,
	];

	it("#validatorIndexMatrix - should return empty matrix", async ({ proposerPicker }) => {
		assert.equal(proposerPicker.validatorIndexMatrix, []);
	});

	it("#getValidatorIndex - should return validator index for round", async ({ proposerPicker }) => {
		proposerPicker.handleCommittedBlock({ height: 1 } as Contracts.Crypto.IBlockCommit);

		for (let i = 0; i < 51; i++) {
			assert.equal(proposerPicker.getValidatorIndex(i), expectedIndexesRound1[i]);
		}

		assert.equal(proposerPicker.getValidatorIndex(51), expectedIndexesRound1[0]);
	});

	it("#getValidatorIndex - should wrap around", async ({ proposerPicker }) => {
		for (let i = 1; i < 51; i++) {
			proposerPicker.handleCommittedBlock({ height: i } as Contracts.Crypto.IBlockCommit);
			assert.equal(proposerPicker.validatorIndexMatrix, expectedIndexesRound1);
		}
	});

	it("#handleCommittedBlock - builds validator matrix based on round height", async ({ proposerPicker }) => {
		proposerPicker.handleCommittedBlock({ height: 5 } as Contracts.Crypto.IBlockCommit);
		assert.equal(proposerPicker.validatorIndexMatrix, expectedIndexesRound1);
	});

	it("#handleCommittedBlock - should shuffle validator matrix on full round", async ({ proposerPicker }) => {
		proposerPicker.handleCommittedBlock({ height: 1 } as Contracts.Crypto.IBlockCommit);
		assert.equal(proposerPicker.validatorIndexMatrix, expectedIndexesRound1);

		// shuffled index wraps around (e.g. prolonged rounds)
		for (let i = 0; i < 51 * 4; i++) {
			assert.equal(proposerPicker.getValidatorIndex(i), expectedIndexesRound1[i % 51]);
		}
	});
});
