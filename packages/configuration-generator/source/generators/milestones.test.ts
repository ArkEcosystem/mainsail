import { Contracts } from "@mainsail/contracts";

import { describe } from "../../../test-framework/source";
import { MilestonesGenerator } from "./milestones";

describe<{
	dataPath: string;
	generator: MilestonesGenerator;
}>("MilestonesGenerator", ({ it, assert, beforeEach }) => {
	beforeEach((context) => {
		context.generator = new MilestonesGenerator();
	});

	it("#generate - should return empty data", ({ generator }) => {
		assert.equal(generator.generate(), []);
	});

	it("#setInitial - should set initial milestone", ({ generator }) => {
		const date = new Date();

		assert.equal(
			generator
				.setInitial({
					blockTime: 8000,
					epoch: date,
					initialBlockNumber: 0,
					maxBlockGasLimit: 1000,
					maxBlockPayload: 2000,
					maxTxPerBlock: 100,
					validators: 53,
					validatorRegistrationFee: "250",
				})
				.generate(),
			[
				{
					roundValidators: 0,
					block: {
						maxGasLimit: 1000,
						maxPayload: 2000,
						maxTransactions: 100,
						version: 1,
					},
					epoch: date.toISOString().slice(0, 11) + "00:00:00.000Z",
					evmSpec: Contracts.Evm.SpecId.SHANGHAI,
					gas: {
						maximumGasLimit: 5_000_000,
						maximumGasPrice: 10_000 * 1e9,
						minimumGasLimit: 21_000,
						minimumGasPrice: 5 * 1e9,
					},
					height: 0,
					reward: "0",
					satoshi: {
						decimals: 18,
						denomination: 1e18,
					},
					timeouts: {
						blockPrepareTime: 4000,
						blockTime: 8000,
						stageTimeout: 2000,
						stageTimeoutIncrease: 2000,
						tolerance: 100,
					},
					validatorRegistrationFee: "250",
				},
				{
					roundValidators: 53,
					height: 1,
				},
			],
		);
	});

	it("#setReward - should set reward", ({ generator }) => {
		assert.equal(generator.setReward(3, "200").generate(), [
			{
				height: 3,
				reward: "200",
			},
		]);
	});
});
