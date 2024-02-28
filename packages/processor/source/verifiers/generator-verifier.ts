import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

@injectable()
export class GeneratorVerifier implements Contracts.Processor.Handler {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Proposer.Selector)
	private readonly proposerSelector!: Contracts.Proposer.Selector;

	@inject(Identifiers.ValidatorSet.Service)
	private readonly validatorSet!: Contracts.ValidatorSet.Service;

	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		if (unit.getBlock().data.height === 0) {
			return;
		}

		const validatorIndex = this.proposerSelector.getValidatorIndex(unit.getBlock().data.round);
		const validator = this.validatorSet.getValidator(validatorIndex);

		if (unit.getBlock().data.generatorPublicKey !== validator.getWalletPublicKey()) {
			throw new Exceptions.InvalidGenerator(unit.getBlock(), validator.getWalletPublicKey());
		}
	}
}
