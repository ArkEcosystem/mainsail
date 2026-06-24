import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { InvalidReward } from "@mainsail/exceptions";

@injectable()
export class RewardVerifier implements Contracts.Processor.Handler {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const reward = this.configuration.getMilestone().reward;

		if (unit.getBlock().reward !== BigInt(reward)) {
			throw new InvalidReward(unit.getBlock(), reward);
		}
	}
}
