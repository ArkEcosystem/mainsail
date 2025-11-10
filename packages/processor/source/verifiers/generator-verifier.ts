import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
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
		if (unit.getBlock().data.number === this.configuration.getGenesisHeight()) {
			return;
		}

		const validatorIndex = this.proposerCalculator.getValidatorIndex(unit.getBlock().data.round);
		const validator = this.validatorSet.getValidator(validatorIndex);

		if (unit.getBlock().data.proposer !== validator.address) {
			throw new InvalidGenerator(unit.getBlock(), validator.address);
		}
	}
}
