import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

import { ConsensusContractCaller } from "./consensus-contract-caller.js";
import { ConsensusContractValidator, toValidatorWallet } from "./validator-wallet.js";

const VALIDATORS_PER_REQUEST = 1000;

@injectable()
export class AsyncValidatorsIterator implements AsyncIterable<Contracts.State.ValidatorWallet> {
	@inject(Identifiers.EvmConsensus.ConsensusContractCaller)
	private readonly contractCaller!: ConsensusContractCaller;

	#validators: Contracts.State.ValidatorWallet[] = [];
	#index = 0;
	#offset = 0;

	[Symbol.asyncIterator](): AsyncIterator<Contracts.State.ValidatorWallet> {
		return this;
	}

	async next(): Promise<IteratorResult<Contracts.State.ValidatorWallet>> {
		if (this.#validators.length === this.#index) {
			this.#validators = await this.getValidators();

			if (this.#validators.length === 0) {
				return { done: true, value: undefined };
			}

			this.#index = 0;
			this.#offset += this.#validators.length;
		}

		return { done: false, value: this.#validators[this.#index++] };
	}

	private async getValidators(): Promise<Contracts.State.ValidatorWallet[]> {
		const validators = await this.contractCaller.view<ConsensusContractValidator[]>("getValidators", [
			this.#offset,
			VALIDATORS_PER_REQUEST,
		]);

		return validators.map((validator) => toValidatorWallet(validator));
	}
}
