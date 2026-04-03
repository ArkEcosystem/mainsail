import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { InvalidGenerator } from "@mainsail/exceptions";

@injectable()
export class GeneratorVerifier implements Contracts.Processor.Handler {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.BlockchainUtils.ProposerCalculator)
	private readonly proposerCalculator!: Contracts.BlockchainUtils.ProposerCalculator;

	@inject(Identifiers.ValidatorSet.Service)
	private readonly validatorSet!: Contracts.ValidatorSet.Service;

	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		if (unit.getBlock().number === this.configuration.getGenesisHeight()) {
			return;
		}

		const validatorIndex = this.proposerCalculator.getValidatorIndex(unit.getBlock().round);
		const validator = this.validatorSet.getValidator(validatorIndex);

		if (unit.getBlock().proposer !== validator.address) {
			throw new InvalidGenerator(unit.getBlock(), validator.address);
		}
	}
}
