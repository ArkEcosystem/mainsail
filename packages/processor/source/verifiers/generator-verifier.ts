import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class GeneratorVerifier implements Contracts.Processor.Handler {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Proposer.Selector)
	private readonly proposerSelector!: Contracts.Proposer.ProposerSelector;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.ValidatorSet;

	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<boolean> {
		if (unit.getBlock().data.height === 0) {
			return true;
		}

		const validatorIndex = this.proposerSelector.getValidatorIndex(unit.getBlock().data.round);
		const validator = this.validatorSet.getValidator(validatorIndex);

		return unit.getBlock().data.generatorPublicKey === validator.getWalletPublicKey();
	}
}