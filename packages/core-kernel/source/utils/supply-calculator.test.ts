import { Interfaces, Managers, Utils } from "@arkecosystem/crypto";

import { describe } from "../../../core-test-framework";
import { calculate } from "./supply-calculator";

const toString = (value) => Utils.BigNumber.make(value).toFixed();

describe<{
	config: Interfaces.NetworkConfig;
	mockConfig: any;
}>("Supply calculator", ({ afterEach, beforeEach, assert, each, it }) => {
	beforeEach((context) => {
		context.config = Managers.configManager.all();

		context.mockConfig = {
			genesisBlock: { totalAmount: 1000 },
			milestones: [{ height: 1, reward: 2 }],
		};

		Managers.configManager.set("genesisBlock", context.mockConfig.genesisBlock);
		Managers.configManager.set("milestones", context.mockConfig.milestones);
	});
	afterEach((context) => {
		Managers.configManager.setConfig(context.config);
	});

	it("should calculate supply with milestone at height 2", (context) => {
		context.mockConfig.milestones[0].height = 2;

		assert.is(calculate(1), toString(context.mockConfig.genesisBlock.totalAmount));
	});

	each(
		"at height %s should calculate the genesis supply without milestone",
		({ context, dataset }) => {
			const genesisSupply = context.mockConfig.genesisBlock.totalAmount;
			assert.is(calculate(dataset), toString(genesisSupply + dataset * context.mockConfig.milestones[0].reward));
		},
		[0, 5, 100, 2000, 4000, 8000],
	);

	each(
		"at height %s should calculate the genesis supply with one milestone",
		({ context, dataset }) => {
			context.mockConfig.milestones.push({ height: 8000, reward: 3 });

			const reward = (current) => {
				if (current < 8000) {
					return current * 2;
				}

				return 7999 * 2 + (current - 7999) * 3;
			};

			const genesisSupply = context.mockConfig.genesisBlock.totalAmount;

			assert.is(calculate(dataset), toString(genesisSupply + reward(dataset)));
		},
		[0, 2000, 4000, 8000, 16_000],
	);

	each(
		"at height %s should calculate the genesis supply with four milestones",
		({ context, dataset }) => {
			context.mockConfig.milestones.push(
				{ height: 8000, reward: 4 },
				{ height: 16_000, reward: 5 },
				{ height: 32_000, reward: 10 },
				{ height: 64_000, reward: 15 },
			);

			const reward = (current) => {
				if (current < 8000) {
					return current * 2;
				}

				if (current < 16_000) {
					return reward(7999) + (current - 7999) * 4;
				}

				if (current < 32_000) {
					return reward(15_999) + (current - 15_999) * 5;
				}

				if (current < 64_000) {
					return reward(31_999) + (current - 31_999) * 10;
				}

				return reward(63_999) + (current - 63_999) * 15;
			};

			const genesisSupply = context.mockConfig.genesisBlock.totalAmount;

			assert.is(calculate(dataset), toString(genesisSupply + reward(dataset)));
		},
		[0, 4000, 8000, 12_000, 16_000, 20_000, 32_000, 48_000, 64_000, 128_000],
	);
});
