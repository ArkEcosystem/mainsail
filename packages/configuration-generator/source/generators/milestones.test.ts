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
					maxBlockPayload: 2000,
					maxBlockGasLimit: 1000,
					maxTxPerBlock: 100,
					validators: 53,
					vendorFieldLength: 255,
				})
				.generate(),
			[
				{
					activeValidators: 0,
					block: {
						maxPayload: 2000,
						maxGasLimit: 1000,
						maxTransactions: 100,
						version: 1,
					},
					timeouts: {
						tolerance: 100,
						blockPrepareTime: 4000,
						blockTime: 8000,
						stageTimeout: 2000,
						stageTimeoutIncrease: 2000,
					},
					epoch: date.toISOString().slice(0, 11) + "00:00:00.000Z",
					evmSpec: Contracts.Evm.SpecId.SHANGHAI,
					gas: {
						minimumGasFee: 5,
						minimumGasLimit: 21_000,
						maximumGasLimit: 2_000_000,
						nativeFeeMultiplier: 100,
					},
					height: 0,
					reward: "0",
					satoshi: {
						decimals: 18,
						denomination: 1e18,
					},
					vendorFieldLength: 255,
				},
				{
					activeValidators: 53,
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
