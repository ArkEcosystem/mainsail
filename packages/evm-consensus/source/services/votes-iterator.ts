import { inject, injectable, tagged } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import { ConsensusAbi } from "@mainsail/evm-contracts";
import { ethers } from "ethers";

import { Identifiers as EvmConsensusIdentifiers } from "../identifiers.js";

const VOTES_PER_REQUEST = 10_000;

@injectable()
export class AsyncVotesIterator implements AsyncIterable<Contracts.Evm.Vote> {
	@inject(Identifiers.Application.Instance)
	private readonly app!: Contracts.Kernel.Application;

	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.Configuration;

	@inject(Identifiers.Evm.Instance)
	@tagged("instance", "evm")
	private readonly evm!: Contracts.Evm.Instance;

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
		const consensusContractAddress = this.app.get<string>(EvmConsensusIdentifiers.Contracts.Addresses.Consensus);
		const deployerAddress = this.app.get<string>(EvmConsensusIdentifiers.Internal.Addresses.Deployer);
		const { evmSpec } = this.configuration.getMilestone();

		const iface = new ethers.Interface(ConsensusAbi.abi);
		const data = iface.encodeFunctionData("getVotes", [this.#address, VOTES_PER_REQUEST]).slice(2);

		const result = await this.evm.view({
			caller: deployerAddress,
			data: Buffer.from(data, "hex"),
			gasLimit: 100_000_000n,
			recipient: consensusContractAddress,
			specId: evmSpec,
		});

		if (!result.success) {
			await this.app.terminate("getVotes failed");
		}

		const [votes] = iface.decodeFunctionResult("getVotes", result.output!);

		return votes.map((vote: string[]) => ({ validatorAddress: vote[1], voterAddress: vote[0] }));
	}
}
