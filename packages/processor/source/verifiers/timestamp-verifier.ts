import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";
import dayjs from "dayjs";

@injectable()
export class TimestampVerifier implements Contracts.Processor.Handler {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.State.Store)
	private readonly store!: Contracts.State.Store;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.BlockchainUtils.TimestampCalculator)
	private readonly timestampCalculator!: Contracts.BlockchainUtils.TimestampCalculator;

	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		if (unit.getBlock().data.number === this.configuration.getGenesisHeight()) {
			return;
		}

		if (unit.getBlock().data.timestamp > dayjs().valueOf() + this.configuration.getMilestone().timeouts.tolerance) {
			throw new Exceptions.FutureBlock(unit.getBlock());
		}

		if (
			unit.getBlock().data.timestamp <
			this.timestampCalculator.calculateMinimalTimestamp(this.store.getLastBlock(), unit.getBlock().data.round)
		) {
			throw new Exceptions.InvalidTimestamp(unit.getBlock());
		}
	}
}
