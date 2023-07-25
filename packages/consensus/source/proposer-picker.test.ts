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
		36, 10, 48, 14, 43, 29, 35, 27, 38, 28, 16, 3, 40, 47, 6, 5, 46, 31, 41, 26, 8, 19, 7, 39, 2, 20, 45, 44, 49,
		17, 30, 12, 15, 24, 34, 32, 22, 1, 50, 37, 4, 0, 18, 9, 33, 23, 25, 11, 42, 21, 13,
	];

	const expectedIndexesRound2 = [
		18, 26, 37, 31, 14, 17, 38, 49, 20, 1, 47, 19, 13, 36, 30, 27, 21, 16, 50, 29, 23, 22, 40, 43, 5, 34, 12, 2, 10,
		46, 4, 28, 45, 15, 6, 11, 9, 44, 48, 24, 32, 7, 39, 35, 33, 3, 42, 0, 8, 41, 25,
	];

	it("#validatorIndexMatrix - should return empty matrix", async ({ proposerPicker }) => {
		assert.equal(validatorIndexMatrix(proposerPicker), []);
	});

	it("#getValidatorIndex - should return validator index for round", async ({ proposerPicker, sandbox }) => {
		const { activeValidators } = sandbox.app
			.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration)
			.getMilestone();

		proposerPicker.handleCommittedBlock({ height: 1 } as Contracts.Crypto.IBlockCommit);
		for (let i = 0; i < activeValidators; i++) {
			assert.equal(proposerPicker.getValidatorIndex(i), expectedIndexesRound1[i]);
		}

		assert.equal(proposerPicker.getValidatorIndex(activeValidators), expectedIndexesRound1[0]);
	});

	it("#getValidatorIndex - should wrap around", async ({ proposerPicker, sandbox }) => {
		const { activeValidators } = sandbox.app
			.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration)
			.getMilestone();

		for (let i = 1; i < activeValidators; i++) {
			proposerPicker.handleCommittedBlock({ height: i } as Contracts.Crypto.IBlockCommit);
			assert.equal(validatorIndexMatrix(proposerPicker), expectedIndexesRound1);
		}
	});

	it("#handleCommittedBlock - builds validator matrix based on round height", async ({ proposerPicker, sandbox }) => {
		const { activeValidators } = sandbox.app
			.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration)
			.getMilestone();

		proposerPicker.handleCommittedBlock({ height: 5 } as Contracts.Crypto.IBlockCommit);
		assert.equal(validatorIndexMatrix(proposerPicker), expectedIndexesRound1);

		proposerPicker.handleCommittedBlock({ height: activeValidators } as Contracts.Crypto.IBlockCommit);
		assert.equal(validatorIndexMatrix(proposerPicker), expectedIndexesRound2);
	});

	it("#handleCommittedBlock - should shuffle validator matrix on full round", async ({ proposerPicker, sandbox }) => {
		const { activeValidators } = sandbox.app
			.get<Contracts.Crypto.IConfiguration>(Identifiers.Cryptography.Configuration)
			.getMilestone();

		proposerPicker.handleCommittedBlock({ height: 1 } as Contracts.Crypto.IBlockCommit);
		assert.equal(validatorIndexMatrix(proposerPicker), expectedIndexesRound1);

		// shuffled index wraps around (e.g. prolonged rounds)
		for (let i = 0; i < 51 * 4; i++) {
			assert.equal(proposerPicker.getValidatorIndex(i), expectedIndexesRound1[i % activeValidators]);
		}
	});

	const validatorIndexMatrix = (proposalPicker: ProposerPicker): ReadonlyArray<number> => {
		return (proposalPicker as any).validatorIndexMatrix;
	};
});
