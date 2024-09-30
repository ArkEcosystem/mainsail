import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class MilestonesGenerator {
	#data: Contracts.Crypto.MilestonePartial[] = [];

	setInitial(options: Contracts.NetworkGenerator.MilestoneOptions): MilestonesGenerator {
		this.#data = [
			{
				activeValidators: 0,
				block: {
					maxGasLimit: options.maxBlockGasLimit,
					maxPayload: options.maxBlockPayload,
					maxTransactions: options.maxTxPerBlock,
					version: 1,
				},
				epoch: options.epoch.toISOString().slice(0, 11) + "00:00:00.000Z",
				evmSpec: Contracts.Evm.SpecId.SHANGHAI,
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
				gas: {
					maximumGasLimit: 2_000_000,
					minimumGasFee: 5,
					minimumGasLimit: 21_000,
					nativeFeeMultiplier: 100,
				},
				height: 0,
				reward: "0",
				satoshi: {
					decimals: 18,
					denomination: 1e18,
				},
				timeouts: {
					blockPrepareTime: options.blockTime / 2,
					blockTime: options.blockTime,
					stageTimeout: 2000,
					stageTimeoutIncrease: 2000,
					tolerance: 100,
				},
				vendorFieldLength: options.vendorFieldLength,
			},
			{
				activeValidators: options.validators,
				height: 1,
			},
		];

		return this;
	}

	setReward(height: number, reward: string): MilestonesGenerator {
		this.#data.push({
			height,
			reward,
		});

		return this;
	}

	generate(): Contracts.Crypto.MilestonePartial[] {
		return this.#data;
	}
}
