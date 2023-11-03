import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class TimestampVerifier implements Contracts.BlockProcessor.Handler {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.StateService)
	private readonly stateService!: Contracts.State.Service;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	public async execute(unit: Contracts.BlockProcessor.IProcessableUnit): Promise<boolean> {
		if (unit.getBlock().data.height === 0) {
			return true;
		}

		const result =
			this.stateService.getStateStore().getLastBlock().data.timestamp <
			unit.getBlock().data.timestamp + this.configuration.getMilestone().blockTime;

		if (!result) {
			this.logger.error(
				`Block ${unit.getBlock().data.height.toLocaleString()} disregarded, because it's timestamp is too low`,
			);
		}

		return result;
	}
}
