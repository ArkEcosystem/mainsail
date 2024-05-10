import { time } from "console";
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
					maxTxPerBlock: 100,
					validators: 53,
					vendorFieldLength: 255,
					address: {
						bech32m: "ark",
					},
				})
				.generate(),
			[
				{
					activeValidators: 0,
					address: {
						bech32m: "ark",
					},
					block: {
						maxPayload: 2000,
						maxTransactions: 100,
						version: 1,
					},
					timeouts: {
						blockPrepareTime: 4000,
						blockTime: 8000,
						stageTime: 2000,
						stageTimeIncrease: 2000,
					},
					epoch: date.toISOString().slice(0, 11) + "00:00:00.000Z",
					fees: {
						staticFees: {
							multiPayment: 10_000_000,
							multiSignature: 500_000_000,
							transfer: 10_000_000,
							usernameRegistration: 2_500_000_000,
							usernameResignation: 2_500_000_000,
							validatorRegistration: 2_500_000_000,
							validatorResignation: 2_500_000_000,
							vote: 100_000_000,
						},
					},
					height: 0,
					multiPaymentLimit: 256,
					reward: "0",
					satoshi: {
						decimals: 8,
						denomination: 1e8,
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
