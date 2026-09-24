import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { ExceededGasLimit } from "@mainsail/exceptions";

@injectable()
export class GasLimitVerifier implements Contracts.Processor.Handler {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const block = unit.getBlock();

		if (block.number === this.configuration.getGenesisHeight()) {
			return;
		}

		const maxGasLimit = this.configuration.getMilestone(block.number).block.maxGasLimit;

		if (block.gasUsed > maxGasLimit) {
			throw new ExceededGasLimit(block, maxGasLimit);
		}
	}
}
