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
			getLastBlock: () => { },
			getLastCommittedRound: () => 0,
		};
		context.validatorSet = {
			getActiveValidators: () => { },
		};

		context.logger = {
			info: () => { },
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
			assert.equal(await proposerPicker.getValidatorIndex(i), i);
		}

		assert.equal(await proposerPicker.getValidatorIndex(51), 0);
		assert.equal(await proposerPicker.getValidatorIndex(52), 1);
	});

	it("#handleCommittedBlock - should shuffle validator index on full round", async ({ proposerPicker }) => {
		assert.equal(proposerPicker.firstValidatorIndex, 0);

		for (let i = 0; i < 51; i++) {
			await proposerPicker.handleCommittedBlock({ commit: { height: i + 1 } } as Contracts.Crypto.ICommittedBlock);
			assert.equal(proposerPicker.firstValidatorIndex, 0);
		}

		await proposerPicker.handleCommittedBlock({ commit: { height: 52 } } as Contracts.Crypto.ICommittedBlock);
		assert.equal(proposerPicker.firstValidatorIndex, 39);

		// shuffled index wraps around
		for (let i = 0; i < 51; i++) {
			const index = (proposerPicker.firstValidatorIndex + i) % 51
			assert.equal(await proposerPicker.getValidatorIndex(i), index);
		}
	});
});
