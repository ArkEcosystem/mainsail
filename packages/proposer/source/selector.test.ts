import { Contracts, Identifiers } from "@mainsail/contracts";
import { describe, Sandbox } from "@mainsail/test-framework";

import { Attributes, StateStore } from "../../state/distribution";
import { Selector } from "./selector";

type Context = {
	sandbox: Sandbox;
	stateStore: Contracts.State.Store;
	stateService: any;
	validatorSet: any;
	proposerSelector;
	logger: any;
};

describe<Context>("Selector", ({ it, beforeEach, assert, stub }) => {
	beforeEach((context) => {
		context.stateService = {
			getStateStore: () => context.stateStore,
		};

		context.validatorSet = {
			getActiveValidators: () => {},
		};

		context.logger = {
			info: () => {},
		};

		const milestone = {
			activeValidators: 53,
			height: 0,
		};

		const config = {
			get: () => [milestone],
			getMilestone: () => milestone,
		};

		context.sandbox = new Sandbox();
		context.sandbox.app.bind(Identifiers.State.Service).toConstantValue(context.stateService);
		context.sandbox.app.bind(Identifiers.Proposer.Selector).toConstantValue(context.proposerSelector);
		context.sandbox.app.bind(Identifiers.Services.Log.Service).toConstantValue(context.logger);
		context.sandbox.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(config);
		context.sandbox.app
			.bind(Identifiers.State.AttributeRepository)
			.to(Attributes.AttributeRepository)
			.inSingletonScope();
		context.sandbox.app
			.get<Contracts.State.IAttributeRepository>(Identifiers.State.AttributeRepository)
			.set("height", Contracts.State.AttributeType.Number);
		context.sandbox.app
			.get<Contracts.State.IAttributeRepository>(Identifiers.State.AttributeRepository)
			.set("totalRound", Contracts.State.AttributeType.Number);
		context.sandbox.app
			.get<Contracts.State.IAttributeRepository>(Identifiers.State.AttributeRepository)
			.set("validatorMatrix", Contracts.State.AttributeType.String);

		context.stateStore = context.sandbox.app.resolve(StateStore).configure();

		context.proposerSelector = context.sandbox.app.resolve(Selector);
	});

	// Calculated indexes seeded from height 1 for the first 51 validators
	const expectedIndexesRound1 = [
		12, 30, 4, 39, 16, 7, 31, 52, 44, 47, 13, 46, 19, 29, 6, 28, 14, 17, 0, 3, 38, 25, 9, 20, 37, 40, 11, 33, 10,
		43, 45, 50, 22, 5, 36, 8, 21, 26, 18, 23, 15, 48, 1, 49, 32, 51, 34, 35, 42, 24, 27, 2, 41,
	];

	const expectedIndexesRound2 = [
		12, 27, 28, 6, 30, 14, 0, 35, 11, 5, 32, 52, 4, 29, 23, 40, 22, 51, 38, 44, 7, 50, 43, 10, 42, 26, 47, 39, 16,
		31, 3, 34, 13, 49, 17, 48, 2, 20, 21, 8, 46, 25, 1, 36, 9, 45, 18, 15, 33, 24, 37, 19, 41,
	];

	it("#getValidatorIndex - should return validator index for round", async ({ proposerSelector, sandbox }) => {
		const { activeValidators } = sandbox.app
			.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration)
			.getMilestone();

		await proposerSelector.onCommit({
			getCommit: async () => ({ block: { header: { height: 0 } } }),
		} as Contracts.Processor.ProcessableUnit);

		for (let index = 0; index < activeValidators; index++) {
			assert.equal(proposerSelector.getValidatorIndex(index), expectedIndexesRound1[index]);
		}
	});

	it("#handleCommit - builds validator matrix based on round height", async ({
		proposerSelector,
		sandbox,
		stateStore,
	}) => {
		const { activeValidators } = sandbox.app
			.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration)
			.getMilestone();

		await proposerSelector.onCommit({
			getCommit: async () => ({ block: { header: { height: 0 } } }),
		} as Contracts.Processor.ProcessableUnit);

		for (let index = 0; index < activeValidators; index++) {
			assert.equal(proposerSelector.getValidatorIndex(index), expectedIndexesRound1[index]);
		}

		stateStore.setTotalRound(53);

		await proposerSelector.onCommit({
			getCommit: async () => ({ block: { header: { height: activeValidators } } }),
		} as Contracts.Processor.ProcessableUnit);

		for (let index = 0; index < activeValidators; index++) {
			assert.equal(proposerSelector.getValidatorIndex(index), expectedIndexesRound2[index]);
		}
	});

	it("#handleCommit - should repeat the indexed on prolonged rounds", async ({ proposerSelector, sandbox }) => {
		const { activeValidators } = sandbox.app
			.get<Contracts.Crypto.Configuration>(Identifiers.Cryptography.Configuration)
			.getMilestone();

		await proposerSelector.onCommit({
			getCommit: async () => ({ block: { header: { height: 0 } } }),
		} as Contracts.Processor.ProcessableUnit);
		for (let index = 0; index < activeValidators; index++) {
			assert.equal(proposerSelector.getValidatorIndex(index), expectedIndexesRound1[index]);
		}
		// shuffled index wraps around (e.g. prolonged rounds)
		for (let index = 0; index < 51 * 4; index++) {
			assert.equal(proposerSelector.getValidatorIndex(index), expectedIndexesRound1[index % activeValidators]);
		}
	});
});
