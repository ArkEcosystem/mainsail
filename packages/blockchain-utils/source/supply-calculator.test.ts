import { Identifiers } from "@mainsail/contracts";
import { BigNumber } from "@mainsail/utils";

import crypto from "../../core/bin/config/testnet/core/crypto.json";
import { Configuration } from "../../crypto-config/distribution/index";
import { describe, Sandbox } from "../../test-framework/source";
import { SupplyCalculator } from "./supply-calculator";

type Context = {
	configuration: Configuration;
	supplyCalculator: SupplyCalculator;
};

const setup = (context: Context) => {
	const sandbox = new Sandbox();

	sandbox.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();

	context.configuration = sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration);

	const cloned = JSON.parse(JSON.stringify(crypto));
	cloned.milestones = cloned.milestones.filter((m) => m.height !== 75_600);
	cloned.milestones[0].reward = blockReward(2).toFixed();

	context.configuration.setConfig(cloned);

	context.supplyCalculator = sandbox.app.resolve(SupplyCalculator);
};

const blockReward = (n: number) => BigNumber.WEI.times(n);
const initialSupply = BigNumber.make(crypto.genesisBlock.block.totalAmount);

describe<Context>("Supply Calculator - calculateSupply", ({ assert, beforeEach, it, each }) => {
	beforeEach(setup);

	it("should calculate initial supply at height 0", ({ supplyCalculator }) => {
		const supply = supplyCalculator.calculateSupply(0);
		assert.equal(supply, initialSupply);
	});

	it("should calculate supply with milestone at height 2", ({ supplyCalculator }) => {
		const height = 2;

		const supply = supplyCalculator.calculateSupply(height);
		assert.equal(supply, initialSupply.plus(blockReward(2).times(height)));
	});

	each(
		"should calculate the genesis supply without milestone at height: ",
		({ dataset, context }) => {
			const supply = context.supplyCalculator.calculateSupply(dataset);
			assert.equal(supply, initialSupply.plus(blockReward(2).times(dataset)));
		},
		[0, 5, 100, 2000, 4000, 8000],
	);

	each(
		"should calculate the genesis supply with one milestone at height: ",
		({ dataset, context }) => {
			context.configuration.getMilestones()[1].height = 8000;
			context.configuration.getMilestones()[1].reward = blockReward(3).toFixed();

			const reward = (current) => {
				if (current < 8000) {
					return blockReward(2).times(current);
				}

				return blockReward(2)
					.times(7999)
					.plus(blockReward(3).times(current - 7999));
			};

			const supply = context.supplyCalculator.calculateSupply(dataset);
			assert.equal(supply, initialSupply.plus(reward(dataset)));
		},
		[0, 5, 100, 2000, 4000, 8000, 16_000],
	);

	each(
		"should calculate the genesis supply with four milestones at height: ",
		({ dataset, context }) => {
			context.configuration.getMilestones()[1].height = 8000;
			context.configuration.getMilestones()[1].reward = blockReward(4).toFixed();
			context.configuration.getMilestones().push({ height: 16_000, reward: blockReward(5).toFixed() });
			context.configuration.getMilestones().push({ height: 32_000, reward: blockReward(10).toFixed() });
			context.configuration.getMilestones().push({ height: 64_000, reward: blockReward(15).toFixed() });

			const reward = (current) => {
				if (current < 8000) {
					return blockReward(2).times(current);
				}

				if (current < 16_000) {
					return reward(7999).plus(blockReward(4).times(current - 7999));
				}

				if (current < 32_000) {
					return reward(15_999).plus(blockReward(5).times(current - 15_999));
				}

				if (current < 64_000) {
					return reward(31_999).plus(blockReward(10).times(current - 31_999));
				}

				return reward(63_999).plus(blockReward(15).times(current - 63_999));
			};

			const supply = context.supplyCalculator.calculateSupply(dataset);
			assert.equal(supply, initialSupply.plus(reward(dataset)));
		},
		[0, 4000, 8000, 12_000, 16_000, 20_000, 32_000, 48_000, 64_000, 128_000],
	);
});
