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

	it("#firstValidatorIndex - should return initial value", async ({ proposerPicker }) => {
		assert.equal(proposerPicker.firstValidatorIndex, 0);
	});

	it("#getValidatorIndex - should return validator index for round", async ({ proposerPicker }) => {
		for (let i = 0; i < 51; i++) {
			assert.equal(proposerPicker.getValidatorIndex(i), i);
		}

		assert.equal(proposerPicker.getValidatorIndex(51), 0);
		assert.equal(proposerPicker.getValidatorIndex(52), 1);
	});

	it("#handleCommittedBlock - should shuffle validator index on full round", async ({ proposerPicker }) => {
		assert.equal(proposerPicker.firstValidatorIndex, 0);

		for (let i = 0; i < 51; i++) {
			proposerPicker.handleCommittedBlock({ height: i } as Contracts.Crypto.IBlockCommit);
			assert.equal(proposerPicker.firstValidatorIndex, 13);
		}

		// Starts next round
		proposerPicker.handleCommittedBlock({ height: 51 } as Contracts.Crypto.IBlockCommit);
		assert.equal(proposerPicker.firstValidatorIndex, 25);

		// shuffled index wraps around
		for (let i = 0; i < 51; i++) {
			const index = (proposerPicker.firstValidatorIndex + i) % 51;
			assert.equal(proposerPicker.getValidatorIndex(i), index);
		}
	});
});
