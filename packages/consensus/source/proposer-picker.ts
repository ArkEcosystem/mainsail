import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import seedrandom from "seedrandom";

@injectable()
export class ProposerPicker implements Contracts.Consensus.IProposerPicker {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.StateStore)
	private readonly state!: Contracts.State.StateStore;

	#firstValidatorIndex: number = 0;

	public async handleCommittedBlock(block: Contracts.Crypto.ICommittedBlock): Promise<void> {
		const { activeValidators } = this.configuration.getMilestone();
		if (block.commit.height % activeValidators !== 0) {
			return;
		}

		// Calculate a random validator starting index for the next 'activeValidators' rounds.
		const seed = await this.#calculateSeed(block.commit.height);
		const rng = seedrandom(seed);
		this.#firstValidatorIndex = Math.floor(rng() * (activeValidators - 1));
	}

	public async getValidatorIndex(round: number): Promise<number> {
		const totalRound = await this.#getTotalRound(round);
		const { activeValidators } = this.configuration.getMilestone();

		// On each round, move from the first index by offset with wrap around
		// to traverse all active validators once each.
		const offset = totalRound % activeValidators;
		return (this.#firstValidatorIndex + offset) % activeValidators;
	}

	async #calculateSeed(round: number): Promise<string> {
		const totalRound = await this.#getTotalRound(round);

		// TODO: take block id into account

		return `${totalRound}`;
	}

	async #getTotalRound(round: number): Promise<number> {
		const committedRound = this.state.getLastCommittedRound();
		return committedRound + round + 1;
	}
}
