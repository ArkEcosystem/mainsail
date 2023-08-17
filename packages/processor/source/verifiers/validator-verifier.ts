import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class ValidatorVerifier implements Contracts.BlockProcessor.Handler {
	@inject(Identifiers.Application)
	protected readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.ValidatorSet)
	private readonly validatorSet!: Contracts.ValidatorSet.IValidatorSet;

	@inject(Identifiers.WalletRepository)
	@tagged("state", "blockchain")
	private readonly walletRepository!: Contracts.State.WalletRepository;

	@inject(Identifiers.Consensus.ProposerPicker)
	private readonly proposerPicker!: Contracts.Consensus.IProposerPicker;

	@inject(Identifiers.LogService)
	private readonly logger!: Contracts.Kernel.Logger;

	public async execute(roundState: Contracts.BlockProcessor.IProcessableUnit): Promise<boolean> {
		const block = roundState.getBlock();
		const { round } = roundState;

		// Get expected validator for current round
		const expectedValidatorIndex = this.proposerPicker.getValidatorIndex(round);
		const expectedValidator = this.validatorSet.getActiveValidators()[expectedValidatorIndex];
		const expectedValidatorPublicKey = expectedValidator.getWalletPublicKey();
		Utils.assert.defined<string>(expectedValidatorPublicKey);

		const receivedValidator = await this.walletRepository.findByPublicKey(block.data.generatorPublicKey);
		if (!receivedValidator.isValidator()) {
			const expectedValidatorName: string = expectedValidator.getUsername();

			this.logger.debug(
				`Received block is from a non-validator (${block.data.generatorPublicKey}), but expected block from ${expectedValidatorName} (${expectedValidatorPublicKey})`,
			);

			return false;
		}

		// Match expected and received validator keys
		const receivedValidatorName = receivedValidator.getAttribute("validator.username");
		if (expectedValidatorPublicKey !== block.data.generatorPublicKey) {
			const expectedValidatorName: string = expectedValidator.getUsername();

			this.logger.warning(
				`Validator ${receivedValidatorName} (${block.data.generatorPublicKey}) not allowed to forge, should be ${expectedValidatorName} (${expectedValidatorPublicKey})`,
			);

			return false;
		}

		this.logger.debug(
			`Validator ${receivedValidatorName} (${
				block.data.generatorPublicKey
			}) allowed to forge block ${block.data.height.toLocaleString()}`,
		);

		return true;
	}
}
