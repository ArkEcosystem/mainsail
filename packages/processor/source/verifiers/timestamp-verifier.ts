import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class TimestampVerifier implements Contracts.Processor.Handler {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.StateService)
	private readonly stateService!: Contracts.State.Service;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Kernel.Log.Service)
	private readonly logger!: Contracts.Kernel.Logger;

	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<boolean> {
		if (unit.getBlock().data.height === 0) {
			return true;
		}

		if (
			unit.getBlock().data.timestamp <
			Utils.timestampCalculator.calculateMinimalTimestamp(
				this.stateService.getStateStore().getLastBlock(),
				unit.getBlock().data.round,
				this.configuration,
			)
		) {
			this.logger.error(
				`Block ${unit.getBlock().data.height.toLocaleString()} disregarded, because it's timestamp is too low`,
			);

			return false;
		}

		return true;
	}
}
