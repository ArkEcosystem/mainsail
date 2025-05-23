import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { ConsensusAbi } from "@mainsail/evm-contracts";
import { BigNumber } from "@mainsail/utils";
import { ethers } from "ethers";

import { Identifiers as EvmConsensusIdentifiers } from "../identifiers.js";

const ROUNDS_PER_REQUEST = 1000;

@injectable()
export class AsyncValidatorRoundsIterator implements AsyncIterable<Contracts.Evm.ValidatorRound> {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.BlockchainUtils.RoundCalculator)
	private readonly roundCalculator!: Contracts.BlockchainUtils.RoundCalculator;

	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

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
		const consensusContractAddress = this.app.get<string>(EvmConsensusIdentifiers.Contracts.Addresses.Consensus);
		const deployerAddress = this.app.get<string>(EvmConsensusIdentifiers.Internal.Addresses.Deployer);
		const { evmSpec } = this.configuration.getMilestone();

		const iface = new ethers.Interface(ConsensusAbi.abi);
		const data = iface.encodeFunctionData("getRounds", [this.#offset, ROUNDS_PER_REQUEST]).slice(2);

		const result = await this.evm.view({
			data: Buffer.from(data, "hex"),
			from: deployerAddress,
			specId: evmSpec,
			to: consensusContractAddress,
		});

		if (!result.success) {
			await this.app.terminate("getRounds failed");
		}

		const [results] = iface.decodeFunctionResult("getRounds", result.output!);

		const validatorRounds: Contracts.Evm.ValidatorRound[] = [];
		for (const validatorRound of results) {
			const [round, validators] = validatorRound;

			const roundNumber = Number(round);

			validatorRounds.push({
				round: roundNumber,
				roundHeight: this.roundCalculator.calculateRoundInfoByRound(roundNumber).roundHeight,
				validators: validators.map((validator) => {
					const [validatorAddress, voteBalance] = validator;

					return {
						address: validatorAddress,
						voteBalance: BigNumber.make(voteBalance),
					};
				}),
			});
		}

		return validatorRounds;
	}
}
