import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

@injectable()
export class GeneratorVerifier implements Contracts.Processor.Handler {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.BlockchainUtils.ProposerCalculator)
	private readonly proposerCalculator!: Contracts.BlockchainUtils.ProposerCalculator;

	@inject(Identifiers.ValidatorSet.Service)
	private readonly validatorSet!: Contracts.ValidatorSet.Service;

	@inject(Identifiers.State.Store)
	private readonly store!: Contracts.State.Store;

	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		if (unit.getBlock().data.height === this.store.getGenesisHeight()) {
			return;
		}

		const validatorIndex = this.proposerCalculator.getValidatorIndex(unit.getBlock().data.round);
		const validator = this.validatorSet.getValidator(validatorIndex);

		if (unit.getBlock().data.generatorAddress !== validator.address) {
			throw new Exceptions.InvalidGenerator(unit.getBlock(), validator.address);
		}
	}
}
