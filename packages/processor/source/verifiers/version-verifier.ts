import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { InvalidBlockVersion } from "@mainsail/exceptions";

@injectable()
export class VersionVerifier implements Contracts.Processor.Handler {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const block = unit.getBlock();
		const version = this.configuration.getMilestone().block.version;

		if (block.version !== version) {
			throw new InvalidBlockVersion(block);
		}
	}
}
