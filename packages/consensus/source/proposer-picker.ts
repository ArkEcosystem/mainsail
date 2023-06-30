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

	get firstValidatorIndex(): number { return this.#firstValidatorIndex };

	public handleCommittedBlock(commit: Contracts.Crypto.IBlockCommit): void {
		const { activeValidators } = this.configuration.getMilestone();

		const { height: currentHeight } = commit;
		const roundHeight = currentHeight - (currentHeight % activeValidators);

		this.#updateValidatorIndex(activeValidators, roundHeight);
	}

	public getValidatorIndex(round: number): number {
		const totalRound = this.#getTotalRound(round);
		const { activeValidators } = this.configuration.getMilestone();
		// On each round, move from the first index by offset with wrap around
		// to traverse all active validators once each.
		const offset = (totalRound - 1) % activeValidators;
		return (this.#firstValidatorIndex + offset) % activeValidators;
	}

	#updateValidatorIndex(activeValidators: number, height: number): void {
		// Calculate a random validator starting index for the next 'activeValidators' rounds.
		const seed = this.#calculateSeed(height);
		const rng = seedrandom(seed);
		this.#firstValidatorIndex = Math.floor(rng() * (activeValidators - 1));
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
