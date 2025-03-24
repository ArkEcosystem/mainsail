import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

@injectable()
export class GasLimitVerifier implements Contracts.Processor.Handler {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		if (unit.getBlock().data.number === this.configuration.getGenesisHeight()) {
			return;
		}

		const maxGasLimit = this.configuration.getMilestone().block.maxGasLimit;

		if (unit.getBlock().data.gasUsed > maxGasLimit) {
			throw new Exceptions.ExceededGasLimit(unit.getBlock(), maxGasLimit);
		}
	}
}
