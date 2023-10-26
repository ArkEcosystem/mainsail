import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { Utils } from "@mainsail/kernel";

@injectable()
export class ValidatorSet implements Contracts.ValidatorSet.IValidatorSet {
	// TODO: Check which wallet repository is used here
	@inject(Identifiers.StateService)
	private readonly stateService!: Contracts.State.Service;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly cryptoConfiguration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.ValidatorWalletFactory)
	private readonly validatorWalletFactory!: Contracts.State.ValidatorWalletFactory;

	#validators: Contracts.State.IValidatorWallet[] = [];
	#indexByWalletPublicKey: Map<string, number> = new Map();

	public async initialize(): Promise<void> {
		this.#buildActiveValidators(0);
	}

	public async onCommit(unit: Contracts.BlockProcessor.IProcessableUnit): Promise<void> {
		const committedBlock = await unit.getCommittedBlock();
		const { height } = committedBlock.block.header;
		if (Utils.roundCalculator.isNewRound(height + 1, this.cryptoConfiguration)) {
			this.#buildActiveValidators(height + 1);
		}
	}

	public getActiveValidators(height: number): Contracts.State.IValidatorWallet[] {
		if (this.#validators.length === 0) {
			this.#buildActiveValidators(height);
		}

		return this.#validators;
	}

	public getValidator(index: number): Contracts.State.IValidatorWallet {
		return this.#validators[index];
	}

	public getValidatorIndexByWalletPublicKey(walletPublicKey: string): number {
		const result = this.#indexByWalletPublicKey.get(walletPublicKey);

		if (result === undefined) {
			throw new Error(`Validator ${walletPublicKey} not found.`);
		}

		return result;
	}

	#buildActiveValidators(height: number): void {
		this.#validators = [];
		this.#indexByWalletPublicKey = new Map();

		const { activeValidators } = this.cryptoConfiguration.getMilestone(height);

		for (let index = 0; index < activeValidators; index++) {
			const validator = this.validatorWalletFactory(
				this.stateService.getWalletRepository().findByUsername(`genesis_${index + 1}`),
			);

			validator.setRank(index + 1);

			// All static validators have equal approval
			validator.setApproval(100 / activeValidators);

			this.#validators.push(validator);

			const walletPublicKey = validator.getWalletPublicKey();
			Utils.assert.defined<string>(walletPublicKey);
			this.#indexByWalletPublicKey.set(walletPublicKey, index);
		}
	}
}
