import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";
import { NotEnoughRoundValidatorsError } from "@mainsail/exceptions";

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

	public async restore(): Promise<void> {
		await this.#buildRoundValidators();
	}

	public async onCommit(unit: Contracts.Processor.ProcessableUnit): Promise<void> {
		if (this.roundCalculator.isNewRound(unit.blockNumber + 1)) {
			await this.#buildRoundValidators();
		}
	}

	public getRoundValidators(): Contracts.State.ValidatorWallet[] {
		const { roundValidators } = this.configuration.getMilestone();

		if (this.#topValidators.length !== roundValidators) {
			throw new NotEnoughRoundValidatorsError(this.#topValidators.length, roundValidators);
		}

		return this.#topValidators.slice(0, roundValidators);
	}

	public getValidator(index: number): Contracts.State.ValidatorWallet {
		const validator = this.#topValidators[index];

		if (validator === undefined) {
			throw new Error(`Validator at index ${index} not found.`);
		}

		return validator;
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
			throw new NotEnoughRoundValidatorsError(validators.length, roundValidators);
		}

		this.#topValidators = validators.slice(0, roundValidators);
		this.#indexByAddress = new Map(this.#topValidators.map((validator, index) => [validator.address, index]));
	}
}
