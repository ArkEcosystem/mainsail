import { Identifiers } from "@mainsail/constants";

import { Application } from "@mainsail/kernel";
import { describe } from "@mainsail/test-runner";
import { ProposerCalculator } from "./proposer-calculator";

type Context = {
	app: Application;
	proposerCalculator: ProposerCalculator;
	stateStore: any;
	configuration: any;
};

describe<Context>("ProposerCalculator", ({ assert, it, beforeEach }) => {
	beforeEach((context: Context) => {
		context.app = new Application();

		context.stateStore = {
			getTotalRound: () => 0,
		};

		context.configuration = {
			getMilestone: () => {
				return {
					roundValidators: 53,
				};
			},
		};

		context.app.bind(Identifiers.State.Store).toConstantValue(context.stateStore);
		context.app.bind(Identifiers.Cryptography.Configuration).toConstantValue(context.configuration);

		context.proposerCalculator = context.app.resolve(ProposerCalculator);
	});

	it("should return correct validator index", async ({ proposerCalculator }) => {
		assert.equal(await proposerCalculator.getValidatorIndex(0), 0);
		assert.equal(await proposerCalculator.getValidatorIndex(1), 1);
		assert.equal(await proposerCalculator.getValidatorIndex(2), 2);
		assert.equal(await proposerCalculator.getValidatorIndex(52), 52);

		assert.equal(await proposerCalculator.getValidatorIndex(53), 0);
		assert.equal(await proposerCalculator.getValidatorIndex(54), 1);
		assert.equal(await proposerCalculator.getValidatorIndex(55), 2);

		assert.equal(await proposerCalculator.getValidatorIndex(106), 0);
		assert.equal(await proposerCalculator.getValidatorIndex(107), 1);
		assert.equal(await proposerCalculator.getValidatorIndex(108), 2);
	});
});
