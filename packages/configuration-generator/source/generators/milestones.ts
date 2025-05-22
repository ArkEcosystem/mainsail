import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class MilestonesGenerator {
	#data: Contracts.Crypto.MilestonePartial[] = [];

	setInitial(options: Contracts.NetworkGenerator.InternalOptions): MilestonesGenerator {
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
				gas: {
					maximumGasLimit: 2_000_000,
					maximumGasPrice: 10_000 * 1e9,
					minimumGasLimit: 21_000,
					minimumGasPrice: 5 * 1e9,
				},
				height: options.initialBlockNumber,
				reward: "0",
				satoshi: {
					decimals: 18,
					denomination: 1e18,
				},
				timeouts: options.timeouts ?? {
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
				height: options.initialBlockNumber + 1,
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
