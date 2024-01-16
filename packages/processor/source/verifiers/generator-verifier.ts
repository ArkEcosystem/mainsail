import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";

@injectable()
export class GeneratorVerifier implements Contracts.Processor.Handler {
	@inject(Identifiers.Application.Instance)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Proposer.Selector)
	private readonly proposerSelector!: Contracts.Proposer.Selector;

	@inject(Identifiers.ValidatorSet.Service)
	private readonly validatorSet!: Contracts.ValidatorSet.Service;

	public async execute(unit: Contracts.Processor.ProcessableUnit): Promise<boolean> {
		if (unit.getBlock().data.height === 0) {
			return true;
		}

		const validatorIndex = this.proposerSelector.getValidatorIndex(unit.getBlock().data.round);
		const validator = this.validatorSet.getValidator(validatorIndex);

		return unit.getBlock().data.generatorPublicKey === validator.getWalletPublicKey();
	}
}
