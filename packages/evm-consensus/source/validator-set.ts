import { inject, injectable } from "@mainsail/container";
import { Contracts, Exceptions, Identifiers } from "@mainsail/contracts";

@injectable()
export class ValidatorSet implements Contracts.ValidatorSet.Service {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Evm.ContractService.Consensus)
	private readonly consensusContractService!: Contracts.Evm.ConsensusContractService;

	@inject(Identifiers.BlockchainUtils.RoundCalculator)
	private readonly roundCalculator!: Contracts.BlockchainUtils.RoundCalculator;

	#topValidators: Contracts.State.ValidatorWallet[] = [];
	#indexByAddress: Map<string, number> = new Map();

	#allValidators: Map<string, Contracts.State.ValidatorWallet> = new Map();
	#dirtyValidators: Contracts.State.ValidatorWallet[] = [];

	public async restore(): Promise<void> {
		await this.#buildActiveValidators();

		const validators = await this.consensusContractService.getAllValidators();
		this.#allValidators = new Map(validators.map((validator) => [validator.address, validator]));
	}

	public async onCommit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		if (this.roundCalculator.isNewRound(unit.height + 1)) {
			await this.#buildActiveValidators();
		}

		await this.#calculateChangedValidators();
	}

	public getAllValidators(): Contracts.State.ValidatorWallet[] {
		return [...this.#allValidators.values()];
	}

	public getDirtyValidators(): Contracts.State.ValidatorWallet[] {
		return this.#dirtyValidators;
	}

	public getActiveValidators(): Contracts.State.ValidatorWallet[] {
		const { activeValidators } = this.configuration.getMilestone();

		if (this.#topValidators.length !== activeValidators) {
			throw new Exceptions.NotEnoughActiveValidatorsError(this.#topValidators.length, activeValidators);
		}

		return this.#topValidators.slice(0, activeValidators);
	}

	public getValidator(index: number): Contracts.State.ValidatorWallet {
		return this.#topValidators[index];
	}

	public getValidatorIndexByWalletAddress(walletAddress: string): number {
		const result = this.#indexByAddress.get(walletAddress);

		if (result === undefined) {
			throw new Error(`Validator ${walletAddress} not found.`);
		}

		return result;
	}

	async #buildActiveValidators(): Promise<void> {
		const { activeValidators } = this.configuration.getMilestone();
		const validators = await this.consensusContractService.getActiveValidators();
		if (validators.length < activeValidators) {
			throw new Exceptions.NotEnoughActiveValidatorsError(this.#topValidators.length, activeValidators);
		}

		this.#topValidators = validators.slice(0, activeValidators);
		this.#indexByAddress = new Map(this.#topValidators.map((validator, index) => [validator.address, index]));
	}

	async #calculateChangedValidators(): Promise<void> {
		this.#dirtyValidators = [];

		const validators = await this.consensusContractService.getAllValidators();
		for (const validator of validators) {
			const currentValidator = this.#allValidators.get(validator.address);
			if (
				!currentValidator ||
				!currentValidator.voteBalance.isEqualTo(validator.voteBalance) ||
				currentValidator.isResigned !== validator.isResigned ||
				currentValidator.votersCount !== validator.votersCount ||
				currentValidator.blsPublicKey !== validator.blsPublicKey
			) {
				this.#dirtyValidators.push(validator);
			}
		}

		this.#allValidators = new Map(validators.map((validator) => [validator.address, validator]));
	}
}
