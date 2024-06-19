import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";
import dayjs from "dayjs";

@injectable()
export class TimestampVerifier implements Contracts.Processor.Handler {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.State.Service)
	private readonly stateService!: Contracts.State.Service;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		if (unit.getBlock().data.height === 0) {
			return;
		}

		if (unit.getBlock().data.timestamp > dayjs().valueOf() + this.configuration.getMilestone().timeouts.tolerance) {
			throw new Exceptions.FutureBlock(unit.getBlock());
		}

		if (
			unit.getBlock().data.timestamp <
			Utils.timestampCalculator.calculateMinimalTimestamp(
				this.stateService.getStore().getLastBlock(),
				unit.getBlock().data.round,
				this.configuration,
			)
		) {
			throw new Exceptions.InvalidTimestamp(unit.getBlock());
		}
	}
}
