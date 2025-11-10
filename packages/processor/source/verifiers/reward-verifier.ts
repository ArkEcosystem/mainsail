import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { InvalidReward } from "@mainsail/exceptions";

@injectable()
export class RewardVerifier implements Contracts.Processor.Handler {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const reward = this.configuration.getMilestone().reward;

		if (!unit.getBlock().data.reward.isEqualTo(reward)) {
			throw new InvalidReward(unit.getBlock(), reward);
		}
	}
}
