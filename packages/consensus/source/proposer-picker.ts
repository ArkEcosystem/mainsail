import { inject, injectable } from "@mainsail/container";
import { Contracts, Identifiers } from "@mainsail/contracts";
import seedrandom from "seedrandom";

@injectable()
export class ProposerPicker implements Contracts.Consensus.IProposerPicker {
	@inject(Identifiers.Cryptography.Configuration)
	private readonly configuration!: Contracts.Crypto.IConfiguration;

	@inject(Identifiers.StateStore)
	private readonly state!: Contracts.State.StateStore;

	public getValidatorIndex(round: number): number {
		const seed = this.#calculateSeed(round);

		const { activeValidators } = this.configuration.getMilestone();
		const rng = seedrandom(seed);
		return Math.floor(rng() * (activeValidators - 1));
	}

	#calculateSeed(round: number): string {
		const totalRound = this.#getTotalRound(round);

		// TODO: take block id into account

		return `${totalRound}`;
	}

	#getTotalRound(round: number): number {
		const committedRound = this.state.getLastCommittedRound();
		return committedRound + round + 1;
	}
}
