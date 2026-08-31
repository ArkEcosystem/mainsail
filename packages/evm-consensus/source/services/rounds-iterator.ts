import type { Contracts } from "@mainsail/contracts";

import { Identifiers } from "@mainsail/constants";
import { inject, injectable } from "@mainsail/container";

import { ConsensusContractCaller } from "./consensus-contract-caller.js";

const ROUNDS_PER_REQUEST = 2500;

interface ConsensusContractValidatorRound {
	readonly round: bigint;
	readonly validators: {
		readonly addr: string;
		readonly voteBalance: bigint;
	}[];
}

@injectable()
export class AsyncValidatorRoundsIterator implements AsyncIterable<Contracts.Evm.ValidatorRound> {
	@inject(Identifiers.BlockchainUtils.RoundCalculator)
	private readonly roundCalculator!: Contracts.BlockchainUtils.RoundCalculator;

	@inject(Identifiers.EvmConsensus.ConsensusContractCaller)
	private readonly contractCaller!: ConsensusContractCaller;

	#rounds: Contracts.Evm.ValidatorRound[] = [];
	#index = 0; // Index of returned round in chunk
	#offset = 0; // Offset for querying rounds

	[Symbol.asyncIterator](): AsyncIterator<Contracts.Evm.ValidatorRound> {
		return this;
	}

	async next(): Promise<IteratorResult<Contracts.Evm.ValidatorRound>> {
		if (this.#rounds.length === this.#index) {
			this.#rounds = await this.getRounds();

			if (this.#rounds.length === 0) {
				return { done: true, value: undefined };
			}

			this.#index = 0;
			this.#offset += this.#rounds.length;
		}

		return { done: false, value: this.#rounds[this.#index++] };
	}

	private async getRounds(): Promise<Contracts.Evm.ValidatorRound[]> {
		const rounds = await this.contractCaller.view<ConsensusContractValidatorRound[]>("getRounds", [
			this.#offset,
			ROUNDS_PER_REQUEST,
		]);

		const validatorRounds: Contracts.Evm.ValidatorRound[] = [];
		for (const validatorRound of rounds) {
			const { round, validators } = validatorRound;

			const roundNumber = Number(round);

			validatorRounds.push({
				round: roundNumber,
				roundHeight: this.roundCalculator.calculateRoundInfoByRound(roundNumber).roundHeight,
				validators: validators.map((validator) => {
					const { addr: address, voteBalance } = validator;

					return {
						address,
						voteBalance: voteBalance,
					};
				}),
			});
		}

		return validatorRounds;
	}
}
