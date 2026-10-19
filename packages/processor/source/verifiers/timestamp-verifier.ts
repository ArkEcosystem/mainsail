import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { InvalidTimestamp } from "@mainsail/exceptions";

@injectable()
export class TimestampVerifier implements Contracts.Processor.Handler {
	@inject(Identifiers.State.Store)
	private readonly store!: Contracts.State.Store;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.BlockchainUtils.TimestampCalculator)
	private readonly timestampCalculator!: Contracts.BlockchainUtils.TimestampCalculator;

	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const block = unit.getBlock();

		if (block.number === this.configuration.getGenesisHeight()) {
			return;
		}

		if (
			block.timestamp < this.timestampCalculator.calculateMinimalTimestamp(this.store.getLastBlock(), block.round)
		) {
			throw new InvalidTimestamp(block);
		}
	}
}
