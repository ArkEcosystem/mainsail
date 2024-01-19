import { Identifiers } from "@mainsail/contracts";

import crypto from "../../../core/bin/config/testnet/mainsail/crypto.json";
import { Configuration } from "../../../crypto-config";
import { describe, Sandbox } from "../../../test-framework";
import { calculateSupply } from "./supply-calculator";
import { BigNumber } from "@mainsail/utils";

type Context = {
	configuration: Configuration;
};

const setup = (context: Context) => {
	const sandbox = new Sandbox();

	sandbox.app.bind(Identifiers.Cryptography.Configuration).to(Configuration).inSingletonScope();

	context.configuration = sandbox.app.get<Configuration>(Identifiers.Cryptography.Configuration);

	const cloned = JSON.parse(JSON.stringify(crypto));
	cloned.milestones = cloned.milestones.filter(m => m.height !== 75600);
	cloned.milestones[0].reward = blockReward(2).toFixed();

	context.configuration.setConfig(cloned);
};

const blockReward = (n: number) => BigNumber.SATOSHI.times(n);
const initialSupply = BigNumber.make(crypto.genesisBlock.block.totalAmount);

describe<Context>("Supply Calculator - calculateSupply", ({ assert, beforeEach, it, each }) => {
	beforeEach(setup);

	it("should calculate initial supply at height 0", ({ configuration }) => {
		const supply = calculateSupply(0, configuration);
		assert.equal(supply, initialSupply);
	});

	it("should calculate supply with milestone at height 2", ({ configuration }) => {
		const height = 2;

		const supply = calculateSupply(height, configuration);
		assert.equal(supply, initialSupply.plus(blockReward(2).times(height)));
	});

	each(
		"should calculate the genesis supply without milestone at height: ",
		({ dataset, context }) => {
			const supply = calculateSupply(dataset, context.configuration);
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

			const supply = calculateSupply(dataset, context.configuration);
			assert.equal(supply, initialSupply.plus(reward(dataset)));
		},
		[0, 5, 100, 2000, 4000, 8000, 16000],
	);

	each(
		"should calculate the genesis supply with four milestones at height: ",
		({ dataset, context }) => {
			context.configuration.getMilestones()[1].height = 8000;
			context.configuration.getMilestones()[1].reward = blockReward(4).toFixed();
			context.configuration.getMilestones().push({ height: 16000, reward: blockReward(5).toFixed() });
			context.configuration.getMilestones().push({ height: 32000, reward: blockReward(10).toFixed() });
			context.configuration.getMilestones().push({ height: 64000, reward: blockReward(15).toFixed() });

			const reward = (current) => {
				if (current < 8000) {
					return blockReward(2).times(current);
				}

				if (current < 16000) {
					return reward(7999).plus(blockReward(4).times(current - 7999));
				}

				if (current < 32000) {
					return reward(15999).plus(blockReward(5).times(current - 15999));
				}

				if (current < 64000) {
					return reward(31999).plus(blockReward(10).times(current - 31999));
				}

				return reward(63999).plus(blockReward(15).times(current - 63999));
			};

			const supply = calculateSupply(dataset, context.configuration);
			assert.equal(supply, initialSupply.plus(reward(dataset)));
		},
		[0, 4000, 8000, 12000, 16000, 20000, 32000, 48000, 64000, 128000],
	);
});
