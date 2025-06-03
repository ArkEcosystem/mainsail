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
		await this.#buildRoundValidators();

		const validators = await this.consensusContractService.getAllValidators();
		this.#allValidators = new Map(validators.map((validator) => [validator.address, validator]));
	}

	public async onCommit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		if (this.roundCalculator.isNewRound(unit.blockNumber + 1)) {
			await this.#buildRoundValidators();
		}

		await this.#calculateChangedValidators();
	}

	public getAllValidators(): Contracts.State.ValidatorWallet[] {
		return [...this.#allValidators.values()];
	}

	public getDirtyValidators(): Contracts.State.ValidatorWallet[] {
		return this.#dirtyValidators;
	}

	public getRoundValidators(): Contracts.State.ValidatorWallet[] {
		const { roundValidators } = this.configuration.getMilestone();

		if (this.#topValidators.length !== roundValidators) {
			throw new Exceptions.NotEnoughRoundValidatorsError(this.#topValidators.length, roundValidators);
		}

		return this.#topValidators.slice(0, roundValidators);
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

	async #buildRoundValidators(): Promise<void> {
		const { roundValidators } = this.configuration.getMilestone();
		const validators = await this.consensusContractService.getRoundValidators();
		if (validators.length < roundValidators) {
			throw new Exceptions.NotEnoughRoundValidatorsError(this.#topValidators.length, roundValidators);
		}

		this.#topValidators = validators.slice(0, roundValidators);
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
