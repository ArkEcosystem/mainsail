import { injectable } from "@mainsail/container";
import { Contracts } from "@mainsail/contracts";

@injectable()
export class MilestonesGenerator {
	#data: Contracts.Crypto.MilestonePartial[] = [];

	setInitial(options: Contracts.NetworkGenerator.MilestoneOptions): MilestonesGenerator {
		this.#data = [
			{
				activeValidators: 0,
				address: options.address,
				block: {
					maxPayload: options.maxBlockPayload,
					maxTransactions: options.maxTxPerBlock,
					version: 1,
				},
				blockTime: options.blockTime,
				epoch: options.epoch.toISOString().slice(0, 11) + "00:00:00.000Z",
				height: 0,
				multiPaymentLimit: 256,
				reward: "0",
				satoshi: {
					decimals: 8,
					denomination: 1e8,
				},
				stageTimeout: 2000,
				stageTimeoutIncrease: 2000,
				vendorFieldLength: options.vendorFieldLength,
			}, {
				activeValidators: options.validators,
				height: 1,
			}
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
