import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

@injectable()
export class RewardVerifier implements Contracts.Processor.Handler {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const reward = this.configuration.getMilestone().reward;

		if (!unit.getBlock().data.reward.isEqualTo(reward)) {
			throw new Exceptions.InvalidReward(unit.getBlock(), reward);
		}
	}
}
