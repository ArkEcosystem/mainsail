import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import * as Exceptions from "@mainsail/exceptions";

@injectable()
export class VersionVerifier implements Contracts.Processor.Handler {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		const version = this.configuration.getMilestone().block.version;

		if (unit.getBlock().data.version !== version) {
			throw new Exceptions.InvalidBlockVersion(unit.getBlock());
		}
	}
}
