import type { Contracts } from "@mainsail/contracts";

import { inject, injectable } from "@mainsail/container";

import { Identifiers as EvmConsensusIdentifiers } from "../identifiers.js";
import { ConsensusContractCaller } from "./consensus-contract-caller.js";

const VOTES_PER_REQUEST = 10_000;

interface ConsensusContractVote {
	readonly validator: string;
	readonly voter: string;
}

@injectable()
export class AsyncVotesIterator implements AsyncIterable<Contracts.Evm.Vote> {
	@inject(EvmConsensusIdentifiers.Internal.ConsensusContractCaller)
	private readonly contractCaller!: ConsensusContractCaller;

	#address = "0x0000000000000000000000000000000000000000";
	#votes: Contracts.Evm.Vote[] = [];
	#index = 0;

	[Symbol.asyncIterator](): AsyncIterator<Contracts.Evm.Vote> {
		return this;
	}

	async next(): Promise<IteratorResult<Contracts.Evm.Vote>> {
		if (this.#votes.length === this.#index) {
			this.#votes = await this.getVotes();

			if (this.#votes.length === 0) {
				return { done: true, value: undefined };
			}

			this.#index = 0;
			this.#address = this.#votes.at(-1)!.voterAddress;
		}

		return { done: false, value: this.#votes[this.#index++] };
	}

	private async getVotes(): Promise<Contracts.Evm.Vote[]> {
		const votes = await this.contractCaller.view<ConsensusContractVote[]>("getVotes", [
			this.#address,
			VOTES_PER_REQUEST,
		]);

		return votes.map((vote) => ({ validatorAddress: vote.validator, voterAddress: vote.voter }));
	}
}
